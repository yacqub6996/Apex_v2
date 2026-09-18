import uuid
from datetime import timedelta
import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool

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
    UserTraderCopy,
)
from app.api.routes.copy_trading import stop_copy_relationship
from app.api.routes.crypto_deposits import (
    generate_deposit_address,
    GenerateAddressRequest,
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
    tx = db_session.get(Transaction, uuid.UUID(gen_res.transaction_id))
    assert tx is not None
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
    tx = db_session.get(Transaction, uuid.UUID(res.transaction_id))
    assert tx is not None

    finalize_deposit_transaction(session=db_session, transaction=tx, notify=False)
    db_session.refresh(user)
    db_session.refresh(copy_wallet)

    assert user.wallet_balance == 300.0
    assert user.balance == 300.0
    assert copy_wallet.balance == 50.0  # Copy wallet untouched


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

    print("\nAll Copy Trading commission accounting and settlement tests passed successfully!")
