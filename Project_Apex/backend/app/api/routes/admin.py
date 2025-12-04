from __future__ import annotations

from datetime import datetime, timedelta
import uuid
from typing import List, Any, cast

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, select
from sqlalchemy import func, desc

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    KycStatus,
    ExecutionEventType,
    Transaction,
    TransactionStatus,
    TransactionType,
    TraderProfile,
    User,
    UserRole,
)
from app.core.time import utc_now
from app.services.execution_events import record_execution_event
from app.services.trader_simulator import TraderSimulator
from app.services.transactions import finalize_deposit_transaction


class AdminTotals(SQLModel):
    total_users: int
    total_deposits: float
    total_withdrawals: float


class AdminOnlineUser(SQLModel):
    id: uuid.UUID
    email: str
    full_name: str | None = None
    role: str
    account_tier: str | None = None
    last_login_at: datetime | None = None


class AdminKycItem(SQLModel):
    id: uuid.UUID
    email: str
    full_name: str | None = None
    kyc_status: str
    kyc_notes: str | None = None
    kyc_submitted_at: datetime | None = None
    last_login_at: datetime | None = None


class AdminDepositItem(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    amount: float
    status: str
    transaction_type: str
    created_at: datetime
    # Crypto-specific fields
    crypto_network: str | None = None
    crypto_address: str | None = None
    crypto_coin: str | None = None
    crypto_amount: str | None = None
    payment_confirmed_by_user: bool = False
    payment_confirmed_at: datetime | None = None
    address_expires_at: datetime | None = None
    vat_amount: float | None = None


class AdminDashboardSummary(SQLModel):
    totals: AdminTotals
    online_users: List[AdminOnlineUser]
    pending_kyc: List[AdminKycItem]
    pending_deposits: List[AdminDepositItem]


class SimulationTriggerRequest(SQLModel):
    trader_profile_id: uuid.UUID | None = None


class SimulationTriggerResponse(SQLModel):
    trader_trades_created: int
    follower_trades_created: int
    events_recorded: int


class ManualProfitRequest(SQLModel):
    amount: float
    description: str | None = None


class ManualProfitResponse(SQLModel):
    balance: float
    event_id: uuid.UUID


router = APIRouter(prefix="/admin", tags=["admin"])

ONLINE_THRESHOLD_MINUTES = 15


@router.get("/dashboard", response_model=AdminDashboardSummary)
def get_admin_dashboard_summary(
    session: SessionDep, current_user: CurrentUser
) -> AdminDashboardSummary:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    total_users = session.exec(select(func.count()).select_from(User)).one()

    deposit_sum = session.exec(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.transaction_type == TransactionType.DEPOSIT,
            Transaction.status == TransactionStatus.COMPLETED,
        )
    ).one()
    withdrawal_sum = session.exec(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.transaction_type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.COMPLETED,
        )
    ).one()

    totals = AdminTotals(
        total_users=int(total_users or 0),
        total_deposits=float(deposit_sum or 0.0),
        total_withdrawals=float(withdrawal_sum or 0.0),
    )

    threshold = utc_now() - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
    online_users = session.exec(
        select(User)
        .where(cast(Any, User.last_login_at).isnot(None))
        .where(cast(Any, User.last_login_at) >= threshold)
        .order_by(desc(cast(Any, User.last_login_at)))
    ).all()

    online_payload = [
        AdminOnlineUser(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value.lower(),
            account_tier=user.account_tier.value.lower() if user.account_tier else None,
            last_login_at=user.last_login_at,
        )
        for user in online_users
    ]

    pending_kyc_users = session.exec(
        select(User)
        .where(User.kyc_status.in_([KycStatus.PENDING, KycStatus.UNDER_REVIEW]))
        .order_by(User.email)
    ).all()

    pending_kyc_payload = [
        AdminKycItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            kyc_status=user.kyc_status.value.lower(),
            kyc_notes=user.kyc_notes,
            kyc_submitted_at=user.kyc_submitted_at,
            last_login_at=user.last_login_at,
        )
        for user in pending_kyc_users
    ]

    pending_deposit_rows = session.exec(
        select(Transaction, User)
        .join(User, cast(Any, User.id == Transaction.user_id))
        .where(Transaction.transaction_type == TransactionType.DEPOSIT)
        .where(Transaction.status == TransactionStatus.PENDING)
        .order_by(cast(Any, Transaction.created_at))
    ).all()

    pending_deposits_payload = [
        AdminDepositItem(
            id=tx.id,
            user_id=user.id,
            email=user.email,
            amount=tx.amount,
            status=tx.status.value.lower(),
            transaction_type=tx.transaction_type.value.lower(),
            created_at=tx.created_at,
            crypto_network=tx.crypto_network,
            crypto_address=tx.crypto_address,
            crypto_coin=tx.crypto_coin,
            crypto_amount=tx.crypto_amount,
            payment_confirmed_by_user=tx.payment_confirmed_by_user,
            payment_confirmed_at=tx.payment_confirmed_at,
            address_expires_at=tx.address_expires_at,
            vat_amount=tx.vat_amount,
        )
        for tx, user in pending_deposit_rows
    ]

    return AdminDashboardSummary(
        totals=totals,
        online_users=online_payload,
        pending_kyc=pending_kyc_payload,
        pending_deposits=pending_deposits_payload,
    )


