from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    CryptoDepositAddress,
    CryptoDepositAddressesPublic,
    CryptoDepositAddressPublic,
    CryptoDepositAddressUpdate,
    User,
    UserRole,
)

router = APIRouter(prefix="/admin/crypto-addresses", tags=["admin"])


def validate_crypto_address_format(address: str, network: str) -> None:
    trimmed = address.strip()
    if not trimmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address cannot be empty",
        )

    if network == "BITCOIN":
        if trimmed.startswith("bc1"):
            if not re.match(r"^bc1[ac-hj-np-z02-9]{25,90}$", trimmed):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Bitcoin SegWit (bc1) address format",
                )
        elif trimmed.startswith(("1", "3")):
            if not re.match(r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$", trimmed):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Bitcoin legacy/P2SH address format",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Bitcoin address: must start with bc1, 1, or 3",
            )
    elif network in ("ETHEREUM_ERC20", "POLYGON"):
        if not re.match(r"^0x[a-fA-F0-9]{40}$", trimmed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid EVM address format: must start with 0x followed by 40 hex characters",
            )
    elif network == "TRON_TRC20":
        if not (trimmed.startswith("T") and re.match(r"^T[a-zA-HJ-NP-Z0-9]{33}$", trimmed)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid TRON TRC20 address format: must start with T and be 34 characters",
            )
    else:
        if len(trimmed) < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address is too short",
            )


@router.get("", response_model=CryptoDepositAddressesPublic)
def get_all_deposit_addresses(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get all configured platform deposit addresses (Admin only)"""
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    statement = select(CryptoDepositAddress).order_by(
        CryptoDepositAddress.coin, CryptoDepositAddress.network
    )
    records = session.exec(statement).all()

    # Join or fetch updater emails
    user_ids = {r.updated_by_id for r in records if r.updated_by_id}
    users_by_id: dict[uuid.UUID, User] = {}
    if user_ids:
        users = session.exec(select(User).where(User.id.in_(user_ids))).all()  # type: ignore[attr-defined]
        users_by_id = {u.id: u for u in users}

    result = [
        CryptoDepositAddressPublic(
            id=r.id,
            coin=r.coin,
            network=r.network,
            address=r.address,
            memo=r.memo,
            is_active=r.is_active,
            notes=r.notes,
            created_at=r.created_at,
            updated_at=r.updated_at,
            updated_by_id=r.updated_by_id,
            updated_by_email=users_by_id[r.updated_by_id].email if r.updated_by_id in users_by_id else None,
        )
        for r in records
    ]

    return CryptoDepositAddressesPublic(data=result, count=len(result))


@router.put("/{address_id}", response_model=CryptoDepositAddressPublic)
def update_deposit_address(
    session: SessionDep,
    current_user: CurrentUser,
    address_id: uuid.UUID,
    payload: CryptoDepositAddressUpdate,
) -> Any:
    """Update a platform deposit address (Admin only)"""
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    record = session.get(CryptoDepositAddress, address_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deposit address configuration not found",
        )

    if payload.address is not None:
        new_address = payload.address.strip()
        validate_crypto_address_format(new_address, record.network)
        record.address = new_address

    if payload.memo is not None:
        record.memo = payload.memo.strip() if payload.memo.strip() else None

    if payload.is_active is not None:
        record.is_active = payload.is_active

    if payload.notes is not None:
        record.notes = payload.notes.strip()

    record.updated_at = utc_now()
    record.updated_by_id = current_user.id

    session.add(record)
    session.commit()
    session.refresh(record)

    return CryptoDepositAddressPublic(
        id=record.id,
        coin=record.coin,
        network=record.network,
        address=record.address,
        memo=record.memo,
        is_active=record.is_active,
        notes=record.notes,
        created_at=record.created_at,
        updated_at=record.updated_at,
        updated_by_id=record.updated_by_id,
        updated_by_email=current_user.email,
    )
