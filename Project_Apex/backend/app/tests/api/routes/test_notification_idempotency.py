"""Regression tests for notification idempotency."""

import uuid

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.models import Notification, NotificationType, User
from app.services import notification_delivery
from app.services.notification_service import (
    NotificationService,
    email_deposit_pending,
    email_wallet_transfer,
    email_withdrawal_received,
    email_withdrawal_requested,
    notify_commission_confirmed,
    notify_copy_trade_executed,
    notify_deposit_confirmed,
    notify_investment_matured,
    notify_withdrawal_approved,
    notify_withdrawal_rejected,
)


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


@pytest.fixture
def email_spy(monkeypatch):
    calls = []

    def fake_send_email(payload):
        calls.append(payload)
        return None

    monkeypatch.setattr(notification_delivery, "send_email", fake_send_email)
    return calls


def _make_user(db_session: Session) -> User:
    user = User(id=uuid.uuid4(), email="idem@example.com", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    return user


def _notification_count(db_session: Session, user: User) -> int:
    return len(
        db_session.exec(
            select(Notification).where(Notification.user_id == user.id)
        ).all()
    )


def test_create_notification_dedups_by_key(db_session: Session):
    user = _make_user(db_session)
    key = "deposit_confirmed:11111111-1111-1111-1111-111111111111"

    first = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        idempotency_key=key,
    )
    second = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        idempotency_key=key,
    )
    assert first.id == second.id
    assert _notification_count(db_session, user) == 1

    different = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        idempotency_key=f"{key}:other",
    )
    assert different.id != first.id
    assert _notification_count(db_session, user) == 2

    NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
    )
    NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
    )
    # Without a key, both calls create rows.
    assert _notification_count(db_session, user) == 4


