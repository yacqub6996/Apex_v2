import uuid
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    ROISource,
    Transaction,
    TransactionCreate,
    TransactionPublic,
    TransactionStatus,
    TransactionType,
    TransactionUpdate,
    TransactionsPublic,
    UserRole,
)
from app.services.execution_events import record_execution_event
from app.models import ExecutionEventType
from app.services.notification_service import (
    email_deposit_failed,
    email_withdrawal_failed,
    email_withdrawal_cancelled,
    email_withdrawal_received,
)
from app.services.transactions import finalize_deposit_transaction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=TransactionsPublic)
def read_transactions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    type: Optional[TransactionType] = Query(None, description="Filter by transaction type"),
    status: Optional[TransactionStatus] = Query(None, description="Filter by status"),
    source: Optional[ROISource] = Query(None, description="Filter by ROI source"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
) -> Any:
    # Base query
    if current_user.is_superuser or current_user.role == UserRole.ADMIN:
        count_statement = select(func.count()).select_from(Transaction)
        statement = select(Transaction)
    else:
        count_statement = (
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.user_id == current_user.id)
        )
        statement = (
            select(Transaction)
            .where(Transaction.user_id == current_user.id)
        )

    # Apply filters
    if type:
        statement = statement.where(Transaction.transaction_type == type)
        count_statement = count_statement.where(Transaction.transaction_type == type)
    
    if source:
        statement = statement.where(Transaction.source == source)
        count_statement = count_statement.where(Transaction.source == source)

    if status:
        statement = statement.where(Transaction.status == status)
        count_statement = count_statement.where(Transaction.status == status)

    if start_date:
        statement = statement.where(Transaction.created_at >= start_date)
        count_statement = count_statement.where(Transaction.created_at >= start_date)
    
    if end_date:
        statement = statement.where(Transaction.created_at <= end_date)
        count_statement = count_statement.where(Transaction.created_at <= end_date)

    # Get count and transactions
    count = session.exec(count_statement).one()
    statement = statement.offset(skip).limit(limit)
    transactions = session.exec(statement).all()

    # For regular users, filter out admin-only fields
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        transaction_publics = []
        for tx in transactions:
            tx_public = TransactionPublic.model_validate(tx)
            # Hide admin-only fields from regular users
            tx_public.source = None
            tx_public.pushed_by_admin_id = None
            # Allow showing withdrawal_source to owner for pending display in UI
            transaction_publics.append(tx_public)
    else:
        transaction_publics = [TransactionPublic.model_validate(tx) for tx in transactions]

    return TransactionsPublic(
        data=transaction_publics,
        count=count,
    )


from sqlmodel import SQLModel


class PendingSummary(SQLModel):
    copy_trading_wallet_pending: float = 0.0
    long_term_wallet_pending: float = 0.0
    main_wallet_pending: float = 0.0


@router.get("/pending-summary", response_model=PendingSummary)
def get_pending_summary(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Return user's pending withdrawal totals grouped by source."""
    user_id = current_user.id

    rows = session.exec(
        select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.PENDING,
        )
    ).all()

    copy_pending = 0.0
    long_pending = 0.0
    main_pending = 0.0
    for tx in rows:
        src = getattr(tx, "withdrawal_source", None)
        try:
            src_value = src.value if src is not None else None
        except Exception:
            src_value = None

        if src_value == "COPY_TRADING_WALLET":
            copy_pending += float(tx.amount or 0.0)
        elif src_value == "LONG_TERM_WALLET":
            long_pending += float(tx.amount or 0.0)
        else:
            main_pending += float(tx.amount or 0.0)

    return PendingSummary(
        copy_trading_wallet_pending=round(copy_pending, 2),
        long_term_wallet_pending=round(long_pending, 2),
        main_wallet_pending=round(main_pending, 2),
    )


