"""Regression tests for notification domain/API foundations.

Covers:
- Safe pagination (limit clamp, offset, newest-first, total count).
- Unread count correctness (database COUNT semantics).
- PATCH honors is_read including mark-unread.
- Persistent notification preferences with GET/PUT.
"""

import uuid
from datetime import timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.routes.notifications import (
    get_notification_preferences,
    get_notifications,
    get_unread_count,
    mark_all_read,
    update_notification,
    update_notification_preferences,
)
from app.core.time import utc_now
from app.models import (
    Notification,
    NotificationType,
    NotificationUpdate,
    User,
    UserNotificationPreferences,
    UserNotificationPreferencesUpdate,
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


def _make_user(db_session: Session) -> User:
    user = User(
        id=uuid.uuid4(),
        email="notif@example.com",
        hashed_password="hash",
    )
    db_session.add(user)
    db_session.commit()
    return user


def _make_notification(
    db_session: Session,
    user: User,
    *,
    title: str,
    is_read: bool = False,
    created_at=None,
) -> Notification:
    notification = Notification(
        user_id=user.id,
        title=title,
        message=f"Message for {title}",
        notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
        is_read=is_read,
        created_at=created_at or utc_now(),
    )
    db_session.add(notification)
    db_session.commit()
    return notification


def test_get_notifications_paginates_and_clamps(db_session: Session):
    user = _make_user(db_session)
    base = utc_now()
    for i in range(5):
        _make_notification(
            db_session,
            user,
            title=f"Notification {i}",
            created_at=base - timedelta(seconds=i),
        )

    page_1 = get_notifications(
        current_user=user, session=db_session, limit=2, offset=0
    )
    assert len(page_1.data) == 2
    assert page_1.count == 5
    assert page_1.data[0].title == "Notification 0"  # newest first

    page_2 = get_notifications(
        current_user=user, session=db_session, limit=2, offset=2
    )
    assert len(page_2.data) == 2
    assert page_2.data[0].title == "Notification 2"

    page_3 = get_notifications(
        current_user=user, session=db_session, limit=2, offset=4
    )
    assert len(page_3.data) == 1
    assert page_3.data[0].title == "Notification 4"

    # Negative offset and oversized limit are clamped safely
    clamped = get_notifications(
        current_user=user, session=db_session, limit=999, offset=-5
    )
    assert len(clamped.data) == 5
    assert clamped.count == 5


def test_unread_count_reflects_read_state(db_session: Session):
    user = _make_user(db_session)
    for i in range(3):
        _make_notification(db_session, user, title=f"Unread {i}", is_read=False)
    for i in range(2):
        _make_notification(db_session, user, title=f"Read {i}", is_read=True)

    assert get_unread_count(current_user=user, session=db_session) == {"count": 3}

    read_one = db_session.exec(
        select(Notification).where(Notification.title == "Unread 0")
    ).first()
    assert read_one is not None
    update_notification(
        notification_id=read_one.id,
        current_user=user,
        notification_update=NotificationUpdate(is_read=True),
        session=db_session,
    )
    assert get_unread_count(current_user=user, session=db_session) == {"count": 2}


def test_patch_honors_is_read_and_mark_unread(db_session: Session):
    user = _make_user(db_session)
    notification = _make_notification(
        db_session, user, title="Marked read", is_read=False
    )

    updated = update_notification(
        notification_id=notification.id,
        current_user=user,
        notification_update=NotificationUpdate(is_read=True),
        session=db_session,
    )
    assert updated.is_read is True
    assert updated.read_at is not None

    # Body-less PATCH preserves the legacy mark-as-read behavior
    updated = update_notification(
        notification_id=notification.id,
        current_user=user,
        notification_update=NotificationUpdate(),
        session=db_session,
    )
    assert updated.is_read is True

    # Explicit is_read=False marks unread
    updated = update_notification(
        notification_id=notification.id,
        current_user=user,
        notification_update=NotificationUpdate(is_read=False),
        session=db_session,
    )
    assert updated.is_read is False
    assert updated.read_at is None


def test_preferences_default_then_persisted_update(db_session: Session):
    user = _make_user(db_session)

    defaults = get_notification_preferences(current_user=user, session=db_session)
    assert defaults.email_notifications is True
    assert defaults.browser_notifications is False
    assert defaults.copy_trading_alerts is True
    assert defaults.withdrawal_alerts is True
    assert defaults.market_updates is False
    assert defaults.security_alerts is True
    assert defaults.user_id == user.id

    updated = update_notification_preferences(
        current_user=user,
        preferences_update=UserNotificationPreferencesUpdate(
            email_notifications=False,
            market_updates=True,
        ),
        session=db_session,
    )
    assert updated.email_notifications is False
    assert updated.market_updates is True
    assert updated.security_alerts is True  # untouched

    fetched = get_notification_preferences(current_user=user, session=db_session)
    assert fetched.email_notifications is False
    assert fetched.market_updates is True

    stored = db_session.exec(
        select(UserNotificationPreferences).where(
            UserNotificationPreferences.user_id == user.id
        )
    ).first()
    assert stored is not None
    assert stored.email_notifications is False


def test_mark_all_read_uses_service(db_session: Session):
    user = _make_user(db_session)
    for i in range(3):
        _make_notification(db_session, user, title=f"Unread {i}", is_read=False)

    result = mark_all_read(current_user=user, session=db_session)
    assert result == {"marked_read": 3}
    assert get_unread_count(current_user=user, session=db_session) == {"count": 0}
