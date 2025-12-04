from __future__ import annotations

import logging
import uuid
from typing import List

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, select

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    ExecutionEventType,
    User,
    UserRole,
    UserTraderCopy,
    CopyStatus,
    TraderProfile,
    RiskTolerance,
    Transaction,
    TransactionType,
    TransactionStatus,
)
from app.services.execution_events import record_execution_event
from app.services.notification_service import notify_roi_received

logger = logging.getLogger(__name__)


# SIMPLE_ROI_MODE flag - set to True for simplified ROI flow, False for original copy trading logic
SIMPLE_ROI_MODE = False


class ROIExecutionPushRequest(SQLModel):
    trader_id: uuid.UUID | None = None  # For normal mode
    user_id: uuid.UUID | None = None    # For simple mode
    roi_percent: float
    symbol: str
    note: str | None = None


class ROIExecutionPushResponse(SQLModel):
    success: bool
    message: str
    affected_users: int
    total_roi_amount: float
    execution_event_id: uuid.UUID


class SimpleROIPushResponse(SQLModel):
    status: str
    amount: float
    new_balance: float


router = APIRouter(prefix="/admin/executions", tags=["admin-executions"])


@router.post("/push", response_model=ROIExecutionPushResponse)
async def push_roi_execution(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: ROIExecutionPushRequest,
) -> ROIExecutionPushResponse:
    """
    Push an ROI execution event. In SIMPLE_ROI_MODE, applies ROI to individual users.
    In normal mode, applies ROI to all active copy relationships for a trader.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Validate ROI percentage
    if abs(payload.roi_percent) > 1000:  # Limit to +/-1000% for safety
        raise HTTPException(
            status_code=400,
            detail="ROI percentage must be between -1000% and +1000%"
        )

    # SIMPLE_ROI_MODE: Apply ROI to individual users
    if SIMPLE_ROI_MODE:
        target_user_id = payload.user_id

        # If user_id is not provided but trader_id is, try to resolve user from trader
        if not target_user_id and payload.trader_id:
            trader = session.get(TraderProfile, payload.trader_id)
            if trader:
                target_user_id = trader.user_id

        if not target_user_id:
            raise HTTPException(
                status_code=400,
                detail="user_id (or valid trader_id) is required in SIMPLE_ROI_MODE"
            )

        # Get user and validate
        user = session.get(User, target_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Calculate ROI based on copy trading balance
        roi_amount = user.copy_trading_balance * (payload.roi_percent / 100)
        roi_amount = round(roi_amount, 2)

        # Update user's copy trading balance
        user.copy_trading_balance = round(user.copy_trading_balance + roi_amount, 2)
        session.add(user)

        # Create ROI transaction record with enhanced fields
        transaction = Transaction(
            user_id=user.id,
            amount=roi_amount,
            transaction_type=TransactionType.ROI,
            status=TransactionStatus.COMPLETED,
            description=f"{payload.symbol} ROI at {payload.roi_percent}%",
            created_at=utc_now(),
            executed_at=utc_now(),
            roi_percent=payload.roi_percent,
            symbol=payload.symbol,
            source="ADMIN_PUSH",
            pushed_by_admin_id=current_user.id,
        )
        session.add(transaction)

        # Record execution event (tagged as COPY_TRADING service)
        main_event = await record_execution_event(
            session,
            event_type=ExecutionEventType.FOLLOWER_PROFIT,
            description=f"ROI execution: {payload.roi_percent:+.2f}% on {payload.symbol}",
            amount=roi_amount,
            user_id=user.id,
            payload={
                "service": "COPY_TRADING",
                "symbol": payload.symbol,
                "roi_percent": payload.roi_percent,
                "note": payload.note,
                "roi_amount": roi_amount,
                "transaction_id": str(transaction.id),
                "pushed_by_admin": current_user.email,
                "execution_type": "admin_roi_push_simple",
            },
        )

        session.commit()

        # Send notification to user
        try:
            notify_roi_received(
                session=session,
                user_id=user.id,
                amount=roi_amount,
                source=f"{payload.symbol} ({payload.roi_percent:+.2f}%)",
            )
        except Exception as e:
            logger.warning(f"Failed to send ROI notification: {e}")

        return ROIExecutionPushResponse(
            success=True,
            message=f"ROI execution pushed successfully for user {user.email}",
            affected_users=1,
            total_roi_amount=roi_amount,
            execution_event_id=main_event.id,
        )

    # NORMAL MODE: Original copy trading logic
    else:
        if not payload.trader_id:
            raise HTTPException(
                status_code=400,
                detail="trader_id is required in normal mode"
            )

        # Validate trader exists
        trader = session.get(TraderProfile, payload.trader_id)
        if not trader:
            raise HTTPException(status_code=404, detail="Trader not found")

        # TODO: Re-enable risk tolerance validation with more reasonable limits
        # For now, allow any ROI within the +/-1000% range for testing
        # Get trader's risk tolerance and validate ROI against it
        if payload.roi_percent > 0:
            # Positive ROI - check if it's reasonable for the risk tolerance
            if trader.risk_tolerance == RiskTolerance.LOW and payload.roi_percent > 50.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"ROI percentage of {payload.roi_percent}% is too high for LOW risk tolerance trader"
                )
            elif trader.risk_tolerance == RiskTolerance.MEDIUM and payload.roi_percent > 100.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"ROI percentage of {payload.roi_percent}% is too high for MEDIUM risk tolerance trader"
                )
            # HIGH risk tolerance allows up to 1000% (already validated above)
        elif payload.roi_percent < 0:
            # Negative ROI - check if loss is reasonable
            if trader.risk_tolerance == RiskTolerance.LOW and payload.roi_percent < -10.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"ROI percentage of {payload.roi_percent}% is too low for LOW risk tolerance trader"
                )
            elif trader.risk_tolerance == RiskTolerance.MEDIUM and payload.roi_percent < -20.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"ROI percentage of {payload.roi_percent}% is too low for MEDIUM risk tolerance trader"
                )

        # Get all active copy relationships for this trader
        active_copies = session.exec(
            select(UserTraderCopy).where(
                UserTraderCopy.trader_profile_id == payload.trader_id,
                UserTraderCopy.copy_status == CopyStatus.ACTIVE,
            )
        ).all()

        if not active_copies:
            raise HTTPException(
                status_code=400,
                detail="No active copy relationships found for this trader"
            )

        total_roi_amount = 0.0
        affected_users = set()

        # Apply ROI to each active copy relationship
        for copy in active_copies:
            # Calculate ROI amount for this copy
            roi_amount = copy.copy_amount * (payload.roi_percent / 100)
            roi_amount = round(roi_amount, 2)

            # Update user's copy trading balance
            user = session.get(User, copy.user_id)
            if user:
                user.copy_trading_balance = round(user.copy_trading_balance + roi_amount, 2)
                session.add(user)
                affected_users.add(user.id)
                total_roi_amount += roi_amount

                # Create DEPOSIT transaction for ROI amount
                transaction = Transaction(
                    user_id=user.id,
                    amount=roi_amount,
                    transaction_type=TransactionType.DEPOSIT,
                    status=TransactionStatus.COMPLETED,
                    description=f"Copy trading ROI: {payload.roi_percent:+.2f}% on {payload.symbol}",
                    created_at=utc_now(),
                    executed_at=utc_now(),
                )
                session.add(transaction)

                # Record individual execution event for each user (tagged as COPY_TRADING)
                await record_execution_event(
                    session,
                    event_type=ExecutionEventType.FOLLOWER_PROFIT,
                    description=f"ROI execution: {payload.roi_percent:+.2f}% on {payload.symbol}",
                    amount=roi_amount,
                    user_id=user.id,
                    trader_profile_id=payload.trader_id,
                    payload={
                        "service": "COPY_TRADING",
                        "symbol": payload.symbol,
                        "roi_percent": payload.roi_percent,
                        "trader_display_name": trader.display_name,
                        "trader_code": trader.trader_code,
                        "note": payload.note,
                        "copy_amount": copy.copy_amount,
                        "roi_amount": roi_amount,
                        "transaction_id": str(transaction.id),
                        "pushed_by_admin": current_user.email,
                        "execution_type": "admin_roi_push",
                    },
                )

        # Record main execution event for the trader
        main_event = await record_execution_event(
            session,
            event_type=ExecutionEventType.TRADER_SIMULATION,
            description=f"Admin ROI push: {payload.roi_percent:+.2f}% on {payload.symbol}",
            amount=total_roi_amount,
            trader_profile_id=payload.trader_id,
            payload={
                "symbol": payload.symbol,
                "roi_percent": payload.roi_percent,
                "affected_users": len(affected_users),
                "total_roi_amount": total_roi_amount,
                "note": payload.note,
                "pushed_by_admin": current_user.email,
            },
        )

        session.commit()

        # Send notifications to affected users
        try:
            trader_label = trader.display_name or trader.trader_code or "Trader"
            for copy in active_copies:
                user = session.get(User, copy.user_id)
                if user:
                    roi_amount = copy.copy_amount * (payload.roi_percent / 100)
                    notify_roi_received(
                        session=session,
                        user_id=copy.user_id,
                        amount=round(roi_amount, 2),
                        source=f"{trader_label} - {payload.symbol} ({payload.roi_percent:+.2f}%)",
                    )
        except Exception as e:
            logger.warning(f"Failed to send ROI notifications: {e}")

        return ROIExecutionPushResponse(
            success=True,
            message=f"ROI execution pushed successfully for {len(affected_users)} users",
            affected_users=len(affected_users),
            total_roi_amount=total_roi_amount,
            execution_event_id=main_event.id,
        )


@router.get("/traders")
async def get_traders_for_executions(
    session: SessionDep,
    current_user: CurrentUser,
) -> List[dict]:
    """
    Get list of traders with active copy relationships for ROI execution.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get traders with active copy relationships
    traders_with_copies = session.exec(
        select(TraderProfile).where(
            TraderProfile.id.in_(
                select(UserTraderCopy.trader_profile_id).where(
                    UserTraderCopy.copy_status == CopyStatus.ACTIVE
                )
            )
        )
    ).all()

    result = []
    for trader in traders_with_copies:
        # Count active copiers and total allocation
        active_copies = session.exec(
            select(UserTraderCopy).where(
                UserTraderCopy.trader_profile_id == trader.id,
                UserTraderCopy.copy_status == CopyStatus.ACTIVE,
            )
        ).all()

        total_allocation = sum(copy.copy_amount for copy in active_copies)

        result.append({
            "id": trader.id,
            "display_name": trader.display_name,
            "trader_code": trader.trader_code,
            "active_copiers": len(active_copies),
            "total_allocation": total_allocation,
            "trading_strategy": trader.trading_strategy,
            "risk_tolerance": trader.risk_tolerance.value,
        })

    return result


@router.get("/traders/{trader_id}/followers")
async def get_trader_followers(
    trader_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> List[dict]:
    """
    Get list of followers for a specific trader for ROI execution in SIMPLE_ROI_MODE.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Validate trader exists
    trader = session.get(TraderProfile, trader_id)
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    # Get active copy relationships for this trader
    active_copies = session.exec(
        select(UserTraderCopy).where(
            UserTraderCopy.trader_profile_id == trader_id,
            UserTraderCopy.copy_status == CopyStatus.ACTIVE,
        )
    ).all()

    result = []
    for copy in active_copies:
        user = session.get(User, copy.user_id)
        if user:
            result.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "copy_trading_balance": user.copy_trading_balance,
                "copy_amount": copy.copy_amount,
                "copy_started_at": copy.copy_started_at,
            })

    return result


__all__ = [
    "router",
    "ROIExecutionPushRequest",
    "ROIExecutionPushResponse",
    "push_roi_execution",
    "get_traders_for_executions",
]


