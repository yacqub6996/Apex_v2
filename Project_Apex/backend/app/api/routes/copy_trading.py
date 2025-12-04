"""Copy trading API endpoints for managing trader verification and copy relationships."""

from __future__ import annotations

import asyncio
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any, cast

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from jwt import InvalidTokenError
from pydantic import ValidationError, computed_field
from sqlmodel import SQLModel, Session, func, select, col
from sqlalchemy import desc

from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.db import engine
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    ExecutionEvent,
    ExecutionEventType,
    RiskTolerance,
    TokenPayload,
    TraderProfile,
    Transaction,
    TransactionStatus,
    TransactionType,
    User,
    UserTraderCopy,
    WithdrawalSource,
)
from app.services.notification_service import (
    email_wallet_transfer,
    email_withdrawal_requested,
    notify_copy_relationship_started,
    notify_copy_relationship_status_changed,
)

router = APIRouter(prefix="/copy-trading", tags=["copy-trading"])


def _extract_specialty(trading_strategy: str | None) -> str:
    if not trading_strategy:
        return "General"

    parts = trading_strategy.strip().split()
    if not parts:
        return "General"

    return parts[0].capitalize()


def _format_performance(trader: TraderProfile) -> tuple[str, str]:
    metrics = trader.performance_metrics or {}
    win_rate = metrics.get("win_rate")
    avg_return = trader.average_monthly_return or metrics.get("average_return_per_trade")

    win_rate_str = f"{float(win_rate):.0f}%" if win_rate is not None else "N/A"

    if avg_return is None:
        total_profit = metrics.get("total_profit_loss")
        if total_profit is not None:
            performance_str = f"{float(total_profit):+.2f}"
        else:
            performance_str = "N/A"
    else:
        performance_str = f"{float(avg_return):+.2f}%"

    return performance_str, win_rate_str


def _normalize_trader_code(trader_code: str | None) -> str | None:
    if trader_code is None:
        return None
    normalized = trader_code.strip().upper()
    return normalized or None


def _build_trader_summary(trader: TraderProfile) -> "TraderSummary":
    performance, win_rate = _format_performance(trader)

    stored_code = _normalize_trader_code(trader.trader_code)
    trader_code = stored_code or str(trader.id).replace("-", "").upper()[:8]

    display_name = (
        trader.display_name
        or (
            trader.user.full_name
            if isinstance(trader.user, User) and trader.user.full_name
            else f"Trader {trader_code}"
        )
    )
    specialty = _extract_specialty(trader.trading_strategy)

    return TraderSummary(
        id=trader.id,
        trader_code=trader_code,
        display_name=display_name,
        specialty=specialty,
        risk_level=trader.risk_tolerance,
        performance=performance,
        win_rate=win_rate,
        avatar_url=trader.avatar_url,
    )


def _find_trader_by_code(session: SessionDep, trader_code: str) -> TraderProfile | None:
    normalized = _normalize_trader_code(trader_code)
    if not normalized:
        return None

    statement = select(TraderProfile).where(TraderProfile.trader_code == normalized)
    trader = session.exec(statement).first()
    if trader:
        session.refresh(trader, attribute_names=["user"])
    return trader


def _build_copied_trader(copy: UserTraderCopy) -> "CopiedTraderSummary":
    if copy.trader_profile is None:
        raise HTTPException(status_code=500, detail="Associated trader profile not loaded")

    summary = _build_trader_summary(copy.trader_profile)
    return CopiedTraderSummary(
        **summary.dict(),
        copy_id=copy.id,
        allocation=copy.copy_amount,
        status=copy.copy_status,
    )

def _record_balance_delta(
    session: SessionDep,
    *,
    user_id: uuid.UUID,
    amount: float,
    description: str,
) -> None:
    transaction = Transaction(
        user_id=user_id,
        amount=round(amount, 2),
        transaction_type=TransactionType.ADJUSTMENT,
        status=TransactionStatus.COMPLETED,
        description=description,
        executed_at=utc_now(),
    )
    session.add(transaction)



class TraderSummary(SQLModel):
    id: uuid.UUID
    trader_code: str
    display_name: str
    specialty: str
    risk_level: RiskTolerance
    performance: str
    win_rate: str
    avatar_url: str | None = None

    @computed_field(return_type=str, alias="traderCode")
    def trader_code_camel(self) -> str:
        return self.trader_code

    @computed_field(return_type=str, alias="displayName")
    def display_name_camel(self) -> str:
        return self.display_name

    @computed_field(return_type=str, alias="riskLevel")
    def risk_level_camel(self) -> str:
        value = getattr(self.risk_level, 'value', None)
        return value if value is not None else str(self.risk_level)

    @computed_field(return_type=str, alias="winRate")
    def win_rate_camel(self) -> str:
        return self.win_rate


class TraderVerificationRequest(SQLModel):
    trader_code: str


class TraderVerificationResponse(SQLModel):
    valid: bool
    trader: TraderSummary | None = None
    message: str | None = None


class CopyTradingStartRequest(SQLModel):
    trader_id: uuid.UUID | None = None
    trader_code: str | None = None
    allocation_amount: float


class CopyTradingStartResponse(SQLModel):
    success: bool
    message: str
    available_balance: float
    copied_trader: CopiedTraderSummary | None = None


class CopiedTraderSummary(TraderSummary):
    copy_id: uuid.UUID
    allocation: float
    status: CopyStatus


class CopiedTradersResponse(SQLModel):
    data: list[CopiedTraderSummary]
    count: int


class CopyTradingPositionSummary(CopiedTraderSummary):
    total_profit: float
    roi_percentage: float
    session_trade_count: int
    session_win_rate: float


