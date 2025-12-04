import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlmodel import SQLModel, col, delete, func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.core.time import utc_now
from app.models import (
    AccountSummary,
    AccountSummaryBase,
    AccountSummaryPublic,
    AccountTier,
    CopyStatus,
    Item,
    KycStatus,
    Message,
    Transaction,
    TransactionCreate,
    TransactionStatus,
    TransactionType,
    UpdatePassword,
    User,
    UserCreate,
    UserPublic,
    UserRegister,
    UserRole,
    UserTraderCopy,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
    WithdrawalSource,
)
from app.utils import (
    generate_email_verification_token,
)
from app.services.email_sender import send_welcome_email, send_verification_email
from app.services.file_storage import file_storage_service
from app.services.notification_service import (
    email_profile_change,
    email_compliance_review,
)

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


class BalanceResponse(SQLModel):
    balance: float


class BalanceUpdate(SQLModel):
    amount: float
    description: str | None = None


class KycDecision(SQLModel):
    status: KycStatus
    notes: str | None = None
    rejection_reason: str | None = None


class RoleTierUpdate(SQLModel):
    role: UserRole | None = None
    account_tier: AccountTier | None = None
    is_active: bool | None = None


class UserMeResponse(UserPublic):
    available_balance: float
    allocated_copy_balance: float
    total_balance: float
    pending_long_term_wallet_withdrawal: float = 0.0


MAX_PROFILE_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_PROFILE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()
    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()
    return UsersPublic(data=[UserPublic.model_validate(user) for user in users], count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic
)
async def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        try:
            send_welcome_email(user_in.email, user_in.full_name)
            token = generate_email_verification_token(user_in.email)
            send_verification_email(user_in.email, token)
        except Exception:
            logger.warning("Failed to dispatch welcome/verification email", exc_info=True)
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    previous_email = current_user.email
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    if user_in.email and user_in.email != previous_email:
        try:
            email_profile_change(session=session, user_id=current_user.id, field="email")
        except Exception:
            pass
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    try:
        email_profile_change(session=session, user_id=current_user.id, field="password")
    except Exception:
        pass
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserMeResponse)
def read_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    # Coerce to float to satisfy typing – ScalarResult.one() may be Any/None
    active_allocation_value: float = float(
        session.exec(
            select(func.coalesce(func.sum(UserTraderCopy.copy_amount), 0.0)).where(
                UserTraderCopy.user_id == current_user.id,
                UserTraderCopy.copy_status == CopyStatus.ACTIVE,
            )
        ).one()
        or 0.0
    )

    allocated_value = active_allocation_value
    available_balance = float(current_user.wallet_balance or current_user.balance or 0.0)  # Use wallet_balance, fallback to legacy balance
    total_balance = available_balance + allocated_value

    base_payload = UserPublic.model_validate(current_user, from_attributes=True)
    base_data = base_payload.model_dump(mode="json")

    pending_long_term_wallet_withdrawal = float(
        session.exec(
            select(func.coalesce(func.sum(Transaction.amount), 0.0))
            .where(Transaction.user_id == current_user.id)
            .where(Transaction.transaction_type == TransactionType.WITHDRAWAL)
            .where(Transaction.status == TransactionStatus.PENDING)
            .where(Transaction.withdrawal_source == WithdrawalSource.LONG_TERM_WALLET)
        ).one()
        or 0.0
    )

    return UserMeResponse(
        **base_data,
        available_balance=available_balance,
        allocated_copy_balance=allocated_value,
        total_balance=total_balance,
        pending_long_term_wallet_withdrawal=pending_long_term_wallet_withdrawal,
    )


@router.post("/profile-picture", response_model=UserPublic)
async def upload_profile_picture(
    *, session: SessionDep, current_user: CurrentUser, file: UploadFile = File(...)
) -> Any:
    import logging
    logger = logging.getLogger(__name__)
    
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")
    if len(contents) > MAX_PROFILE_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (5MB limit)")
    if file.content_type not in ALLOWED_PROFILE_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    storage_path = await file_storage_service.upload_profile_picture(
        contents,
        file.filename or "profile.jpg",
        str(current_user.id),
    )
    logger.info(f"Uploaded profile picture for user {current_user.id}: {storage_path}")
    await file.close()

    current_user.profile_picture_url = storage_path
    logger.info(f"Set profile_picture_url to: {current_user.profile_picture_url}")
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    logger.info(f"After refresh, profile_picture_url is: {current_user.profile_picture_url}")
    return UserPublic.model_validate(current_user)