@router.get("/{id}", response_model=TransactionPublic)
def read_transaction(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    tx = session.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return tx



@router.post("/", response_model=TransactionPublic)
def create_transaction(
    *, session: SessionDep, current_user: CurrentUser, tx_in: TransactionCreate
) -> Any:
    owner_id = current_user.id
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        tx_in.user_id = current_user.id
    tx = crud.create_transaction(session=session, tx_in=tx_in, owner_id=owner_id)
    return tx


@router.put("/{id}", response_model=TransactionPublic)
def update_transaction(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, tx_in: TransactionUpdate
) -> Any:
    tx = session.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    tx = crud.update_transaction(session=session, db_tx=tx, tx_in=tx_in)
    return tx


@router.delete("/{id}")
def delete_transaction(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Message:
    tx = session.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and tx.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(tx)
    session.commit()
    return Message(message="Transaction deleted successfully")


@router.post("/{id}/status", response_model=TransactionPublic)
def update_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    status: TransactionStatus,
) -> Transaction:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    tx = session.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    update = TransactionUpdate(status=status)
    # When admins mark deposits/withdrawals as completed, reflect in wallet_balance
    if status == TransactionStatus.COMPLETED and tx.transaction_type == TransactionType.DEPOSIT:
        return finalize_deposit_transaction(session=session, transaction=tx)

    if status == TransactionStatus.COMPLETED and tx.transaction_type == TransactionType.WITHDRAWAL:
        try:
            current = float(tx.user.wallet_balance or 0.0)
        except Exception:
            current = 0.0
        tx.user.wallet_balance = round(current - float(tx.amount or 0.0), 2)
    tx = crud.update_transaction(session=session, db_tx=tx, tx_in=update)
    session.add(tx.user)
    session.commit()
    session.refresh(tx)
    
    if status == TransactionStatus.FAILED and tx.transaction_type == TransactionType.DEPOSIT:
        try:
            email_deposit_failed(
                session=session,
                user_id=tx.user_id,
                amount=float(tx.amount or 0.0),
                reason="Deposit failed",
            )
        except Exception as e:
            logger.warning(f"Failed to send deposit failed email: {e}")

    if status == TransactionStatus.COMPLETED and tx.transaction_type == TransactionType.WITHDRAWAL:
        try:
            email_withdrawal_received(
                session=session,
                user_id=tx.user_id,
                amount=float(tx.amount or 0.0),
                reference=str(tx.id),
            )
        except Exception as e:
            logger.warning(f"Failed to send withdrawal delivered email: {e}")

    if status in {TransactionStatus.CANCELLED, TransactionStatus.FAILED} and tx.transaction_type == TransactionType.WITHDRAWAL:
        try:
            if status == TransactionStatus.CANCELLED:
                email_withdrawal_cancelled(
                    session=session,
                    user_id=tx.user_id,
                    amount=float(tx.amount or 0.0),
                )
            else:
                email_withdrawal_failed(
                    session=session,
                    user_id=tx.user_id,
                    amount=float(tx.amount or 0.0),
                    reason="Withdrawal failed",
                )
        except Exception as e:
            logger.warning(f"Failed to send withdrawal status email: {e}")

    return tx


@router.post("/{id}/cancel", response_model=TransactionPublic)
async def cancel_pending_withdrawal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Transaction:
    """Allow a user to cancel their own pending withdrawal

    Requirements:
    - Owner only
    - Transaction type = WITHDRAWAL
    - Status = PENDING
    -> Set status to CANCELLED and record an execution event
    """
    tx = session.get(Transaction, id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.user_id != current_user.id and not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if tx.transaction_type != TransactionType.WITHDRAWAL:
        raise HTTPException(status_code=400, detail="Only withdrawal transactions can be cancelled")
    if tx.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending transactions can be cancelled")

    update = TransactionUpdate(status=TransactionStatus.CANCELLED)
    tx = crud.update_transaction(session=session, db_tx=tx, tx_in=update)
    session.add(tx)
    await record_execution_event(
        session,
        event_type=ExecutionEventType.MANUAL_ADJUSTMENT,
        description="User cancelled pending withdrawal",
        amount=0.0,
        user_id=tx.user_id,
        payload={
            "transaction_id": str(tx.id),
            "type": "withdrawal_cancel",
        },
    )
    session.commit()
    session.refresh(tx)
    try:
        email_withdrawal_cancelled(
            session=session,
            user_id=tx.user_id,
            amount=float(tx.amount or 0.0),
        )
    except Exception as e:
        logger.warning(f"Failed to send withdrawal cancelled email: {e}")
    return tx

