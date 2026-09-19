import uuid
from datetime import timedelta
import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

from app.core.time import utc_now
from app.models import (
    CopyStatus,
    ExecutionEvent,
    ExecutionEventType,
    RiskTolerance,
    TraderProfile,
    Transaction,
    TransactionType,
    TransactionStatus,
    User,
    UserRole,
    UserTraderCopy,
)
from app.api.routes.admin_executions import (
    ROIExecutionPushRequest,
    ROIExecutionPushResponse,
    push_roi_execution,
)


@pytest.fixture(scope="session", autouse=True)
def db():
    yield None


@pytest.fixture(name="db_session")
def db_session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def _create_admin(session: Session) -> User:
    admin = User(
        id=uuid.uuid4(),
        email=f"admin_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hash",
        is_superuser=True,
        role=UserRole.ADMIN,
        wallet_balance=10000.0,
        copy_trading_balance=0.0,
    )
    session.add(admin)
    session.commit()
    session.refresh(admin)
    return admin


def _create_trader(session: Session, risk_tolerance: RiskTolerance = RiskTolerance.LOW) -> tuple[User, TraderProfile]:
    trader_user = User(
        id=uuid.uuid4(),
        email=f"trader_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hash",
        role=UserRole.USER,
        wallet_balance=5000.0,
        copy_trading_balance=0.0,
    )
    session.add(trader_user)
    session.commit()

    trader_profile = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Test Alpha Trader",
        trader_code=f"TR{uuid.uuid4().hex[:6].upper()}",
        trading_strategy="algorithmic crypto trading",
        risk_tolerance=risk_tolerance,
        is_public=True,
        minimum_copy_amount=100.0,
    )
    session.add(trader_profile)
    session.commit()
    session.refresh(trader_profile)
    return trader_user, trader_profile


def _create_follower(session: Session, copy_trading_balance: float = 1000.0) -> User:
    follower = User(
        id=uuid.uuid4(),
        email=f"follower_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hash",
        role=UserRole.USER,
        wallet_balance=2000.0,
        copy_trading_balance=copy_trading_balance,
    )
    session.add(follower)
    session.commit()
    session.refresh(follower)
    return follower


def _create_copy(
    session: Session, user: User, trader: TraderProfile, copy_amount: float = 500.0
) -> UserTraderCopy:
    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader.id,
        copy_amount=copy_amount,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=5),
        copy_settings={"mode": "auto"},
    )
    session.add(copy)
    session.commit()
    session.refresh(copy)
    return copy


@pytest.mark.anyio
async def test_roi_above_global_1000_limit_returns_400(db_session: Session):
    """Test that global safety clamp (> 1000% or < -1000%) returns HTTP 400."""
    admin = _create_admin(db_session)
    _, trader = _create_trader(db_session, risk_tolerance=RiskTolerance.HIGH)

    # Positive ROI > 1000%
    payload_high = ROIExecutionPushRequest(
        trader_id=trader.id,
        roi_percent=1000.1,
        symbol="BTC/USDT",
    )
    with pytest.raises(HTTPException) as exc_info:
        await push_roi_execution(session=db_session, current_user=admin, payload=payload_high)
    assert exc_info.value.status_code == 400
    assert "between -1000% and +1000%" in exc_info.value.detail

    # Negative ROI < -1000%
    payload_low = ROIExecutionPushRequest(
        trader_id=trader.id,
        roi_percent=-1000.5,
        symbol="BTC/USDT",
    )
    with pytest.raises(HTTPException) as exc_info_neg:
        await push_roi_execution(session=db_session, current_user=admin, payload=payload_low)
    assert exc_info_neg.value.status_code == 400
    assert "between -1000% and +1000%" in exc_info_neg.value.detail


