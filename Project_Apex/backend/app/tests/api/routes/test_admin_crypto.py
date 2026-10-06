import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.api.routes.admin_crypto import (
    get_all_deposit_addresses,
    update_deposit_address,
    validate_crypto_address_format,
)
from app.api.routes.crypto_deposits import (
    GenerateAddressRequest,
    generate_deposit_address,
)
from app.models import (
    CryptoDepositAddress,
    CryptoDepositAddressUpdate,
    User,
    UserRole,
)


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


def test_validate_crypto_address_format():
    # Valid Bitcoin addresses
    validate_crypto_address_format("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "BITCOIN")
    validate_crypto_address_format("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", "BITCOIN")
    validate_crypto_address_format("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "BITCOIN")

    # Invalid Bitcoin address
    with pytest.raises(HTTPException) as exc_info:
        validate_crypto_address_format("0x1234567890123456789012345678901234567890", "BITCOIN")
    assert exc_info.value.status_code == 400

    # Valid EVM
    validate_crypto_address_format("0x1111cAFe2222babe3333dEAD4444beef5555cAFE", "ETHEREUM_ERC20")
    validate_crypto_address_format("0x2222dEAD3333bEEF4444cAFE5555bABE6666cAFE", "POLYGON")

    # Invalid EVM
    with pytest.raises(HTTPException):
        validate_crypto_address_format("0xinvalid", "ETHEREUM_ERC20")

    # Valid TRON
    validate_crypto_address_format("TYDzsYUEpvnYmQk4zGP9sWWcTEd36d57yo", "TRON_TRC20")

    # Invalid TRON
    with pytest.raises(HTTPException):
        validate_crypto_address_format("0x7E57D3m0cAfE0000000000000000000000CaFe00", "TRON_TRC20")


def test_get_deposit_addresses_permissions(db_session: Session):
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        is_superuser=True,
        role=UserRole.ADMIN,
    )
    normal_user = User(
        id=uuid.uuid4(),
        email="user@example.com",
        is_superuser=False,
        role=UserRole.USER,
    )

    # Normal user should be rejected
    with pytest.raises(HTTPException) as exc:
        get_all_deposit_addresses(session=db_session, current_user=normal_user)
    assert exc.value.status_code == 403

    # Admin should succeed
    res = get_all_deposit_addresses(session=db_session, current_user=admin)
    assert res.count == 0

    # Add a record
    addr = CryptoDepositAddress(
        coin="BTC",
        network="BITCOIN",
        address="bc1q9demo0x9k4u5y6x7z8q2m3n4p5r6s7t8v9w0xy",
        is_active=True,
    )
    db_session.add(addr)
    db_session.commit()

    res2 = get_all_deposit_addresses(session=db_session, current_user=admin)
    assert res2.count == 1
    assert res2.data[0].coin == "BTC"


def test_update_deposit_address_and_deposit_generation_flow(db_session: Session):
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password="fakehashedpassword",
        is_superuser=True,
        role=UserRole.ADMIN,
    )
    db_session.add(admin)

    user = User(
        id=uuid.uuid4(),
        email="client@example.com",
        hashed_password="fakehashedpassword",
        is_superuser=False,
        role=UserRole.USER,
    )
    db_session.add(user)
    db_session.commit()

    # Create USDT TRC20 address
    addr = CryptoDepositAddress(
        coin="USDT",
        network="TRON_TRC20",
        address="TQ2DeM0Addr3ss111111111111111111111111",
        is_active=True,
    )
    db_session.add(addr)
    db_session.commit()
    db_session.refresh(addr)

    # 1. Update address as admin to client's new address
    client_new_tron = "TYDzsYUEpvnYmQk4zGP9sWWcTEd36d57yo"
    update_payload = CryptoDepositAddressUpdate(
        address=client_new_tron,
        notes="Client custom deposit wallet",
    )
    updated = update_deposit_address(
        session=db_session,
        current_user=admin,
        address_id=addr.id,
        payload=update_payload,
    )
    assert updated.address == client_new_tron
    assert updated.notes == "Client custom deposit wallet"
    assert updated.updated_by_email == "admin@example.com"

    # 2. When user generates a deposit address, it must use the newly updated address!
    req = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=100.0,
    )
    # generate_deposit_address is async
    import asyncio
    gen_res = asyncio.run(
        generate_deposit_address(
            session=db_session,
            current_user=user,
            request=req,
        )
    )
    assert gen_res.address == client_new_tron

    # 3. Deactivate address -> fallback should be demo default
    deact_payload = CryptoDepositAddressUpdate(is_active=False)
    update_deposit_address(
        session=db_session,
        current_user=admin,
        address_id=addr.id,
        payload=deact_payload,
    )

    req2 = GenerateAddressRequest(
        coin="USDT",
        network="TRON_TRC20",
        usd_amount=120.0,
    )
    gen_res2 = asyncio.run(
        generate_deposit_address(
            session=db_session,
            current_user=user,
            request=req2,
        )
    )
    assert gen_res2.address == "TQ2DeM0Addr3ss111111111111111111111111"


