"""
Notification Service

Handles creation and management of user notifications.
"""
import uuid
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.models import (
    Notification,
    NotificationCreate,
    NotificationType,
    User,
    TraderProfile,
)
from app.core.time import utc_now
from app.services.email_sender import EmailPayload, send_email, render_branded_html, get_frontend_base
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing user notifications"""

    @staticmethod
    def create_notification(
        session: Session,
        user_id: uuid.UUID,
        title: str,
        message: str,
        notification_type: NotificationType,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None,
        action_url: Optional[str] = None,
    ) -> Notification:
        """Create a new notification for a user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            action_url=action_url,
            is_read=False,
            created_at=utc_now(),
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        return notification

    @staticmethod
    def get_user_notifications(
        session: Session,
        user_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50,
    ) -> list[Notification]:
        """Get notifications for a user"""
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        
        notifications = session.exec(query).all()
        return list(notifications)

    @staticmethod
    def mark_as_read(
        session: Session,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Optional[Notification]:
        """Mark a notification as read"""
        notification = session.get(Notification, notification_id)
        
        if notification and notification.user_id == user_id:
            notification.is_read = True
            notification.read_at = utc_now()
            session.add(notification)
            session.commit()
            session.refresh(notification)
            return notification
        
        return None

    @staticmethod
    def mark_all_as_read(
        session: Session,
        user_id: uuid.UUID,
    ) -> int:
        """Mark all notifications as read for a user"""
        notifications = session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).all()
        
        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.read_at = utc_now()
            session.add(notification)
            count += 1
        
        session.commit()
        return count

    @staticmethod
    def get_unread_count(
        session: Session,
        user_id: uuid.UUID,
    ) -> int:
        """Get count of unread notifications for a user"""
        count = session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).all()
        return len(list(count))

    @staticmethod
    def delete_notification(
        session: Session,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Delete a notification"""
        notification = session.get(Notification, notification_id)
        
        if notification and notification.user_id == user_id:
            session.delete(notification)
            session.commit()
            return True
        
        return False


def _email_user(session: Session, user_id: uuid.UUID, subject: str, message: str, html: str | None = None) -> None:
    user = session.get(User, user_id)
    if not user or not getattr(user, "email", None):
        return
    try:
        send_email(EmailPayload(to=user.email, subject=subject, message=message, html=html))
    except Exception:
        logger.warning(
            "email_notification_failed",
            exc_info=True,
            extra={"user_id": str(user_id), "subject": subject},
        )


# Convenience functions for common notification types

def notify_kyc_approved(session: Session, user_id: uuid.UUID) -> Notification:
    """Send notification when KYC is approved"""
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="KYC Verification Approved",
        message="Your identity verification has been approved. You now have full access to all platform features.",
        notification_type=NotificationType.KYC_APPROVED,
        related_entity_type="kyc",
        related_entity_id=str(user_id),
        action_url="/dashboard",
    )
    _email_user(
        session,
        user_id,
        "KYC approved",
        "Your identity verification has been approved. You now have full access to all platform features.",
        html=render_branded_html(
            title="KYC approved",
            body="Your identity verification has been approved. You now have full access to all platform features.",
            cta_text="Go to dashboard",
            cta_url=f"{get_frontend_base()}/dashboard" if get_frontend_base() else None,
        ),
    )
    return notif


def notify_kyc_submitted(session: Session, user_id: uuid.UUID) -> Notification:
    """Send notification when KYC submission is received."""
    message = "We received your KYC submission and are reviewing it. We’ll notify you once it’s approved."
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="KYC Submission Received",
        message=message,
        notification_type=NotificationType.KYC_SUBMITTED,
        related_entity_type="kyc",
        related_entity_id=str(user_id),
        action_url="/kyc",
    )
    _email_user(
        session,
        user_id,
        "KYC submission received",
        message,
        html=render_branded_html(
            title="KYC submission received",
            body=message,
            cta_text="Check status",
            cta_url=f"{get_frontend_base()}/kyc" if get_frontend_base() else None,
            status="info",
        ),
    )
    return notif


def notify_kyc_rejected(
    session: Session,
    user_id: uuid.UUID,
    reason: str
) -> Notification:
    """Send notification when KYC is rejected"""
    message = f"Your KYC verification was not approved. Reason: {reason}. Please review and resubmit your documents."
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="KYC Verification Requires Attention",
        message=message,
        notification_type=NotificationType.KYC_REJECTED,
        related_entity_type="kyc",
        related_entity_id=str(user_id),
        action_url="/kyc",
    )
    _email_user(
        session,
        user_id,
        "KYC requires attention",
        message,
        html=render_branded_html(
            title="KYC requires attention",
            body=message,
            cta_text="Review KYC",
            cta_url=f"{get_frontend_base()}/kyc" if get_frontend_base() else None,
        ),
    )
    return notif


def notify_withdrawal_approved(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    transaction_id: str,
) -> Notification:
    """Send notification when withdrawal is approved"""
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="Withdrawal Approved",
        message=f"Your withdrawal request of ${amount:.2f} has been approved and processed.",
        notification_type=NotificationType.WITHDRAWAL_APPROVED,
        related_entity_type="transaction",
        related_entity_id=transaction_id,
        action_url="/transactions",
    )
    _email_user(
        session,
        user_id,
        "Withdrawal approved",
        f"Your withdrawal request of ${amount:.2f} has been approved and processed.",
        html=render_branded_html(
            title="Withdrawal approved",
            body=f"Your withdrawal request of ${amount:.2f} has been approved and processed.",
            cta_text="View transactions",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )
    return notif


def notify_withdrawal_rejected(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    transaction_id: str,
    reason: str,
) -> Notification:
    """Send notification when withdrawal is rejected"""
    message = f"Your withdrawal request of ${amount:.2f} was rejected. Reason: {reason}."
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="Withdrawal Rejected",
        message=message,
        notification_type=NotificationType.WITHDRAWAL_REJECTED,
        related_entity_type="transaction",
        related_entity_id=transaction_id,
        action_url="/transactions",
    )
    _email_user(
        session,
        user_id,
        "Withdrawal rejected",
        message,
        html=render_branded_html(
            title="Withdrawal rejected",
            body=message,
            cta_text="View transactions",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )
    return notif


def notify_roi_received(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    source: str,
) -> Notification:
    """Send notification when ROI is received"""
    message = f"You have received ${amount:.2f} in ROI from {source}."
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="ROI Payment Received",
        message=message,
        notification_type=NotificationType.ROI_RECEIVED,
        related_entity_type="roi",
        action_url="/dashboard",
    )
    _email_user(
        session,
        user_id,
        "ROI received",
        message,
        html=render_branded_html(
            title="ROI received",
            body=message,
            cta_text="View performance",
            cta_url=f"{get_frontend_base()}/dashboard" if get_frontend_base() else None,
            status="success",
            preheader="Your ROI has been added to your balance.",
        ),
    )
    return notif


def notify_investment_matured(
    session: Session,
    user_id: uuid.UUID,
    plan_name: str,
    amount: float,
) -> Notification:
    """Send notification when investment matures"""
    message = f"Your {plan_name} investment has matured. ${amount:.2f} has been released to your wallet."
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="Investment Matured",
        message=message,
        notification_type=NotificationType.INVESTMENT_MATURED,
        related_entity_type="investment",
        action_url="/plans",
    )
    _email_user(
        session,
        user_id,
        "Investment matured",
        message,
        html=render_branded_html(
            title="Investment matured",
            body=message,
            cta_text="Review your plans",
            cta_url=f"{get_frontend_base()}/plans" if get_frontend_base() else None,
            status="success",
        ),
    )
    return notif


def notify_deposit_confirmed(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    transaction_id: str | None = None,
) -> Notification:
    """Send notification when deposit is confirmed"""
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="Deposit Confirmed",
        message=f"Your deposit of ${amount:.2f} has been confirmed and added to your wallet.",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        related_entity_type="transaction",
        related_entity_id=transaction_id,
        action_url="/dashboard",
    )
    _email_user(
        session,
        user_id,
        "Deposit confirmed",
        "Your deposit has been confirmed and added to your wallet.",
        html=render_branded_html(
            title="Deposit confirmed",
            body=f"Your deposit of ${amount:.2f} has been confirmed and added to your wallet.",
            cta_text="Go to dashboard",
            cta_url=f"{get_frontend_base()}/dashboard" if get_frontend_base() else None,
        ),
    )
    return notif


def email_wallet_transfer(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    from_wallet: str,
    to_wallet: str,
) -> None:
    """Email user when funds are moved between internal wallets."""
    body = (
        f"A transfer of ${amount:.2f} was completed from your {from_wallet} "
        f"to your {to_wallet} wallet."
    )
    _email_user(
        session,
        user_id,
        "Wallet transfer completed",
        body,
        html=render_branded_html(
            title="Wallet transfer completed",
            body=body,
            cta_text="View balances",
            cta_url=f"{get_frontend_base()}/dashboard" if get_frontend_base() else None,
            status="info",
        ),
    )


# Email-only helpers for lifecycle events not backed by specific NotificationTypes
def email_deposit_pending(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    network: str | None = None,
    address: str | None = None,
    expires_at: str | None = None,
) -> None:
    body_lines = [
        f"Amount: ${amount:.2f}",
    ]
    if network:
        body_lines.append(f"Network: {network}")
    if address:
        body_lines.append(f"Deposit address: {address}")
    if expires_at:
        body_lines.append(f"Expires at: {expires_at}")
    body_lines.append("We will notify you once confirmed. If you didn't request this, please ignore.")
    body_text = "\n".join(body_lines)
    _email_user(
        session,
        user_id,
        "Deposit started",
        body_text,
        html=render_branded_html(
            title="Deposit started",
            body="<br>".join(body_lines),
            cta_text="View deposit status",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )


def email_deposit_failed(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    reason: str | None = None,
) -> None:
    reason_text = f" Reason: {reason}" if reason else ""
    body = f"Your deposit of ${amount:.2f} could not be completed.{reason_text} Start a new deposit to continue."
    _email_user(
        session,
        user_id,
        "Deposit failed",
        body,
        html=render_branded_html(
            title="Deposit failed",
            body=body,
            cta_text="Start a new deposit",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )


def email_withdrawal_requested(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    source: str | None = None,
) -> None:
    body = f"Your withdrawal request for ${amount:.2f} has been received." + (f" Source: {source}." if source else "")
    _email_user(
        session,
        user_id,
        "Withdrawal requested",
        body,
        html=render_branded_html(
            title="Withdrawal requested",
            body=body,
            cta_text="View withdrawals",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )


def email_withdrawal_cancelled(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
) -> None:
    body = f"Your withdrawal request for ${amount:.2f} was cancelled. If you still need funds, submit a new request."
    _email_user(
        session,
        user_id,
        "Withdrawal cancelled",
        body,
        html=render_branded_html(
            title="Withdrawal cancelled",
            body=body,
            cta_text="Submit new withdrawal",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )


def email_withdrawal_failed(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    reason: str | None = None,
) -> None:
    body = f"Your withdrawal for ${amount:.2f} could not be processed." + (f" Reason: {reason}" if reason else "")
    _email_user(
        session,
        user_id,
        "Withdrawal failed",
        body,
        html=render_branded_html(
            title="Withdrawal failed",
            body=body,
            cta_text="View withdrawals",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
        ),
    )


def notify_copy_trade_executed(
    session: Session,
    user_id: uuid.UUID,
    trader_name: str,
    symbol: str,
    side: str,
    amount: float,
) -> Notification:
    """Send notification when a trade is executed by a trader the user is copying"""
    message = f"{trader_name} executed a {side} trade for {symbol}. Amount: ${amount:.2f}"
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title="Trade Executed",
        message=message,
        notification_type=NotificationType.COPY_TRADE_EXECUTED,
        related_entity_type="trade",
        action_url="/copy-trading",
    )
    _email_user(
        session,
        user_id,
        "Copy trade executed",
        message,
        html=render_branded_html(
            title="Copy trade executed",
            body=message,
            cta_text="View copy performance",
            cta_url=f"{get_frontend_base()}/copy-trading" if get_frontend_base() else None,
            status="success",
        ),
    )
    return notif


def notify_copy_relationship_started(
    session: Session,
    user_id: uuid.UUID,
    trader: TraderProfile,
    allocation: float,
) -> Notification:
    """Notify when a new copy-trading relationship is started."""
    trader_name = trader.display_name or trader.user.full_name if getattr(trader, "user", None) else "Trader"
    title = "Copy trading started"
    message = (
        f"You started copying {trader_name} with an allocation of ${allocation:.2f}. "
        "Your funds will now follow this trader's executions."
    )
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.COPY_TRADE_EXECUTED,
        related_entity_type="copy_relationship",
        related_entity_id=str(trader.id),
        action_url="/copy-trading",
    )
    _email_user(
        session,
        user_id,
        title,
        message,
        html=render_branded_html(
            title=title,
            body=message,
            cta_text="View copy trading",
            cta_url=f"{get_frontend_base()}/copy-trading" if get_frontend_base() else None,
            status="success",
        ),
    )
    return notif


def notify_copy_relationship_status_changed(
    session: Session,
    user_id: uuid.UUID,
    trader: TraderProfile,
    new_status: str,
    allocation: float | None = None,
) -> Notification:
    """Notify when a copy-trading relationship is paused, resumed, or stopped."""
    trader_name = trader.display_name or trader.user.full_name if getattr(trader, "user", None) else "Trader"
    status_label = new_status.capitalize()
    title = f"Copy relationship {status_label.lower()}"

    base = f"Your copy relationship with {trader_name} was {status_label.lower()}."
    if new_status.upper() == "STOPPED" and allocation is not None:
        base += f" Your copy equity of approximately ${allocation:.2f} (allocation plus PnL) has been released back to your Copy Trading Wallet."
    elif new_status.upper() == "PAUSED":
        base += " No new trades will be copied while paused."
    elif new_status.upper() == "ACTIVE":
        base += " Trades from this trader will resume being copied."

    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title=title,
        message=base,
        notification_type=NotificationType.COPY_TRADE_EXECUTED,
        related_entity_type="copy_relationship",
        related_entity_id=str(trader.id),
        action_url="/copy-trading",
    )
    _email_user(
        session,
        user_id,
        title,
        base,
        html=render_branded_html(
            title=title,
            body=base,
            cta_text="Manage copy trading",
            cta_url=f"{get_frontend_base()}/copy-trading" if get_frontend_base() else None,
            status="info",
        ),
    )
    return notif


def email_deposit_expired(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    expires_at: str | None = None,
) -> None:
    expiry = f" The address expired at {expires_at}." if expires_at else ""
    body = f"Your deposit of ${amount:.2f} expired before it was confirmed.{expiry} Start a new deposit to continue."
    _email_user(
        session,
        user_id,
        "Deposit expired",
        body,
        html=render_branded_html(
            title="Deposit expired",
            body=body,
            cta_text="Start a new deposit",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
            status="error",
        ),
    )


def email_withdrawal_received(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    reference: str | None = None,
) -> None:
    body = f"Your withdrawal of ${amount:.2f} has been delivered to your destination."
    if reference:
        body += f" Reference: {reference}."
    _email_user(
        session,
        user_id,
        "Withdrawal delivered",
        body,
        html=render_branded_html(
            title="Withdrawal delivered",
            body=body,
            cta_text="View transactions",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
            status="success",
        ),
    )


def email_portfolio_digest(
    session: Session,
    user_id: uuid.UUID,
    period: str,
    summary: str,
    cta_url: str | None = None,
) -> None:
    _email_user(
        session,
        user_id,
        f"{period.capitalize()} portfolio digest",
        summary,
        html=render_branded_html(
            title=f"{period.capitalize()} portfolio digest",
            body=summary,
            cta_text="View portfolio",
            cta_url=cta_url or (f"{get_frontend_base()}/dashboard" if get_frontend_base() else None),
            status="info",
        ),
    )


def email_allocation_drift(
    session: Session,
    user_id: uuid.UUID,
    drift_summary: str,
    cta_url: str | None = None,
) -> None:
    _email_user(
        session,
        user_id,
        "Allocation drift alert",
        drift_summary,
        html=render_branded_html(
            title="Allocation drift alert",
            body=drift_summary,
            cta_text="Rebalance now",
            cta_url=cta_url or (f"{get_frontend_base()}/portfolio" if get_frontend_base() else None),
            status="info",
        ),
    )


def email_trader_status_change(
    session: Session,
    user_id: uuid.UUID,
    trader_name: str,
    new_status: str,
) -> None:
    body = f"{trader_name} status changed to {new_status}. Your copy strategy may be affected."
    _email_user(
        session,
        user_id,
        "Trader status update",
        body,
        html=render_branded_html(
            title="Trader status update",
            body=body,
            cta_text="View copy settings",
            cta_url=f"{get_frontend_base()}/copy-trading" if get_frontend_base() else None,
            status="info",
        ),
    )


def email_drawdown_alert(
    session: Session,
    user_id: uuid.UUID,
    trader_name: str,
    drawdown: float,
) -> None:
    body = f"{trader_name} hit a drawdown of {drawdown:.2f}%. Review your copy allocation."
    _email_user(
        session,
        user_id,
        "Drawdown alert",
        body,
        html=render_branded_html(
            title="Drawdown alert",
            body=body,
            cta_text="Adjust allocation",
            cta_url=f"{get_frontend_base()}/copy-trading" if get_frontend_base() else None,
            status="error",
        ),
    )


def email_new_device_login(
    session: Session,
    user_id: uuid.UUID,
    device: str,
    location: str | None = None,
) -> None:
    loc = f" from {location}" if location else ""
    message = f"New login detected on {device}{loc}. If this wasn't you, secure your account."
    notify_security_alert(
        session=session,
        user_id=user_id,
        title="New device sign-in",
        message=message,
        action_url="/settings/security",
    )


def email_profile_change(
    session: Session,
    user_id: uuid.UUID,
    field: str,
) -> None:
    message = f"Your {field} was changed. If you didn't make this change, secure your account."
    notify_security_alert(
        session=session,
        user_id=user_id,
        title=f"{field.capitalize()} changed",
        message=message,
        action_url="/settings/security",
    )


def email_mfa_event(
    session: Session,
    user_id: uuid.UUID,
    event: str,
) -> None:
    message = f"MFA {event} for your account. Keep your backup codes safe."
    notify_security_alert(
        session=session,
        user_id=user_id,
        title=f"MFA {event}",
        message=message,
        action_url="/settings/security",
    )


def email_account_lock_or_hold(
    session: Session,
    user_id: uuid.UUID,
    reason: str,
) -> None:
    notify_security_alert(
        session=session,
        user_id=user_id,
        title="Account locked",
        message=reason,
        action_url="/support",
    )


def email_admin_adjustment(
    session: Session,
    user_id: uuid.UUID,
    amount: float,
    reason: str,
    action_label: str | None = None,
) -> None:
    label = action_label or "Balance update"
    direction = "credited" if amount >= 0 else "debited"
    body = f"{label}: your account was {direction} by ${abs(amount):.2f}. Reason: {reason}."
    _email_user(
        session,
        user_id,
        f"{label} applied",
        body,
        html=render_branded_html(
            title=label,
            body=body,
            cta_text="View ledger",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
            status="info",
        ),
    )


def email_chargeback_update(
    session: Session,
    user_id: uuid.UUID,
    status: str,
    reference: str | None = None,
) -> None:
    ref = f" Reference: {reference}." if reference else ""
    body = f"Your dispute/chargeback status: {status}.{ref}"
    _email_user(
        session,
        user_id,
        "Dispute status updated",
        body,
        html=render_branded_html(
            title="Dispute status updated",
            body=body,
            cta_text="View details",
            cta_url=f"{get_frontend_base()}/transactions" if get_frontend_base() else None,
            status="info",
        ),
    )


def email_compliance_review(
    session: Session,
    user_id: uuid.UUID,
    state: str,
    notes: str | None = None,
) -> None:
    extra = f" Notes: {notes}" if notes else ""
    message = f"Your account is under compliance review: {state}.{extra}"
    notify_security_alert(
        session=session,
        user_id=user_id,
        title="Compliance review update",
        message=message,
        action_url="/kyc",
    )


def email_document_expiry(
    session: Session,
    user_id: uuid.UUID,
    document: str,
    expires_at: str,
) -> None:
    body = f"Your {document} expires on {expires_at}. Please upload a refreshed document to avoid interruptions."
    _email_user(
        session,
        user_id,
        "Document expiry reminder",
        body,
        html=render_branded_html(
            title="Document expiry reminder",
            body=body,
            cta_text="Update documents",
            cta_url=f"{get_frontend_base()}/kyc" if get_frontend_base() else None,
            status="info",
        ),
    )


def email_engagement_nudge(
    session: Session,
    user_id: uuid.UUID,
    title: str,
    body: str,
    cta_text: str | None = None,
    cta_url: str | None = None,
) -> None:
    _email_user(
        session,
        user_id,
        title,
        body,
        html=render_branded_html(
            title=title,
            body=body,
            cta_text=cta_text,
            cta_url=cta_url or (f"{get_frontend_base()}/dashboard" if get_frontend_base() else None),
            status="info",
        ),
    )


def email_platform_incident(
    session: Session,
    user_id: uuid.UUID,
    summary: str,
    details_url: str | None = None,
) -> None:
    _email_user(
        session,
        user_id,
        "Platform incident update",
        summary,
        html=render_branded_html(
            title="Platform incident update",
            body=summary,
            cta_text="Incident details" if details_url else None,
            cta_url=details_url,
            status="error",
        ),
    )


def notify_security_alert(
    session: Session,
    user_id: uuid.UUID,
    title: str,
    message: str,
    action_url: str | None = "/settings/security",
) -> Notification:
    """Send a security alert notification and email"""
    base_url = get_frontend_base()
    cta_url = action_url
    if base_url and action_url and not action_url.startswith("http"):
        cta_url = f"{base_url}{action_url}"
    notif = NotificationService.create_notification(
        session=session,
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.SECURITY_ALERT,
        related_entity_type="security",
        related_entity_id=str(user_id),
        action_url=action_url,
    )
    _email_user(
        session,
        user_id,
        f"Security alert: {title}",
        message,
        html=render_branded_html(
            title=title,
            body=message,
            cta_text="Secure your account",
            cta_url=cta_url,
            status="error",
            preheader="Important security notice for your Apex account.",
        ),
    )
    return notif
