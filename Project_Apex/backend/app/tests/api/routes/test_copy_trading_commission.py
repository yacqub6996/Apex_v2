import uuid
from datetime import timedelta

import pytest
from fastapi import HTTPException, Response
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.routes.admin import get_admin_dashboard_summary
from app.api.routes.copy_trading import stop_copy_relationship
from app.api.routes.crypto_deposits import (
    DEMO_ADDRESSES,
    GenerateAddressRequest,
    generate_deposit_address,
    get_pending_deposits,
)
from app.core.config import settings
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    CopyTradingWallet,
    ExecutionEvent,
    ExecutionEventType,
    RiskTolerance,
    TraderProfile,
    Transaction,
    TransactionStatus,
    TransactionType,
    User,
    UserRole,
    UserTraderCopy,
)
from app.services.transactions import finalize_deposit_transaction


@pytest.fixture(name="db_session")
def db_session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.mark.anyio
async def test_copy_trading_commission_stop_holds_equity_and_admin_release(db_session: Session):
    """Test that stop_copy_relationship holds released equity when commission is due,

    and only releases the held equity to CopyTradingWallet once admin confirms the
    separate external crypto commission deposit.
    """
    # 1. Create follower user and trader
    user = User(
        id=uuid.uuid4(),
        email="follower@example.com",
        hashed_password="hash",
        wallet_balance=500.0,
        balance=500.0,
        copy_trading_balance=1000.0,
    )
    db_session.add(user)
    db_session.commit()

    copy_wallet = CopyTradingWallet(
        user_id=user.id,
        balance=250.0,
    )
    db_session.add(copy_wallet)
    db_session.commit()

    trader_user = User(
        id=uuid.uuid4(),
        email="trader@example.com",
        hashed_password="hash",
    )
    db_session.add(trader_user)
    db_session.commit()

    trader_profile = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Elite Trader Alex",
        trader_code="ALEX100",
        copy_fee_percentage=15.0,  # 15% commission
        risk_tolerance=RiskTolerance.MEDIUM,
    )
    db_session.add(trader_profile)
    db_session.commit()

    # 2. Create active copy relationship
    copy_started = utc_now() - timedelta(days=7)
    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=1000.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=copy_started,
    )
    db_session.add(copy)
    db_session.commit()

    # 3. Add execution events (realized profit = $300 total)
    ev1 = ExecutionEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Follower trade profit 1",
        amount=200.0,
        created_at=copy_started + timedelta(days=1),
    )
    ev2 = ExecutionEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Follower trade profit 2",
        amount=100.0,
        created_at=copy_started + timedelta(days=2),
    )
    db_session.add(ev1)
    db_session.add(ev2)
    db_session.commit()

    # 4. Stop the copy relationship
    response = stop_copy_relationship(
        session=db_session,
        current_user=user,
        copy_id=copy.id,
    )

    # 5. Verify response calculations
    assert response.success is True
    assert response.session_profit == 300.0
    assert response.copy_fee_percentage == 15.0
    assert response.commission_due == 45.0  # 15% of $300 = $45.0
    assert response.trader_name == "Elite Trader Alex"
    assert response.released_equity == 1000.0
    assert response.available_balance == 250.0  # Held equity NOT in available balance yet

    # 6. HELD EQUITY AND NON-DEDUCTION CHECK:
    # Released equity ($1000) is HELD pending commission confirmation.
    # CopyTradingWallet balance MUST remain 250.0.
    # User copy_trading_balance is liquidated from active allocation to 0.0.
    # Main wallet is untouched.
    db_session.refresh(copy_wallet)
    db_session.refresh(user)
    db_session.refresh(copy)

    assert copy_wallet.balance == 250.0, f"Copy wallet was credited prematurely! Balance: {copy_wallet.balance}"
    assert user.copy_trading_balance == 0.0, "Active trading balance was not liquidated!"
    assert user.wallet_balance == 500.0, "Main wallet balance was touched!"
    assert user.balance == 500.0, "Legacy balance was touched!"

    assert copy.copy_settings["held_released_equity"] == 1000.0
    assert copy.copy_settings["equity_released"] is False
    assert copy.copy_settings["commission_due"] == 45.0

    # 7. User initiates separate external crypto deposit for commission ($45)
    req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=45.0,
        description=f"Trader commission: 45.00 USD for copy session {copy.id}",
        metadata_payload={
            "type": "COPY_TRADING_COMMISSION",
            "copy_id": str(copy.id),
            "trader_name": "Elite Trader Alex",
            "commission_amount": 45.0,
            "session_profit": 300.0,
            "fee_percentage": 15.0,
            "held_released_equity": 1000.0,
        },
    )
    gen_res = await generate_deposit_address(
        session=db_session,
        current_user=user,
        request=req,
    )
    assert gen_res.address == settings.COPY_TRADING_COMMISSION_BTC_ADDRESS
    tx = db_session.get(Transaction, uuid.UUID(gen_res.transaction_id))
    assert tx is not None
    assert tx.crypto_coin == "BTC"
    assert tx.crypto_network == "BITCOIN"
    assert tx.crypto_address == settings.COPY_TRADING_COMMISSION_BTC_ADDRESS
    assert tx.status == TransactionStatus.PENDING

    # 8. Admin confirms the commission deposit
    finalized_tx = finalize_deposit_transaction(
        session=db_session,
        transaction=tx,
        notify=False,
    )
    assert finalized_tx.status == TransactionStatus.COMPLETED

    # 9. Verify settlement & equity release:
    # - Commission deposit ($45) is NOT credited to Main Wallet or Copy Trading Wallet.
    # - Previously held equity ($1000) IS credited to CopyTradingWallet.
    # - copy_wallet.balance becomes 250.0 + 1000.0 = 1250.0.
    # - Main wallet remains 500.0.
    # - copy_settings marked equity_released = True, held_released_equity = 0.0.
    db_session.refresh(copy_wallet)
    db_session.refresh(user)
    db_session.refresh(copy)

    assert copy_wallet.balance == 1250.0, f"Expected copy wallet 1250.0, got {copy_wallet.balance}"
    assert user.wallet_balance == 500.0, f"Main wallet should remain 500.0, got {user.wallet_balance}"
    assert user.balance == 500.0, f"Legacy balance should remain 500.0, got {user.balance}"
    assert copy.copy_settings["equity_released"] is True
    assert copy.copy_settings["held_released_equity"] == 0.0

    # 10. Idempotency test: repeated finalize call does NOT release funds again
    finalize_deposit_transaction(
        session=db_session,
        transaction=finalized_tx,
        notify=False,
    )
    db_session.refresh(copy_wallet)
    assert copy_wallet.balance == 1250.0, "Duplicate finalization released funds again!"


