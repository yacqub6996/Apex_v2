from __future__ import annotations

import asyncio
import time
import uuid
from calendar import monthrange
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import List, cast

from fastapi import APIRouter, HTTPException, Response
from sqlmodel import SQLModel, select, Field
from enum import Enum

from app.api.deps import CurrentUser, SessionDep
from app.api.routes.errors import LongTermMaximumDepositViolation
from app.models import (
    CopyStatus,
    LongTermPlan,
    LongTermPlanTier,
    LongTermWallet,
    User,
    UserLongTermInvestment,
    LongTermPlanCatalogVersion,
    WithdrawalSource,
)
from app.services.execution_events import record_execution_event
from app.models import Transaction, TransactionStatus, TransactionType, ExecutionEventType
from app.services.long_term import (
    ensure_default_plans,
    projected_plan_allocation,
    current_plan_catalog_version,
)
from app.core.config import settings
from app.core.time import utc_now
from app.services.notification_service import email_withdrawal_requested


class LongTermPlanItem(SQLModel):
    id: uuid.UUID
    name: str
    tier: LongTermPlanTier
    minimum_deposit: float
    maximum_deposit: float | None = None
    description: str | None = None


class LongTermPlanList(SQLModel):
    data: List[LongTermPlanItem]


class LongTermInvestmentItem(SQLModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    plan_name: str
    plan_tier: LongTermPlanTier
    allocation: float
    status: CopyStatus
    started_at: datetime
    investment_due_date: datetime | None = None
    pending_withdrawal_transaction_id: uuid.UUID | None = None
    pending_withdrawal_amount: float | None = None
    early_withdrawal_requested: bool = False
    lock_duration_months: int | None = None


class LongTermInvestmentList(SQLModel):
    data: List[LongTermInvestmentItem]


class SubscribeLongTermRequest(SQLModel):
    plan_id: uuid.UUID
    amount: float
    lock_duration_months: int = Field(default=3, ge=1, le=6)


class SubscribeLongTermResponse(SQLModel):
    success: bool
    long_term_balance: float
    wallet_balance: float
    investment: LongTermInvestmentItem


class WithdrawalRequest(SQLModel):
    amount: float
    description: str | None = "Withdrawal from long-term wallet"


class InvestmentWithdrawalRequest(SQLModel):
    amount: float | None = None
    note: str | None = None
    acknowledge_policy: bool = False


class InvestmentWithdrawalResponse(SQLModel):
    transaction_id: str
    status: str
    amount: float
    early_withdrawal: bool
    review_eta_hours: int = 48


class WalletTransferDirection(str, Enum):
    MAIN_TO_LONG_TERM = "MAIN_TO_LONG_TERM"


class WalletTransferRequest(SQLModel):
    amount: float
    direction: WalletTransferDirection = WalletTransferDirection.MAIN_TO_LONG_TERM
    note: str | None = None


router = APIRouter(prefix="/long-term", tags=["long-term"])

CACHE_CONTROL_HEADER = "no-cache, max-age=0, must-revalidate"


def _apply_plan_catalog_headers(response: Response, version: LongTermPlanCatalogVersion) -> None:
    response.headers["X-Long-Term-Plan-Version"] = str(version.version)
    response.headers["X-Long-Term-Plan-Updated-At"] = version.updated_at.isoformat()
    response.headers["Cache-Control"] = CACHE_CONTROL_HEADER


_long_term_deposit_rate_limit_lock = asyncio.Lock()
_long_term_deposit_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


async def _enforce_long_term_deposit_rate_limit(user_id: uuid.UUID) -> None:
    """Throttle repeated long-term deposit attempts per user."""

    if not settings.LONG_TERM_DEPOSIT_RATE_LIMIT_ENABLED:
        return

    window = max(1, settings.LONG_TERM_DEPOSIT_RATE_LIMIT_WINDOW_SECONDS)
    limit = max(1, settings.LONG_TERM_DEPOSIT_RATE_LIMIT_MAX_ATTEMPTS)
    identifier = str(user_id)
    now = time.monotonic()

    async with _long_term_deposit_rate_limit_lock:
        bucket = _long_term_deposit_rate_limit_buckets[identifier]
        cutoff = now - window
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(int(bucket[0] + window - now), 0)
            raise HTTPException(
                status_code=429,
                detail="Too many long-term deposit attempts. Try again soon.",
                headers={
                    "Retry-After": str(retry_after),
                    "X-Error-Code": "LONG_TERM_DEPOSIT_RATE_LIMIT",
                },
            )
        bucket.append(now)


def _add_months(dt: datetime, months: int) -> datetime:
    """Return datetime advanced by N calendar months, clamping to month end."""
    target_month = dt.month - 1 + months
    target_year = dt.year + target_month // 12
    target_month = target_month % 12 + 1
    last_day = monthrange(target_year, target_month)[1]
    day = min(dt.day, last_day)
    return dt.replace(year=target_year, month=target_month, day=day)


def _ensure_long_term_wallet(session: SessionDep, user: User, *, create: bool = False) -> LongTermWallet | None:
    wallet = user.long_term_wallet
    if wallet:
        return wallet
    wallet = (
        session.exec(select(LongTermWallet).where(LongTermWallet.user_id == user.id)).one_or_none()
    )
    if wallet:
        user.long_term_wallet = wallet
        return wallet
    if create:
        wallet = LongTermWallet(user_id=user.id, balance=0.0)
        session.add(wallet)
        session.flush()
        user.long_term_wallet = wallet
        return wallet
    return None


def _set_long_term_wallet_balance(user: User, wallet: LongTermWallet, new_balance: float) -> None:
    wallet.balance = round(new_balance, 2)
    user.long_term_wallet = wallet


def _plan_allocation_within_limit(plan: LongTermPlan, allocation: float, *, action: str) -> None:
    limit = plan.maximum_deposit
    if limit is not None and allocation > limit:
        detail = f"Attempted {action} would exceed the plan maximum allocation of {limit:.2f}"
        raise LongTermMaximumDepositViolation(detail=detail)


def _ensure_plan_total_within_limit(
    session: SessionDep, plan: LongTermPlan, addition: float, *, action: str
) -> None:
    limit = plan.maximum_deposit
    if limit is None:
        return

    addition = round(addition, 2)
    current_total, projected_total = projected_plan_allocation(
        session, plan_id=plan.id, additional=addition, lock=True
    )

    if projected_total > limit:
        detail = (
            f"{action.capitalize()} would push the {plan.name} plan past its maximum allocation of {limit:.2f} "
            f"(currently allocated {current_total:.2f}, attempted addition {addition:.2f})."
        )
        raise LongTermMaximumDepositViolation(detail=detail)


@router.get("/plans", response_model=LongTermPlanList)
def list_long_term_plans(
    *, session: SessionDep, current_user: CurrentUser, response: Response
) -> LongTermPlanList:
    """Return the available long-term plans. Plans are auto-seeded if missing."""

    plans = ensure_default_plans(session)
    plan_version = current_plan_catalog_version(session)
    _apply_plan_catalog_headers(response, plan_version)

    return LongTermPlanList(
        data=[
            LongTermPlanItem(
                id=plan.id,
                name=plan.name,
                tier=plan.tier or LongTermPlanTier.FOUNDATION,
                minimum_deposit=plan.minimum_deposit,
                maximum_deposit=plan.maximum_deposit,
                description=plan.description,
            )
            for plan in plans
        ]
    )


@router.get("/plans/public", response_model=LongTermPlanList)
def list_public_long_term_plans(*, session: SessionDep, response: Response) -> LongTermPlanList:
    """Return the available long-term plans without requiring authentication."""

    plans = ensure_default_plans(session)
    plan_version = current_plan_catalog_version(session)
    _apply_plan_catalog_headers(response, plan_version)

    return LongTermPlanList(
        data=[
            LongTermPlanItem(
                id=plan.id,
                name=plan.name,
                tier=plan.tier or LongTermPlanTier.FOUNDATION,
                minimum_deposit=plan.minimum_deposit,
                maximum_deposit=plan.maximum_deposit,
                description=plan.description,
            )
            for plan in plans
        ]
    )


@router.get("/investments", response_model=LongTermInvestmentList)
def list_long_term_investments(
    *, session: SessionDep, current_user: CurrentUser
) -> LongTermInvestmentList:
    """Return the current user's long-term plan allocations."""

    pending_by_investment: dict[uuid.UUID, Transaction] = {}
    try:
        pending_transactions = session.exec(
            select(Transaction)
            .where(Transaction.user_id == current_user.id)
            .where(Transaction.transaction_type == TransactionType.WITHDRAWAL)
            .where(Transaction.status == TransactionStatus.PENDING)
            .where(Transaction.withdrawal_source == WithdrawalSource.ACTIVE_ALLOCATION)
        ).all()
        for tx in pending_transactions:
            if getattr(tx, "long_term_investment_id", None):
                long_term_inv_id = getattr(tx, "long_term_investment_id", None)
                if long_term_inv_id is not None:
                    pending_by_investment[long_term_inv_id] = tx
    except Exception:
        pending_by_investment = {}

    investments = session.exec(
        select(UserLongTermInvestment).where(UserLongTermInvestment.user_id == current_user.id)
    ).all()

    response_items: list[LongTermInvestmentItem] = []
    for investment in investments:
        plan = session.get(LongTermPlan, investment.plan_id)
        if plan is None:
            # Plan was removed; skip but keep allocation information accessible
            plan_name = "Archived Plan"
            plan_tier = LongTermPlanTier.FOUNDATION
        else:
            plan_name = plan.name
            plan_tier = plan.tier

        pending_tx = pending_by_investment.get(investment.id)

        lock_duration_months: int | None = None
        if investment.investment_due_date:
            delta_days = (investment.investment_due_date - investment.started_at).days
            lock_duration_months = max(1, round(delta_days / 30)) if delta_days > 0 else 1

        response_items.append(
            LongTermInvestmentItem(
                id=investment.id,
                plan_id=investment.plan_id,
                plan_name=plan_name,
                plan_tier=plan_tier or LongTermPlanTier.FOUNDATION,
                allocation=investment.allocation,
                status=investment.status,
                started_at=investment.started_at,
                investment_due_date=investment.investment_due_date,
                pending_withdrawal_transaction_id=pending_tx.id if pending_tx else None,
                pending_withdrawal_amount=float(pending_tx.amount) if pending_tx else None,
                early_withdrawal_requested=bool(pending_tx),
                lock_duration_months=lock_duration_months,
            )
        )

    return LongTermInvestmentList(data=response_items)


@router.post("/investments", response_model=SubscribeLongTermResponse)
async def subscribe_to_long_term_plan(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: SubscribeLongTermRequest,
) -> SubscribeLongTermResponse:
    """Allocate funds from wallet into a managed long-term plan."""

    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    await _enforce_long_term_deposit_rate_limit(current_user.id)
    amount = round(payload.amount, 2)

    plan_stmt = select(LongTermPlan).where(LongTermPlan.id == payload.plan_id).with_for_update()
    plan = session.exec(plan_stmt).one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if amount < plan.minimum_deposit:
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be at least {plan.minimum_deposit:.2f} for the selected plan",
        )
    _plan_allocation_within_limit(plan, amount, action="initial allocation")
    _ensure_plan_total_within_limit(session, plan, amount, action="initial allocation")

    user = session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use main wallet funds (legacy-compatible); create long_term_wallet lazily
    session.refresh(user, attribute_names=["wallet_balance"])  # type: ignore[arg-type]
    main_available = float(user.wallet_balance or user.balance or 0.0)
    long_term_wallet = _ensure_long_term_wallet(session, user)
    long_term_wallet_balance = float(long_term_wallet.balance if long_term_wallet else 0.0)
    using_long_term_wallet = long_term_wallet_balance >= amount

    if not using_long_term_wallet and amount > main_available:
        raise HTTPException(status_code=400, detail="Insufficient main wallet balance for allocation")

    if using_long_term_wallet:
        wallet = _ensure_long_term_wallet(session, user, create=True)
        if wallet is None:
            raise HTTPException(status_code=500, detail="Failed to initialize long-term wallet")
        new_long_wallet_balance = round(long_term_wallet_balance - amount, 2)
        _set_long_term_wallet_balance(user, wallet, new_long_wallet_balance)
        session.add(wallet)
        long_term_wallet = wallet

    existing_active = session.exec(
        select(UserLongTermInvestment)
        .where(UserLongTermInvestment.user_id == current_user.id)
        .where(UserLongTermInvestment.plan_id == plan.id)
        .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
    ).first()
    if existing_active:
        raise HTTPException(status_code=400, detail="An active allocation for this plan already exists")

    lock_duration_months = max(1, min(6, payload.lock_duration_months))
    locked_until = _add_months(utc_now(), lock_duration_months)

    investment = UserLongTermInvestment(
        user_id=current_user.id,
        plan_id=plan.id,
        allocation=amount,
        status=CopyStatus.ACTIVE,
        investment_due_date=locked_until,
    )

    transaction_source = "LONG_TERM_WALLET" if using_long_term_wallet else "MAIN_WALLET"
    if not using_long_term_wallet:
        new_main_balance = round(main_available - amount, 2)
        user.wallet_balance = new_main_balance
        user.balance = new_main_balance
    user.long_term_balance = round((user.long_term_balance or 0.0) + amount, 2)

    session.add(investment)
    session.add(user)
    session.commit()
    session.refresh(user)
    session.refresh(investment)
    if user.long_term_wallet:
        session.refresh(user.long_term_wallet)

    # Record transaction and execution event
    tx = Transaction(
        user_id=user.id,
        amount=amount,
        transaction_type=TransactionType.ADJUSTMENT,
        status=TransactionStatus.COMPLETED,
        description="long_term_initial_investment",
        executed_at=utc_now(),
        long_term_investment_id=investment.id,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)
    # Event
    await record_execution_event(
        session,
        event_type=cast(ExecutionEventType, ExecutionEventType.MANUAL_ADJUSTMENT),
        description=f"Long-term: Initial investment into {plan.name}",
        amount=amount,
        user_id=user.id,
        payload={
            "service": "LONG_TERM",
            "plan_id": str(plan.id),
            "investment_id": str(investment.id),
            "action": "INVEST",
            "source": transaction_source,
        },
    )

    return SubscribeLongTermResponse(
        success=True,
        long_term_balance=user.long_term_balance,
        wallet_balance=user.wallet_balance,
        investment=LongTermInvestmentItem(
            id=investment.id,
            plan_id=plan.id,
            plan_name=plan.name,
            plan_tier=plan.tier or LongTermPlanTier.FOUNDATION,
            allocation=investment.allocation,
            status=investment.status,
            started_at=investment.started_at,
            investment_due_date=investment.investment_due_date,
            lock_duration_months=lock_duration_months,
        ),
    )


