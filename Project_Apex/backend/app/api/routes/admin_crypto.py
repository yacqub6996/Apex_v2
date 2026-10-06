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
    CryptoDepositAddressCreate,
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

    net_upper = network.upper()

    if net_upper in ("BITCOIN", "BTC"):
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
    elif (
        net_upper in ("ETHEREUM_ERC20", "POLYGON", "BSC_BEP20", "ARBITRUM", "AVAX_C", "OPTIMISM", "BASE")
        or "ERC20" in net_upper
        or "BEP20" in net_upper
        or "EVM" in net_upper
    ):
        if not re.match(r"^0x[a-fA-F0-9]{40}$", trimmed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid EVM address format: must start with 0x followed by 40 hex characters",
            )
    elif net_upper in ("TRON_TRC20", "TRON", "TRC20"):
        if not (trimmed.startswith("T") and re.match(r"^T[a-zA-HJ-NP-Z0-9]{33}$", trimmed)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid TRON TRC20 address format: must start with T and be 34 characters",
            )
    elif net_upper in ("SOLANA", "SOL"):
        if not re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", trimmed):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Solana address format: must be 32-44 base58 characters",
            )
    elif net_upper in ("RIPPLE", "XRP"):
        if not (trimmed.startswith("r") and re.match(r"^r[1-9A-HJ-NP-Za-km-z]{24,34}$", trimmed)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Ripple (XRP) address format: must start with r and be 25-35 characters",
            )
    elif net_upper in ("LITECOIN", "LTC"):
        if not (
            trimmed.startswith(("L", "M")) and re.match(r"^[LM][a-km-zA-HJ-NP-Z1-9]{25,34}$", trimmed)
            or trimmed.startswith("ltc1") and re.match(r"^ltc1[ac-hj-np-z02-9]{25,90}$", trimmed)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Litecoin address format",
            )
    elif net_upper in ("DOGECOIN", "DOGE"):
        if not (trimmed.startswith("D") and re.match(r"^D[1-9A-HJ-NP-Za-km-z]{33}$", trimmed)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Dogecoin address format: must start with D and be 34 characters",
            )
    elif net_upper in ("TON", "TONCOIN"):
        if len(trimmed) < 24 or len(trimmed) > 66:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid TON address format",
            )
    else:
        if len(trimmed) < 10 or len(trimmed) > 255:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Address must be between 10 and 255 characters",
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
            display_name=r.display_name,
            coingecko_id=r.coingecko_id,
            fallback_rate=r.fallback_rate,
            created_at=r.created_at,
            updated_at=r.updated_at,
            updated_by_id=r.updated_by_id,
            updated_by_email=users_by_id[r.updated_by_id].email if r.updated_by_id in users_by_id else None,
        )
        for r in records
    ]

    return CryptoDepositAddressesPublic(data=result, count=len(result))


@router.post("", response_model=CryptoDepositAddressPublic, status_code=status.HTTP_201_CREATED)
def create_deposit_address(
    session: SessionDep,
    current_user: CurrentUser,
    payload: CryptoDepositAddressCreate,
) -> Any:
    """Add a new cryptocurrency deposit address (Admin only)"""
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )

    coin_clean = payload.coin.strip().upper()
    network_clean = payload.network.strip().upper()
    address_clean = payload.address.strip()

    if not coin_clean or len(coin_clean) > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid coin symbol (must be 1-20 characters)",
        )

    if not network_clean or len(network_clean) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid network name (must be 1-50 characters)",
        )

    validate_crypto_address_format(address_clean, network_clean)

    # Check for existing coin and network pair
    existing = session.exec(
        select(CryptoDepositAddress).where(
            CryptoDepositAddress.coin == coin_clean,
            CryptoDepositAddress.network == network_clean,
        )
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An active deposit address for {coin_clean} on {network_clean} already exists. Please update the existing address.",
            )
        # Reactivate and update existing record
        existing.address = address_clean
        existing.memo = payload.memo.strip() if payload.memo and payload.memo.strip() else None
        existing.is_active = True
        existing.notes = payload.notes.strip() if payload.notes else None
        existing.display_name = payload.display_name.strip() if payload.display_name else None
        existing.coingecko_id = payload.coingecko_id.strip() if payload.coingecko_id else None
        existing.fallback_rate = payload.fallback_rate
        existing.updated_at = utc_now()
        existing.updated_by_id = current_user.id
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return CryptoDepositAddressPublic(
            id=existing.id,
            coin=existing.coin,
            network=existing.network,
            address=existing.address,
            memo=existing.memo,
            is_active=existing.is_active,
            notes=existing.notes,
            display_name=existing.display_name,
            coingecko_id=existing.coingecko_id,
            fallback_rate=existing.fallback_rate,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
            updated_by_id=existing.updated_by_id,
            updated_by_email=current_user.email,
        )

    record = CryptoDepositAddress(
        coin=coin_clean,
        network=network_clean,
        address=address_clean,
        memo=payload.memo.strip() if payload.memo and payload.memo.strip() else None,
        is_active=payload.is_active,
        notes=payload.notes.strip() if payload.notes else None,
        display_name=payload.display_name.strip() if payload.display_name else None,
        coingecko_id=payload.coingecko_id.strip() if payload.coingecko_id else None,
        fallback_rate=payload.fallback_rate,
        created_at=utc_now(),
        updated_at=utc_now(),
        updated_by_id=current_user.id,
    )

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
        display_name=record.display_name,
        coingecko_id=record.coingecko_id,
        fallback_rate=record.fallback_rate,
        created_at=record.created_at,
        updated_at=record.updated_at,
        updated_by_id=record.updated_by_id,
        updated_by_email=current_user.email,
    )


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

    if payload.coin is not None:
        c_clean = payload.coin.strip().upper()
        if c_clean:
            record.coin = c_clean

    if payload.network is not None:
        n_clean = payload.network.strip().upper()
        if n_clean:
            record.network = n_clean

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

    if payload.display_name is not None:
        record.display_name = payload.display_name.strip() if payload.display_name.strip() else None

    if payload.coingecko_id is not None:
        record.coingecko_id = payload.coingecko_id.strip() if payload.coingecko_id.strip() else None

    if payload.fallback_rate is not None:
        record.fallback_rate = payload.fallback_rate

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
        display_name=record.display_name,
        coingecko_id=record.coingecko_id,
        fallback_rate=record.fallback_rate,
        created_at=record.created_at,
        updated_at=record.updated_at,
        updated_by_id=record.updated_by_id,
        updated_by_email=current_user.email,
    )

