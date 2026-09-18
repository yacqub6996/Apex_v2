"""Shared helpers for transaction finalization."""

from __future__ import annotations

import logging
import re
import uuid
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

    # Check if this deposit was a copy trading commission payment
    is_commission = False
    if transaction.metadata_payload and transaction.metadata_payload.get("type") == "COPY_TRADING_COMMISSION":
        is_commission = True
    elif transaction.description and "COPY_TRADING_COMMISSION" in transaction.description:
        is_commission = True

    # If this is an ordinary deposit, credit user's Main Wallet (wallet_balance and legacy balance).
    # Commission deposits are standalone trader obligations and MUST NOT credit Main Wallet.
    if not is_commission:
        current_wallet = float(user.wallet_balance or 0.0)
        current_legacy = float(user.balance or 0.0)
        user.wallet_balance = round(current_wallet + amount, 2)
        user.balance = round(current_legacy + amount, 2)
        session.add(user)
    else:
        # Commission deposit confirmed: release previously held session equity to CopyTradingWallet.
        # Idempotency guarantee: only release if equity has not already been released.
        copy_id_val = None
        if transaction.metadata_payload and transaction.metadata_payload.get("copy_id"):
            copy_id_val = transaction.metadata_payload.get("copy_id")
        elif transaction.description and "for copy " in transaction.description:
            try:
                match = re.search(r"for copy ([0-9a-fA-F-]+)", transaction.description)
                if match:
                    copy_id_val = match.group(1)
            except Exception:
                pass

        if copy_id_val:
            try:
                copy_uuid = uuid.UUID(str(copy_id_val))
                from app.models import CopyTradingWallet, UserTraderCopy

                copy_rel = session.get(UserTraderCopy, copy_uuid)
                if copy_rel:
                    settings = dict(copy_rel.copy_settings or {})
                    equity_released = settings.get("equity_released", False)
                    held_amount = float(settings.get("held_released_equity", 0.0) or 0.0)
                    if held_amount <= 0.0 and transaction.metadata_payload:
                        held_amount = float(transaction.metadata_payload.get("held_released_equity", 0.0) or 0.0)

                    if not equity_released and held_amount > 0:
                        session.refresh(user, attribute_names=["copy_trading_wallet"])
                        if user.copy_trading_wallet is None:
                            user.copy_trading_wallet = CopyTradingWallet(user_id=user.id, balance=0.0)
                            session.add(user.copy_trading_wallet)
                            session.flush()

                        current_copy_balance = float(user.copy_trading_wallet.balance or 0.0)
                        user.copy_trading_wallet.balance = round(current_copy_balance + held_amount, 2)
                        session.add(user.copy_trading_wallet)

                        # Update settings to guarantee exactly-once release
                        settings["equity_released"] = True
                        settings["held_released_equity"] = 0.0
                        settings["equity_released_at"] = utc_now().isoformat()
                        settings["commission_deposit_transaction_id"] = str(transaction.id)
                        copy_rel.copy_settings = settings
                        session.add(copy_rel)
                        logger.info(
                            f"Released held equity of ${held_amount:.2f} to CopyTradingWallet for user {user.id} (copy {copy_rel.id})"
                        )
            except Exception as exc:
                logger.error(f"Error releasing held equity during commission finalization: {exc}")

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
