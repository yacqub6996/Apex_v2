"""Tests for the centralized notification delivery/policy layer.

Proves:
- In-app notifications persist independently of email delivery.
- Email delivery routes through the centralized policy layer.
- Optional preference fields gate the corresponding email channels.
- Mandatory security email is never suppressed.
- Email-provider failure never blocks the in-app notification.
- A single notification path results in exactly one email attempt.
- Email-only events remain email-only (no Notification row).
"""

import uuid

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.models import (
    Notification,
    NotificationType,
    RiskTolerance,
    TraderProfile,
    User,
)
from app.services import notification_delivery
from app.services.notification_service import (
    NotificationService,
    email_portfolio_digest,
    email_withdrawal_requested,
    notify_copy_relationship_started,
    notify_deposit_confirmed,
    notify_security_alert,
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
    user = User(
        id=uuid.uuid4(),
        email="delivery@example.com",
        hashed_password="hash",
    )
    db_session.add(user)
    db_session.commit()
    return user


def _set_preferences(db_session: Session, user: User, **updates):
    NotificationService.update_preferences(
        session=db_session,
        user_id=user.id,
        updates=updates,
    )


def _notification_count(db_session: Session, user: User) -> int:
    return len(
        db_session.exec(
            select(Notification).where(Notification.user_id == user.id)
        ).all()
    )


def test_in_app_notification_persisted_without_email_when_email_disabled(
    db_session: Session, email_spy
):
    user = _make_user(db_session)
    _set_preferences(db_session, user, email_notifications=False)

    notif = notify_deposit_confirmed(
        session=db_session, user_id=user.id, amount=100.0
    )

    assert notif is not None
    assert notif.notification_type == NotificationType.DEPOSIT_CONFIRMED
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 0


def test_email_delivery_routed_through_policy_when_enabled(
    db_session: Session, email_spy
):
    user = _make_user(db_session)  # default preferences: email enabled

    notify_deposit_confirmed(session=db_session, user_id=user.id, amount=100.0)

    assert len(email_spy) == 1
    assert email_spy[0].to == user.email


def test_copy_trading_email_gated_by_copy_trading_alerts(
    db_session: Session, email_spy
):
    user = _make_user(db_session)
    trader = TraderProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        display_name="Trader",
        trader_code="TST100",
        copy_fee_percentage=10.0,
        risk_tolerance=RiskTolerance.MEDIUM,
        is_public=True,
    )
    db_session.add(trader)
    db_session.commit()

    _set_preferences(db_session, user, copy_trading_alerts=False)
    notify_copy_relationship_started(
        session=db_session, user_id=user.id, trader=trader, allocation=1000.0
    )
    assert _notification_count(db_session, user) == 1  # in-app still created
    assert len(email_spy) == 0  # email suppressed

    _set_preferences(db_session, user, copy_trading_alerts=True)
    notify_copy_relationship_started(
        session=db_session, user_id=user.id, trader=trader, allocation=1000.0
    )
    assert _notification_count(db_session, user) == 2
    assert len(email_spy) == 1


def test_withdrawal_email_gated_by_withdrawal_alerts(
    db_session: Session, email_spy
):
    user = _make_user(db_session)

    _set_preferences(db_session, user, withdrawal_alerts=False)
    email_withdrawal_requested(
        session=db_session, user_id=user.id, amount=250.0
    )
    assert _notification_count(db_session, user) == 0  # email-only event stays email-only
    assert len(email_spy) == 0

    _set_preferences(db_session, user, withdrawal_alerts=True)
    email_withdrawal_requested(
        session=db_session, user_id=user.id, amount=250.0
    )
    assert _notification_count(db_session, user) == 0
    assert len(email_spy) == 1


def test_market_email_gated_by_market_updates(db_session: Session, email_spy):
    user = _make_user(db_session)

    # market_updates defaults to False
    email_portfolio_digest(
        session=db_session, user_id=user.id, period="daily", summary="summary"
    )
    assert len(email_spy) == 0

    _set_preferences(db_session, user, market_updates=True)
    email_portfolio_digest(
        session=db_session, user_id=user.id, period="daily", summary="summary"
    )
    assert len(email_spy) == 1


def test_security_email_mandatory_regardless_of_preferences(
    db_session: Session, email_spy
):
    user = _make_user(db_session)
    _set_preferences(
        db_session,
        user,
        email_notifications=False,
        security_alerts=False,
    )

    notif = notify_security_alert(
        session=db_session,
        user_id=user.id,
        title="New device sign-in",
        message="New login detected.",
    )

    assert notif is not None
    assert notif.notification_type == NotificationType.SECURITY_ALERT
    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1  # mandatory email still delivered


def test_email_provider_failure_does_not_block_in_app_notification(
    db_session: Session, monkeypatch
):
    user = _make_user(db_session)

    def failing_send_email(payload):
        raise RuntimeError("SMTP_HOST is not configured")

    monkeypatch.setattr(notification_delivery, "send_email", failing_send_email)

    notif = notify_deposit_confirmed(
        session=db_session, user_id=user.id, amount=100.0
    )

    assert notif is not None
    assert _notification_count(db_session, user) == 1


def test_single_notification_path_attempts_email_once(
    db_session: Session, email_spy
):
    user = _make_user(db_session)

    notify_deposit_confirmed(session=db_session, user_id=user.id, amount=100.0)

    assert _notification_count(db_session, user) == 1
    assert len(email_spy) == 1