@router.post("/request-withdrawal")
async def request_long_term_withdrawal(
    *, session: SessionDep, current_user: CurrentUser, payload: WithdrawalRequest
) -> dict:
    # KYC gate: withdrawals require APPROVED status
    try:
        from app.models import KycStatus
        if current_user.kyc_status != KycStatus.APPROVED:
            raise HTTPException(status_code=403, detail="Withdrawals require KYC approval")
    except Exception:
        if getattr(current_user, "kyc_status", None) not in ("APPROVED",):
            raise HTTPException(status_code=403, detail="Withdrawals require KYC approval")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be positive")

    # Ensure wallet exists
    session.refresh(current_user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]
    wallet = current_user.long_term_wallet
    if wallet is None:
        raise HTTPException(status_code=400, detail="Long-term wallet not initialized")
    balance = float(wallet.balance) if wallet.balance is not None else 0.0
    if payload.amount > balance:
        raise HTTPException(status_code=400, detail=f"Insufficient long-term wallet balance. Available: ${balance:.2f}")

    # Reserve the funds immediately so API consumers see the updated balance and pending amount.
    new_balance = round(balance - payload.amount, 2)
    _set_long_term_wallet_balance(current_user, wallet, new_balance)
    current_user.long_term_balance = round(
        max(0.0, (current_user.long_term_balance or 0.0) - payload.amount),
        2,
    )
    session.add(wallet)
    session.add(current_user)

    # Create pending withdrawal transaction (no funds moved yet)
    tx = Transaction(
        user_id=current_user.id,
        amount=round(payload.amount, 2),
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description=payload.description or "Withdrawal from long-term wallet",
        executed_at=None,
        withdrawal_source=WithdrawalSource.LONG_TERM_WALLET,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)
    try:
        email_withdrawal_requested(
            session=session,
            user_id=current_user.id,
            amount=float(tx.amount or 0.0),
            source="Long-term wallet",
        )
    except Exception:
        pass
    return {"transaction_id": str(tx.id), "status": tx.status.value}


