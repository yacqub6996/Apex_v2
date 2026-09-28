"""Tests for the daily email-verification reminder job."""

import asyncio
from unittest.mock import AsyncMock, patch

from sqlmodel import Session

from app import crud
from app.core.time import utc_now
from app.models import UserCreate
from app.services.verification_reminders import send_verification_reminders
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(db: Session, *, verified: bool = False, active: bool = True):
    email = random_email()
    password = random_lower_string()
    user = crud.create_user(
        session=db, user_create=UserCreate(email=email, password=password)
    )
    if verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
    if not active:
        user.is_active = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_sends_reminders_to_unverified_active_users(db: Session) -> None:
    user_a = _create_user(db, verified=False)
    user_b = _create_user(db, verified=False)
    _create_user(db, verified=True)

    with patch(
        "app.services.verification_reminders.send_email",
        new=AsyncMock(return_value=None),
    ) as send:
        sent = asyncio.run(send_verification_reminders())

    assert sent == 2
    assert send.await_count == 2

    db.refresh(user_a)
    db.refresh(user_b)
    assert user_a.last_verification_reminder_sent_at is not None
    assert user_b.last_verification_reminder_sent_at is not None


def test_skips_users_reminded_recently(db: Session) -> None:
    user = _create_user(db, verified=False)
    user.last_verification_reminder_sent_at = utc_now()
    db.add(user)
    db.commit()

    with patch(
        "app.services.verification_reminders.send_email",
        new=AsyncMock(return_value=None),
    ) as send:
        sent = asyncio.run(send_verification_reminders())

    assert sent == 0
    send.assert_not_awaited()


def test_skips_inactive_users(db: Session) -> None:
    _create_user(db, verified=False, active=False)

    with patch(
        "app.services.verification_reminders.send_email",
        new=AsyncMock(return_value=None),
    ) as send:
        sent = asyncio.run(send_verification_reminders())

    assert sent == 0
    send.assert_not_awaited()