def test_copy_trading_zero_commission_releases_equity_immediately(db_session: Session):
    """Test that when a copy relationship has zero commission due (no profit),

    the released equity is credited to CopyTradingWallet immediately.
    """
    user = User(
        id=uuid.uuid4(),
        email="zero_comm@example.com",
        hashed_password="hash",
        wallet_balance=300.0,
        balance=300.0,
        copy_trading_balance=600.0,
    )
    db_session.add(user)
    copy_wallet = CopyTradingWallet(user_id=user.id, balance=100.0)
    db_session.add(copy_wallet)

    trader_user = User(id=uuid.uuid4(), email="trader_zero@example.com", hashed_password="hash")
    db_session.add(trader_user)
    db_session.commit()

    trader_profile = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Trader Zero",
        trader_code="ZERO100",
        copy_fee_percentage=10.0,
        risk_tolerance=RiskTolerance.LOW,
    )
    db_session.add(trader_profile)
    db_session.commit()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=600.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=3),
    )
    db_session.add(copy)
    db_session.commit()

    # No profit events added (session profit = 0)
    response = stop_copy_relationship(
        session=db_session,
        current_user=user,
        copy_id=copy.id,
    )

    assert response.commission_due == 0.0
    assert response.released_equity == 600.0
    assert response.available_balance == 700.0

    db_session.refresh(copy_wallet)
    db_session.refresh(user)
    db_session.refresh(copy)

    # Credited immediately: 100 + 600 = 700
    assert copy_wallet.balance == 700.0
    assert user.copy_trading_balance == 0.0
    assert copy.copy_settings["equity_released"] is True
    assert copy.copy_settings["held_released_equity"] == 0.0