@router.post("/signup", response_model=UserPublic)
async def register_user(session: SessionDep, user_in: UserRegister, request: Request) -> Any:
    # Honeypot validation check - if website field is filled, it's a bot
    if user_in.website:
        client_ip = request.client.host if request.client else "unknown"
        logger.warning(
            f"Honeypot triggered during registration. Email: {user_in.email}, IP: {client_ip}, "
            f"Website field content: {user_in.website[:100]}"
        )
        raise HTTPException(
            status_code=400,
            detail="Something went wrong.",
        )
    
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    # Exclude website field when converting to UserCreate
    user_create = UserCreate.model_validate(user_in.model_dump(exclude={"website"}))
    user = crud.create_user(session=session, user_create=user_create)

    # Send verification email immediately after signup when email is configured
    try:
        if settings.emails_enabled and user.email:
            send_welcome_email(user.email, user.full_name)
            token = generate_email_verification_token(user.email)
            send_verification_email(user.email, token)
    except Exception:
        # Do not block signup if email fails; logs are handled inside send_email
        pass

    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user or current_user.is_superuser or current_user.role == UserRole.ADMIN:
        return user
    raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")


@router.get("/{user_id}/balance", response_model=BalanceResponse)
def read_user_balance(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user != current_user and current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return BalanceResponse(balance=user.balance)


@router.patch(
    "/{user_id}/balance",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=BalanceResponse,
)
def update_user_balance(
    user_id: uuid.UUID,
    balance_update: BalanceUpdate,
    session: SessionDep,
) -> Any:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    previous_balance = user.balance
    user.balance = balance_update.amount
    user.wallet_balance = balance_update.amount  # Also update wallet_balance for consistency
    session.add(user)
    session.commit()
    session.refresh(user)

    adjustment = balance_update.amount - previous_balance
    if adjustment != 0:
        tx = TransactionCreate(
            amount=adjustment,
            transaction_type=TransactionType.ADJUSTMENT,
            status=TransactionStatus.COMPLETED,
            description=balance_update.description or "Manual balance adjustment",
        )
        crud.create_transaction(session=session, tx_in=tx, owner_id=user.id)
    return BalanceResponse(balance=user.balance)


@router.post(
    "/{user_id}/kyc/decision",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_kyc_status(
    user_id: uuid.UUID, decision: KycDecision, session: SessionDep
) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    now = utc_now()
    user.kyc_status = decision.status
    user.kyc_notes = decision.notes

    if decision.status == KycStatus.APPROVED:
        user.kyc_verified_at = now
        user.kyc_approved_at = now
        user.kyc_rejected_reason = None
    elif decision.status == KycStatus.REJECTED:
        user.kyc_verified_at = None
        user.kyc_approved_at = None
        user.kyc_rejected_reason = decision.rejection_reason or decision.notes
    else:
        user.kyc_verified_at = None
        user.kyc_approved_at = None
        user.kyc_rejected_reason = None
        if decision.status == KycStatus.PENDING:
            user.kyc_submitted_at = None
        elif decision.status == KycStatus.UNDER_REVIEW and not user.kyc_submitted_at:
            user.kyc_submitted_at = now
    session.add(user)
    session.commit()
    session.refresh(user)
    try:
        email_compliance_review(
            session=session,
            user_id=user.id,
            state=decision.status.value,
            notes=decision.notes or decision.rejection_reason,
        )
    except Exception:
        pass
    return user


@router.patch(
    "/{user_id}/role",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_role_or_tier(
    user_id: uuid.UUID, payload: RoleTierUpdate, session: SessionDep
) -> User:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role:
        user.role = payload.role
        user.is_superuser = payload.role == UserRole.ADMIN
    if payload.account_tier:
        user.account_tier = payload.account_tier
    if payload.is_active is not None:
        user.is_active = payload.is_active
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get(
    "/{user_id}/account-summary",
    response_model=AccountSummaryPublic,
)
def get_account_summary(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> AccountSummary:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user != current_user and current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    summary = session.exec(
        select(AccountSummary).where(AccountSummary.user_id == user_id)
    ).first()
    if not summary:
        # Initialize a default summary to avoid 404 on first load
        base = AccountSummaryBase()
        summary = crud.upsert_account_summary(session=session, user_id=user_id, summary_in=base)
    return summary


@router.post(
    "/{user_id}/account-summary",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=AccountSummaryPublic,
)
def upsert_account_summary(
    user_id: uuid.UUID, payload: AccountSummaryBase, session: SessionDep
) -> AccountSummary:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    summary = crud.upsert_account_summary(session=session, user_id=user_id, summary_in=payload)
    return summary


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *,
    session: SessionDep,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete(
    "/{user_id}", dependencies=[Depends(get_current_active_superuser)]
)
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    # Related records (e.g., items) are configured with cascade deletes via relationships
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")
