from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    ROISource,
    Transaction,
    TransactionType,
    TransactionStatus,
    User,
    UserRole,
)


class ROIReversalRequest(SQLModel):
    transaction_id: uuid.UUID
    reason: str


class ROIReversalResponse(SQLModel):
    success: bool
    message: str
    reversal_transaction_id: uuid.UUID
    new_balance: float


router = APIRouter(prefix="/admin", tags=["admin-roi-reversal"])


@router.post("/reverse-roi", response_model=ROIReversalResponse)
async def reverse_roi_transaction(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payload: ROIReversalRequest,
) -> ROIReversalResponse:
    """
    Reverse an existing ROI transaction.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Validate reason
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Reason is required and must be at least 5 characters long"
        )

    # Load original transaction
    original_transaction = session.get(Transaction, payload.transaction_id)
    if not original_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Validate transaction is reversible
    if original_transaction.transaction_type not in [TransactionType.ROI, TransactionType.LONG_TERM_ROI]:
        raise HTTPException(
            status_code=400,
            detail="Only ROI transactions can be reversed"
        )

    if original_transaction.status != TransactionStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Only completed ROI transactions can be reversed"
        )

    # Check if this transaction has already been reversed
    existing_reversal = session.exec(
        session.query(Transaction).where(
            Transaction.reversal_of == original_transaction.id
        )
    ).first()
    
    if existing_reversal:
        raise HTTPException(
            status_code=400,
            detail="This ROI transaction has already been reversed"
        )

    # Get user
    user = session.get(User, original_transaction.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate reverse amount
    reverse_amount = -original_transaction.amount

    # Create reversal transaction
    reversal_transaction = Transaction(
        user_id=user.id,
        amount=reverse_amount,
        transaction_type=TransactionType.ROI,
        status=TransactionStatus.COMPLETED,
        description=f"Reversal: {original_transaction.description}",
        created_at=utc_now(),
        executed_at=utc_now(),
        roi_percent=original_transaction.roi_percent,
        symbol=original_transaction.symbol,
        source=ROISource.ADMIN_REVERSAL,
        pushed_by_admin_id=current_user.id,
        reversal_of=original_transaction.id,
    )
    session.add(reversal_transaction)

    # Update the correct balance based on transaction type
    if original_transaction.transaction_type == TransactionType.LONG_TERM_ROI:
        user.long_term_balance = round(user.long_term_balance + reverse_amount, 2)
    else:
        user.copy_trading_balance = round(user.copy_trading_balance + reverse_amount, 2)
    session.add(user)

    # Commit all changes
    session.commit()

    # Return the correct balance based on transaction type
    if original_transaction.transaction_type == TransactionType.LONG_TERM_ROI:
        new_balance = user.long_term_balance
    else:
        new_balance = user.copy_trading_balance

    return ROIReversalResponse(
        success=True,
        message=f"ROI transaction reversed successfully. Reason: {payload.reason}",
        reversal_transaction_id=reversal_transaction.id,
        new_balance=new_balance,
    )


__all__ = [
    "router",
    "ROIReversalRequest",
    "ROIReversalResponse",
    "reverse_roi_transaction",
]