def test_deposit_confirmed_idempotent_with_single_email(db_session: Session, email_spy):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())

    first = notify_deposit_confirmed(
        session=db_session, user_id=user.id, amount=100.0, transaction_id=tx_id
    )
    second = notify_deposit_confirmed(
        session=db_session, user_id=user.id, amount=100.0, transaction_id=tx_id
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1

    other = notify_deposit_confirmed(
        session=db_session,
        user_id=user.id,
        amount=100.0,
        transaction_id=str(uuid.uuid4()),
    )
    assert other.id != first.id
    assert _notification_count(db_session, user) == 2
    assert len(email_spy) == 2


def test_deposit_pending_idempotent_with_single_email(db_session: Session, email_spy):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())

    first = email_deposit_pending(
        session=db_session, user_id=user.id, amount=50.0, transaction_id=tx_id
    )
    second = email_deposit_pending(
        session=db_session, user_id=user.id, amount=50.0, transaction_id=tx_id
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1


def test_withdrawal_requested_idempotent_and_email_gated(
    db_session: Session, email_spy
):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())
    NotificationService.update_preferences(
        session=db_session,
        user_id=user.id,
        updates={"withdrawal_alerts": False},
    )

    first = email_withdrawal_requested(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    second = email_withdrawal_requested(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 0  # optional email suppressed by preference


def test_commission_confirmed_idempotent_with_single_email(
    db_session: Session, email_spy
):
    user = _make_user(db_session)
    copy_id = str(uuid.uuid4())

    first = notify_commission_confirmed(
        session=db_session, user_id=user.id, amount=10.0, copy_id=copy_id
    )
    second = notify_commission_confirmed(
        session=db_session, user_id=user.id, amount=10.0, copy_id=copy_id
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1


def test_copy_trade_executed_idempotent_per_event(db_session: Session, email_spy):
    user = _make_user(db_session)
    trade_id = str(uuid.uuid4())

    first = notify_copy_trade_executed(
        session=db_session,
        user_id=user.id,
        trader_name="Bankroll",
        symbol="BTCUSDT",
        side="buy",
        amount=12.0,
        trade_id=trade_id,
    )
    second = notify_copy_trade_executed(
        session=db_session,
        user_id=user.id,
        trader_name="Bankroll",
        symbol="BTCUSDT",
        side="buy",
        amount=12.0,
        trade_id=trade_id,
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1

    other = notify_copy_trade_executed(
        session=db_session,
        user_id=user.id,
        trader_name="Bankroll",
        symbol="ETHUSDT",
        side="sell",
        amount=5.0,
        trade_id=str(uuid.uuid4()),
    )
    assert other.id != first.id
    assert _notification_count(db_session, user) == 2
    assert len(email_spy) == 2


def test_wallet_transfer_idempotent_per_event(db_session: Session, email_spy):
    user = _make_user(db_session)
    transaction_id = str(uuid.uuid4())

    first = email_wallet_transfer(
        session=db_session,
        user_id=user.id,
        amount=500.0,
        from_wallet="Main",
        to_wallet="Copy Trading",
        transaction_id=transaction_id,
    )
    second = email_wallet_transfer(
        session=db_session,
        user_id=user.id,
        amount=500.0,
        from_wallet="Main",
        to_wallet="Copy Trading",
        transaction_id=transaction_id,
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1

    other = email_wallet_transfer(
        session=db_session,
        user_id=user.id,
        amount=200.0,
        from_wallet="Main",
        to_wallet="Copy Trading",
        transaction_id=str(uuid.uuid4()),
    )
    assert other.id != first.id
    assert _notification_count(db_session, user) == 2
    assert len(email_spy) == 2


def test_investment_matured_idempotent_per_investment(db_session: Session, email_spy):
    user = _make_user(db_session)
    investment_id = str(uuid.uuid4())

    first = notify_investment_matured(
        session=db_session,
        user_id=user.id,
        plan_name="Growth Plan",
        amount=1000.0,
        investment_id=investment_id,
    )
    second = notify_investment_matured(
        session=db_session,
        user_id=user.id,
        plan_name="Growth Plan",
        amount=1000.0,
        investment_id=investment_id,
    )

    assert first.id == second.id
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1

    other = notify_investment_matured(
        session=db_session,
        user_id=user.id,
        plan_name="Growth Plan",
        amount=500.0,
        investment_id=str(uuid.uuid4()),
    )
    assert other.id != first.id
    assert _notification_count(db_session, user) == 2
    assert len(email_spy) == 2


def test_withdrawal_lifecycle_transitions_remain_distinct(db_session: Session, email_spy):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())

    approved = notify_withdrawal_approved(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    rejected = notify_withdrawal_rejected(
        session=db_session,
        user_id=user.id,
        amount=250.0,
        transaction_id=tx_id,
        reason="Policy",
    )
    delivered = email_withdrawal_received(
        session=db_session, user_id=user.id, amount=250.0, reference=tx_id
    )

    assert len({approved.id, rejected.id, delivered.id}) == 3
    assert _notification_count(db_session, user) == 3
    assert len(email_spy) == 3

    # Retrying the same transition returns the existing notification and no email.
    repeated = notify_withdrawal_approved(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    assert repeated.id == approved.id
    assert _notification_count(db_session, user) == 3
    assert len(email_spy) == 3


def test_unique_constraint_collision_recovers_existing_notification(
    db_session: Session,
):
    """The losing insert in a concurrent duplicate-key race recovers the winner.

    This deterministically exercises the IntegrityError recovery branch of
    ``_commit_or_recover`` using a real SQLite UNIQUE-constraint violation
    (true multi-connection concurrency is not practical with the in-memory
    StaticPool test setup).
    """
    user = _make_user(db_session)
    key = f"{NotificationType.COPY_TRADE_EXECUTED.value}:{uuid.uuid4()}"

    winner = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="Trade Executed",
        message="M",
        notification_type=NotificationType.COPY_TRADE_EXECUTED,
        idempotency_key=key,
    )

    duplicate = Notification(
        user_id=user.id,
        title="Trade Executed",
        message="M",
        notification_type=NotificationType.COPY_TRADE_EXECUTED,
        idempotency_key=key,
    )
    db_session.add(duplicate)

    recovered, created = NotificationService._commit_or_recover(
        session=db_session,
        notification=duplicate,
        user_id=user.id,
        idempotency_key=key,
    )

    assert created is False
    assert recovered.id == winner.id
    assert _notification_count(db_session, user) == 1

    # The session remains usable after the rollback.
    after = db_session.exec(
        select(Notification).where(Notification.user_id == user.id)
    ).all()
    assert len(after) == 1
    assert after[0].id == winner.id
