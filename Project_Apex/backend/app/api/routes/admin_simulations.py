from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Any, cast

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, select
from sqlalchemy import func, desc

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    ExecutionEventType,
    Transaction,
    TransactionStatus,
    TransactionType,
    TraderProfile,
    TraderTrade,
    TradeStatus,
    User,
    UserRole,
    UserTraderCopy,
    CopyStatus,
    WithdrawalSource,
    LongTermPlan,
    UserLongTermInvestment,
)
from app.services.execution_events import record_execution_event
from app.services.trader_simulator import TraderSimulator
from app.services.notification_service import (
    notify_withdrawal_approved,
    notify_withdrawal_rejected,
    email_withdrawal_requested,
)


class SimulationScenarioRequest(SQLModel):
    trader_category: Optional[str] = None  # forex, crypto, stocks, indices
    profit_scenario: str = "balanced"  # bullish, bearish, balanced
    session_duration_hours: int = 24
    trader_profile_ids: Optional[List[uuid.UUID]] = None


class SimulationScenarioResponse(SQLModel):
    scenario_id: uuid.UUID
    trader_trades_created: int
    follower_trades_created: int
    events_recorded: int
    total_profit_loss: float
    scenario_summary: dict


class WithdrawalRequest(SQLModel):
    amount: float
    description: str = "Withdrawal request"


class WithdrawalResponse(SQLModel):
    transaction_id: uuid.UUID
    status: str
    amount: float
    description: str
    created_at: datetime


class PendingWithdrawal(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    amount: float
    description: str
    created_at: datetime
    status: str
    source: str
    investment_id: uuid.UUID | None = None
    plan_name: str | None = None


class PendingWithdrawalsList(SQLModel):
    data: List[PendingWithdrawal]
    total: int


router = APIRouter(prefix="/admin/simulations", tags=["admin-simulations"])

logger = logging.getLogger(__name__)


@router.post("/scenario", response_model=SimulationScenarioResponse)
async def run_simulation_scenario(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: SimulationScenarioRequest,
) -> SimulationScenarioResponse:
    """
    Run a controlled simulation scenario with specific trader categories and profit scenarios.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Build trader profile query based on category
    statement = select(TraderProfile).where(TraderProfile.is_public == True)
    if payload.trader_category:
        # Filter by specialty based on category
        if payload.trader_category == "forex":
            statement = statement.where(
                func.lower(TraderProfile.trading_strategy).like("%forex%")
            )
        elif payload.trader_category == "crypto":
            statement = statement.where(
                func.lower(TraderProfile.trading_strategy).like("%crypto%")
            )
        elif payload.trader_category == "stocks":
            statement = statement.where(
                func.lower(TraderProfile.trading_strategy).like("%stock%")
            )
        elif payload.trader_category == "indices":
            statement = statement.where(
                func.lower(TraderProfile.trading_strategy).like("%indices%")
            )
    
    if payload.trader_profile_ids:
        statement = statement.where(cast(Any, TraderProfile.id).in_(payload.trader_profile_ids))

    trader_profiles = session.exec(statement).all()
    
    if not trader_profiles:
        raise HTTPException(status_code=404, detail="No traders found for the specified criteria")

    simulator = TraderSimulator()
    
    # Adjust simulation parameters based on profit scenario
    original_volatility = simulator.volatility_factors.copy()
    try:
        if payload.profit_scenario == "bullish":
            # Increase win rates and positive volatility
            for key in simulator.volatility_factors:
                simulator.volatility_factors[key] *= 1.5
        elif payload.profit_scenario == "bearish":
            # Decrease win rates and increase negative volatility
            for key in simulator.volatility_factors:
                simulator.volatility_factors[key] *= 0.7

        # Run simulation
        simulation = simulator.simulate_trader_trade(
            session,
            trader_profile_ids=[tp.id for tp in trader_profiles],
        )

        # Calculate total P&L
        total_profit_loss = sum(
            (trade.profit_loss or 0) for trade in simulation.trader_trades
        ) + sum(
            (record.trade.profit_loss or 0) for record in simulation.follower_trades
        )

        # Record scenario execution event
        await record_execution_event(
            session,
            event_type=ExecutionEventType.TRADER_SIMULATION,
            description=f"Admin scenario: {payload.trader_category or 'all'} traders, {payload.profit_scenario} market",
            amount=total_profit_loss,
            payload={
                "scenario_type": payload.profit_scenario,
                "trader_category": payload.trader_category,
                "session_duration_hours": payload.session_duration_hours,
                "traders_count": len(trader_profiles),
                "total_profit_loss": total_profit_loss,
            },
        )

        session.commit()

        return SimulationScenarioResponse(
            scenario_id=uuid.uuid4(),
            trader_trades_created=len(simulation.trader_trades),
            follower_trades_created=len(simulation.follower_trades),
            events_recorded=len(simulation.follower_trades),
            total_profit_loss=total_profit_loss,
            scenario_summary={
                "trader_count": len(trader_profiles),
                "category": payload.trader_category,
                "scenario": payload.profit_scenario,
                "duration_hours": payload.session_duration_hours,
            },
        )

    finally:
        # Restore original volatility factors
        simulator.volatility_factors = original_volatility


@router.post("/withdrawals/request", response_model=WithdrawalResponse)
async def request_withdrawal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: WithdrawalRequest,
) -> WithdrawalResponse:
    """
    Request a withdrawal from copy trading balance to main balance.
    Uses current copy_trading_balance field which includes ROI gains.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be positive")

    # Use the current copy_trading_balance which includes ROI gains (legacy simulation path)
    copy_balance = current_user.copy_trading_balance or 0.0

    if payload.amount > copy_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient copy balance. Available: ${copy_balance:.2f}",
        )

    # Create withdrawal transaction
    transaction = Transaction(
        user_id=current_user.id,
        amount=payload.amount,
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description=payload.description,
        created_at=utc_now(),
        withdrawal_source=WithdrawalSource.ACTIVE_ALLOCATION,
    )
    session.add(transaction)
    try:
        session.commit()
        session.refresh(transaction)
    except Exception:
        session.rollback()
        logger.exception("Failed to create withdrawal transaction", extra={"user_id": str(current_user.id)})
        raise HTTPException(status_code=500, detail="Failed to create withdrawal request")

    try:
        email_withdrawal_requested(
            session=session,
            user_id=current_user.id,
            amount=float(transaction.amount or 0.0),
            source="Copy trading balance",
        )
    except Exception:
        pass

    return WithdrawalResponse(
        transaction_id=transaction.id,
        status=transaction.status.value,
        amount=transaction.amount,
        description=transaction.description or "",
        created_at=transaction.created_at,
    )


