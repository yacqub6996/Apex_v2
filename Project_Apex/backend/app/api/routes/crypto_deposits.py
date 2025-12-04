"""Crypto deposit and withdrawal endpoints for crypto-only payment flow"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select, desc

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Transaction,
    TransactionPublic,
    TransactionStatus,
    TransactionType,
)
from app.core.time import utc_now
from app.services.notification_service import (
    email_deposit_pending,
    email_deposit_failed,
    email_deposit_expired,
)
from app.services.coingecko import fetch_crypto_prices, FALLBACK_RATES

router = APIRouter(prefix="/crypto", tags=["crypto"])


# Request/Response Models
class GenerateAddressRequest(BaseModel):
    coin: str  # e.g., "USDT", "BTC", "ETH", "USDC"
    network: str  # e.g., "TRON_TRC20", "ETHEREUM_ERC20", "BITCOIN"
    usd_amount: float


class GenerateAddressResponse(BaseModel):
    address: str
    memo: str | None = None
    expires_at: datetime
    transaction_id: str


class ConfirmPaymentRequest(BaseModel):
    transaction_id: str


class NetworkInfo(BaseModel):
    key: str
    label: str
    chain_name: str
    fee_estimate: str
    confirmation_time: str
    requires_memo: bool


class CryptoRates(BaseModel):
    BTC: float
    ETH: float
    USDT: float
    USDC: float


# Default crypto to USD exchange rates (fallback if CoinGecko API fails)
# These are imported from the coingecko service
DEFAULT_CRYPTO_RATES = FALLBACK_RATES

# Static demo addresses per coin/network (in production, these would be generated dynamically)
# WARNING: These are shared addresses for all users. This is a CRITICAL SECURITY ISSUE.
# All deposits use the same addresses, making it impossible to distinguish which user sent which payment.
# This allows users to potentially claim other users' deposits.
# MUST be replaced with unique address generation per transaction before production use.
DEMO_ADDRESSES = {
    "BTC_BITCOIN": "bc1q9demo0x9k4u5y6x7z8q2m3n4p5r6s7t8v9w0xy",
    "ETH_ETHEREUM_ERC20": "0x7E57D3m0cAfE0000000000000000000000CaFe00",
    "USDT_TRON_TRC20": "TQ2DeM0Addr3ss111111111111111111111111",
    "USDT_ETHEREUM_ERC20": "0x1111cAFe2222babe3333dEAD4444beef5555cAFE",
    "USDT_POLYGON": "0x2222dEAD3333bEEF4444cAFE5555bABE6666cAFE",
    "USDC_POLYGON": "0x3333bEEF4444cAFE5555dEAD6666bABE7777cAFE",
    "USDC_ETHEREUM_ERC20": "0x4444cAFE5555dEAD6666bEEF7777bABE8888cAFE",
}

# Coins that require memo/tag
MEMO_REQUIRED_COINS = {"XRP", "XLM", "EOS", "ATOM"}


@router.get("/networks", response_model=list[NetworkInfo])
def get_available_networks(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get list of available crypto networks for deposits/withdrawals"""
    networks = [
        NetworkInfo(
            key="TRON_TRC20",
            label="TRON (TRC20)",
            chain_name="TRON",
            fee_estimate="~$1",
            confirmation_time="1-3 minutes",
            requires_memo=False,
        ),
        NetworkInfo(
            key="ETHEREUM_ERC20",
            label="Ethereum (ERC20)",
            chain_name="Ethereum",
            fee_estimate="~$5-15",
            confirmation_time="5-15 minutes",
            requires_memo=False,
        ),
        NetworkInfo(
            key="POLYGON",
            label="Polygon",
            chain_name="Polygon",
            fee_estimate="~$0.50",
            confirmation_time="1-2 minutes",
            requires_memo=False,
        ),
        NetworkInfo(
            key="BITCOIN",
            label="Bitcoin",
            chain_name="Bitcoin",
            fee_estimate="~$2-10",
            confirmation_time="10-60 minutes",
            requires_memo=False,
        ),
    ]
    return networks


