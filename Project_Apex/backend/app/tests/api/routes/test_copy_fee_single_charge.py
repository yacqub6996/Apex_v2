"""Regression tests for the single-charge copy fee model.

After removing the per-trade copy_fee_percentage deduction from
TraderSimulator.copy_trade_to_followers, simulated follower profits must remain
gross all the way through Trade.profit_loss, User.balance, AccountSummary.net_profit
and the FOLLOWER_PROFIT ExecutionEvent. The only fee application is then the
Stop Copy settlement commission_due computed on that gross session profit.
"""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.routes.copy_trading import (
    get_copy_relationship_stop_preview,
    stop_copy_relationship,
)
from app.core.time import utc_now
from app.models import (
    AccountSummary,
    CopyStatus,
    CopyTradingWallet,
    ExecutionEvent,
    ExecutionEventType,
    RiskTolerance,
    TraderProfile,
    TraderTrade,
    TradeSide,
    TradeStatus,
    User,
    UserTraderCopy,
)
from app.services.trader_simulator import TraderSimulator


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


def _make_copy_scenario(
    db_session: Session, *, fee_pct: float = 10.0, copy_amount: float = 1000.0
):
    trader_user = User(
        id=uuid.uuid4(),
        email="trader@example.com",
        hashed_password="hash",
    )
    follower = User(
        id=uuid.uuid4(),
        email="follower@example.com",
        hashed_password="hash",
        balance=0.0,
        wallet_balance=500.0,
        copy_trading_balance=copy_amount,
    )
    db_session.add(trader_user)
    db_session.add(follower)
    db_session.flush()

    trader = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Trader One",
        trader_code="TST100",
        copy_fee_percentage=fee_pct,
        risk_tolerance=RiskTolerance.MEDIUM,
        is_public=True,
    )
    db_session.add(trader)
    db_session.flush()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=follower.id,
        trader_profile_id=trader.id,
        copy_amount=copy_amount,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=1),
    )
    db_session.add(copy)
    db_session.flush()
    return follower, trader, copy


def test_simulator_copy_trade_keeps_full_gross_profit(db_session: Session):
    """The simulator must no longer deduct copy_fee_percentage per trade.

    Trade.profit_loss, User.balance, AccountSummary.net_profit and the
    FOLLOWER_PROFIT event (recorded from follower_trade.profit_loss, see
    admin.py trigger_simulated_trades) must all equal the full scaled gross
    profit.
    """
    follower, trader, _ = _make_copy_scenario(
        db_session, fee_pct=10.0, copy_amount=1000.0
    )

    trader_trade = TraderTrade(
        trader_profile_id=trader.id,
        symbol="BTC/USD",
        side=TradeSide.BUY,
        entry_price=100.0,
        exit_price=110.0,
        volume=1.0,
        profit_loss=100.0,  # gross scaled profit for $1,000 allocation
        status=TradeStatus.CLOSED,
        executed_at=utc_now(),
        is_copyable=True,
    )
    db_session.add(trader_trade)
    db_session.commit()

    records = TraderSimulator().copy_trade_to_followers(db_session, trader_trade)
    assert len(records) == 1

    follower_trade = records[0].trade
    assert follower_trade.profit_loss == 100.0, (
        "Follower Trade.profit_loss must remain gross; per-trade fee was not removed"
    )

    db_session.refresh(follower)
    assert follower.balance == 100.0, (
        "User.balance must be credited with the full gross profit"
    )

    summary = db_session.exec(
        select(AccountSummary).where(AccountSummary.user_id == follower.id)
    ).first()
    assert summary is not None
    assert summary.net_profit == 100.0, (
        "AccountSummary.net_profit must accumulate the full gross profit"
    )
    assert summary.total_trades == 1
    assert summary.winning_trades == 1

    # Mirror admin.py trigger_simulated_trades, which records the FOLLOWER_PROFIT
    # ExecutionEvent using follower_trade.profit_loss.
    event = ExecutionEvent(
        user_id=follower.id,
        trader_profile_id=trader.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Copy trade BTC/USD",
        amount=round(follower_trade.profit_loss or 0.0, 2),
    )
    db_session.add(event)
    db_session.commit()
    assert event.amount == 100.0, (
        "FOLLOWER_PROFIT must be recorded with the full gross profit"
    )


def test_stop_settlement_charges_single_10pct_on_gross_profit(db_session: Session):
    """End-to-end single-charge regression.

    With a 10% fee and $100 gross session profit, Stop Copy must charge exactly
    $10.00 commission (10% of gross), not the historical double-charge of $19
    ($10 withheld per-trade + 10% of the remaining $90).
    """
    follower, trader, copy = _make_copy_scenario(
        db_session, fee_pct=10.0, copy_amount=1000.0
    )
    db_session.add(CopyTradingWallet(user_id=follower.id, balance=0.0))

    # Gross FOLLOWER_PROFIT events totalling $100 since copy start.
    for amount in (60.0, 40.0):
        db_session.add(
            ExecutionEvent(
                user_id=follower.id,
                trader_profile_id=trader.id,
                event_type=ExecutionEventType.FOLLOWER_PROFIT,
                description="Follower profit",
                amount=amount,
                created_at=copy.copy_started_at + timedelta(hours=1),
            )
        )
    db_session.commit()

    preview = get_copy_relationship_stop_preview(
        session=db_session, current_user=follower, copy_id=copy.id
    )
    assert preview.session_profit == 100.0
    assert preview.copy_fee_percentage == 10.0
    assert preview.commission_due == 10.0, (
        "Stop preview must charge 10% of gross session profit ($100 -> $10)"
    )
    assert preview.requires_commission_deposit is True

    response = stop_copy_relationship(
        session=db_session, current_user=follower, copy_id=copy.id
    )
    assert response.session_profit == 100.0
    assert response.copy_fee_percentage == 10.0
    assert response.commission_due == 10.0, (
        "Stop Copy must charge exactly $10.00 commission on $100 gross profit"
    )

    # Single-charge invariant: commission is the full fee on gross profit.
    expected_single_charge = round(
        response.session_profit * (response.copy_fee_percentage / 100.0), 2
    )
    assert response.commission_due == expected_single_charge == 10.0
    assert response.commission_due != 19.0, (
        "Double-charge regression: commission must not include a per-trade fee"
    )

    db_session.refresh(copy)
    assert copy.copy_settings["session_profit"] == 100.0
    assert copy.copy_settings["commission_due"] == 10.0
    assert copy.copy_settings["copy_fee_percentage"] == 10.0
