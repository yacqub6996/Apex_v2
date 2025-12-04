"""Admin endpoints for financial ledger and balance adjustments"""
from __future__ import annotations

import uuid
from typing import Any, Dict, cast
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import SQLModel, select, and_, Field
from sqlalchemy import func, desc

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    User,
    UserRole,
    LedgerEntry,
    LedgerEntryPublic,
    LedgerEntriesPublic,
    LedgerType,
    LedgerStatus,
    AdminBalanceAdjustment,
    AdminBalanceAdjustmentPublic,
    AdminBalanceAdjustmentsPublic,
    AdminActionType,
)
from app.core.time import utc_now


def _action_label(action_type: AdminActionType) -> str:
    mapping = {
        AdminActionType.ADD_FUNDS: "Funds added",
        AdminActionType.DEDUCT_FUNDS: "Funds deducted",
        AdminActionType.REVERSE_TRANSACTION: "Transaction reversed",
        AdminActionType.FORCE_COMPLETE_WITHDRAWAL: "Withdrawal completed",
        AdminActionType.MANUAL_CORRECTION: "Balance correction",
    }
    return mapping.get(action_type, "Balance update")

router = APIRouter(prefix="/admin/ledger", tags=["admin-ledger"])


# --- Request/Response Models ---


class CreateAdjustmentRequest(SQLModel):
    """Request to create an admin balance adjustment"""
    user_id: uuid.UUID
    action_type: AdminActionType
    amount: float  # For MANUAL_CORRECTION, can be positive or negative. For others, must be positive.
    reason: str
    # Use a name that doesn't collide with SQLModel.Base.metadata; keep external key "metadata"
    metadata_payload: dict[str, Any] | None = Field(default=None, alias="metadata")


class CreateAdjustmentResponse(SQLModel):
    """Response after creating balance adjustment"""
    adjustment_id: uuid.UUID
    ledger_entry_id: uuid.UUID
    user_email: str
    previous_balance: float
    new_balance: float
    delta: float
    message: str


# --- Helper Functions ---