@pytest.mark.anyio
async def test_low_and_medium_risk_tolerance_no_longer_blocks_valid_push(db_session: Session):
    """Test that LOW (previously capped at 50%) and MEDIUM (previously capped at 100%)
    risk tolerance traders no longer block valid admin simulation ROI pushes.
    """
    admin = _create_admin(db_session)

    # 1. LOW risk tolerance trader with 75% ROI (previously blocked at > 50%)
    _, low_trader = _create_trader(db_session, risk_tolerance=RiskTolerance.LOW)
    follower_low = _create_follower(db_session, copy_trading_balance=1000.0)
    _create_copy(db_session, follower_low, low_trader, copy_amount=1000.0)

    payload_low = ROIExecutionPushRequest(
        trader_id=low_trader.id,
        roi_percent=75.0,
        symbol="BTC/USDT",
        note="LOW risk trader above 50%",
    )
    res_low = await push_roi_execution(session=db_session, current_user=admin, payload=payload_low)
    assert res_low.success is True
    assert res_low.affected_users == 1
    assert res_low.total_roi_amount == 750.0  # 1000 * 0.75

    db_session.refresh(follower_low)
    assert follower_low.copy_trading_balance == 1750.0

    # 2. MEDIUM risk tolerance trader with 150% ROI (previously blocked at > 100%)
    _, med_trader = _create_trader(db_session, risk_tolerance=RiskTolerance.MEDIUM)
    follower_med = _create_follower(db_session, copy_trading_balance=500.0)
    _create_copy(db_session, follower_med, med_trader, copy_amount=500.0)

    payload_med = ROIExecutionPushRequest(
        trader_id=med_trader.id,
        roi_percent=150.0,
        symbol="ETH/USDT",
        note="MEDIUM risk trader above 100%",
    )
    res_med = await push_roi_execution(session=db_session, current_user=admin, payload=payload_med)
    assert res_med.success is True
    assert res_med.affected_users == 1
    assert res_med.total_roi_amount == 750.0  # 500 * 1.50

    db_session.refresh(follower_med)
    assert follower_med.copy_trading_balance == 1250.0

    # 3. Negative ROI below previous LOW risk cap (-10%)
    payload_neg = ROIExecutionPushRequest(
        trader_id=low_trader.id,
        roi_percent=-15.0,
        symbol="BTC/USDT",
    )
    res_neg = await push_roi_execution(session=db_session, current_user=admin, payload=payload_neg)
    assert res_neg.success is True
    assert res_neg.total_roi_amount == -150.0  # 1000 * -0.15


@pytest.mark.anyio
async def test_supplied_user_id_affects_only_selected_follower(db_session: Session):
    """Test that when payload.user_id is supplied, only that follower's active copy
    relationship receives the ROI execution, while other followers remain untouched.
    """
    admin = _create_admin(db_session)
    _, trader = _create_trader(db_session, risk_tolerance=RiskTolerance.MEDIUM)

    # Follower 1 (targeted)
    follower_1 = _create_follower(db_session, copy_trading_balance=600.0)
    _create_copy(db_session, follower_1, trader, copy_amount=600.0)

    # Follower 2 (not targeted)
    follower_2 = _create_follower(db_session, copy_trading_balance=1200.0)
    _create_copy(db_session, follower_2, trader, copy_amount=1200.0)

    # Push targeting follower_1 only
    payload = ROIExecutionPushRequest(
        trader_id=trader.id,
        user_id=follower_1.id,
        roi_percent=20.0,
        symbol="SOL/USDT",
        note="Selective follower push",
    )
    res = await push_roi_execution(session=db_session, current_user=admin, payload=payload)

    assert res.success is True
    assert res.affected_users == 1
    assert res.total_roi_amount == 120.0  # 600 * 0.20

    # Follower 1 balance increased by exactly 120.0
    db_session.refresh(follower_1)
    assert follower_1.copy_trading_balance == 720.0

    # Follower 2 balance is completely untouched
    db_session.refresh(follower_2)
    assert follower_2.copy_trading_balance == 1200.0