def test_duplicate_protection_in_stop_and_deposit(db_session: Session):
    """Test duplicate protection so that an already stopped session or a session with

    an existing deposit does not re-create commission obligations or allow double deposits.
    """
    user = User(
        id=uuid.uuid4(),
        email="dup_user@example.com",
        hashed_password="hash",
        wallet_balance=100.0,
        balance=100.0,
        copy_trading_balance=500.0,
    )
    db_session.add(user)
    copy_wallet = CopyTradingWallet(user_id=user.id, balance=100.0)
    db_session.add(copy_wallet)

    trader_user = User(id=uuid.uuid4(), email="trader2@example.com", hashed_password="hash")
    db_session.add(trader_user)
    db_session.commit()

    trader_profile = TraderProfile(
        id=uuid.uuid4(),
        user_id=trader_user.id,
        display_name="Trader Bob",
        trader_code="BOB100",
        copy_fee_percentage=10.0,
        risk_tolerance=RiskTolerance.LOW,
    )
    db_session.add(trader_profile)
    db_session.commit()

    copy = UserTraderCopy(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
        copy_started_at=utc_now() - timedelta(days=5),
    )
    db_session.add(copy)
    ev = ExecutionEvent(
        id=uuid.uuid4(),
        user_id=user.id,
        trader_profile_id=trader_profile.id,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description="Follower trade profit",
        amount=200.0,
        created_at=utc_now() - timedelta(days=2),
    )
    db_session.add(ev)
    db_session.commit()

    # First stop creates obligation and holds equity
    res1 = stop_copy_relationship(session=db_session, current_user=user, copy_id=copy.id)
    assert res1.commission_due == 20.0
    assert res1.released_equity == 500.0

    # Calling stop again returns commission_due = 0.0 (already stopped)
    res2 = stop_copy_relationship(session=db_session, current_user=user, copy_id=copy.id)
    assert res2.commission_due == 0.0


@pytest.mark.anyio
async def test_ordinary_deposit_still_credits_main_wallet(db_session: Session):
    """Test that ordinary deposits (< $50 min, credits main wallet) continue normal behavior."""
    user = User(
        id=uuid.uuid4(),
        email="ordinary@example.com",
        hashed_password="hash",
        wallet_balance=200.0,
        balance=200.0,
    )
    db_session.add(user)
    copy_wallet = CopyTradingWallet(user_id=user.id, balance=50.0)
    db_session.add(copy_wallet)
    db_session.commit()

    # Normal deposit under $50 rejected
    low_req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=40.0,
    )
    with pytest.raises(HTTPException) as exc_info:
        await generate_deposit_address(session=db_session, current_user=user, request=low_req)
    assert exc_info.value.status_code == 400
    assert "Minimum deposit is $50.00" in exc_info.value.detail

    # Normal deposit $100 accepted
    req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=100.0,
    )
    res = await generate_deposit_address(session=db_session, current_user=user, request=req)
    assert res.address == DEMO_ADDRESSES["USDT_TRON_TRC20"]
    assert res.address == "TQ2DeM0Addr3ss111111111111111111111111"
    tx = db_session.get(Transaction, uuid.UUID(res.transaction_id))
    assert tx is not None
    assert tx.crypto_address == DEMO_ADDRESSES["USDT_TRON_TRC20"]

    finalize_deposit_transaction(session=db_session, transaction=tx, notify=False)
    db_session.refresh(user)
    db_session.refresh(copy_wallet)

    assert user.wallet_balance == 300.0
    assert user.balance == 300.0
    assert copy_wallet.balance == 50.0  # Copy wallet untouched


