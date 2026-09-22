"""Centralized notification channel delivery and policy layer.

Separates notification persistence (the canonical in-app Notification row,
managed by NotificationService) from channel delivery (currently email).

Policy rules:
- ``email_notifications`` is the master switch for every optional email.
- ``copy_trading_alerts`` gates copy-trading related emails.
- ``withdrawal_alerts`` gates withdrawal related emails.
- ``market_updates`` gates market/digest/engagement emails.
- Security/account-protection emails are MANDATORY and are never suppressed by
  any preference. ``security_alerts`` is reserved for future non-critical
  security digests; it does not gate the current security events.
- ``browser_notifications`` is client-side only and is not evaluated here.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlmodel import Session, select

from app.models import User, UserNotificationPreferences
from app.services.email_sender import EmailPayload, send_email

logger = logging.getLogger(__name__)

CATEGORY_COPY_TRADING = "copy_trading"
CATEGORY_WITHDRAWAL = "withdrawal"
CATEGORY_MARKET = "market"
CATEGORY_SECURITY = "security"

_DEFAULT_PREFS = {
    "email_notifications": True,
    "browser_notifications": False,
    "copy_trading_alerts": True,
    "withdrawal_alerts": True,
    "market_updates": False,
    "security_alerts": True,
}


def get_preference_map(session: Session, user_id: uuid.UUID) -> dict[str, Any]:
    """Return persisted preferences, falling back to model defaults if absent."""
    preferences = session.exec(
        select(UserNotificationPreferences).where(
            UserNotificationPreferences.user_id == user_id
        )
    ).first()

    if preferences is None:
        return dict(_DEFAULT_PREFS)

    return {
        "email_notifications": preferences.email_notifications,
        "browser_notifications": preferences.browser_notifications,
        "copy_trading_alerts": preferences.copy_trading_alerts,
        "withdrawal_alerts": preferences.withdrawal_alerts,
        "market_updates": preferences.market_updates,
        "security_alerts": preferences.security_alerts,
    }


def should_deliver_email(
    preferences: dict[str, Any],
    *,
    category: str | None = None,
    mandatory: bool = False,
) -> bool:
    """Decide whether an email should be delivered for a notification."""
    if mandatory:
        return True

    if category == CATEGORY_SECURITY:
        # Security/account-protection email is mandatory.
        return True

    if not preferences.get("email_notifications", True):
        return False

    if category == CATEGORY_COPY_TRADING and not preferences.get(
        "copy_trading_alerts", True
    ):
        return False

    if category == CATEGORY_WITHDRAWAL and not preferences.get(
        "withdrawal_alerts", True
    ):
        return False

    if category == CATEGORY_MARKET and not preferences.get("market_updates", False):
        return False

    return True


def deliver_email(
    session: Session,
    user_id: uuid.UUID,
    *,
    subject: str,
    message: str,
    html: str | None = None,
    category: str | None = None,
    mandatory: bool = False,
) -> bool:
    """Route an email through the centralized policy layer.

    Returns True if the email was attempted/sent, False if suppressed by policy
    or skipped because the user has no email address. Never raises: an
    email-provider failure must not affect the canonical in-app notification,
    which is committed separately by NotificationService.
    """
    preferences = get_preference_map(session, user_id)

    if not should_deliver_email(preferences, category=category, mandatory=mandatory):
        return False

    user = session.get(User, user_id)
    if not user or not getattr(user, "email", None):
        return False

    try:
        send_email(EmailPayload(to=user.email, subject=subject, message=message, html=html))
        return True
    except Exception:
        logger.warning(
            "email_notification_failed",
            exc_info=True,
            extra={"user_id": str(user_id), "subject": subject, "category": category},
        )
        return False
