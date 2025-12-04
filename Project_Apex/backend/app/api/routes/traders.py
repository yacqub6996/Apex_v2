import random
import string
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import SQLModel, func, select

from app.api.deps import SessionDep, get_current_active_superuser
from app.services.file_storage import file_storage_service
from app.models import (
    Message,
    TraderProfile,
    TraderProfileCreate,
    TraderProfilePublic,
    TraderProfilesPublic,
    TraderProfileUpdate,
    User,
    RiskTolerance,
)

router = APIRouter(prefix="/traders", tags=["traders"])


class TraderCreateRequest(SQLModel):
    """Request model for creating a trader profile."""
    user_id: uuid.UUID
    display_name: str
    specialty: str
    risk_level: RiskTolerance
    trading_strategy: str | None = None
    is_public: bool = False
    copy_fee_percentage: float = 0.0
    minimum_copy_amount: float = 100.0
    # Optional initial performance fields to seed public profile cards
    total_copiers: int | None = None
    total_assets_under_copy: float | None = None
    average_monthly_return: float | None = None


class TraderCreateResponse(SQLModel):
    """Response model for creating a trader profile."""
    trader_profile: TraderProfilePublic
    trader_code: str


def _generate_unique_trader_code(session: SessionDep) -> str:
    """Generate a unique 6-8 character trader code."""

    alphabet = string.ascii_uppercase + string.digits
    length_options = (6, 7, 8)

    while True:
        length = random.choice(length_options)
        candidate = "".join(random.choice(alphabet) for _ in range(length))

        existing = session.exec(
            select(TraderProfile).where(TraderProfile.trader_code == candidate)
        ).first()

        if existing is None:
            return candidate


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=TraderProfilesPublic,
)
def read_traders(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """Retrieve all trader profiles."""
    count_statement = select(func.count()).select_from(TraderProfile)
    count = session.exec(count_statement).one()
    
    statement = select(TraderProfile).offset(skip).limit(limit)
    traders = session.exec(statement).all()
    
    return TraderProfilesPublic(
        data=[TraderProfilePublic.model_validate(trader) for trader in traders], 
        count=count
    )


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=TraderCreateResponse,
)
def create_trader(*, session: SessionDep, trader_in: TraderCreateRequest) -> Any:
    """Create a new trader profile."""

    user = session.get(User, trader_in.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing_trader = session.exec(
        select(TraderProfile).where(TraderProfile.user_id == trader_in.user_id)
    ).first()

    if existing_trader:
        raise HTTPException(status_code=400, detail="User already has a trader profile.")

    display_name = trader_in.display_name.strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="Display name cannot be empty.")

    trader_code = _generate_unique_trader_code(session)

    trader_profile_data = TraderProfileCreate(
        user_id=trader_in.user_id,
        display_name=display_name,
        trader_code=trader_code,
        trading_strategy=
            trader_in.trading_strategy
            or f"{trader_in.specialty} trading specialist",
        risk_tolerance=trader_in.risk_level,
        is_public=trader_in.is_public,
        copy_fee_percentage=trader_in.copy_fee_percentage,
        minimum_copy_amount=trader_in.minimum_copy_amount,
        total_copiers=trader_in.total_copiers or 0,
        total_assets_under_copy=trader_in.total_assets_under_copy or 0.0,
        average_monthly_return=trader_in.average_monthly_return or 0.0,
    )

    trader_profile = TraderProfile.model_validate(trader_profile_data)
    session.add(trader_profile)
    session.commit()
    session.refresh(trader_profile)

    return TraderCreateResponse(
        trader_profile=TraderProfilePublic.model_validate(trader_profile),
        trader_code=trader_code,
    )


@router.get(
    "/{trader_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=TraderProfilePublic,
)
def read_trader_by_id(trader_id: uuid.UUID, session: SessionDep) -> Any:
    """Get a specific trader by id."""
    trader = session.get(TraderProfile, trader_id)
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return trader


@router.patch(
    "/{trader_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=TraderProfilePublic,
)
def update_trader(
    trader_id: uuid.UUID, trader_in: TraderProfileUpdate, session: SessionDep
) -> Any:
    """Update a trader profile."""
    trader = session.get(TraderProfile, trader_id)
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    
    trader_data = trader_in.model_dump(exclude_unset=True)
    trader.sqlmodel_update(trader_data)
    session.add(trader)
    session.commit()
    session.refresh(trader)
    return trader


@router.delete(
    "/{trader_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_trader(trader_id: uuid.UUID, session: SessionDep) -> Message:
    """Delete a trader profile."""
    trader = session.get(TraderProfile, trader_id)
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    
    session.delete(trader)
    session.commit()
    return Message(message="Trader deleted successfully")


# Avatar upload for trader profiles (admin-only)
MAX_AVATAR_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_AVATAR_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post(
    "/{trader_id}/avatar",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=TraderProfilePublic,
)
async def upload_trader_avatar(
    trader_id: uuid.UUID,
    session: SessionDep,
    file: UploadFile = File(...),
) -> Any:
    """Upload or replace a trader profile avatar."""
    trader = session.get(TraderProfile, trader_id)
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload")
    if len(contents) > MAX_AVATAR_UPLOAD_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (5MB limit)")
    if file.content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image type")

    storage_path = await file_storage_service.upload_trader_avatar(
        contents, file.filename or "avatar.jpg", str(trader_id)
    )
    await file.close()

    trader.avatar_url = storage_path
    session.add(trader)
    session.commit()
    session.refresh(trader)
    return TraderProfilePublic.model_validate(trader)