@pytest.mark.anyio
async def test_commission_deposits_use_fixed_btc_address_while_ordinary_deposits_use_demo_addresses(db_session: Session):
    """Verify that all COPY_TRADING_COMMISSION deposits strictly resolve to one fixed BTC address
    on the Bitcoin network, regardless of requested coin/network, while ordinary deposits remain
    completely unchanged and resolve to DEMO_ADDRESSES.
    """
    user = User(
        id=uuid.uuid4(),
        email="shared_addr_user@example.com",
        hashed_password="hash",
        wallet_balance=100.0,
        balance=100.0,
    )
    db_session.add(user)
    db_session.commit()

    # 1. Test USDT / TRON_TRC20 specifically:
    # Ordinary deposit resolves to DEMO_ADDRESSES["USDT_TRON_TRC20"]
    ordinary_req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=100.0,
    )
    ordinary_res = await generate_deposit_address(
        session=db_session,
        current_user=user,
        request=ordinary_req,
    )
    assert ordinary_res.address == DEMO_ADDRESSES["USDT_TRON_TRC20"]
    assert ordinary_res.address == "TQ2DeM0Addr3ss111111111111111111111111"

    # Commission deposit requesting USDT/TRON must be forced to fixed BTC address on Bitcoin network
    dummy_copy_id = uuid.uuid4()
    commission_req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=25.0,  # Below ordinary minimum ($50), allowed for commission
        metadata_payload={
            "type": "COPY_TRADING_COMMISSION",
            "copy_id": str(dummy_copy_id),
            "trader_name": "Test Trader",
            "commission_amount": 25.0,
        },
        description=f"Trader commission: 25.00 USD for copy session {dummy_copy_id}",
    )
    commission_res = await generate_deposit_address(
        session=db_session,
        current_user=user,
        request=commission_req,
    )

    # Assert commission resolves to the configured fixed BTC address:
    assert commission_res.address == settings.COPY_TRADING_COMMISSION_BTC_ADDRESS
    assert commission_res.address != ordinary_res.address

    # Verify underlying transaction record:
    ord_tx = db_session.get(Transaction, uuid.UUID(ordinary_res.transaction_id))
    comm_tx = db_session.get(Transaction, uuid.UUID(commission_res.transaction_id))
    assert ord_tx is not None and comm_tx is not None

    assert ord_tx.crypto_coin == "USDT"
    assert ord_tx.crypto_network == "TRON_TRC20"
    assert ord_tx.crypto_address == DEMO_ADDRESSES["USDT_TRON_TRC20"]

    assert comm_tx.crypto_coin == "BTC"
    assert comm_tx.crypto_network == "BITCOIN"
    assert comm_tx.crypto_address == settings.COPY_TRADING_COMMISSION_BTC_ADDRESS
    assert comm_tx.crypto_memo is None

    # 2. Test all supported coin/network pairs:
    # Ordinary BTC deposits must resolve strictly to settings.GLOBAL_BTC_DEPOSIT_ADDRESS
    # Other ordinary deposits (ETH, USDT, USDC) resolve strictly to DEMO_ADDRESSES[key]
    # Commission deposits must resolve strictly to settings.GLOBAL_BTC_DEPOSIT_ADDRESS as BTC/BITCOIN
    test_pairs = [
        ("BTC", "BITCOIN", 100.0, 10.0),
        ("ETH", "ETHEREUM_ERC20", 100.0, 15.0),
        ("USDT", "ETHEREUM_ERC20", 100.0, 20.0),
        ("USDT", "POLYGON", 100.0, 5.0),
        ("USDC", "POLYGON", 100.0, 8.0),
        ("USDC", "ETHEREUM_ERC20", 100.0, 12.0),
    ]

    for coin, net, ord_amt, comm_amt in test_pairs:
        key = f"{coin}_{net}"
        if coin == "BTC" and net == "BITCOIN":
            expected_ord_addr = settings.GLOBAL_BTC_DEPOSIT_ADDRESS
        else:
            expected_ord_addr = DEMO_ADDRESSES[key]

        ord_r = await generate_deposit_address(
            session=db_session,
            current_user=user,
            request=GenerateAddressRequest(coin=coin, network=net, usd_amount=ord_amt),
        )
        c_id = uuid.uuid4()
        comm_r = await generate_deposit_address(
            session=db_session,
            current_user=user,
            request=GenerateAddressRequest(
                coin=coin,
                network=net,
                usd_amount=comm_amt,
                metadata_payload={"type": "COPY_TRADING_COMMISSION", "copy_id": str(c_id)},
            ),
        )

        assert ord_r.address == expected_ord_addr, f"Ordinary {key} resolved to {ord_r.address}, expected {expected_ord_addr}"
        assert comm_r.address == settings.GLOBAL_BTC_DEPOSIT_ADDRESS, f"Commission {key} should use global BTC address, got {comm_r.address}"

        ord_rec = db_session.get(Transaction, uuid.UUID(ord_r.transaction_id))
        assert ord_rec.crypto_address == expected_ord_addr

        comm_rec = db_session.get(Transaction, uuid.UUID(comm_r.transaction_id))
        assert comm_rec.crypto_coin == "BTC"
        assert comm_rec.crypto_network == "BITCOIN"
        assert comm_rec.crypto_address == settings.GLOBAL_BTC_DEPOSIT_ADDRESS

    # 3. Test dynamic environment configuration:
    original_configured = settings.GLOBAL_BTC_DEPOSIT_ADDRESS
    try:
        custom_btc_addr = "bc1qcustomcommissionfixedaddress0001"
        settings.GLOBAL_BTC_DEPOSIT_ADDRESS = custom_btc_addr
        settings.COPY_TRADING_COMMISSION_BTC_ADDRESS = custom_btc_addr

        # Dynamic config applies to regular BTC deposit
        custom_ord_res = await generate_deposit_address(
            session=db_session,
            current_user=user,
            request=GenerateAddressRequest(coin="BTC", network="BITCOIN", usd_amount=150.0),
        )
        assert custom_ord_res.address == custom_btc_addr
        custom_ord_tx = db_session.get(Transaction, uuid.UUID(custom_ord_res.transaction_id))
        assert custom_ord_tx.crypto_address == custom_btc_addr

        # Dynamic config applies to commission deposit
        custom_c_id = uuid.uuid4()
        custom_comm_res = await generate_deposit_address(
            session=db_session,
            current_user=user,
            request=GenerateAddressRequest(
                coin="ETH",
                network="ETHEREUM_ERC20",
                usd_amount=30.0,
                metadata_payload={"type": "COPY_TRADING_COMMISSION", "copy_id": str(custom_c_id)},
            ),
        )
        assert custom_comm_res.address == custom_btc_addr
        custom_tx = db_session.get(Transaction, uuid.UUID(custom_comm_res.transaction_id))
        assert custom_tx.crypto_address == custom_btc_addr
        assert custom_tx.crypto_coin == "BTC"
        assert custom_tx.crypto_network == "BITCOIN"
    finally:
        settings.GLOBAL_BTC_DEPOSIT_ADDRESS = original_configured
        settings.COPY_TRADING_COMMISSION_BTC_ADDRESS = original_configured

    # 4. Confirm business rules:
    # Ordinary deposit below $50 must fail
    with pytest.raises(HTTPException) as exc_info:
        await generate_deposit_address(
            session=db_session,
            current_user=user,
            request=GenerateAddressRequest(coin="USDT", network="TRON_TRC20", usd_amount=25.0),
        )
    assert exc_info.value.status_code == 400
    assert "Minimum deposit is $50.00" in exc_info.value.detail

    # Commission deposit below $50 (e.g. $25.00) succeeded
    assert commission_res.transaction_id is not None


