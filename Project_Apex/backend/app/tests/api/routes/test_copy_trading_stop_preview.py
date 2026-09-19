import uuid
from datetime import timedelta
import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

from app.core.time import utc_now
from app.models import (
    CopyStatus,
    CopyTradingWallet,
    ExecutionEvent,
    ExecutionEventType,
    RiskTolerance,
    TraderProfile,
    User,
    UserTraderCopy,
)
from app.api.routes.copy_trading import get_copy_relationship_stop_preview, stop_copy_relationship


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


def test_stop_preview_zero_profit(db_session: Session):
    """Test stop preview for relationship with zero profits:
    - commission_due == 0.0
    - immediate_release_amount == copy_amount
    - held_released_equity == 0.0
    - requires_commission_deposit == False
    - equity_released == True
    """
    user = User(
        id=uuid.uuid4(),
        email="zero_profit_user@example.com",
        hashed_password="hash",
        wallet_balance=500.0,
        balance=500.0,
        copy_trading_balance=500.0,
    )
    db_session.add(user)
    db_session.commit()

    copy_wallet = CopyTradingWallet(
        user_id=user.id,
        balance=100.0,
    )
    db_session.add(copy_wallet)
    db_session.commit()

    trader_user = User(
        id=uuid.uuid4(),
        email="trader_zero@example.com",
        hashed_password="hash",
    )
    db_session.add(trader_user)
    db_session.commit()

    trader = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Safe Trader Sam",
        trader_code="SAM200",
        copy_fee_percentage=20.0,
        risk_tolerance=RiskTolerance.LOW,
    )
    db_session.add(trader)
    db_session.commit()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=3),
    )
    db_session.add(copy)
    db_session.commit()

    # 1. Preview
    preview = get_copy_relationship_stop_preview(copy_id=copy.id, session=db_session, current_user=user)

    assert preview.copy_id == copy.id
    assert preview.trader_name == "Safe Trader Sam"
    assert preview.allocation == 500.0
    assert preview.session_profit == 0.0
    assert preview.copy_fee_percentage == 20.0
    assert preview.commission_due == 0.0
    assert preview.release_amount == 500.0
    assert preview.held_released_equity == 0.0
    assert preview.immediate_release_amount == 500.0
    assert preview.equity_released is True
    assert preview.requires_commission_deposit is False

    # 2. Parity check with actual stop
    stop_res = stop_copy_relationship(copy_id=copy.id, session=db_session, current_user=user)
    assert stop_res.commission_due == preview.commission_due
    assert stop_res.released_equity == preview.immediate_release_amount
    assert stop_res.session_profit == preview.session_profit
    assert stop_res.copy_fee_percentage == preview.copy_fee_percentage

    # Wallet balance increased by immediate release
    db_session.refresh(copy_wallet)
    assert copy_wallet.balance == 600.0


def test_stop_preview_positive_profit_escrow_hold(db_session: Session):
    """Test stop preview with positive profit events:
    - calculates commission correctly
    - held_released_equity == release_amount
    - immediate_release_amount == 0.0
    - requires_commission_deposit == True
    - equity_released == False
    """
    user = User(
        id=uuid.uuid4(),
        email="profit_follower@example.com",
        hashed_password="hash",
        wallet_balance=1000.0,
        balance=1000.0,
        copy_trading_balance=1000.0,
    )
    db_session.add(user)
    db_session.commit()

    copy_wallet = CopyTradingWallet(
        user_id=user.id,
        balance=50.0,
    )
    db_session.add(copy_wallet)
    db_session.commit()

    trader_user = User(
        id=uuid.uuid4(),
        email="trader_pro@example.com",
        hashed_password="hash",
    )
    db_session.add(trader_user)
    db_session.commit()

    trader = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Pro Alpha Trader",
        trader_code="PROALPHA",
        copy_fee_percentage=15.0,
        risk_tolerance=RiskTolerance.HIGH,
    )
    db_session.add(trader)
    db_session.commit()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader.id,
        copy_amount=1000.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=10),
    )
    db_session.add(copy)
    db_session.commit()

    # Add profit execution events
    p1 = ExecutionEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Follower profit EURUSD",
        amount=200.0,
        realized_pnl=200.0,
        roi_percent=20.0,
        created_at=utc_now() - timedelta(days=5),
    )
    p2 = ExecutionEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Follower profit BTCUSD",
        amount=100.0,
        realized_pnl=100.0,
        roi_percent=10.0,
        created_at=utc_now() - timedelta(days=2),
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Preview
    preview = get_copy_relationship_stop_preview(copy_id=copy.id, session=db_session, current_user=user)

    assert preview.copy_id == copy.id
    assert preview.trader_name == "Pro Alpha Trader"
    assert preview.allocation == 1000.0
    assert preview.session_profit == 300.0
    assert preview.copy_fee_percentage == 15.0
    assert preview.commission_due == 45.0  # 15% of 300
    assert preview.release_amount == 1000.0
    assert preview.held_released_equity == 1000.0
    assert preview.immediate_release_amount == 0.0
    assert preview.equity_released is False
    assert preview.requires_commission_deposit is True

    # Parity check with actual stop
    stop_res = stop_copy_relationship(copy_id=copy.id, session=db_session, current_user=user)
    assert stop_res.commission_due == preview.commission_due
    assert stop_res.released_equity == preview.held_released_equity
    assert stop_res.session_profit == preview.session_profit
    assert stop_res.copy_fee_percentage == preview.copy_fee_percentage

    # Immediate wallet balance not increased due to escrow hold
    db_session.refresh(copy_wallet)
    assert copy_wallet.balance == 50.0


def test_stop_preview_unauthorized_and_invalid(db_session: Session):
    """Test preview for nonexistent copy or copy belonging to another user."""
    user_a = User(
        id=uuid.uuid4(),
        email="user_a@example.com",
        hashed_password="hash",
    )
    user_b = User(
        id=uuid.uuid4(),
        email="user_b@example.com",
        hashed_password="hash",
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()

    trader = TraderProfile(
        id=uuid.uuid4(),
        user_id=user_a.id,
        display_name="Trader",
        trader_code="TRD",
        copy_fee_percentage=10.0,
    )
    db_session.add(trader)
    db_session.commit()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user_a.id,
        trader_profile_id=trader.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
    )
    db_session.add(copy)
    db_session.commit()

    # User B attempting to view User A's copy preview should raise 404
    with pytest.raises(HTTPException) as exc_info:
        get_copy_relationship_stop_preview(copy_id=copy.id, session=db_session, current_user=user_b)
    assert exc_info.value.status_code == 404

    # Nonexistent copy id should raise 404
    with pytest.raises(HTTPException) as exc_info:
        get_copy_relationship_stop_preview(copy_id=uuid.uuid4(), session=db_session, current_user=user_a)
    assert exc_info.value.status_code == 404