def test_create_custom_crypto_coin_and_available_coins_flow(db_session: Session):
    from app.api.routes.admin_crypto import create_deposit_address
    from app.api.routes.crypto_deposits import get_available_coins
    from app.models import CryptoDepositAddressCreate
    import asyncio

    admin = User(
        id=uuid.uuid4(),
        email="admin2@example.com",
        hashed_password="fakehashedpassword",
        is_superuser=True,
        role=UserRole.ADMIN,
    )
    db_session.add(admin)

    user = User(
        id=uuid.uuid4(),
        email="user2@example.com",
        hashed_password="fakehashedpassword",
        is_superuser=False,
        role=UserRole.USER,
    )
    db_session.add(user)
    db_session.commit()

    # 1. Non-admin cannot create
    sol_payload = CryptoDepositAddressCreate(
        coin="SOL",
        network="SOLANA",
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        display_name="Solana",
        coingecko_id="solana",
        fallback_rate=150.0,
    )
    with pytest.raises(HTTPException) as exc:
        create_deposit_address(session=db_session, current_user=user, payload=sol_payload)
    assert exc.value.status_code == 403

    # 2. Invalid Solana address raises 400
    invalid_sol = CryptoDepositAddressCreate(
        coin="SOL",
        network="SOLANA",
        address="0xInvalidSolanaAddress",
    )
    with pytest.raises(HTTPException) as exc2:
        create_deposit_address(session=db_session, current_user=admin, payload=invalid_sol)
    assert exc2.value.status_code == 400

    # 3. Admin creates valid SOL address
    created = create_deposit_address(session=db_session, current_user=admin, payload=sol_payload)
    assert created.coin == "SOL"
    assert created.network == "SOLANA"
    assert created.display_name == "Solana"
    assert created.coingecko_id == "solana"
    assert created.fallback_rate == 150.0
    assert created.address == "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

    # 4. Duplicate creation raises 400
    with pytest.raises(HTTPException) as exc3:
        create_deposit_address(session=db_session, current_user=admin, payload=sol_payload)
    assert exc3.value.status_code == 400

    # 5. Check get_available_coins includes SOL
    coins = get_available_coins(session=db_session, current_user=user)
    sol_coin = next((c for c in coins if c.coin == "SOL"), None)
    assert sol_coin is not None
    assert sol_coin.display_name == "Solana"
    assert len(sol_coin.networks) == 1
    assert sol_coin.networks[0].key == "SOLANA"

    # 6. User generates deposit address for SOL
    req = GenerateAddressRequest(
        coin="SOL",
        network="SOLANA",
        usd_amount=75.0,
    )
    gen = asyncio.run(generate_deposit_address(session=db_session, current_user=user, request=req))
    assert gen.address == "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"


if __name__ == "__main__":
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        test_validate_crypto_address_format()
        print("test_validate_crypto_address_format passed!")
        test_get_deposit_addresses_permissions(session)
        print("test_get_deposit_addresses_permissions passed!")
        test_update_deposit_address_and_deposit_generation_flow(session)
        print("test_update_deposit_address_and_deposit_generation_flow passed!")
        test_create_custom_crypto_coin_and_available_coins_flow(session)
        print("test_create_custom_crypto_coin_and_available_coins_flow passed!")
        print("ALL ADMIN CRYPTO TESTS PASSED SUCCESSFULLY!")