@router.post("/simulations/run", response_model=SimulationTriggerResponse)
async def trigger_simulated_trades(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: SimulationTriggerRequest,
) -> SimulationTriggerResponse:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    simulator = TraderSimulator()
    trader_ids = [payload.trader_profile_id] if payload.trader_profile_id else None
    simulation = simulator.simulate_trader_trade(
        session,
        trader_profile_ids=trader_ids,
    )

    events_logged = 0
    profile_cache: dict[uuid.UUID, tuple[str | None, str | None]] = {}
    for record in simulation.follower_trades:
        follower_trade = record.trade
        source_trade = record.source_trade
        events_logged += 1
        trader_display_name: str | None = None
        trader_code: str | None = None
        if source_trade.trader_profile_id:
            cached = profile_cache.get(source_trade.trader_profile_id)
            if cached is None:
                trader_profile = session.get(TraderProfile, source_trade.trader_profile_id)
                if trader_profile is not None:
                    cached = (trader_profile.display_name, trader_profile.trader_code)
                else:
                    cached = (None, None)
                profile_cache[source_trade.trader_profile_id] = cached
            trader_display_name, trader_code = cached

        await record_execution_event(
            session,
            event_type=ExecutionEventType.FOLLOWER_PROFIT,
            description=f"Copy trade {follower_trade.symbol}",
            amount=follower_trade.profit_loss or 0.0,
            user_id=follower_trade.user_id,
            trader_profile_id=source_trade.trader_profile_id,
            payload={
                "trade_id": str(follower_trade.id),
                "source_trade_id": str(source_trade.id),
                "symbol": follower_trade.symbol,
                "side": follower_trade.side.value,
                "profit_loss": follower_trade.profit_loss,
                "volume": follower_trade.volume,
                "trader_display_name": trader_display_name,
                "trader_code": trader_code,
            },
        )

    session.commit()

    return SimulationTriggerResponse(
        trader_trades_created=len(simulation.trader_trades),
        follower_trades_created=len(simulation.follower_trades),
        events_recorded=events_logged,
    )


@router.post(
    "/simulations/users/{user_id}/profit",
    response_model=ManualProfitResponse,
)
async def grant_manual_profit_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
    payload: ManualProfitRequest,
) -> ManualProfitResponse:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    adjustment = round(payload.amount, 2)
    if adjustment == 0:
        raise HTTPException(status_code=400, detail="Adjustment amount must be non-zero")

    user.balance = round((user.balance or 0.0) + adjustment, 2)
    user.wallet_balance = user.balance
    session.add(user)

    transaction = Transaction(
        user_id=user.id,
        amount=adjustment,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.COMPLETED,
        description=payload.description or "Admin balance adjustment",
        created_at=utc_now(),
        executed_at=utc_now(),
    )
    session.add(transaction)

    event = await record_execution_event(
        session,
        event_type=ExecutionEventType.MANUAL_ADJUSTMENT,
        description=payload.description or "Admin balance adjustment",
        amount=adjustment,
        user_id=user.id,
        payload={"origin": "admin-dashboard"},
    )

    session.commit()
    session.refresh(user, attribute_names=["balance"])
    session.refresh(event)

    return ManualProfitResponse(balance=user.balance, event_id=event.id)


class ApproveCryptoDepositRequest(SQLModel):
    transaction_id: uuid.UUID
    admin_notes: str | None = None


class ApproveCryptoDepositResponse(SQLModel):
    transaction_id: uuid.UUID
    user_email: str
    amount_credited: float
    new_balance: float


@router.post("/crypto-deposits/approve", response_model=ApproveCryptoDepositResponse)
def approve_crypto_deposit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: ApproveCryptoDepositRequest,
) -> ApproveCryptoDepositResponse:
    """Admin approves a crypto deposit after verifying on-chain"""
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get transaction
    transaction = session.get(Transaction, payload.transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Validate it's a deposit
    if transaction.transaction_type != TransactionType.DEPOSIT:
        raise HTTPException(status_code=400, detail="Not a deposit transaction")

    # Validate it's pending
    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction already processed with status: {transaction.status.value}",
        )

    # Get user
    user = session.get(User, transaction.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    transaction = finalize_deposit_transaction(
        session=session,
        transaction=transaction,
        notes=payload.admin_notes,
    )

    user = transaction.user or user
    credit_amount = transaction.amount

    return ApproveCryptoDepositResponse(
        transaction_id=transaction.id,
        user_email=user.email,
        amount_credited=credit_amount,
        new_balance=user.balance,
    )


@router.post("/crypto-deposits/{transaction_id}/reject")
def reject_crypto_deposit(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    transaction_id: uuid.UUID,
    reason: str | None = None,
) -> Any:
    """Admin rejects a crypto deposit"""
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get transaction
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Validate it's a deposit
    if transaction.transaction_type != TransactionType.DEPOSIT:
        raise HTTPException(status_code=400, detail="Not a deposit transaction")

    # Validate it's pending
    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction already processed with status: {transaction.status.value}",
        )

    # Update transaction status
    transaction.status = TransactionStatus.FAILED
    transaction.executed_at = utc_now()
    if reason:
        transaction.description = f"{transaction.description} | Rejected: {reason}"

    session.add(transaction)
    session.commit()

    return {"message": "Deposit rejected", "transaction_id": str(transaction.id)}