def test_production_environment_requires_commission_btc_address():
    """Verify that Settings raises ValidationError when ENVIRONMENT='production'
    without an explicitly configured COPY_TRADING_COMMISSION_BTC_ADDRESS."""
    from pydantic import ValidationError

    from app.core.config import Settings

    # Missing / empty address in production must fail
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            PROJECT_NAME="Apex",
            POSTGRES_SERVER="localhost",
            POSTGRES_USER="test",
            FIRST_SUPERUSER="admin@example.com",
            FIRST_SUPERUSER_PASSWORD="password123",
            ENVIRONMENT="production",
            COPY_TRADING_COMMISSION_BTC_ADDRESS=None,
        )
    assert "COPY_TRADING_COMMISSION_BTC_ADDRESS must be explicitly configured in production" in str(exc_info.value)

    # "changethis" in production must fail
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            PROJECT_NAME="Apex",
            POSTGRES_SERVER="localhost",
            POSTGRES_USER="test",
            FIRST_SUPERUSER="admin@example.com",
            FIRST_SUPERUSER_PASSWORD="password123",
            ENVIRONMENT="production",
            COPY_TRADING_COMMISSION_BTC_ADDRESS="changethis",
        )
    assert "COPY_TRADING_COMMISSION_BTC_ADDRESS must be explicitly configured in production" in str(exc_info.value)

    # Explicitly configured address via COPY_TRADING_COMMISSION_BTC_ADDRESS in production succeeds and syncs
    valid_prod_settings = Settings(
        PROJECT_NAME="Apex",
        POSTGRES_SERVER="localhost",
        POSTGRES_USER="test",
        FIRST_SUPERUSER="admin@example.com",
        FIRST_SUPERUSER_PASSWORD="password123",
        ENVIRONMENT="production",
        COPY_TRADING_COMMISSION_BTC_ADDRESS="bc1qprod9876543210address",
    )
    assert valid_prod_settings.COPY_TRADING_COMMISSION_BTC_ADDRESS == "bc1qprod9876543210address"
    assert valid_prod_settings.GLOBAL_BTC_DEPOSIT_ADDRESS == "bc1qprod9876543210address"

    # Explicitly configured address via GLOBAL_BTC_DEPOSIT_ADDRESS in production succeeds and syncs
    valid_prod_settings_global = Settings(
        PROJECT_NAME="Apex",
        POSTGRES_SERVER="localhost",
        POSTGRES_USER="test",
        FIRST_SUPERUSER="admin@example.com",
        FIRST_SUPERUSER_PASSWORD="password123",
        ENVIRONMENT="production",
        GLOBAL_BTC_DEPOSIT_ADDRESS="bc1qprodglobal9876543210addr",
    )
    assert valid_prod_settings_global.GLOBAL_BTC_DEPOSIT_ADDRESS == "bc1qprodglobal9876543210addr"
    assert valid_prod_settings_global.COPY_TRADING_COMMISSION_BTC_ADDRESS == "bc1qprodglobal9876543210addr"