class CopyTradingSummaryResponse(SQLModel):
    wallet_balance: float
    copy_trading_wallet_balance: float
    total_allocation: float
    total_profit: float
    copy_trading_roi_percentage: float
    active_positions: int
    paused_positions: int
    stopped_positions: int
    positions: list[CopyTradingPositionSummary]


class FundWalletRequest(SQLModel):
    amount: float


class FundWalletResponse(SQLModel):
    success: bool
    message: str
    wallet_balance: float
    copy_trading_wallet_balance: float


class PartialReduceRequest(SQLModel):
    amount: float


class ExecutionFeedEvent(SQLModel):
    id: uuid.UUID
    event_type: ExecutionEventType
    description: str
    amount: float
    symbol: str | None = None
    trader_display_name: str | None = None
    trader_code: str | None = None
    created_at: datetime

    @computed_field(return_type=str, alias="eventType")
    def event_type_camel(self) -> str:
        return getattr(self.event_type, "value", str(self.event_type))

    @computed_field(return_type=str | None, alias="traderDisplayName")
    def trader_display_name_camel(self) -> str | None:
        return self.trader_display_name

    @computed_field(return_type=str | None, alias="traderCode")
    def trader_code_camel(self) -> str | None:
        return self.trader_code

    @computed_field(return_type=str, alias="createdAt")
    def created_at_iso(self) -> str:
        return self.created_at.isoformat()


class ExecutionFeedResponse(SQLModel):
    data: list[ExecutionFeedEvent]
    count: int
    latest_cursor: datetime | None = None

    @computed_field(return_type=str | None, alias="latestCursor")
    def latest_cursor_iso(self) -> str | None:
        return self.latest_cursor.isoformat() if self.latest_cursor else None



DEFAULT_EXECUTION_POLL_SECONDS = 2.0
MAX_BUFFERED_EXECUTION_IDS = 400


def _normalize_cursor(cursor: datetime | None) -> datetime | None:
    if cursor is None:
        return None
    if cursor.tzinfo is None:
        return cursor.replace(tzinfo=timezone.utc)
    return cursor.astimezone(timezone.utc)


def _resolve_poll_interval(raw_value: str | None) -> float:
    try:
        value = float(raw_value) if raw_value is not None else None
    except (TypeError, ValueError):
        value = None
    if value is None:
        return DEFAULT_EXECUTION_POLL_SECONDS
    return max(0.5, min(value, 10.0))


def _serialize_execution_event(
    session: Session,
    event: ExecutionEvent,
    profile_cache: dict[uuid.UUID, tuple[str | None, str | None]],
) -> ExecutionFeedEvent:
    trader_display_name: str | None = None
    trader_code: str | None = None

    if event.trader_profile_id:
        cached = profile_cache.get(event.trader_profile_id)
        if cached is None:
            trader_profile = session.get(TraderProfile, event.trader_profile_id)
            if trader_profile is not None:
                cached = (trader_profile.display_name, trader_profile.trader_code)
            else:
                cached = (None, None)
            profile_cache[event.trader_profile_id] = cached
        trader_display_name, trader_code = cached

    payload = event.payload or {}
    if trader_display_name is None:
        name_value = payload.get("trader_display_name")
        if isinstance(name_value, str):
            trader_display_name = name_value
    if trader_code is None:
        code_value = payload.get("trader_code")
        if isinstance(code_value, str):
            trader_code = code_value

    symbol_value = payload.get("symbol")
    symbol = symbol_value if isinstance(symbol_value, str) else None

    return ExecutionFeedEvent(
        id=event.id,
        event_type=event.event_type,
        description=event.description,
        amount=float(event.amount or 0.0),
        symbol=symbol,
        trader_display_name=trader_display_name,
        trader_code=trader_code,
        created_at=event.created_at,
    )


class CopyTradingUpdateResponse(SQLModel):
    success: bool
    message: str
    available_balance: float
    copied_trader: CopiedTraderSummary


class CopyTradingWithdrawalRequest(SQLModel):
    amount: float
    description: str | None = "Withdrawal from copy trading wallet"


class CopyTradingWithdrawalResponse(SQLModel):
    transaction_id: uuid.UUID
    status: str
    amount: float
    description: str | None
    created_at: datetime


class CopyTradingAggregateResponse(SQLModel):
    active: int
    paused: int
    stopped: int


