"""Crypto deposit and withdrawal endpoints for crypto-only payment flow"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import desc, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.time import utc_now
from app.models import (
    Transaction,
    TransactionPublic,
    TransactionStatus,
    TransactionType,
)
from app.services.coingecko import FALLBACK_RATES, fetch_crypto_prices
from app.services.notification_service import (
    email_deposit_expired,
    email_deposit_pending,
)

router = APIRouter(prefix="/crypto", tags=["crypto"])


# Request/Response Models
class GenerateAddressRequest(BaseModel):
    coin: str  # e.g., "USDT", "BTC", "ETH", "USDC"
    network: str  # e.g., "TRON_TRC20", "ETHEREUM_ERC20", "BITCOIN"
    usd_amount: float
    description: str | None = None
    metadata_payload: dict[str, Any] | None = None


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

# Preconfigured receiving addresses per coin/network.
# Intentional hardcoded receiving addresses used by Apex as fallback for non-BTC demo networks.
# BTC deposits use the configured settings.GLOBAL_BTC_DEPOSIT_ADDRESS / settings.COPY_TRADING_COMMISSION_BTC_ADDRESS.
DEMO_ADDRESSES = {
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
    session: SessionDep,  # noqa: ARG001
    current_user: CurrentUser,  # noqa: ARG001
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
    session: SessionDep,  # noqa: ARG001
    current_user: CurrentUser,  # noqa: ARG001
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
    # Check if this is a commission payment
    is_commission = False
    copy_id_val = None
    if request.metadata_payload:
        if request.metadata_payload.get("type") == "COPY_TRADING_COMMISSION":
            is_commission = True
            copy_id_val = request.metadata_payload.get("copy_id")
    if not is_commission and request.description and "COPY_TRADING_COMMISSION" in request.description:
        is_commission = True

    # Validate amount ($50.00 minimum for normal deposits, $0.01 for commission payments)
    min_amount = 0.01 if is_commission else 50.0
    if request.usd_amount < min_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum deposit is ${min_amount:.2f}",
        )

    # Duplicate protection if copy_id is provided
    if copy_id_val:
        existing_txs = session.exec(
            select(Transaction).where(
                Transaction.user_id == current_user.id,
                Transaction.transaction_type == TransactionType.DEPOSIT,
            )
        ).all()
        for tx in existing_txs:
            tx_copy_id = None
            if tx.metadata_payload and tx.metadata_payload.get("copy_id"):
                tx_copy_id = str(tx.metadata_payload.get("copy_id"))
            elif tx.description and str(copy_id_val) in tx.description:
                tx_copy_id = str(copy_id_val)

            if tx_copy_id == str(copy_id_val):
                if tx.status == TransactionStatus.COMPLETED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Commission for this copy trading session has already been paid.",
                    )
                if tx.status == TransactionStatus.PENDING and tx.address_expires_at:
                    tx_exp = tx.address_expires_at
                    if tx_exp.tzinfo is None:
                        tx_exp = tx_exp.replace(tzinfo=timezone.utc)
                    if tx_exp > utc_now():
                        return GenerateAddressResponse(
                            address=tx.crypto_address,
                            memo=tx.crypto_memo,
                            expires_at=tx.address_expires_at,
                            transaction_id=str(tx.id),
                        )

    # Calculate VAT (flat $5 fee as per spec)
    vat_amount = 5.0
    total_amount = request.usd_amount + vat_amount

    # For COPY_TRADING_COMMISSION, force BTC + BITCOIN
    if is_commission:
        coin = "BTC"
        network = "BITCOIN"
    else:
        coin = request.coin
        network = request.network

    # Global BTC address resolution across both normal deposits and commission deposits:
    if coin == "BTC" and network == "BITCOIN":
        address = settings.GLOBAL_BTC_DEPOSIT_ADDRESS or settings.COPY_TRADING_COMMISSION_BTC_ADDRESS
        if not address:
            err_detail = (
                "Copy trading commission BTC receiving address is not configured."
                if is_commission
                else "Global BTC deposit receiving address is not configured."
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=err_detail,
            )
        memo = None
    else:
        # Generate address key for other supported networks
        address_key = f"{coin}_{network}"
        address = DEMO_ADDRESSES.get(address_key)

        if not address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported coin/network combination: {coin} on {network}",
            )

        # Generate memo if required
        memo = None
        if coin in MEMO_REQUIRED_COINS:
            # In production, generate unique memo for each transaction
            memo = f"MEMO{uuid.uuid4().hex[:8].upper()}"

    # Set address expiry (20 minutes from now)
    expires_at = utc_now() + timedelta(minutes=20)

    # Fetch live crypto prices from CoinGecko
    live_rates = await fetch_crypto_prices()
    rate = live_rates.get(coin, DEFAULT_CRYPTO_RATES.get(coin, 1.0))
    crypto_amount = str(total_amount / rate)

    # Create transaction
    tx_description = (
        request.description
        if request.description
        else f"Crypto deposit: {request.usd_amount} USD as {coin} on {network}"
    )
    transaction = Transaction(
        user_id=current_user.id,
        amount=request.usd_amount,  # Net amount (without VAT)
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description=tx_description,
        crypto_network=network,
        crypto_address=address,
        crypto_coin=coin,
        crypto_amount=crypto_amount,
        crypto_memo=memo,
        payment_confirmed_by_user=False,
        address_expires_at=expires_at,
        vat_amount=vat_amount,
        metadata_payload=request.metadata_payload,
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
    response: Response,
) -> Any:
    """Get user's pending deposit transactions with authoritative fresh cache headers"""
    response.headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    statement = select(Transaction).where(
        Transaction.user_id == current_user.id,
        Transaction.transaction_type == TransactionType.DEPOSIT,
        Transaction.status == TransactionStatus.PENDING,
    ).order_by(desc(Transaction.created_at))

    transactions = session.exec(statement).all()
    return [TransactionPublic.model_validate(tx) for tx in transactions]
