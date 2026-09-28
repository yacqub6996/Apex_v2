"""Daily email-verification reminder job.

Unverified, active users receive a fresh verification link once per day until
they verify. When outbound email is not configured, ``send_email`` logs the
link as a placeholder so development environments remain debuggable.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from sqlmodel import Session, select

from app.core.db import engine
from app.core.time import utc_now
from app.models import User
from app.utils import (
    generate_email_verification_email,
    generate_email_verification_token,
    send_email,
)

logger = logging.getLogger(__name__)

# Send reminders at most once every ~22 hours so a missed daily run still works.
REMINDER_THRESHOLD_HOURS = 22


async def send_verification_reminders() -> int:
    """Send verification reminders to eligible unverified users.

    Returns the number of reminder emails dispatched.
    """
    cutoff = utc_now() - timedelta(hours=REMINDER_THRESHOLD_HOURS)
    sent = 0

    with Session(engine) as session:
        users = session.exec(
            select(User).where(
                User.email_verified == False,  # noqa: E712 - SQLAlchemy expression
                User.is_active == True,  # noqa: E712 - SQLAlchemy expression
            )
        ).all()

        for user in users:
            last_sent = user.last_verification_reminder_sent_at
            if last_sent is not None and last_sent > cutoff:
                continue

            token = generate_email_verification_token(user.email)
            email_data = generate_email_verification_email(user.email, token)
            try:
                await send_email(
                    email_to=user.email,
                    subject=email_data.subject,
                    html_content=email_data.html_content,
                )
            except Exception:
                logger.warning(
                    "verification_reminder_send_failed",
                    extra={"user_id": str(user.id)},
                    exc_info=True,
                )
                continue

            user.last_verification_reminder_sent_at = utc_now()
            session.add(user)
            sent += 1

        session.commit()

    logger.info("verification_reminders_dispatched", extra={"sent": sent})
    return sent
