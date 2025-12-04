"""Utilities for balance management including transfers and resets."""

from __future__ import annotations

from datetime import datetime
import uuid
from typing import Optional, Tuple, Any, cast

from sqlmodel import Session, select
from sqlalchemy import desc

from app.models import (
    Transaction,
    TransactionStatus,
    TransactionType,
    User,
    BalanceTransfer,
    BalanceTransferStatus,
)
from app.core.time import utc_now


def ensure_zero_balance(
    session: Session,
    user: User,
    *,
    description: str = "Baseline balance reset",
) -> bool:
    """Ensure a user's balance is zero, logging an adjustment transaction if needed."""

    if round(user.balance or 0.0, 2) == 0.0:
        return False

    delta = round(-user.balance, 2)
    user.balance = 0.0
    session.add(user)

    transaction = Transaction(
        user_id=user.id,
        amount=delta,
        transaction_type=TransactionType.ADJUSTMENT,
        status=TransactionStatus.COMPLETED,
        description=description,
        executed_at=utc_now(),
    )
    session.add(transaction)
    return True


def reset_all_user_balances(
    session: Session,
    *,
    description: str = "Baseline balance reset",
) -> int:
    """Set every user's balance to zero and record adjustment transactions.

    Returns the number of users whose balances were adjusted.
    """

    updated = 0
    users = session.exec(select(User)).all()
    for user in users:
        if ensure_zero_balance(session, user, description=description):
            updated += 1

    if updated:
        session.commit()
    return updated


def transfer_balance(
    session: Session,
    user_id: uuid.UUID,
    from_balance_type: str,
    to_balance_type: str,
    amount: float,
    description: str = "Balance transfer"
) -> Tuple[bool, str]:
    """
    Transfer balance between wallet and copy trading accounts.
    
    Args:
        session: Database session
        user_id: User ID to transfer balance for
        from_balance_type: Source balance type ('wallet' or 'copy_trading')
        to_balance_type: Target balance type ('wallet' or 'copy_trading')
        amount: Amount to transfer
        description: Description for the transfer
        
    Returns:
        Tuple of (success, message)
    """
    user = session.get(User, user_id)
    if not user:
        return False, "User not found"
    
    # Validate amount
    if amount <= 0:
        return False, "Transfer amount must be positive"
    
    # Validate balance types
    valid_balance_types = ['wallet', 'copy_trading']
    if from_balance_type not in valid_balance_types or to_balance_type not in valid_balance_types:
        return False, "Invalid balance type"
    
    if from_balance_type == to_balance_type:
        return False, "Cannot transfer between same balance types"
    
    # Check sufficient balance
    source_balance = getattr(user, f"{from_balance_type}_balance", 0.0) or 0.0
    if source_balance < amount:
        return False, f"Insufficient balance in {from_balance_type}"
    
    # Perform transfer
    try:
        # Deduct from source
        setattr(user, f"{from_balance_type}_balance", round(source_balance - amount, 2))
        
        # Add to target
        target_balance = getattr(user, f"{to_balance_type}_balance", 0.0) or 0.0
        setattr(user, f"{to_balance_type}_balance", round(target_balance + amount, 2))
        
        # Create balance transfer record
        transfer = BalanceTransfer(
            user_id=user_id,
            amount=amount,
            from_balance_type=from_balance_type,
            to_balance_type=to_balance_type,
            status=BalanceTransferStatus.COMPLETED,
            description=description,
            created_at=utc_now(),
        )
        session.add(transfer)
        
        # Create transaction record for audit
        transaction = Transaction(
            user_id=user_id,
            amount=amount,
            transaction_type=TransactionType.ADJUSTMENT,
            status=TransactionStatus.COMPLETED,
            description=f"Balance transfer: {description}",
            executed_at=utc_now(),
        )
        session.add(transaction)
        
        session.commit()
        return True, "Balance transfer completed successfully"
        
    except Exception as e:
        session.rollback()
        return False, f"Transfer failed: {str(e)}"


def get_balance_transfer_history(
    session: Session,
    user_id: uuid.UUID,
    limit: int = 50
) -> list[BalanceTransfer]:
    """
    Get balance transfer history for a user.
    
    Args:
        session: Database session
        user_id: User ID to get history for
        limit: Maximum number of records to return
        
    Returns:
        List of balance transfer records
    """
    transfers = session.exec(
        select(BalanceTransfer)
        .where(BalanceTransfer.user_id == user_id)
    # cast to Any to satisfy static typing; at runtime this is an instrumented attribute
    .order_by(desc(cast(Any, BalanceTransfer.created_at)))
        .limit(limit)
    ).all()

    # Ensure concrete list type for callers and static typing
    return list(transfers)


def sync_balances(
    session: Session,
    user_id: uuid.UUID
) -> Tuple[bool, str]:
    """
    Synchronize balances across all account segments and verify consistency.
    
    Args:
        session: Database session
        user_id: User ID to sync balances for
        
    Returns:
        Tuple of (success, message)
    """
    user = session.get(User, user_id)
    if not user:
        return False, "User not found"
    
    try:
        # Calculate expected overall equity
        wallet_balance = user.wallet_balance or 0.0
        copy_trading_balance = user.copy_trading_balance or 0.0
        calculated_equity = wallet_balance + copy_trading_balance
        
        # Get actual overall equity
        actual_equity = user.get_overall_equity()
        
        # Check for discrepancies
        discrepancy = abs(calculated_equity - actual_equity)
        if discrepancy > 0.01:  # Allow for $0.01 rounding differences
            # Auto-correct the discrepancy
            correction_amount = actual_equity - calculated_equity
            user.wallet_balance = round(wallet_balance + correction_amount, 2)
            
            # Log the correction
            transaction = Transaction(
                user_id=user_id,
                amount=correction_amount,
                transaction_type=TransactionType.ADJUSTMENT,
                status=TransactionStatus.COMPLETED,
                description="Balance synchronization correction",
                executed_at=utc_now(),
            )
            session.add(transaction)
            session.commit()
            
            return True, f"Balances synchronized. Corrected discrepancy of ${correction_amount:.2f}"
        
        return True, "Balances are already synchronized"
        
    except Exception as e:
        session.rollback()
        return False, f"Balance synchronization failed: {str(e)}"


__all__ = [
    "ensure_zero_balance", 
    "reset_all_user_balances",
    "transfer_balance",
    "get_balance_transfer_history",
    "sync_balances"
]