@router.get("/withdrawals/pending", response_model=PendingWithdrawalsList)
def get_pending_withdrawals(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
) -> PendingWithdrawalsList:
    """
    Get pending withdrawal requests for admin approval.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Count total pending withdrawals
    count_query = select(func.count()).select_from(Transaction).where(
        Transaction.transaction_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.PENDING,
    )
    total = session.exec(count_query).one()

    # Get pending withdrawals with user info
    withdrawals_query = (
        select(Transaction, User)
        .join(User, cast(Any, User.id == Transaction.user_id))
        .where(
            Transaction.transaction_type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.PENDING,
        )
        .order_by(desc(cast(Any, Transaction.created_at)))
        .offset(skip)
        .limit(limit)
    )

    results = session.exec(withdrawals_query).all()

    pending_withdrawals = []
    for tx, user in results:
        src = getattr(tx, "withdrawal_source", None)
        if isinstance(src, WithdrawalSource):
            src_value = src.value
        elif isinstance(src, str):
            src_value = src
        else:
            src_value = WithdrawalSource.ACTIVE_ALLOCATION.value

        plan_name: str | None = None
        if tx.long_term_investment_id:
            investment = session.get(UserLongTermInvestment, tx.long_term_investment_id)
            if investment:
                plan = session.get(LongTermPlan, investment.plan_id)
                plan_name = plan.name if plan else None

        pending_withdrawals.append(
            PendingWithdrawal(
                id=tx.id,
                user_id=user.id,
                email=user.email,
                amount=tx.amount,
                description=tx.description or "Withdrawal request",
                created_at=tx.created_at,
                status=tx.status.value,
                source=src_value,
                investment_id=tx.long_term_investment_id,
                plan_name=plan_name,
            )
        )

    return PendingWithdrawalsList(
        data=pending_withdrawals,
        total=total,
    )


@router.post("/withdrawals/{transaction_id}/approve", response_model=WithdrawalResponse, status_code=200)
async def approve_withdrawal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    transaction_id: uuid.UUID,
) -> WithdrawalResponse:
    """
    Approve a pending withdrawal request.
    Uses copy_trading_balance field which includes ROI gains.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.transaction_type != TransactionType.WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Not a withdrawal transaction")

    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    # Get the user and apply balance changes based on source
    user = session.get(User, transaction.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    src = getattr(transaction, 'withdrawal_source', None)
    try:
        source_value = src.value if src is not None else WithdrawalSource.ACTIVE_ALLOCATION.value
    except Exception:
        source_value = WithdrawalSource.ACTIVE_ALLOCATION.value

    event_payload_extra: dict[str, Any] = {}

    if source_value == WithdrawalSource.COPY_TRADING_WALLET.value:
        # Ensure wallet is loaded and has sufficient funds
        session.refresh(user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
        wallet = user.copy_trading_wallet
        wallet_balance = float(wallet.balance) if wallet and wallet.balance is not None else 0.0
        if transaction.amount > wallet_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient copy wallet balance. Available: ${wallet_balance:.2f}",
            )
        if wallet is None:
            raise HTTPException(status_code=400, detail="Copy trading wallet not initialized")
        wallet.balance = round(float(wallet.balance or 0.0) - transaction.amount, 2)
        user.wallet_balance = round(float(user.wallet_balance or 0.0) + transaction.amount, 2)
        session.add(wallet)
        session.add(user)
        event_payload_extra["source_wallet"] = "copy_trading_wallet"
    elif source_value == WithdrawalSource.LONG_TERM_WALLET.value:
        # Ensure long term wallet
        session.refresh(user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]
        wallet = user.long_term_wallet
        wallet_balance = float(wallet.balance) if wallet and wallet.balance is not None else 0.0
        if transaction.amount > wallet_balance:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient long-term wallet balance. Available: ${wallet_balance:.2f}",
            )
        if wallet is None:
            raise HTTPException(status_code=400, detail="Long-term wallet not initialized")
        wallet.balance = round(float(wallet.balance or 0.0) - transaction.amount, 2)
        user.wallet_balance = round(float(user.wallet_balance or 0.0) + transaction.amount, 2)
        session.add(wallet)
        session.add(user)
        event_payload_extra["source_wallet"] = "long_term_wallet"
    elif source_value == WithdrawalSource.ACTIVE_ALLOCATION.value:
        if transaction.long_term_investment_id is None:
            raise HTTPException(status_code=400, detail="Missing investment reference for withdrawal")
        investment = session.get(UserLongTermInvestment, transaction.long_term_investment_id)
        if not investment or investment.user_id != user.id:
            raise HTTPException(status_code=404, detail="Associated investment not found")
        available = float(investment.allocation or 0.0)
        if transaction.amount > available:
            raise HTTPException(
                status_code=400,
                detail=f"Requested amount exceeds active allocation. Available: ${available:.2f}",
            )
        new_allocation = round(available - transaction.amount, 2)
        investment.allocation = max(new_allocation, 0.0)
        if investment.allocation <= 0:
            investment.allocation = 0.0
            investment.status = CopyStatus.STOPPED
            investment.investment_due_date = None
        session.add(investment)

        # Adjust user's tracked balances
        current_long_term_balance = float(user.long_term_balance or 0.0)
        user.long_term_balance = max(round(current_long_term_balance - transaction.amount, 2), 0.0)
        user.wallet_balance = round(float(user.wallet_balance or 0.0) + transaction.amount, 2)
        session.add(user)

        # Capture plan metadata for logging
        plan_name = None
        plan_tier = None
        if investment.plan_id:
            plan = session.get(LongTermPlan, investment.plan_id)
            if plan:
                plan_name = plan.name
                plan_tier = plan.tier.value if plan.tier else None
        event_payload_extra.update(
            {
                "source_wallet": "active_allocation",
                "investment_id": str(investment.id),
                "remaining_allocation": investment.allocation,
                "plan_name": plan_name,
                "plan_tier": plan_tier,
            }
        )
    else:
        # Legacy path: allocated copy_trading_balance
        if transaction.amount > (user.copy_trading_balance or 0.0):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient copy balance. Available: ${float(user.copy_trading_balance or 0.0):.2f}",
            )
        user.copy_trading_balance = round(float(user.copy_trading_balance or 0.0) - transaction.amount, 2)
        user.wallet_balance = round(float(user.wallet_balance or 0.0) + transaction.amount, 2)
        session.add(user)
        event_payload_extra["source_wallet"] = "copy_trading_balance"

    # Update transaction status and record event
    try:
        transaction.status = TransactionStatus.COMPLETED
        transaction.executed_at = utc_now()

        await record_execution_event(
            session,
            event_type=ExecutionEventType.MANUAL_ADJUSTMENT,
            description=f"Withdrawal approved: {transaction.description}",
            amount=transaction.amount,
            user_id=transaction.user_id,
            payload={
                "transaction_id": str(transaction.id),
                "type": "withdrawal_approval",
                "copy_balance_reduction": transaction.amount,
                "source": source_value,
                **event_payload_extra,
            },
        )

        session.commit()
        session.refresh(transaction)
    except Exception:
        session.rollback()
        logger.exception(
            "Failed to approve withdrawal",
            extra={"transaction_id": str(transaction.id), "user_id": str(transaction.user_id)},
        )
        raise HTTPException(status_code=500, detail="Failed to approve withdrawal")

    # Send notification to user
    try:
        notify_withdrawal_approved(
            session=session,
            user_id=transaction.user_id,
            amount=transaction.amount,
            transaction_id=str(transaction.id),
        )
    except Exception as e:
        logger.warning(f"Failed to send withdrawal approval notification: {e}")

    return WithdrawalResponse(
        transaction_id=transaction.id,
        status=transaction.status.value,
        amount=transaction.amount,
        description=transaction.description or "",
        created_at=transaction.created_at,
    )