def require_admin(current_user: CurrentUser) -> None:
    """Verify user has admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")


# --- Admin Balance Adjustment Endpoints ---


@router.post("/adjustments", response_model=CreateAdjustmentResponse)
def create_balance_adjustment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: CreateAdjustmentRequest,
) -> CreateAdjustmentResponse:
    """
    Create an admin balance adjustment with full audit trail.
    
    This endpoint:
    1. Validates admin permission
    2. Loads current user balance
    3. Creates a ledger entry
    4. Creates an adjustment record
    5. Updates user balance atomically
    
    Requires admin role.
    """
    require_admin(current_user)
    
    # Validate amount based on action type
    if request.action_type == AdminActionType.MANUAL_CORRECTION:
        # MANUAL_CORRECTION can be positive or negative
        if request.amount == 0:
            raise HTTPException(status_code=400, detail="Amount cannot be zero")
        delta = request.amount
    else:
        # Other action types require positive amount
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        
        # Calculate delta based on action type
        if request.action_type == AdminActionType.ADD_FUNDS:
            delta = request.amount
        elif request.action_type in [AdminActionType.DEDUCT_FUNDS, AdminActionType.REVERSE_TRANSACTION, AdminActionType.FORCE_COMPLETE_WITHDRAWAL]:
            delta = -request.amount
        else:
            delta = -request.amount
    
    # Get target user
    target_user = session.get(User, request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    previous_balance = target_user.wallet_balance or 0.0
    new_balance = max(0.0, previous_balance + delta)  # Don't allow negative balance
    
    try:
        # Ensure a well-typed JSON payload for metadata
        meta_payload: Dict[str, Any] = request.metadata_payload or {}

        # Create ledger entry
        ledger_entry = LedgerEntry(
            user_id=target_user.id,
            ledger_type=LedgerType.ADJUSTMENT,
            tx_reference=f"ADJ-{current_user.id}-{utc_now().strftime('%Y%m%d%H%M%S')}",
            asset=None,  # Fiat adjustment
            network=None,
            amount_usd=delta,
            crypto_amount=None,
            description=f"Admin adjustment: {request.action_type.value} - {request.reason}",
            status=LedgerStatus.COMPLETED,
            created_by_admin_id=current_user.id,
            approved_at=utc_now(),
            metadata_payload=meta_payload,
        )
        session.add(ledger_entry)
        session.flush()  # Get ledger_entry.id
        
        # Create adjustment record
        adjustment = AdminBalanceAdjustment(
            admin_id=current_user.id,
            user_id=target_user.id,
            action_type=request.action_type,
            previous_balance=previous_balance,
            new_balance=new_balance,
            delta=delta,
            reason=request.reason,
            related_ledger_entry_id=ledger_entry.id,
            metadata_payload=meta_payload,
        )
        session.add(adjustment)
        
        # Update user balance
        target_user.wallet_balance = new_balance
        session.add(target_user)
        
        # Commit transaction
        session.commit()
        session.refresh(adjustment)
        session.refresh(ledger_entry)

        return CreateAdjustmentResponse(
            adjustment_id=adjustment.id,
            ledger_entry_id=ledger_entry.id,
            user_email=target_user.email,
            previous_balance=previous_balance,
            new_balance=new_balance,
            delta=delta,
            message=f"Balance adjustment completed. User {target_user.email} balance changed from {previous_balance:.2f} to {new_balance:.2f}",
        )
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create adjustment: {str(e)}")


@router.get("/adjustments", response_model=AdminBalanceAdjustmentsPublic)
def list_balance_adjustments(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: uuid.UUID | None = None,
    admin_id: uuid.UUID | None = None,
    action_type: AdminActionType | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> AdminBalanceAdjustmentsPublic:
    """
    List admin balance adjustments with filters.
    
    Filters:
    - user_id: Filter by affected user
    - admin_id: Filter by admin who made adjustment
    - action_type: Filter by type of adjustment
    - start_date: Filter by created_at >= start_date
    - end_date: Filter by created_at <= end_date
    
    Requires admin role.
    """
    require_admin(current_user)
    
    # Build query
    statement = select(AdminBalanceAdjustment)
    
    # Apply filters
    conditions = []
    if user_id:
        conditions.append(AdminBalanceAdjustment.user_id == user_id)
    if admin_id:
        conditions.append(AdminBalanceAdjustment.admin_id == admin_id)
    if action_type:
        conditions.append(AdminBalanceAdjustment.action_type == action_type)
    if start_date:
        conditions.append(AdminBalanceAdjustment.created_at >= start_date)
    if end_date:
        conditions.append(AdminBalanceAdjustment.created_at <= end_date)
    
    if conditions:
        statement = statement.where(and_(*conditions))
    
    # Get total count
    count_statement = select(func.count()).select_from(AdminBalanceAdjustment)
    if conditions:
        count_statement = count_statement.where(and_(*conditions))
    total = session.exec(count_statement).one()
    
    # Get data with pagination
    statement = statement.order_by(desc(cast(Any, AdminBalanceAdjustment.created_at)))
    statement = statement.offset(skip).limit(limit)
    adjustments = session.exec(statement).all()
    
    return AdminBalanceAdjustmentsPublic(
        data=[AdminBalanceAdjustmentPublic.model_validate(adj) for adj in adjustments],
        count=total,
    )


# --- Ledger Entry Endpoints ---


@router.get("/entries", response_model=LedgerEntriesPublic)
def list_ledger_entries(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: uuid.UUID | None = None,
    ledger_type: LedgerType | None = None,
    status: LedgerStatus | None = None,
    asset: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> LedgerEntriesPublic:
    """
    List ledger entries with filters.
    
    Filters:
    - user_id: Filter by user
    - ledger_type: Filter by entry type
    - status: Filter by status
    - asset: Filter by asset (BTC, ETH, USDT, USDC, or null for fiat)
    - start_date: Filter by created_at >= start_date
    - end_date: Filter by created_at <= end_date
    
    Requires admin role.
    """
    require_admin(current_user)
    
    # Build query
    statement = select(LedgerEntry)
    
    # Apply filters
    conditions = []
    if user_id:
        conditions.append(LedgerEntry.user_id == user_id)
    if ledger_type:
        conditions.append(LedgerEntry.ledger_type == ledger_type)
    if status:
        conditions.append(LedgerEntry.status == status)
    if asset:
        conditions.append(LedgerEntry.asset == asset)
    if start_date:
        conditions.append(LedgerEntry.created_at >= start_date)
    if end_date:
        conditions.append(LedgerEntry.created_at <= end_date)
    
    if conditions:
        statement = statement.where(and_(*conditions))
    
    # Get total count
    count_statement = select(func.count()).select_from(LedgerEntry)
    if conditions:
        count_statement = count_statement.where(and_(*conditions))
    total = session.exec(count_statement).one()
    
    # Get data with pagination
    statement = statement.order_by(desc(cast(Any, LedgerEntry.created_at)))
    statement = statement.offset(skip).limit(limit)
    entries = session.exec(statement).all()
    
    return LedgerEntriesPublic(
        data=[LedgerEntryPublic.model_validate(entry) for entry in entries],
        count=total,
    )


@router.get("/entries/{entry_id}", response_model=LedgerEntryPublic)
def get_ledger_entry(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    entry_id: uuid.UUID,
) -> LedgerEntryPublic:
    """
    Get a specific ledger entry by ID.
    
    Requires admin role.
    """
    require_admin(current_user)
    
    entry = session.get(LedgerEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    return LedgerEntryPublic.model_validate(entry)


# --- Superuser Balance Override ---


class BalanceOverrideRequest(SQLModel):
    """Request to directly set a user's balance (superuser only)"""
    user_id: uuid.UUID
    balance_field: str  # 'wallet', 'copy_wallet', 'long_term_wallet', or 'total'
    new_value: float  # Can be any number: positive, negative, decimal
    reason: str