@router.get("/rates", response_model=CryptoRates)
async def get_crypto_rates(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get current crypto to USD exchange rates from CoinGecko API.
    Falls back to static rates if API key is not configured or request fails.
    """
    rates = await fetch_crypto_prices()
    return CryptoRates(**rates)


@router.post("/generate-address", response_model=GenerateAddressResponse)
async def generate_deposit_address(
    session: SessionDep,
    current_user: CurrentUser,
    request: GenerateAddressRequest,
) -> Any:
    """
    Generate a deposit address for the user.
    Creates a pending transaction with address expiry (20 minutes).
    Uses live prices from CoinGecko API when available.
    """
    # Validate amount
    if request.usd_amount < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum deposit is $50.00",
        )

    # Calculate VAT (flat $5 fee as per spec)
    vat_amount = 5.0
    total_amount = request.usd_amount + vat_amount

    # Generate address key
    address_key = f"{request.coin}_{request.network}"
    address = DEMO_ADDRESSES.get(address_key)
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported coin/network combination: {request.coin} on {request.network}",
        )

    # Generate memo if required
    memo = None
    if request.coin in MEMO_REQUIRED_COINS:
        # In production, generate unique memo for each transaction
        memo = f"MEMO{uuid.uuid4().hex[:8].upper()}"

    # Set address expiry (20 minutes from now)
    expires_at = utc_now() + timedelta(minutes=20)

    # Fetch live crypto prices from CoinGecko
    live_rates = await fetch_crypto_prices()
    rate = live_rates.get(request.coin, DEFAULT_CRYPTO_RATES.get(request.coin, 1.0))
    crypto_amount = str(total_amount / rate)

    # Create transaction
    transaction = Transaction(
        user_id=current_user.id,
        amount=request.usd_amount,  # Net amount (without VAT)
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description=f"Crypto deposit: {request.usd_amount} USD as {request.coin} on {request.network}",
        crypto_network=request.network,
        crypto_address=address,
        crypto_coin=request.coin,
        crypto_amount=crypto_amount,
        crypto_memo=memo,
        payment_confirmed_by_user=False,
        address_expires_at=expires_at,
        vat_amount=vat_amount,
    )

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    # Email: deposit initiated/pending
    try:
        email_deposit_pending(
            session=session,
            user_id=current_user.id,
            amount=float(request.usd_amount),
            network=request.network,
            address=address,
            expires_at=expires_at.isoformat(),
        )
    except Exception:
        # non-blocking
        pass

    return GenerateAddressResponse(
        address=address,
        memo=memo,
        expires_at=expires_at,
        transaction_id=str(transaction.id),
    )


@router.post("/confirm-payment", response_model=TransactionPublic)
def confirm_payment_sent(
    session: SessionDep,
    current_user: CurrentUser,
    request: ConfirmPaymentRequest,
) -> Any:
    """
    User confirms they have sent the crypto payment.
    Updates transaction to mark user confirmation for admin review.
    """
    # Get transaction
    try:
        transaction_id = uuid.UUID(request.transaction_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction ID",
        )

    statement = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEPOSIT,
    )
    transaction = session.exec(statement).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    # Check if already confirmed
    if transaction.payment_confirmed_by_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already confirmed",
        )

    # Check if address expired
    if transaction.address_expires_at:
        # Ensure timezone-aware comparison
        expires_at_utc = transaction.address_expires_at.replace(tzinfo=timezone.utc) if transaction.address_expires_at.tzinfo is None else transaction.address_expires_at
        if expires_at_utc < utc_now():
            try:
                email_deposit_expired(
                    session=session,
                    user_id=current_user.id,
                    amount=float(transaction.amount or 0.0),
                    expires_at=transaction.address_expires_at.isoformat() if transaction.address_expires_at else None,
                )
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Deposit address expired at {transaction.address_expires_at.isoformat()}. Please generate a new address.",
            )

    # Mark as confirmed by user
    transaction.payment_confirmed_by_user = True
    transaction.payment_confirmed_at = utc_now()
    
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return TransactionPublic.model_validate(transaction)


@router.get("/pending-deposits", response_model=list[TransactionPublic])
def get_pending_deposits(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get user's pending deposit transactions"""
    statement = select(Transaction).where(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEPOSIT,
        Transaction.status == TransactionStatus.PENDING,
    ).order_by(desc(Transaction.created_at))
    
    transactions = session.exec(statement).all()
    return [TransactionPublic.model_validate(tx) for tx in transactions]
