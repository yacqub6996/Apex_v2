from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    ExecutionEventType,
    User,
    UserRole,
    Transaction,
    TransactionType,
    TransactionStatus,
    ROISource,
)
from app.services.execution_events import record_execution_event
from app.services.notification_service import notify_roi_received

logger = logging.getLogger(__name__)


class LongTermROIPushRequest(SQLModel):
    user_id: uuid.UUID
    roi_percent: float
    symbol: str
    note: str | None = None


class LongTermROIPushResponse(SQLModel):
    success: bool
    message: str
    affected_users: int
    total_roi_amount: float
    execution_event_id: uuid.UUID


router = APIRouter(prefix="/admin/long-term-roi", tags=["admin-long-term-roi"])


@router.post("/push", response_model=LongTermROIPushResponse)
async def push_long_term_roi(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: LongTermROIPushRequest,
) -> LongTermROIPushResponse:
    """
    Push a long-term ROI execution event to a specific user's long-term balance.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Validate ROI percentage
    if abs(payload.roi_percent) > 1000:  # Limit to ±1000% for safety
        raise HTTPException(
            status_code=400,
            detail="ROI percentage must be between -1000% and +1000%"
        )

    # Get user and validate
    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate long-term balance for negative ROI
    if payload.roi_percent < 0 and user.long_term_balance <= 0:
        raise HTTPException(
            status_code=400,
            detail="User has insufficient long-term balance for negative ROI"
        )

    # Calculate ROI based on long-term balance
    roi_amount = user.long_term_balance * (payload.roi_percent / 100)
    roi_amount = round(roi_amount, 2)

    # Update user's long-term balance
    user.long_term_balance = round(user.long_term_balance + roi_amount, 2)
    session.add(user)

    # Create long-term ROI transaction record with enhanced fields
    transaction = Transaction(
        user_id=user.id,
        amount=roi_amount,
        transaction_type=TransactionType.LONG_TERM_ROI,
        status=TransactionStatus.COMPLETED,
        description=f"{payload.symbol} Long-term ROI at {payload.roi_percent}%",
        created_at=utc_now(),
        executed_at=utc_now(),
        roi_percent=payload.roi_percent,
        symbol=payload.symbol,
        source=ROISource.ADMIN_PUSH,
        pushed_by_admin_id=current_user.id,
    )
    session.add(transaction)

    # Record execution event (tagged as LONG_TERM service)
    main_event = await record_execution_event(
        session,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description=f"Long-term ROI execution: {payload.roi_percent:+.2f}% on {payload.symbol}",
        amount=roi_amount,
        user_id=user.id,
        payload={
            "service": "LONG_TERM",
            "symbol": payload.symbol,
            "roi_percent": payload.roi_percent,
            "note": payload.note,
            "roi_amount": roi_amount,
            "transaction_id": str(transaction.id),
            "pushed_by_admin": current_user.email,
            "execution_type": "admin_long_term_roi_push",
            "balance_type": "long_term",
        },
    )

    session.commit()

    try:
        notify_roi_received(
            session=session,
            user_id=user.id,
            amount=roi_amount,
            source=f"{payload.symbol} ({payload.roi_percent:+.2f}%)",
        )
    except Exception as exc:
        logger.warning("Failed to send long-term ROI notification", exc_info=exc)

    return LongTermROIPushResponse(
        success=True,
        message=f"Long-term ROI execution pushed successfully for user {user.email}",
        affected_users=1,
        total_roi_amount=roi_amount,
        execution_event_id=main_event.id,
    )


__all__ = [
    "router",
    "LongTermROIPushRequest",
    "LongTermROIPushResponse",
    "push_long_term_roi",
]
