"""Tests for financially accurate notification semantics.

Covers:
- Stop Copy notification reflects escrow hold when commission is due.
- Stop Copy notification reflects immediate release when no commission is due.
- Commission deposit confirmation sends COMMISSION_CONFIRMED (not DEPOSIT_CONFIRMED).
- Ordinary deposit confirmation still sends DEPOSIT_CONFIRMED with wallet-credit wording.
- Copy relationship lifecycle events use their own notification types.
"""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.routes.copy_trading import pause_copy_relationship, stop_copy_relationship
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    CopyTradingWallet,
    ExecutionEvent,
    ExecutionEventType,
    Notification,
    NotificationType,
    RiskTolerance,
    TraderProfile,
    Transaction,
    TransactionStatus,
    TransactionType,
    User,
    UserTraderCopy,
)
from app.services.transactions import finalize_deposit_transaction


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


def _make_copy_scenario(db_session: Session, *, fee_pct: float = 10.0):
    trader_user = User(id=uuid.uuid4(), email="trader@example.com", hashed_password="hash")
    follower = User(
        id=uuid.uuid4(),
        email="follower@example.com",
        hashed_password="hash",
        balance=500.0,
        wallet_balance=500.0,
        copy_trading_balance=1000.0,
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
        copy_amount=1000.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=1),
    )
    db_session.add(copy)
    db_session.add(CopyTradingWallet(user_id=follower.id, balance=0.0))
    db_session.flush()
    return follower, trader, copy


def _latest_notification(db_session: Session, user_id: uuid.UUID) -> Notification | None:
    return db_session.exec(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
    ).first()


def test_stop_with_commission_notifies_escrow_hold(db_session: Session):
    follower, trader, copy = _make_copy_scenario(db_session, fee_pct=10.0)

    # $100 gross FOLLOWER_PROFIT -> $10 commission due (10%)
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

    stop_copy_relationship(session=db_session, current_user=follower, copy_id=copy.id)

    notification = _latest_notification(db_session, follower.id)
    assert notification is not None
    assert notification.notification_type == NotificationType.COPY_RELATIONSHIP_STOPPED
    assert "held in escrow" in notification.message
    assert "$10.00" in notification.message
    assert "released back" not in notification.message


def test_stop_without_commission_notifies_immediate_release(db_session: Session):
    follower, _, copy = _make_copy_scenario(db_session, fee_pct=10.0)
    db_session.commit()

    stop_copy_relationship(session=db_session, current_user=follower, copy_id=copy.id)

    notification = _latest_notification(db_session, follower.id)
    assert notification is not None
    assert notification.notification_type == NotificationType.COPY_RELATIONSHIP_STOPPED
    assert "released back to your Copy Trading Wallet" in notification.message
    assert "held in escrow" not in notification.message


def test_pause_notifies_copy_relationship_paused(db_session: Session):
    follower, _, copy = _make_copy_scenario(db_session, fee_pct=10.0)
    db_session.commit()

    pause_copy_relationship(session=db_session, current_user=follower, copy_id=copy.id)

    notification = _latest_notification(db_session, follower.id)
    assert notification is not None
    assert notification.notification_type == NotificationType.COPY_RELATIONSHIP_PAUSED


def test_finalize_commission_deposit_notifies_commission_confirmed(db_session: Session):
    follower, _, copy = _make_copy_scenario(db_session, fee_pct=10.0)
    copy.copy_status = CopyStatus.STOPPED
    copy.copy_settings = {"held_released_equity": 1000.0, "equity_released": False}
    db_session.add(copy)
    db_session.commit()

    transaction = Transaction(
        user_id=follower.id,
        amount=10.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="Trader commission: 10.00 USD for copy session",
        metadata_payload={"type": "COPY_TRADING_COMMISSION", "copy_id": str(copy.id)},
    )
    db_session.add(transaction)
    db_session.commit()

    finalized = finalize_deposit_transaction(
        session=db_session, transaction=transaction, notify=True
    )
    assert finalized.status == TransactionStatus.COMPLETED

    # Existing accounting preserved: held equity released to copy wallet, main wallet untouched
    db_session.refresh(follower)
    assert follower.wallet_balance == 500.0
    db_session.refresh(follower, attribute_names=["copy_trading_wallet"])
    assert follower.copy_trading_wallet.balance == 1000.0

    notification = _latest_notification(db_session, follower.id)
    assert notification is not None
    assert notification.notification_type == NotificationType.COMMISSION_CONFIRMED
    assert "released to your Copy Trading Wallet" in notification.message
    assert "$1000.00" in notification.message
    assert notification.notification_type != NotificationType.DEPOSIT_CONFIRMED


def test_finalize_ordinary_deposit_still_notifies_deposit_confirmed(db_session: Session):
    follower, _, _ = _make_copy_scenario(db_session, fee_pct=10.0)
    db_session.commit()

    transaction = Transaction(
        user_id=follower.id,
        amount=100.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="Crypto deposit",
    )
    db_session.add(transaction)
    db_session.commit()

    finalized = finalize_deposit_transaction(
        session=db_session, transaction=transaction, notify=True
    )
    assert finalized.status == TransactionStatus.COMPLETED

    db_session.refresh(follower)
    assert follower.wallet_balance == 600.0

    notification = _latest_notification(db_session, follower.id)
    assert notification is not None
    assert notification.notification_type == NotificationType.DEPOSIT_CONFIRMED
    assert "added to your wallet" in notification.message
