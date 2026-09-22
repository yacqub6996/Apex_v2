"""Regression tests for the expanded canonical in-app notification taxonomy."""

import uuid

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.models import Notification, NotificationType, User
from app.services import notification_delivery
from app.services.notification_service import (
    NotificationService,
    email_admin_adjustment,
    email_chargeback_update,
    email_deposit_expired,
    email_deposit_failed,
    email_deposit_pending,
    email_document_expiry,
    email_drawdown_alert,
    email_platform_incident,
    email_portfolio_digest,
    email_trader_status_change,
    email_wallet_transfer,
    email_withdrawal_cancelled,
    email_withdrawal_failed,
    email_withdrawal_received,
    email_withdrawal_requested,
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
    user = User(id=uuid.uuid4(), email="taxonomy@example.com", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    return user


def _latest(db_session: Session, user: User) -> Notification | None:
    return db_session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).first()


def test_deposit_lifecycle_events_promoted(db_session: Session, email_spy):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())

    pending = email_deposit_pending(
        session=db_session,
        user_id=user.id,
        amount=100.0,
        network="BITCOIN",
        transaction_id=tx_id,
    )
    assert pending.notification_type == NotificationType.DEPOSIT_PENDING
    assert pending.related_entity_type == "transaction"
    assert str(pending.related_entity_id) == tx_id
    assert pending.action_url == "/transactions"
    assert "pending confirmation" in pending.message

    failed = email_deposit_failed(
        session=db_session, user_id=user.id, amount=100.0, transaction_id=tx_id
    )
    assert failed.notification_type == NotificationType.DEPOSIT_FAILED
    assert failed.action_url == "/transactions"

    expired = email_deposit_expired(
        session=db_session, user_id=user.id, amount=100.0, transaction_id=tx_id
    )
    assert expired.notification_type == NotificationType.DEPOSIT_EXPIRED
    assert expired.action_url == "/transactions"

    # Default preferences allow one email per event.
    assert len(email_spy) == 3


def test_withdrawal_lifecycle_events_promoted(db_session: Session, email_spy):
    user = _make_user(db_session)
    tx_id = str(uuid.uuid4())

    requested = email_withdrawal_requested(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    assert requested.notification_type == NotificationType.WITHDRAWAL_REQUESTED
    assert requested.action_url == "/transactions"

    cancelled = email_withdrawal_cancelled(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    assert cancelled.notification_type == NotificationType.WITHDRAWAL_CANCELLED

    failed = email_withdrawal_failed(
        session=db_session, user_id=user.id, amount=250.0, transaction_id=tx_id
    )
    assert failed.notification_type == NotificationType.WITHDRAWAL_FAILED

    delivered = email_withdrawal_received(
        session=db_session, user_id=user.id, amount=250.0, reference=tx_id
    )
    assert delivered.notification_type == NotificationType.WITHDRAWAL_DELIVERED
    assert str(delivered.related_entity_id) == tx_id
    assert delivered.action_url == "/transactions"

    assert len(email_spy) == 4


def test_wallet_transfer_promoted(db_session: Session, email_spy):
    user = _make_user(db_session)

    notif = email_wallet_transfer(
        session=db_session,
        user_id=user.id,
        amount=500.0,
        from_wallet="Main Wallet",
        to_wallet="Copy Trading Wallet",
    )
    assert notif.notification_type == NotificationType.WALLET_TRANSFER_COMPLETED
    assert notif.related_entity_type == "wallet_transfer"
    assert notif.action_url == "/dashboard"
    assert len(email_spy) == 1


def test_admin_adjustment_and_chargeback_promoted(db_session: Session, email_spy):
    user = _make_user(db_session)

    adjustment = email_admin_adjustment(
        session=db_session,
        user_id=user.id,
        amount=-25.0,
        reason="Fee correction",
    )
    assert adjustment.notification_type == NotificationType.ADMIN_ADJUSTMENT
    assert "debited" in adjustment.message
    assert adjustment.action_url == "/transactions"

    chargeback = email_chargeback_update(
        session=db_session,
        user_id=user.id,
        status="resolved",
        reference="ref-123",
    )
    assert chargeback.notification_type == NotificationType.CHARGEBACK_UPDATE
    assert chargeback.action_url == "/transactions"

    assert len(email_spy) == 2


def test_trader_status_and_drawdown_promoted(db_session: Session, email_spy):
    user = _make_user(db_session)

    status = email_trader_status_change(
        session=db_session, user_id=user.id, trader_name="Bankroll", new_status="paused"
    )
    assert status.notification_type == NotificationType.TRADER_STATUS_CHANGED
    assert status.related_entity_type == "trader_profile"
    assert status.action_url == "/copy-trading"

    drawdown = email_drawdown_alert(
        session=db_session, user_id=user.id, trader_name="Bankroll", drawdown=12.5
    )
    assert drawdown.notification_type == NotificationType.COPY_DRAWDOWN_ALERT
    assert drawdown.action_url == "/copy-trading"

    assert len(email_spy) == 2


def test_platform_incident_promoted_and_mandatory(db_session: Session, email_spy):
    user = _make_user(db_session)
    NotificationService.update_preferences(
        session=db_session,
        user_id=user.id,
        updates={"email_notifications": False},
    )

    notif = email_platform_incident(
        session=db_session,
        user_id=user.id,
        summary="Delayed withdrawals",
        details_url="https://status.example.com",
    )
    assert notif.notification_type == NotificationType.PLATFORM_INCIDENT
    assert notif.action_url == "https://status.example.com"
    assert len(email_spy) == 1  # mandatory email still delivered


def test_deliberately_email_only_events_stay_email_only(
    db_session: Session, email_spy
):
    user = _make_user(db_session)

    email_document_expiry(
        session=db_session,
        user_id=user.id,
        document="Passport",
        expires_at="2027-01-01",
    )
    email_portfolio_digest(
        session=db_session, user_id=user.id, period="daily", summary="digest"
    )

    notifications = db_session.exec(
        select(Notification).where(Notification.user_id == user.id)
    ).all()
    assert len(notifications) == 0
    # Document expiry email is sent (default email enabled); digest is gated by
    # market_updates defaulting to False.
    assert len(email_spy) == 1
