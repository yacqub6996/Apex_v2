from __future__ import annotations

import logging
import uuid
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
import io
import zipfile
from sqlmodel import SQLModel, select, col

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    KycDocument,
    KycDocumentPublic,
    KycDocumentType,
    KycDocumentsPublic,
    KycStatus,
    User,
    UserPublic,
    UserProfile,
    UserProfilePublic,
)
from app.core.time import utc_now
from app.services.file_storage import file_storage_service
from app.services.notification_service import notify_kyc_approved, notify_kyc_rejected, notify_kyc_submitted


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kyc", tags=["kyc"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


class KycSubmission(SQLModel):
    legal_first_name: str
    legal_last_name: str
    date_of_birth: str  # Accept string from frontend, convert to date in endpoint
    phone_number: str
    address_line_1: str
    address_line_2: str | None = None
    city: str
    state: str
    postal_code: str
    country: str
    tax_id_number: str
    occupation: str
    source_of_funds: str
    investment_strategy: str = "BALANCED"  # Default to balanced strategy


class KycSubmissionResponse(SQLModel):
    profile: UserProfilePublic
    status: KycStatus
    submitted_at: datetime | None


class KycStatusResponse(SQLModel):
    status: KycStatus
    submitted_at: datetime | None
    approved_at: datetime | None
    rejected_reason: str | None
    notes: str | None


class KycApplicationPublic(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    kyc_status: str
    kyc_submitted_at: datetime | None
    legal_first_name: str | None
    legal_last_name: str | None
    date_of_birth: date | None
    phone_number: str | None
    country: str | None
    risk_assessment_score: int


class KycApplicationDetail(SQLModel):
    user: UserPublic
    profile: UserProfilePublic | None
    documents: list[KycDocumentPublic]


class KycRejectionPayload(SQLModel):
    reason: str
    notes: str | None = None


async def notify_admins_kyc_submission(session: SessionDep, user_id: uuid.UUID) -> None:
    """Notify stakeholders when a KYC submission is created."""
    logger.info("KYC submission received for user %s", user_id)


def calculate_age(born: str | date) -> int:
    """Calculate age from date string or date object"""
    if isinstance(born, str):
        # Parse string date (format: YYYY-MM-DD)
        born = date.fromisoformat(born)
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _determine_risk_score(submission: KycSubmission) -> int:
    base_score = 40
    income_source = submission.source_of_funds.lower()
    if income_source in {"business_income", "investments"}:
        base_score += 10
    elif income_source == "inheritance":
        base_score += 5
    elif income_source == "other":
        base_score += 15

    age = calculate_age(submission.date_of_birth)
    if age < 25:
        base_score += 10
    elif age > 60:
        base_score += 5

    return max(0, min(100, base_score))


async def _store_document(
    *,
    user_id: uuid.UUID,
    document_type: KycDocumentType,
    side: str,
    filename: str,
    payload: bytes,
) -> str:
    """Store document using the configured file storage service"""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file extension",
        )

    # Use file storage service
    storage_path = await file_storage_service.upload_document(
        file_content=payload,
        filename=filename,
        user_id=str(user_id),
        document_type=f"{document_type.value}_{side}"
    )
    
    return storage_path


@router.get("/profile", response_model=UserProfilePublic | None)
def get_profile(session: SessionDep, current_user: CurrentUser) -> UserProfilePublic | None:
    profile = session.exec(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).first()
    if not profile:
        return None
    return UserProfilePublic.model_validate(profile)