@router.post("/wallet/transfer")
async def transfer_long_term_wallet(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: WalletTransferRequest,
) -> dict:
    """Transfer funds from the main wallet into the long-term wallet."""

    if payload.direction != WalletTransferDirection.MAIN_TO_LONG_TERM:
        raise HTTPException(status_code=400, detail="Only MAIN_TO_LONG_TERM transfers are supported.")

    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be greater than zero.")

    user = session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    main_balance = float(user.wallet_balance or 0.0)
    if payload.amount > main_balance:
        raise HTTPException(status_code=400, detail="Insufficient main wallet balance.")

    session.refresh(user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]
    if user.long_term_wallet is None:
        from app.models import LongTermWallet  # local import to avoid circulars

        user.long_term_wallet = LongTermWallet(user_id=user.id, balance=0.0)
        session.add(user.long_term_wallet)
        session.commit()
        session.refresh(user)
        session.refresh(user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]

    long_balance = float(user.long_term_wallet.balance or 0.0)
    new_main = round(main_balance - payload.amount, 2)
    new_long = round(long_balance + payload.amount, 2)

    user.wallet_balance = new_main
    user.long_term_wallet.balance = new_long
    session.add(user)
    session.add(user.long_term_wallet)

    tx = Transaction(
        user_id=user.id,
        amount=round(payload.amount, 2),
        transaction_type=TransactionType.ADJUSTMENT,
        status=TransactionStatus.COMPLETED,
        description="long_term_wallet_transfer",
        executed_at=utc_now(),
        long_term_investment_id=None,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)

    await record_execution_event(
        session,
        event_type=cast(ExecutionEventType, ExecutionEventType.MANUAL_ADJUSTMENT),
        description="Transferred funds to Long-Term Wallet",
        amount=round(payload.amount, 2),
        user_id=user.id,
        payload={
            "service": "LONG_TERM",
            "action": "MAIN_TO_LONG_TERM_WALLET",
            "note": payload.note,
        },
    )

    # Ensure all relationships are properly loaded for consistent response
    session.expunge_all()
    user = session.get(User, current_user.id)
    if user:
        session.refresh(user)
        session.refresh(user, attribute_names=["long_term_wallet", "copy_trading_wallet"])  # type: ignore[arg-type]

    return {
        "wallet_balance": user.wallet_balance if user else 0.0,
        "long_term_wallet_balance": user.long_term_wallet.balance if user and user.long_term_wallet else 0.0,
        "copy_trading_wallet_balance": user.copy_trading_wallet.balance if user and user.copy_trading_wallet else 0.0,
        "copy_trading_balance": user.copy_trading_balance if user else 0.0,
        "long_term_balance": user.long_term_balance if user else 0.0,
        "transaction_id": str(tx.id),
        "status": tx.status.value,
        "direction": payload.direction.value,
    }