class BalanceOverrideResponse(SQLModel):
    """Response after balance override"""
    user_email: str
    balance_field: str
    previous_value: float
    new_value: float
    delta: float
    ledger_entry_id: uuid.UUID
    message: str


@router.post("/balance/override", response_model=BalanceOverrideResponse)
def override_user_balance(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    request: BalanceOverrideRequest,
) -> BalanceOverrideResponse:
    """
    Superuser endpoint to directly set any user balance field.
    
    No validation limits - accepts any number (positive, negative, decimal).
    Creates immutable ledger entry and adjustment record.
    
    Supported balance_field values:
    - 'wallet': Main wallet balance
    - 'copy_wallet': Copy trading wallet balance
    - 'long_term_wallet': Long-term wallet balance
    - 'total': Total balance (sets wallet and zeros others)
    
    Requires admin role.
    """
    require_admin(current_user)
    
    # Validate balance field
    valid_fields = ['wallet', 'copy_wallet', 'long_term_wallet', 'total']
    if request.balance_field not in valid_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid balance_field. Must be one of: {', '.join(valid_fields)}"
        )
    
    # Get target user
    target_user = session.get(User, request.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current value
    if request.balance_field == 'wallet':
        previous_value = target_user.wallet_balance or 0.0
    elif request.balance_field == 'copy_wallet':
        previous_value = target_user.copy_trading_wallet_balance or 0.0
    elif request.balance_field == 'long_term_wallet':
        previous_value = target_user.long_term_wallet_balance or 0.0
    elif request.balance_field == 'total':
        # Use computed total balance; hybrid_property is float at runtime
        previous_value = float(target_user.total_balance or 0.0)
    else:
        previous_value = 0.0
    
    delta = request.new_value - previous_value
    
    try:
        # Create ledger entry
        ledger_entry = LedgerEntry(
            user_id=target_user.id,
            ledger_type=LedgerType.ADJUSTMENT,
            tx_reference=f"OVERRIDE-{current_user.id}-{utc_now().strftime('%Y%m%d%H%M%S')}",
            asset=None,
            network=None,
            amount_usd=delta,
            crypto_amount=None,
            description=f"Superuser balance override [{request.balance_field}]: {previous_value:.2f} → {request.new_value:.2f} - {request.reason}",
            status=LedgerStatus.COMPLETED,
            created_by_admin_id=current_user.id,
            approved_at=utc_now(),
            metadata_payload={
                'action': 'SUPERUSER_OVERRIDE',
                'balance_field': request.balance_field,
                'previous_value': previous_value,
                'new_value': request.new_value,
                'delta': delta,
                'initiated_from': 'admin_override_panel',
                'admin_email': current_user.email,
                'user_email': target_user.email,
            },
        )
        session.add(ledger_entry)
        session.flush()
        
        # Create adjustment record
        adjustment = AdminBalanceAdjustment(
            admin_id=current_user.id,
            user_id=target_user.id,
            action_type=AdminActionType.MANUAL_CORRECTION,
            previous_balance=previous_value,
            new_balance=request.new_value,
            delta=delta,
            reason=f"[SUPERUSER_OVERRIDE:{request.balance_field}] {request.reason}",
            related_ledger_entry_id=ledger_entry.id,
            metadata_payload={
                'balance_field': request.balance_field,
                'override_type': 'direct_set',
            },
        )
        session.add(adjustment)
        
        # Update user balance based on field
        if request.balance_field == 'wallet':
            target_user.wallet_balance = request.new_value
        elif request.balance_field == 'copy_wallet':
            target_user.copy_trading_wallet_balance = request.new_value
        elif request.balance_field == 'long_term_wallet':
            target_user.long_term_wallet_balance = request.new_value
        elif request.balance_field == 'total':
            # For total override, set wallet and zero others; total_balance remains hybrid/computed
            target_user.wallet_balance = request.new_value
            # Underlying fields used by hybrid properties
            target_user.copy_trading_balance = 0.0
            target_user.long_term_balance = 0.0
        
        session.add(target_user)
        
        # Commit transaction
        session.commit()
        session.refresh(target_user)
        session.refresh(ledger_entry)

        return BalanceOverrideResponse(
            user_email=target_user.email,
            balance_field=request.balance_field,
            previous_value=previous_value,
            new_value=request.new_value,
            delta=delta,
            ledger_entry_id=ledger_entry.id,
            message=f"Balance override successful. {request.balance_field} changed from {previous_value:.2f} to {request.new_value:.2f}",
        )
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to override balance: {str(e)}")