@pytest.mark.anyio
async def test_omitted_user_id_preserves_trader_wide_distribution(db_session: Session):
    """Test that when payload.user_id is absent, ROI is distributed to ALL active
    copiers of the trader.
    """
    admin = _create_admin(db_session)
    _, trader = _create_trader(db_session, risk_tolerance=RiskTolerance.MEDIUM)

    follower_a = _create_follower(db_session, copy_trading_balance=400.0)
    _create_copy(db_session, follower_a, trader, copy_amount=400.0)

    follower_b = _create_follower(db_session, copy_trading_balance=800.0)
    _create_copy(db_session, follower_b, trader, copy_amount=800.0)

    # Push trader-wide (no user_id)
    payload = ROIExecutionPushRequest(
        trader_id=trader.id,
        user_id=None,
        roi_percent=10.0,
        symbol="BTC/USDT",
        note="Trader-wide push",
    )
    res = await push_roi_execution(session=db_session, current_user=admin, payload=payload)

    assert res.success is True
    assert res.affected_users == 2
    assert res.total_roi_amount == 120.0  # (400 + 800) * 0.10

    db_session.refresh(follower_a)
    assert follower_a.copy_trading_balance == 440.0

    db_session.refresh(follower_b)
    assert follower_b.copy_trading_balance == 880.0


@pytest.mark.anyio
async def test_roi_transactions_remain_deposit_and_calculated_from_copy_amount(db_session: Session):
    """Test that:
    1. The transaction created uses TransactionType.DEPOSIT (preserving DB enum compatibility).
    2. The ROI amount is strictly calculated from UserTraderCopy.copy_amount (not total user balance).
    """
    admin = _create_admin(db_session)
    _, trader = _create_trader(db_session, risk_tolerance=RiskTolerance.LOW)

    # Follower has $5,000.0 total copy trading balance, but only $1,000.0 active copy amount
    follower = _create_follower(db_session, copy_trading_balance=5000.0)
    _create_copy(db_session, follower, trader, copy_amount=1000.0)

    payload = ROIExecutionPushRequest(
        trader_id=trader.id,
        user_id=follower.id,
        roi_percent=15.0,
        symbol="BTC/USD",
        note="Calculation source verification",
    )
    res = await push_roi_execution(session=db_session, current_user=admin, payload=payload)

    # ROI amount must be 150.0 (1000 * 0.15), NOT 750.0 (5000 * 0.15)
    assert res.total_roi_amount == 150.0

    # Query transaction created
    txs = db_session.exec(
        select(Transaction).where(Transaction.user_id == follower.id)
    ).all()
    assert len(txs) == 1
    tx = txs[0]

    assert tx.transaction_type == TransactionType.DEPOSIT
    assert tx.amount == 150.0
    assert tx.status == TransactionStatus.COMPLETED
    assert tx.description == "Copy trading ROI: +15.00% on BTC/USD"

    # Query execution events created
    follower_events = db_session.exec(
        select(ExecutionEvent).where(
            ExecutionEvent.user_id == follower.id,
            ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT,
        )
    ).all()
    assert len(follower_events) == 1
    f_event = follower_events[0]
    assert f_event.amount == 150.0
    assert f_event.payload["service"] == "COPY_TRADING"
    assert f_event.payload["copy_amount"] == 1000.0
    assert f_event.payload["roi_amount"] == 150.0
    assert f_event.payload["roi_percent"] == 15.0
    assert f_event.payload["execution_type"] == "admin_roi_push"


@pytest.mark.anyio
async def test_supplied_user_id_without_active_copy_returns_400(db_session: Session):
    """Test that supplying a user_id that has no active copy relationship with the trader returns 400."""
    admin = _create_admin(db_session)
    _, trader = _create_trader(db_session)
    unrelated_user = _create_follower(db_session)

    payload = ROIExecutionPushRequest(
        trader_id=trader.id,
        user_id=unrelated_user.id,
        roi_percent=10.0,
        symbol="BTC/USDT",
    )
    with pytest.raises(HTTPException) as exc_info:
        await push_roi_execution(session=db_session, current_user=admin, payload=payload)

    assert exc_info.value.status_code == 400
    assert "No active copy relationships found for this trader and user" in exc_info.value.detail