@router.post(
    "/investments/{investment_id}/request-withdrawal",
)
async def request_withdrawal_from_active_investment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    investment_id: uuid.UUID,
    payload: InvestmentWithdrawalRequest,
) -> dict:
    """Create a pending withdrawal request for an active long-term allocation."""

    investment = session.get(UserLongTermInvestment, investment_id)
    if not investment or investment.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Investment not found")

    plan = session.get(LongTermPlan, investment.plan_id)
    plan_name = plan.name if plan else "Long-term plan"

    amount = float(payload.amount) if payload.amount is not None else float(investment.allocation or 0.0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be greater than zero")
    if amount > float(investment.allocation or 0.0):
        raise HTTPException(status_code=400, detail="Amount exceeds current allocation")

    now = utc_now()
    # Handle timezone-aware comparison: investment_due_date might be naive, so convert to aware if needed
    due_date = investment.investment_due_date
    if due_date and due_date.tzinfo is None:
        # If naive, assume UTC
        due_date = due_date.replace(tzinfo=timezone.utc)
    early_withdrawal = bool(due_date and due_date > now)
    if early_withdrawal and not payload.acknowledge_policy:
        raise HTTPException(
            status_code=400,
            detail="You must acknowledge early withdrawal policies before proceeding.",
        )

    # Prevent duplicate pending requests for the same investment
    existing_pending = session.exec(
        select(Transaction)
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.transaction_type == TransactionType.WITHDRAWAL)
        .where(Transaction.status == TransactionStatus.PENDING)
        .where(Transaction.withdrawal_source == WithdrawalSource.ACTIVE_ALLOCATION)
        .where(Transaction.long_term_investment_id == investment.id)
    ).first()
    if existing_pending:
        raise HTTPException(status_code=400, detail="A withdrawal request for this investment is already pending")

    description_parts = [f"Long-term investment withdrawal ({plan_name})"]
    if early_withdrawal:
        description_parts.append("Early withdrawal - fees per policy")
    if payload.note:
        description_parts.append(payload.note.strip())
    description = " | ".join(description_parts)

    tx = Transaction(
        user_id=current_user.id,
        amount=round(amount, 2),
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description=description,
        executed_at=None,
        withdrawal_source=WithdrawalSource.ACTIVE_ALLOCATION,
        long_term_investment_id=investment.id,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)
    try:
        email_withdrawal_requested(
            session=session,
            user_id=current_user.id,
            amount=float(tx.amount or 0.0),
            source="Long-term allocation",
        )
    except Exception:
        pass

    return {
        "transaction_id": str(tx.id),
        "status": tx.status.value,
        "amount": float(tx.amount or 0.0),
        "early_withdrawal": early_withdrawal,
        "review_eta_hours": 48,
    }