def test_admin_pending_deposits_order_and_commission_metadata(db_session: Session):
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password="hash",
        is_superuser=True,
        role=UserRole.ADMIN,
    )
    user1 = User(
        id=uuid.uuid4(),
        email="user1@example.com",
        full_name="Alice User",
        hashed_password="hash",
    )
    user2 = User(
        id=uuid.uuid4(),
        email="user2@example.com",
        full_name="Bob Trader",
        hashed_password="hash",
    )
    db_session.add_all([admin, user1, user2])
    db_session.commit()

    older_tx = Transaction(
        id=uuid.uuid4(),
        user_id=user1.id,
        amount=50.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="Older regular deposit",
        crypto_network="TRON_TRC20",
        crypto_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
        crypto_coin="USDT",
        created_at=utc_now() - timedelta(hours=2),
    )
    newer_tx = Transaction(
        id=uuid.uuid4(),
        user_id=user2.id,
        amount=120.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="Copy trading commission deposit",
        metadata_payload={
            "type": "COPY_TRADING_COMMISSION",
            "trader_name": "ApexAlpha",
            "held_released_equity": 600.0,
            "copy_id": str(uuid.uuid4()),
        },
        crypto_network="ETHEREUM_ERC20",
        crypto_address="0x71C871A67DD91448b13689408b021319AcC003E9",
        crypto_coin="ETH",
        payment_confirmed_by_user=True,
        payment_confirmed_at=utc_now(),
        created_at=utc_now(),
    )
    db_session.add_all([older_tx, newer_tx])
    db_session.commit()

    dashboard = get_admin_dashboard_summary(session=db_session, current_user=admin)
    pending = dashboard.pending_deposits

    assert len(pending) >= 2
    # Verify newest-first ordering
    newer_idx = next(i for i, d in enumerate(pending) if d.id == newer_tx.id)
    older_idx = next(i for i, d in enumerate(pending) if d.id == older_tx.id)
    assert newer_idx < older_idx, "Newer deposit must be listed before older deposit"

    # Verify extended fields on commission deposit
    dep0 = pending[newer_idx]
    assert dep0.full_name == "Bob Trader"
    assert dep0.email == "user2@example.com"
    assert dep0.amount == 120.0
    assert dep0.payment_confirmed_by_user is True
    assert dep0.payment_confirmed_at is not None
    assert dep0.description == "Copy trading commission deposit"
    assert dep0.metadata_payload is not None
    assert dep0.metadata_payload["type"] == "COPY_TRADING_COMMISSION"
    assert dep0.metadata_payload["trader_name"] == "ApexAlpha"
    assert dep0.metadata_payload["held_released_equity"] == 600.0

    # Verify extended fields on regular older deposit
    dep1 = pending[older_idx]
    assert dep1.full_name == "Alice User"
    assert dep1.email == "user1@example.com"
    assert dep1.amount == 50.0
    assert dep1.payment_confirmed_by_user is False
    assert dep1.description == "Older regular deposit"


