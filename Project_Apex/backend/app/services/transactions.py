"""Shared helpers for transaction finalization."""

from __future__ import annotations

import logging
from sqlmodel import Session

from app.core.time import utc_now
from app.models import Transaction, TransactionStatus, TransactionType, User
from app.services.notification_service import notify_deposit_confirmed

logger = logging.getLogger(__name__)


def finalize_deposit_transaction(
    *,
    session: Session,
    transaction: Transaction,
    notify: bool = True,
    notes: str | None = None,
) -> Transaction:
    """Mark a deposit transaction complete and refresh wallet-backed balances."""

    if transaction.transaction_type != TransactionType.DEPOSIT:
        raise ValueError("finalize_deposit_transaction only supports deposits.")

    user = transaction.user if transaction.user is not None else session.get(User, transaction.user_id)
    if user is None:
        raise ValueError("Associated user must exist to finalize deposit.")

    amount = float(transaction.amount or 0.0)
    current_wallet = float(user.wallet_balance or 0.0)
    current_legacy = float(user.balance or 0.0)

    user.wallet_balance = round(current_wallet + amount, 2)
    user.balance = round(current_legacy + amount, 2)

    transaction.status = TransactionStatus.COMPLETED
    transaction.executed_at = utc_now()
    if notes:
        suffix = f"Admin: {notes}"
        base_desc = transaction.description or ""
        separator = " | " if base_desc else ""
        transaction.description = f"{base_desc}{separator}{suffix}"

    session.add(user)
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    session.refresh(user)

    if notify:
        try:
            notify_deposit_confirmed(
                session=session,
                user_id=transaction.user_id,
                amount=transaction.amount,
                transaction_id=str(transaction.id),
            )
        except Exception as exc:
            logger.warning(f"Failed to send deposit confirmation notification: {exc}")

    return transaction