class IncreaseEquityRequest(SQLModel):
    user_investment_id: uuid.UUID
    amount: float


class UpgradePlanRequest(SQLModel):
    user_investment_id: uuid.UUID
    new_plan_id: uuid.UUID


@router.post("/investments/increase-equity", response_model=SubscribeLongTermResponse)
async def increase_equity(
    *, session: SessionDep, current_user: CurrentUser, payload: IncreaseEquityRequest
) -> SubscribeLongTermResponse:
    # KYC gate: long-term allocations require APPROVED status
    try:
        from app.models import KycStatus
        if current_user.kyc_status != KycStatus.APPROVED:
            raise HTTPException(status_code=403, detail="KYC approval required for long-term allocations")
    except Exception:
        if getattr(current_user, "kyc_status", None) not in ("APPROVED",):
            raise HTTPException(status_code=403, detail="KYC approval required for long-term allocations")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")
    await _enforce_long_term_deposit_rate_limit(current_user.id)
    addition = round(payload.amount, 2)
    user = session.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.refresh(user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]
    if user.long_term_wallet is None:
        raise HTTPException(status_code=400, detail="Long-term wallet not initialized")
    if (user.long_term_wallet.balance or 0.0) < addition:
        raise HTTPException(status_code=400, detail="Insufficient long-term wallet balance")
    inv = session.get(UserLongTermInvestment, payload.user_investment_id)
    if not inv or inv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Investment not found")
    plan_stmt = select(LongTermPlan).where(LongTermPlan.id == inv.plan_id).with_for_update()
    plan = session.exec(plan_stmt).one_or_none()

    projected_allocation = float(inv.allocation or 0.0) + addition
    if plan:
        _plan_allocation_within_limit(plan, projected_allocation, action="increase equity")
        _ensure_plan_total_within_limit(session, plan, addition, action="increase equity")

    inv.allocation = round(inv.allocation + addition, 2)
    user.long_term_wallet.balance = round(float(user.long_term_wallet.balance or 0.0) - addition, 2)
    user.long_term_balance = round(float(user.long_term_balance or 0.0) + addition, 2)
    session.add(inv)
    session.add(user)
    session.add(user.long_term_wallet)

    # Transaction and event
    tx = Transaction(
        user_id=user.id,
        amount=addition,
        transaction_type=TransactionType.ADJUSTMENT,
        status=TransactionStatus.COMPLETED,
        description="long_term_increase_equity",
        executed_at=utc_now(),
        long_term_investment_id=inv.id,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)

    await record_execution_event(
        session,
        event_type=cast(ExecutionEventType, ExecutionEventType.MANUAL_ADJUSTMENT),
        description=f"Long-term: Added funds to {plan.name if plan else inv.plan_id}",
        amount=addition,
        user_id=user.id,
        payload={
            "service": "LONG_TERM",
            "plan_id": str(inv.plan_id),
            "investment_id": str(inv.id),
            "action": "INCREASE_EQUITY",
        },
    )

    session.refresh(inv)
    session.refresh(user)
    if plan is None:
        plan_name = "Archived Plan"
        plan_tier = LongTermPlanTier.FOUNDATION
    else:
        plan_name = plan.name
        plan_tier = plan.tier

    return SubscribeLongTermResponse(
        success=True,
        long_term_balance=user.long_term_balance,
        wallet_balance=user.wallet_balance,
        investment=LongTermInvestmentItem(
            id=inv.id,
            plan_id=inv.plan_id,
            plan_name=plan_name,
            plan_tier=plan_tier or LongTermPlanTier.FOUNDATION,
            allocation=inv.allocation,
            status=inv.status,
            started_at=inv.started_at,
            investment_due_date=inv.investment_due_date,
            lock_duration_months=(
                max(1, round((inv.investment_due_date - inv.started_at).days / 30))
                if inv.investment_due_date
                else None
            ),
        ),
    )


@router.post("/investments/upgrade-plan", response_model=SubscribeLongTermResponse)
async def upgrade_plan(
    *, session: SessionDep, current_user: CurrentUser, payload: UpgradePlanRequest
) -> SubscribeLongTermResponse:
    """Deprecated endpoint retained for backward compatibility."""
    raise HTTPException(status_code=410, detail="Plan upgrades are no longer supported")


__all__ = [
    "router",
    "list_long_term_plans",
    "list_long_term_investments",
    "subscribe_to_long_term_plan",
    "request_long_term_withdrawal",
    "transfer_long_term_wallet",
    "request_withdrawal_from_active_investment",
    "increase_equity",
]