@router.post("/withdrawals/{transaction_id}/reject", response_model=WithdrawalResponse, status_code=200)
async def reject_withdrawal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    transaction_id: uuid.UUID,
    reason: str = "Withdrawal rejected",
) -> WithdrawalResponse:
    """
    Reject a pending withdrawal request.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.transaction_type != TransactionType.WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Not a withdrawal transaction")

    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    # Sanitize reason minimally
    safe_reason = (reason or "Withdrawal rejected").strip()
    if len(safe_reason) > 200:
        safe_reason = safe_reason[:200]

    # Update transaction status and record event
    try:
        transaction.status = TransactionStatus.FAILED
        transaction.executed_at = utc_now()
        transaction.description = f"{transaction.description or 'Withdrawal'} - {safe_reason}"

        await record_execution_event(
            session,
            event_type=ExecutionEventType.MANUAL_ADJUSTMENT,
            description=f"Withdrawal rejected: {safe_reason}",
            amount=-transaction.amount,  # Negative to indicate rejection
            user_id=transaction.user_id,
            payload={
                "transaction_id": str(transaction.id),
                "type": "withdrawal_rejection",
                "reason": safe_reason,
            },
        )

        session.commit()
        session.refresh(transaction)
    except Exception:
        session.rollback()
        logger.exception(
            "Failed to reject withdrawal",
            extra={"transaction_id": str(transaction.id), "user_id": str(transaction.user_id)},
        )
        raise HTTPException(status_code=500, detail="Failed to reject withdrawal")

    # Send notification to user
    try:
        notify_withdrawal_rejected(
            session=session,
            user_id=transaction.user_id,
            amount=transaction.amount,
            transaction_id=str(transaction.id),
            reason=safe_reason,
        )
    except Exception as e:
        logger.warning(f"Failed to send withdrawal rejection notification: {e}")

    return WithdrawalResponse(
        transaction_id=transaction.id,
        status=transaction.status.value,
        amount=transaction.amount,
        description=transaction.description or "",
        created_at=transaction.created_at,
    )
 