@router.get("/user-summary", response_model=CopyTradingSummaryResponse)
def get_copy_trading_user_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> CopyTradingSummaryResponse:
    """Return per-user copy-trading allocation and PnL summary.

    This endpoint is user-scoped and complements the admin-level /summary endpoint.
    """

    # Ensure wallet balances are loaded
    session.refresh(current_user, attribute_names=["wallet_balance", "copy_trading_wallet"])  # type: ignore[arg-type]
    wallet_balance = float(current_user.wallet_balance or current_user.balance or 0.0)
    copy_trading_wallet_balance = (
        float(current_user.copy_trading_wallet.balance or 0.0)
        if current_user.copy_trading_wallet is not None
        else 0.0
    )

    # Load all copy relationships for the user
    statement = select(UserTraderCopy).where(UserTraderCopy.user_id == current_user.id)
    copies = session.exec(statement).all()

    positions: list[CopyTradingPositionSummary] = []
    total_allocation = 0.0
    total_profit = 0.0
    active_positions = 0
    paused_positions = 0
    stopped_positions = 0

    for copy in copies:
        # Status tallies
        if copy.copy_status == CopyStatus.ACTIVE:
            active_positions += 1
        elif copy.copy_status == CopyStatus.PAUSED:
            paused_positions += 1
        elif copy.copy_status == CopyStatus.STOPPED:
            stopped_positions += 1

        allocation = float(copy.copy_amount or 0.0)

        # Ensure trader profile is loaded for summary building
        session.refresh(copy, attribute_names=["trader_profile"])  # type: ignore[arg-type]
        if copy.trader_profile is None:
            continue
        session.refresh(copy.trader_profile, attribute_names=["user"])  # type: ignore[arg-type]

        # Per-relationship performance from execution events, scoped to this copy session.
        # We treat "trades" as FOLLOWER_PROFIT events for this user/trader
        # since the copy started.
        profit_stmt = (
            select(func.coalesce(func.sum(ExecutionEvent.amount), 0.0))
            .where(ExecutionEvent.user_id == current_user.id)
            .where(ExecutionEvent.trader_profile_id == copy.trader_profile_id)
            .where(ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT)
            .where(ExecutionEvent.created_at >= copy.copy_started_at)
        )
        position_profit = float(session.exec(profit_stmt).one() or 0.0)

        trades_stmt = (
            select(func.count())
            .where(ExecutionEvent.user_id == current_user.id)
            .where(ExecutionEvent.trader_profile_id == copy.trader_profile_id)
            .where(ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT)
            .where(ExecutionEvent.created_at >= copy.copy_started_at)
        )
        trade_count = int(session.exec(trades_stmt).one() or 0)

        wins_stmt = (
            select(func.count())
            .where(ExecutionEvent.user_id == current_user.id)
            .where(ExecutionEvent.trader_profile_id == copy.trader_profile_id)
            .where(ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT)
            .where(ExecutionEvent.created_at >= copy.copy_started_at)
            .where(ExecutionEvent.amount > 0)
        )
        wins = int(session.exec(wins_stmt).one() or 0)
        session_win_rate = (wins / trade_count * 100.0) if trade_count > 0 else 0.0

        roi_percentage = (position_profit / allocation * 100.0) if allocation > 0 else 0.0

        trader_summary = _build_trader_summary(copy.trader_profile)
        position = CopyTradingPositionSummary(
            **trader_summary.dict(),
            copy_id=copy.id,
            allocation=allocation,
            status=copy.copy_status,
            total_profit=round(position_profit, 2),
            roi_percentage=round(roi_percentage, 2),
            session_trade_count=trade_count,
            session_win_rate=round(session_win_rate, 2),
        )
        positions.append(position)

        # Aggregate allocation and profit for non-stopped positions only
        if copy.copy_status != CopyStatus.STOPPED:
            total_allocation += allocation
            total_profit += position_profit

    copy_trading_roi_percentage = (
        (total_profit / total_allocation) * 100.0 if total_allocation > 0 else 0.0
    )

    return CopyTradingSummaryResponse(
        wallet_balance=round(wallet_balance, 2),
        copy_trading_wallet_balance=round(copy_trading_wallet_balance, 2),
        total_allocation=round(total_allocation, 2),
        total_profit=round(total_profit, 2),
        copy_trading_roi_percentage=round(copy_trading_roi_percentage, 2),
        active_positions=active_positions,
        paused_positions=paused_positions,
        stopped_positions=stopped_positions,
        positions=positions,
    )


def _load_copy_relationship(
    session: SessionDep,
    current_user: CurrentUser,
    copy_id: uuid.UUID,
) -> UserTraderCopy:
    copy = session.get(UserTraderCopy, copy_id)
    if copy is None or copy.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Copy relationship not found")

    session.refresh(copy, attribute_names=["trader_profile"])
    session.refresh(copy, attribute_names=["user"])
    if copy.trader_profile:
        session.refresh(copy.trader_profile, attribute_names=["user"])
    return copy


def _apply_status_transition(
    copy: UserTraderCopy,
    new_status: CopyStatus,
    *,
    previous_status: CopyStatus,
) -> None:
    trader = copy.trader_profile
    if trader is None:
        return

    was_active = previous_status == CopyStatus.ACTIVE
    will_be_active = new_status == CopyStatus.ACTIVE

    if was_active == will_be_active:
        return

    if was_active:
        trader.total_copiers = max((trader.total_copiers or 0) - 1, 0)
        trader.total_assets_under_copy = max(
            (trader.total_assets_under_copy or 0.0) - copy.copy_amount,
            0.0,
        )
    else:
        trader.total_copiers = (trader.total_copiers or 0) + 1
        trader.total_assets_under_copy = (
            (trader.total_assets_under_copy or 0.0) + copy.copy_amount
        )


@router.post("/verify", response_model=TraderVerificationResponse)
def verify_trader_code(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: TraderVerificationRequest,
) -> Any:
    """Validate a trader code and return a summary if the trader exists and is public."""

    trader = _find_trader_by_code(session, payload.trader_code)
    if trader is None or not trader.is_public:
        return TraderVerificationResponse(
            valid=False,
            trader=None,
            message="Trader code not found or trader is not available for copying.",
        )

    summary = _build_trader_summary(trader)
    return TraderVerificationResponse(valid=True, trader=summary)