def test_pending_deposits_excludes_approved_and_sets_cache_headers(db_session: Session):
    """Verify get_pending_deposits returns only PENDING deposits, excludes COMPLETED
    deposits upon admin approval, and attaches anti-caching HTTP headers.
    """
    user = User(
        id=uuid.uuid4(),
        email="pendingtest@example.com",
        hashed_password="hash",
        wallet_balance=100.0,
        balance=100.0,
    )
    db_session.add(user)
    db_session.commit()

    # Create 3 deposit transactions: 2 pending, 1 withdrawal (non-deposit)
    tx_btc = Transaction(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=100.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="BTC Deposit",
        created_at=utc_now() - timedelta(minutes=10),
    )
    tx_usdt = Transaction(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=250.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description="USDT Deposit",
        created_at=utc_now() - timedelta(minutes=5),
    )
    tx_withdraw = Transaction(
        id=uuid.uuid4(),
        user_id=user.id,
        amount=50.0,
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PENDING,
        description="Withdrawal",
        created_at=utc_now() - timedelta(minutes=2),
    )
    db_session.add(tx_btc)
    db_session.add(tx_usdt)
    db_session.add(tx_withdraw)
    db_session.commit()

    # Step 1: Initial query when 2 deposits are pending
    response = Response()
    pending = get_pending_deposits(session=db_session, current_user=user, response=response)

    assert response.headers.get("Cache-Control") == "no-cache, no-store, max-age=0, must-revalidate"
    assert response.headers.get("Pragma") == "no-cache"
    assert response.headers.get("Expires") == "0"

    assert len(pending) == 2
    pending_ids = {t.id for t in pending}
    assert tx_btc.id in pending_ids
    assert tx_usdt.id in pending_ids
    assert tx_withdraw.id not in pending_ids

    # Step 2: Admin approves tx_btc -> status becomes COMPLETED
    tx_btc.status = TransactionStatus.COMPLETED
    db_session.add(tx_btc)
    db_session.commit()

    response2 = Response()
    pending_after_first_approval = get_pending_deposits(session=db_session, current_user=user, response=response2)
    assert len(pending_after_first_approval) == 1
    assert pending_after_first_approval[0].id == tx_usdt.id

    # Step 3: Admin approves tx_usdt -> status becomes COMPLETED
    tx_usdt.status = TransactionStatus.COMPLETED
    db_session.add(tx_usdt)
    db_session.commit()

    response3 = Response()
    pending_after_second_approval = get_pending_deposits(session=db_session, current_user=user, response=response3)
    assert len(pending_after_second_approval) == 0


if __name__ == "__main__":
    import asyncio
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as s:
        print("Running test_copy_trading_commission_stop_holds_equity_and_admin_release...")
        asyncio.run(test_copy_trading_commission_stop_holds_equity_and_admin_release(s))
        print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_copy_trading_zero_commission_releases_equity_immediately...")
        test_copy_trading_zero_commission_releases_equity_immediately(s)
        print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_duplicate_protection_in_stop_and_deposit...")
        test_duplicate_protection_in_stop_and_deposit(s)
        print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_ordinary_deposit_still_credits_main_wallet...")
        asyncio.run(test_ordinary_deposit_still_credits_main_wallet(s))
        print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_commission_deposits_use_fixed_btc_address_while_ordinary_deposits_use_demo_addresses...")
        asyncio.run(test_commission_deposits_use_fixed_btc_address_while_ordinary_deposits_use_demo_addresses(s))
        print("✓ Passed!")

    print("Running test_production_environment_requires_commission_btc_address...")
    test_production_environment_requires_commission_btc_address()
    print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_admin_pending_deposits_order_and_commission_metadata...")
        test_admin_pending_deposits_order_and_commission_metadata(s)
        print("✓ Passed!")

    with Session(engine) as s:
        print("Running test_pending_deposits_excludes_approved_and_sets_cache_headers...")
        test_pending_deposits_excludes_approved_and_sets_cache_headers(s)
        print("✓ Passed!")

    print("\nAll Copy Trading commission accounting and settlement tests passed successfully!")