@router.post("/submit", response_model=KycSubmissionResponse)
async def submit_kyc_information(
    *, session: SessionDep, current_user: CurrentUser, payload: KycSubmission
) -> KycSubmissionResponse:
    # Debug logging to see what's being received
    logger.info(f"KYC submission received for user {current_user.id}")
    logger.info(f"Payload: {payload.model_dump()}")

    try:
        logger.info(f"Step 1: Age validation")
        if calculate_age(payload.date_of_birth) < 18:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must be at least 18 years old to submit KYC",
            )

        logger.info(f"Step 2: Profile lookup/creation")
        profile = session.exec(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        ).first()
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            logger.info(f"Created new profile for user {current_user.id}")

        logger.info(f"Step 3: Convert date and update profile")
        # Convert string date to date object for database
        profile_data = payload.model_dump()
        if profile_data.get('date_of_birth'):
            profile_data['date_of_birth'] = date.fromisoformat(profile_data['date_of_birth'])
        
        # Update profile fields manually
        for field, value in profile_data.items():
            if hasattr(profile, field):
                setattr(profile, field, value)
        profile.risk_assessment_score = _determine_risk_score(payload)
        profile.updated_at = utc_now()

        session.add(profile)

        logger.info(f"Step 4: Update user KYC status")
        now = utc_now()
        # Use the enum directly, not .value - SQLAlchemy will handle the conversion
        current_user.kyc_status = KycStatus.UNDER_REVIEW
        current_user.kyc_submitted_at = now
        current_user.kyc_approved_at = None
        current_user.kyc_verified_at = None
        current_user.kyc_rejected_reason = None
        current_user.kyc_notes = None

        session.add(current_user)

        logger.info(f"Step 5: Commit to database")
        session.commit()
        session.refresh(profile)
        session.refresh(current_user)

        logger.info(f"Step 6: Notify user")
        notify_kyc_submitted(session=session, user_id=current_user.id)

        logger.info(f"Step 7: Notify admins")
        await notify_admins_kyc_submission(session, current_user.id)

        logger.info(f"Step 8: Return response")
        return KycSubmissionResponse(
            profile=UserProfilePublic.model_validate(profile),
            status=current_user.kyc_status,
            submitted_at=current_user.kyc_submitted_at,
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions without rollback
        raise
    except Exception as e:
        logger.error(f"KYC submission failed for user {current_user.id}: {e}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Rollback the session to prevent PendingRollbackError
        session.rollback()
        
        # Return a clean error response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit KYC information. Please try again."
        )


@router.get("/status", response_model=KycStatusResponse)
def get_kyc_status(current_user: CurrentUser) -> KycStatusResponse:
    return KycStatusResponse(
        status=current_user.kyc_status,
        submitted_at=current_user.kyc_submitted_at,
        approved_at=current_user.kyc_approved_at,
        rejected_reason=current_user.kyc_rejected_reason,
        notes=current_user.kyc_notes,
    )


@router.get("/documents", response_model=KycDocumentsPublic)
def list_documents(session: SessionDep, current_user: CurrentUser) -> KycDocumentsPublic:
    documents = session.exec(
        select(KycDocument).where(KycDocument.user_id == current_user.id)
    ).all()
    payload = [KycDocumentPublic.model_validate(doc) for doc in documents]
    return KycDocumentsPublic(data=payload, count=len(payload))


@router.post("/documents", response_model=KycDocumentPublic)
async def upload_kyc_document(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    document_type: KycDocumentType = Form(...),
    file: UploadFile = File(...),
    side: str = Form("front"),
) -> KycDocumentPublic:
    side_normalised = side.lower()
    if side_normalised not in {"front", "back"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document side")
    if document_type == KycDocumentType.PROOF_OF_ADDRESS:
        side_normalised = "front"

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (10MB limit)")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    storage_path = await _store_document(
        user_id=current_user.id,
        document_type=document_type,
        side=side_normalised,
        filename=file.filename or f"{document_type.value}.bin",
        payload=contents,
    )
    await file.close()

    document = session.exec(
        select(KycDocument)
        .where(KycDocument.user_id == current_user.id)
        .where(KycDocument.document_type == document_type)
    ).first()

    if not document:
        document = KycDocument(user_id=current_user.id, document_type=document_type)

    if side_normalised == "back":
        document.back_image_url = storage_path
    else:
        document.front_image_url = storage_path

    document.verified = False
    document.verified_by = None
    document.verified_at = None

    session.add(document)
    session.commit()
    session.refresh(document)

    return KycDocumentPublic.model_validate(document)


@router.get(
    "/applications/pending",
    response_model=list[KycApplicationPublic],
    dependencies=[Depends(get_current_active_superuser)],
)
def list_pending_applications(session: SessionDep) -> list[KycApplicationPublic]:
    users = session.exec(
        select(User)
        .where(col(User.kyc_status).in_([KycStatus.PENDING, KycStatus.UNDER_REVIEW]))
        .order_by(col(User.kyc_submitted_at).desc(), col(User.email))
    ).all()

    payload: list[KycApplicationPublic] = []
    for user in users:
        profile = session.exec(select(UserProfile).where(UserProfile.user_id == user.id)).first()
        payload.append(
            KycApplicationPublic(
                id=(profile.id if profile else user.id),
                user_id=user.id,
                email=user.email,
                kyc_status=user.kyc_status.value.lower(),
                kyc_submitted_at=user.kyc_submitted_at,
                legal_first_name=profile.legal_first_name if profile else None,
                legal_last_name=profile.legal_last_name if profile else None,
                date_of_birth=profile.date_of_birth if profile else None,
                phone_number=profile.phone_number if profile else None,
                country=profile.country if profile else None,
                risk_assessment_score=profile.risk_assessment_score if profile else 0,
            )
        )
    return payload


@router.get(
    "/applications/{user_id}",
    response_model=KycApplicationDetail,
    dependencies=[Depends(get_current_active_superuser)],
)
def get_application_detail(user_id: uuid.UUID, session: SessionDep) -> KycApplicationDetail:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    profile = session.exec(
        select(UserProfile).where(UserProfile.user_id == user_id)
    ).first()
    documents = session.exec(
        select(KycDocument).where(KycDocument.user_id == user_id)
    ).all()

    return KycApplicationDetail(
        user=UserPublic.model_validate(user),
        profile=UserProfilePublic.model_validate(profile) if profile else None,
        documents=[KycDocumentPublic.model_validate(doc) for doc in documents],
    )


@router.get(
    "/applications/{user_id}/documents/bulk-download",
    dependencies=[Depends(get_current_active_superuser)],
)
def bulk_download_documents(user_id: uuid.UUID, session: SessionDep, ids: str | None = None):
    """Zip and stream selected KYC documents for a user. If ids is omitted, include all."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    id_set: set[uuid.UUID] | None = None
    if ids:
        try:
            id_set = {uuid.UUID(part.strip()) for part in ids.split(',') if part.strip()}
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ids parameter")

    documents = session.exec(
        select(KycDocument).where(KycDocument.user_id == user_id)
    ).all()
    if id_set is not None:
        documents = [d for d in documents if d.id in id_set]
    if not documents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No documents to download")

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for doc in documents:
            # Add both sides if present
            for side, path in [("front", doc.front_image_url), ("back", doc.back_image_url)]:
                if not path:
                    continue
                try:
                    # Handle both old format (storage/...) and new format (/storage/...)
                    path_str = str(path)
                    
                    # Remove leading slash if present to get file system path
                    if path_str.startswith('/'):
                        path_str = path_str.lstrip('/')
                    
                    # Remove /static/ prefix if present (old format)
                    if path_str.startswith("static/"):
                        path_str = path_str[len("static/"):]
                    
                    file_path = Path(path_str)
                    
                    # If path doesn't exist, try relative to current working directory
                    if not file_path.exists():
                        file_path = Path.cwd() / path_str
                    
                    if file_path.exists():
                        arcname = f"{doc.document_type.value}_{side}_{doc.id}{file_path.suffix}"
                        zf.write(file_path, arcname=arcname)
                    else:
                        logger.warning(f"File not found for document {doc.id} ({doc.document_type} {side}): {path_str}")
                except Exception as e:
                    logger.warning(f"Failed adding document {doc.id} to zip: {e}")

    buffer.seek(0)
    filename = f"kyc_documents_{user_id}.zip"
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get(
    "/documents/{document_id}/view",
    dependencies=[Depends(get_current_active_superuser)],
)
def view_document(document_id: uuid.UUID, session: SessionDep):
    """Get document details and view URL for admin inspection"""
    document = session.get(KycDocument, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Get viewable URL for the document
    view_url = None
    if document.front_image_url:
        view_url = file_storage_service.get_document_url(document.front_image_url)
    elif document.back_image_url:
        view_url = file_storage_service.get_document_url(document.back_image_url)

    return {
        "document": KycDocumentPublic.model_validate(document),
        "view_url": view_url,
        "user_id": document.user_id,
        "document_type": document.document_type.value,
        "verified": document.verified,
        "verified_by": document.verified_by,
        "verified_at": document.verified_at,
    }


@router.post(
    "/applications/{user_id}/approve",
    response_model=UserPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def approve_application(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> UserPublic:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    now = utc_now()
    user.kyc_status = KycStatus.APPROVED
    user.kyc_approved_at = now
    user.kyc_verified_at = now
    user.kyc_rejected_reason = None
    user.kyc_notes = None

    documents = session.exec(
        select(KycDocument).where(KycDocument.user_id == user_id)
    ).all()
    for document in documents:
        document.verified = True
        document.verified_by = current_user.id
        document.verified_at = now
        session.add(document)

    session.add(user)
    session.commit()
    session.refresh(user)

    # Send notification to user
    try:
        notify_kyc_approved(session=session, user_id=user_id)
    except Exception as e:
        logger.warning(f"Failed to send KYC approval notification: {e}")

    return UserPublic.model_validate(user)


@router.post(
    "/applications/{user_id}/reject",
    response_model=UserPublic,
    dependencies=[Depends(get_current_active_superuser)],
)
def reject_application(
    user_id: uuid.UUID,
    payload: KycRejectionPayload,
    session: SessionDep,
) -> UserPublic:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.kyc_status = KycStatus.REJECTED
    user.kyc_approved_at = None
    user.kyc_verified_at = None
    user.kyc_rejected_reason = payload.reason
    user.kyc_notes = payload.notes or payload.reason

    documents = session.exec(
        select(KycDocument).where(KycDocument.user_id == user_id)
    ).all()
    for document in documents:
        document.verified = False
        document.verified_by = None
        document.verified_at = None
        session.add(document)

    session.add(user)
    session.commit()
    session.refresh(user)

    # Send notification to user
    try:
        notify_kyc_rejected(
            session=session,
            user_id=user_id,
            reason=payload.reason,
        )
    except Exception as e:
        logger.warning(f"Failed to send KYC rejection notification: {e}")

    return UserPublic.model_validate(user)