@router.get("/copied", response_model=CopiedTradersResponse)
def list_copied_traders(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Return traders that the current user is actively copying."""

    count_stmt = (
        select(func.count())
        .select_from(UserTraderCopy)
        .where(UserTraderCopy.user_id == current_user.id)
    )
    total = session.exec(count_stmt).one()

    statement = (
        select(UserTraderCopy)
        .where(UserTraderCopy.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
    )
    copies = session.exec(statement).all()

    for copy in copies:
        session.refresh(copy, attribute_names=["trader_profile"])
        if copy.trader_profile:
            session.refresh(copy.trader_profile, attribute_names=["user"])

    data = [_build_copied_trader(copy) for copy in copies]
    return CopiedTradersResponse(data=data, count=total)


@router.post("/request-withdrawal", response_model=CopyTradingWithdrawalResponse)
async def request_copy_trading_withdrawal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: CopyTradingWithdrawalRequest,
) -> CopyTradingWithdrawalResponse:
    # KYC gate: withdrawals require APPROVED status
    try:
        from app.models import KycStatus  # local import to avoid circulars
        if current_user.kyc_status != KycStatus.APPROVED:
            raise HTTPException(status_code=403, detail="Withdrawals require KYC approval")
    except Exception:
        # If enum comparison fails for any reason, fall back to string check
        if getattr(current_user, "kyc_status", None) not in ("APPROVED",):
            raise HTTPException(status_code=403, detail="Withdrawals require KYC approval")
    # Validate amount
    try:
        amount = round(float(payload.amount or 0), 2)
    except Exception:
        amount = 0.0
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Withdrawal amount must be greater than 0")

    # Ensure copy trading wallet is loaded/created
    session.refresh(current_user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
    wallet = current_user.copy_trading_wallet
    wallet_balance = float(wallet.balance) if wallet and wallet.balance is not None else 0.0

    if amount > wallet_balance:
        raise HTTPException(status_code=400, detail=f"Insufficient copy trading wallet balance. Available: ${wallet_balance:.2f}")

    # Create pending withdrawal transaction (no funds moved yet)
    tx = Transaction(
        user_id=current_user.id,
        amount=amount,
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description=(payload.description or "Withdrawal from copy trading wallet"),
        created_at=utc_now(),
        withdrawal_source=WithdrawalSource.COPY_TRADING_WALLET,
    )
    session.add(tx)
    session.commit()
    session.refresh(tx)

    try:
        email_withdrawal_requested(
            session=session,
            user_id=current_user.id,
            amount=float(tx.amount or 0.0),
            source="Copy trading wallet",
        )
    except Exception:
        pass

    return CopyTradingWithdrawalResponse(
        transaction_id=tx.id,
        status=tx.status.value,
        amount=tx.amount,
        description=tx.description,
        created_at=tx.created_at,
    )


@router.post("/fund-wallet", response_model=FundWalletResponse)
async def fund_wallet(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: FundWalletRequest,
) -> FundWalletResponse:
    # Optional gate: block funding when KYC is REJECTED per policy
    try:
        from app.models import KycStatus  # local import
        if current_user.kyc_status == KycStatus.REJECTED:
            raise HTTPException(status_code=403, detail="Account restricted. Contact support to resolve KYC status.")
    except Exception:
        if str(getattr(current_user, "kyc_status", "")).upper() == "REJECTED":
            raise HTTPException(status_code=403, detail="Account restricted. Contact support to resolve KYC status.")
    amount = round(float(payload.amount or 0), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    # Ensure copy trading wallet is loaded/created
    session.refresh(current_user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
    if current_user.copy_trading_wallet is None:
        from app.models import CopyTradingWallet  # avoid circular import
        current_user.copy_trading_wallet = CopyTradingWallet(user_id=current_user.id, balance=0.0)
        session.add(current_user.copy_trading_wallet)

    if (current_user.wallet_balance or 0.0) < amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    # Apply atomic updates
    current_user.wallet_balance = round(float(current_user.wallet_balance or 0.0) - amount, 2)
    current_user.copy_trading_wallet.balance = round(
        float(current_user.copy_trading_wallet.balance or 0.0) + amount, 2
    )
    session.add(current_user)
    session.add(current_user.copy_trading_wallet)

    # Record transaction
    transaction = Transaction(
        user_id=current_user.id,
        amount=amount,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.COMPLETED,
        description="copy_trading_wallet_funding",
        executed_at=utc_now(),
    )
    session.add(transaction)

    # Execution event for feed
    from app.services.execution_events import record_execution_event
    await record_execution_event(
        session,
        event_type=ExecutionEventType.MANUAL_ADJUSTMENT,
        description="Funded Copy Trading Wallet",
        amount=amount,
        user_id=current_user.id,
        payload={"service": "COPY_TRADING", "action": "FUND_WALLET"},
    )

    session.commit()
    session.refresh(current_user, attribute_names=["wallet_balance", "copy_trading_wallet"])  # type: ignore[arg-type]

    # Notify user about internal wallet transfer
    email_wallet_transfer(
        session=session,
        user_id=current_user.id,
        amount=amount,
        from_wallet="Main",
        to_wallet="Copy Trading",
    )

    return FundWalletResponse(
        success=True,
        message="Copy trading wallet funded",
        wallet_balance=float(current_user.wallet_balance or 0.0),
        copy_trading_wallet_balance=float(current_user.copy_trading_wallet.balance or 0.0),
    )


@router.post("/start", response_model=CopyTradingStartResponse)
def start_copy_trading(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: CopyTradingStartRequest,
) -> Any:
    """Create a copy-trading relationship between the current user and a trader."""

    if payload.trader_id is None and not payload.trader_code:
        raise HTTPException(status_code=400, detail="Trader identifier is required")

    trader: TraderProfile | None = None
    if payload.trader_id is not None:
        trader = session.get(TraderProfile, payload.trader_id)
    elif payload.trader_code:
        trader = _find_trader_by_code(session, payload.trader_code)

    if trader is None:
        raise HTTPException(status_code=404, detail="Trader not found")

    if not trader.is_public:
        raise HTTPException(status_code=400, detail="Trader is not available for copying")

    if trader.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot copy your own trader profile")

    if payload.allocation_amount <= 0:
        raise HTTPException(status_code=400, detail="Allocation amount must be greater than zero")

    if payload.allocation_amount < trader.minimum_copy_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum allocation for this trader is {trader.minimum_copy_amount}",
        )

    existing_copy = session.exec(
        select(UserTraderCopy).where(
            UserTraderCopy.user_id == current_user.id,
            UserTraderCopy.trader_profile_id == trader.id,
            UserTraderCopy.copy_status != CopyStatus.STOPPED,
        )
    ).first()

    if existing_copy:
        raise HTTPException(status_code=400, detail="You are already copying this trader")

    # Validate available funds (prefer copy_trading_wallet, fall back to wallet_balance/legacy balance)
    session.refresh(current_user, attribute_names=["copy_trading_wallet", "wallet_balance"])  # type: ignore[arg-type]
    main_available = float(current_user.wallet_balance or current_user.balance or 0.0)
    if current_user.copy_trading_wallet is None:
        from app.models import CopyTradingWallet  # avoid circular import
        current_user.copy_trading_wallet = CopyTradingWallet(user_id=current_user.id, balance=0.0)
        session.add(current_user.copy_trading_wallet)
        session.flush()
    wallet_balance = float(current_user.copy_trading_wallet.balance or 0.0)
    total_available = wallet_balance + main_available
    if total_available < payload.allocation_amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance to allocate funds",
        )

    # Move funds from main balance into allocation (use wallet funds first, then main)
    use_from_wallet = min(wallet_balance, payload.allocation_amount)
    remaining = round(payload.allocation_amount - use_from_wallet, 2)
    wallet_balance_after = round(wallet_balance - use_from_wallet, 2)
    main_after = round(main_available - remaining, 2) if remaining > 0 else main_available

    allocation_amount = round(payload.allocation_amount, 2)

    copy_entry = UserTraderCopy(
        user_id=current_user.id,
        trader_profile_id=trader.id,
        copy_amount=allocation_amount,
        copy_status=CopyStatus.ACTIVE,
        copy_settings={"source": "manual", "initial_allocation": allocation_amount},
    )

    session.add(copy_entry)

    # Deduct from available balances and add to allocated (copy_trading_balance)
    current_user.copy_trading_wallet.balance = wallet_balance_after
    current_user.wallet_balance = main_after
    current_user.balance = main_after
    current_user.copy_trading_balance = round(float(current_user.copy_trading_balance or 0.0) + allocation_amount, 2)
    session.add(current_user)
    session.add(current_user.copy_trading_wallet)

    trader.total_copiers = (trader.total_copiers or 0) + 1
    trader.total_assets_under_copy = (trader.total_assets_under_copy or 0.0) + allocation_amount
    session.add(trader)

    _record_balance_delta(
        session,
        user_id=current_user.id,
        amount=-allocation_amount,
        description=f"Copy trading allocation for {trader.display_name or trader.id}",
    )

    session.commit()

    # Notify user of new copy relationship (in-app + email)
    try:
        session.refresh(trader, attribute_names=["user"])
        notify_copy_relationship_started(
            session=session,
            user_id=current_user.id,
            trader=trader,
            allocation=allocation_amount,
        )
    except Exception:
        # Do not block main flow on notification failures
        pass
    session.refresh(current_user, attribute_names=["copy_trading_wallet", "copy_trading_balance", "wallet_balance"])  # type: ignore[arg-type]
    session.refresh(copy_entry, attribute_names=["trader_profile"])
    session.refresh(copy_entry, attribute_names=["user"])
    session.refresh(trader, attribute_names=["user"])

    if copy_entry.trader_profile:
        session.refresh(copy_entry.trader_profile, attribute_names=["user"])

    copied_summary = _build_copied_trader(copy_entry)
    message = (
        f"Copy trading started for {copied_summary.display_name} with allocation "
        f"${allocation_amount:,.2f}"
    )
    return CopyTradingStartResponse(
        success=True,
        message=message,
        available_balance=float(current_user.wallet_balance or current_user.balance or 0.0),
        copied_trader=copied_summary,
    )


@router.post("/copied/{copy_id}/pause", response_model=CopyTradingUpdateResponse)
def pause_copy_relationship(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    copy_id: uuid.UUID,
) -> Any:
    """Pause an active copy-trading relationship for the current user."""

    copy = _load_copy_relationship(session, current_user, copy_id)
    previous_status = copy.copy_status

    if previous_status == CopyStatus.STOPPED:
        raise HTTPException(status_code=400, detail="Copy relationship is already stopped")

    if previous_status == CopyStatus.PAUSED:
        copied_summary = _build_copied_trader(copy)
        return CopyTradingUpdateResponse(
            success=True,
            message="Copy relationship is already paused",
            available_balance=copy.user.balance if copy.user else current_user.balance,
            copied_trader=copied_summary,
        )

    copy.copy_status = CopyStatus.PAUSED
    _apply_status_transition(copy, CopyStatus.PAUSED, previous_status=previous_status)

    session.add(copy)
    if copy.trader_profile:
        session.add(copy.trader_profile)
    session.commit()
    session.refresh(copy, attribute_names=["trader_profile"])
    session.refresh(copy, attribute_names=["user"])
    if copy.trader_profile:
        session.refresh(copy.trader_profile, attribute_names=["user"])

    copied_summary = _build_copied_trader(copy)
    available_balance = copy.user.balance if copy.user else current_user.balance

    # Notify pause event
    try:
        if copy.trader_profile is not None and copy.user is not None:
            notify_copy_relationship_status_changed(
                session=session,
                user_id=copy.user.id,
                trader=copy.trader_profile,
                new_status="PAUSED",
                allocation=float(copy.copy_amount or 0.0),
            )
    except Exception:
        pass

    return CopyTradingUpdateResponse(
        success=True,
        message="Copy relationship paused",
        available_balance=available_balance,
        copied_trader=copied_summary,
    )


@router.post("/copied/{copy_id}/stop", response_model=CopyTradingUpdateResponse)
def stop_copy_relationship(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    copy_id: uuid.UUID,
) -> Any:
    """Stop a copy-trading relationship permanently for the current user."""

    copy = _load_copy_relationship(session, current_user, copy_id)
    previous_status = copy.copy_status

    if previous_status == CopyStatus.STOPPED:
        copied_summary = _build_copied_trader(copy)
        return CopyTradingUpdateResponse(
            success=True,
            message="Copy relationship already stopped",
            available_balance=float(copy.user.copy_trading_wallet.balance) if getattr(copy.user, "copy_trading_wallet", None) else 0.0,
            copied_trader=copied_summary,
        )

    # Ensure user and copy_trading_wallet are loaded
    session.refresh(copy, attribute_names=["user"])  # ensure user loaded
    if not copy.user:
        raise HTTPException(status_code=404, detail="User not found for copy relationship")

    session.refresh(copy.user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
    if copy.user.copy_trading_wallet is None:
        from app.models import CopyTradingWallet  # avoid circular import
        copy.user.copy_trading_wallet = CopyTradingWallet(user_id=copy.user.id, balance=0.0)
        session.add(copy.user.copy_trading_wallet)
        session.flush()

    # Compute proportionate equity to release for this copy
    from sqlmodel import select as _select

    active_copies = session.exec(
        _select(UserTraderCopy).where(
            UserTraderCopy.user_id == copy.user.id,
            UserTraderCopy.copy_status != CopyStatus.STOPPED,
        )
    ).all()
    total_alloc = sum(float(c.copy_amount or 0.0) for c in active_copies) or 0.0
    total_equity = float(copy.user.copy_trading_balance or 0.0)

    if total_alloc > 0 and total_equity > 0:
        equity_per_dollar = total_equity / total_alloc
        release_amount = round(float(copy.copy_amount or 0.0) * equity_per_dollar, 2)
    else:
        release_amount = round(float(copy.copy_amount or 0.0), 2)

    # Update balances: allocated equity -> Copy Trading Wallet
    copy.user.copy_trading_balance = round(total_equity - release_amount, 2)
    wallet_balance = float(copy.user.copy_trading_wallet.balance or 0.0)
    copy.user.copy_trading_wallet.balance = round(wallet_balance + release_amount, 2)

    copy.copy_status = CopyStatus.STOPPED
    _apply_status_transition(copy, CopyStatus.STOPPED, previous_status=previous_status)

    session.add(copy.user)

    session.add(copy)
    if copy.trader_profile:
        session.add(copy.trader_profile)
    session.commit()
    session.refresh(copy, attribute_names=["trader_profile"])
    session.refresh(copy, attribute_names=["user"])
    if copy.trader_profile:
        session.refresh(copy.trader_profile, attribute_names=["user"])

    copied_summary = _build_copied_trader(copy)
    # Return updated Copy Trading Wallet balance as available_balance for client cache update
    session.refresh(copy.user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
    available_balance = float(copy.user.copy_trading_wallet.balance or 0.0)

    # Notify stop event
    try:
        if copy.trader_profile is not None and copy.user is not None:
            notify_copy_relationship_status_changed(
                session=session,
                user_id=copy.user.id,
                trader=copy.trader_profile,
                new_status="STOPPED",
                allocation=release_amount,
            )
    except Exception:
        pass

    return CopyTradingUpdateResponse(
        success=True,
        message="Copy relationship stopped",
        available_balance=available_balance,
        copied_trader=copied_summary,
    )


@router.post("/copied/{copy_id}/reduce", response_model=CopyTradingUpdateResponse)
def reduce_copy_allocation(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    copy_id: uuid.UUID,
    payload: PartialReduceRequest,
) -> Any:
    """Partially reduce an active copy-trading allocation, returning funds to Copy Trading Wallet.

    Guardrails:
    - Remaining allocation must be >= max($100, 10% of current allocation), unless reducing to zero (routes to Stop).
    - Reduction amount must be whole dollars.
    """
    copy = _load_copy_relationship(session, current_user, copy_id)
    if copy.copy_status == CopyStatus.STOPPED:
        raise HTTPException(status_code=400, detail="Cannot reduce a stopped copy relationship")

    try:
        amount = float(payload.amount)
    except Exception:
        amount = 0.0
    amount = round(amount, 2)
    # Whole dollars
    if amount <= 0 or abs(amount - round(amount)) > 1e-9:
        raise HTTPException(status_code=400, detail="Reduction amount must be a positive whole dollar amount")

    current_allocation = float(copy.copy_amount or 0.0)
    if amount > current_allocation:
        raise HTTPException(status_code=400, detail="Reduction exceeds current allocation")

    remaining = round(current_allocation - amount, 2)
    if remaining <= 0:
        # Route to full stop logic
        return stop_copy_relationship(session=session, current_user=current_user, copy_id=copy_id)

    # Enforce floor: remaining >= max($100, 10% of current)
    floor_amount = max(100.0, round(0.10 * current_allocation, 2))
    if remaining < floor_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Remaining allocation must be at least ${floor_amount:.0f}",
        )

    # Apply balance moves: allocated -> Copy Trading Wallet
    session.refresh(copy, attribute_names=["user"])  # ensure user loaded
    if not copy.user:
        raise HTTPException(status_code=404, detail="User not found for copy relationship")

    copy.copy_amount = remaining
    copy.user.copy_trading_balance = round(float(copy.user.copy_trading_balance or 0.0) - amount, 2)
    session.refresh(copy.user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]
    if copy.user.copy_trading_wallet is None:
        from app.models import CopyTradingWallet  # avoid circular import
        copy.user.copy_trading_wallet = CopyTradingWallet(user_id=copy.user.id, balance=0.0)
        session.add(copy.user.copy_trading_wallet)
        session.flush()
    ct_wallet_balance = float(copy.user.copy_trading_wallet.balance or 0.0)
    copy.user.copy_trading_wallet.balance = round(ct_wallet_balance + amount, 2)

    session.add(copy)
    session.add(copy.user)
    session.add(copy.user.copy_trading_wallet)
    _record_balance_delta(
        session,
        user_id=copy.user.id,
        amount=amount,
        description="Copy trading allocation reduced",
    )
    session.commit()
    session.refresh(copy, attribute_names=["trader_profile"])  # ensure trader loaded for response
    session.refresh(copy.user, attribute_names=["copy_trading_wallet"])  # type: ignore[arg-type]

    copied_summary = _build_copied_trader(copy)
    available_balance = float(copy.user.copy_trading_wallet.balance or 0.0)
    return CopyTradingUpdateResponse(
        success=True,
        message="Copy trading allocation reduced",
        available_balance=available_balance,
        copied_trader=copied_summary,
    )


@router.post("/copied/{copy_id}/resume", response_model=CopyTradingUpdateResponse)
def resume_copy_relationship(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    copy_id: uuid.UUID,
) -> Any:
    """Resume a previously paused copy-trading relationship."""

    copy = _load_copy_relationship(session, current_user, copy_id)
    previous_status = copy.copy_status

    if previous_status == CopyStatus.ACTIVE:
        copied_summary = _build_copied_trader(copy)
        return CopyTradingUpdateResponse(
            success=True,
            message="Copy relationship is already active",
            available_balance=copy.user.balance if copy.user else current_user.balance,
            copied_trader=copied_summary,
        )

    if previous_status == CopyStatus.STOPPED:
        raise HTTPException(status_code=400, detail="Stopped copy relationships cannot be resumed")

    copy.copy_status = CopyStatus.ACTIVE
    _apply_status_transition(copy, CopyStatus.ACTIVE, previous_status=previous_status)

    session.add(copy)
    if copy.trader_profile:
        session.add(copy.trader_profile)
    session.commit()
    session.refresh(copy, attribute_names=["trader_profile"])
    session.refresh(copy, attribute_names=["user"])
    if copy.trader_profile:
        session.refresh(copy.trader_profile, attribute_names=["user"])

    copied_summary = _build_copied_trader(copy)
    available_balance = copy.user.balance if copy.user else current_user.balance

    # Notify resume event
    try:
        if copy.trader_profile is not None and copy.user is not None:
            notify_copy_relationship_status_changed(
                session=session,
                user_id=copy.user.id,
                trader=copy.trader_profile,
                new_status="ACTIVE",
                allocation=float(copy.copy_amount or 0.0),
            )
    except Exception:
        pass

    return CopyTradingUpdateResponse(
        success=True,
        message="Copy relationship resumed",
        available_balance=available_balance,
        copied_trader=copied_summary,
    )


@router.get("/executions", response_model=ExecutionFeedResponse)
def read_execution_feed(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    limit: int = 25,
    since: datetime | None = None,
) -> ExecutionFeedResponse:
    limit = max(1, min(limit, 100))
    normalized_since = _normalize_cursor(since)

    statement = (
        select(ExecutionEvent)
        .where(ExecutionEvent.user_id == current_user.id)
        .order_by(desc(col(ExecutionEvent.created_at)))
        .limit(limit)
    )

    if normalized_since is not None:
        statement = statement.where(ExecutionEvent.created_at > normalized_since)

    events = session.exec(statement).all()
    profile_cache: dict[uuid.UUID, tuple[str | None, str | None]] = {}
    feed_items = [
        _serialize_execution_event(session, event, profile_cache) for event in events
    ]
    latest_cursor = max((item.created_at for item in feed_items), default=None)

    return ExecutionFeedResponse(
        data=feed_items, count=len(feed_items), latest_cursor=latest_cursor
    )


@router.websocket("/executions/live")
async def execution_feed_live(websocket: WebSocket) -> None:
    params = websocket.query_params
    token = params.get("token")
    if not token:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Missing authentication token",
        )
        return

    try:
        claims = security.decode_token(token)
        token_payload = TokenPayload(**claims)
    except (InvalidTokenError, ValidationError):
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid credentials",
        )
        return

    poll_interval = _resolve_poll_interval(params.get("interval"))

    with Session(engine) as session:
        user = session.get(User, token_payload.sub)
        if user is None or not user.is_active:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="User not found or inactive",
            )
            return

        await websocket.accept()

        sent_ids: deque[str] = deque(maxlen=MAX_BUFFERED_EXECUTION_IDS)
        latest_cursor: datetime | None = None

        try:
            while True:
                session.expire_all()
                profile_cache: dict[uuid.UUID, tuple[str | None, str | None]] = {}

                statement = (
                    select(ExecutionEvent)
                    .where(ExecutionEvent.user_id == user.id)
                    .order_by(desc(col(ExecutionEvent.created_at)))
                    .limit(50)
                )

                if latest_cursor is not None:
                    statement = statement.where(ExecutionEvent.created_at >= latest_cursor)

                events = session.exec(statement).all()

                new_events: list[ExecutionFeedEvent] = []
                for event in reversed(events):
                    event_id = str(event.id)
                    if event_id in sent_ids:
                        continue

                    feed_event = _serialize_execution_event(session, event, profile_cache)
                    new_events.append(feed_event)
                    sent_ids.append(event_id)
                    if latest_cursor is None or feed_event.created_at > latest_cursor:
                        latest_cursor = feed_event.created_at

                if new_events:
                    await websocket.send_json(
                        {
                            "type": "execution_events",
                            "events": [item.model_dump(mode="json") for item in new_events],
                            "latest_cursor": latest_cursor.isoformat() if latest_cursor else None,
                        }
                    )

                session.rollback()
                await asyncio.sleep(poll_interval)
        except (WebSocketDisconnect, asyncio.CancelledError):
            return
        except Exception:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            raise


@router.get("/summary", response_model=CopyTradingAggregateResponse)
def copy_trading_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Return aggregate copy-trading counts grouped by status (admin only)."""

    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = (
        select(UserTraderCopy.copy_status, func.count())
        .group_by(UserTraderCopy.copy_status)
    )

    counts: dict[CopyStatus, int] = {status: 0 for status in CopyStatus}
    for status_value, count in session.exec(statement):
        counts[CopyStatus(status_value)] = count

    return CopyTradingAggregateResponse(
        active=counts[CopyStatus.ACTIVE],
        paused=counts[CopyStatus.PAUSED],
        stopped=counts[CopyStatus.STOPPED],
    )


class CopyTradingHistoryEvent(SQLModel):
    id: uuid.UUID
    event_type: ExecutionEventType
    description: str
    amount: float
    roi_percent: float | None = None
    symbol: str | None = None
    trader_display_name: str | None = None
    trader_code: str | None = None
    created_at: datetime

    @computed_field(return_type=str, alias="eventType")
    def event_type_camel(self) -> str:
        return getattr(self.event_type, "value", str(self.event_type))

    @computed_field(return_type=str | None, alias="roiPercent")
    def roi_percent_camel(self) -> str | None:
        return f"{self.roi_percent:.2f}%" if self.roi_percent is not None else None

    @computed_field(return_type=str | None, alias="traderDisplayName")
    def trader_display_name_camel(self) -> str | None:
        return self.trader_display_name

    @computed_field(return_type=str | None, alias="traderCode")
    def trader_code_camel(self) -> str | None:
        return self.trader_code

    @computed_field(return_type=str, alias="createdAt")
    def created_at_iso(self) -> str:
        return self.created_at.isoformat()


class CopyTradingHistoryResponse(SQLModel):
    data: list[CopyTradingHistoryEvent]
    count: int
    total_pages: int


@router.get("/history", response_model=CopyTradingHistoryResponse)
def get_copy_trading_history(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 20,
) -> CopyTradingHistoryResponse:
    """
    Get copy trading history for the current user.
    Includes FOLLOWER_PROFIT and TRADER_SIMULATION events (excludes MANUAL_ADJUSTMENT).
    """
    page = max(1, page)
    page_size = max(1, min(page_size, 100))
    offset = (page - 1) * page_size

    # Build query for copy trading events - include all events for the user
    query = (
        select(ExecutionEvent)
        .where(
            ExecutionEvent.user_id == current_user.id,
            cast(Any, ExecutionEvent.event_type).in_([
                ExecutionEventType.FOLLOWER_PROFIT,
                ExecutionEventType.TRADER_SIMULATION,
            ]),
        )
        .order_by(desc(col(ExecutionEvent.created_at)))
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply pagination
    query = query.offset(offset).limit(page_size)
    events = session.exec(query).all()

    # Process events with trader information
    profile_cache: dict[uuid.UUID, tuple[str | None, str | None]] = {}
    history_events = []

    for event in events:
        trader_display_name: str | None = None
        trader_code: str | None = None

        if event.trader_profile_id:
            cached = profile_cache.get(event.trader_profile_id)
            if cached is None:
                trader_profile = session.get(TraderProfile, event.trader_profile_id)
                if trader_profile is not None:
                    cached = (trader_profile.display_name, trader_profile.trader_code)
                else:
                    cached = (None, None)
                profile_cache[event.trader_profile_id] = cached
            trader_display_name, trader_code = cached

        payload = event.payload or {}
        
        # Fallback to payload data if trader info not found via profile
        if trader_display_name is None:
            name_value = payload.get("trader_display_name")
            if isinstance(name_value, str):
                trader_display_name = name_value
        if trader_code is None:
            code_value = payload.get("trader_code")
            if isinstance(code_value, str):
                trader_code = code_value

        symbol_value = payload.get("symbol")
        symbol = symbol_value if isinstance(symbol_value, str) else None

        # Calculate ROI percentage - prioritize payload roi_percent, otherwise calculate from amount
        roi_percent = None
        if payload.get("roi_percent") is not None:
            try:
                roi_percent = float(payload["roi_percent"])
            except (ValueError, TypeError):
                pass
        elif event.amount and payload.get("copy_amount"):
            try:
                copy_amount = float(payload["copy_amount"])
                if copy_amount > 0:
                    roi_percent = (event.amount / copy_amount) * 100
            except (ValueError, TypeError):
                pass

        history_events.append(CopyTradingHistoryEvent(
            id=event.id,
            event_type=event.event_type,
            description=event.description,
            amount=float(event.amount or 0.0),
            roi_percent=roi_percent,
            symbol=symbol,
            trader_display_name=trader_display_name,
            trader_code=trader_code,
            created_at=event.created_at,
        ))

    total_pages = max(1, (total + page_size - 1) // page_size)

    return CopyTradingHistoryResponse(
        data=history_events,
        count=total,
        total_pages=total_pages,
    )


__all__ = [
    "router",
    "TraderVerificationRequest",
    "TraderVerificationResponse",
    "CopyTradingStartRequest",
    "CopyTradingStartResponse",
    "CopiedTradersResponse",
    "CopiedTraderSummary",
    "CopyTradingUpdateResponse",
    "read_execution_feed",
    "execution_feed_live",
    "ExecutionFeedEvent",
    "ExecutionFeedResponse",
    "CopyTradingAggregateResponse",
]
