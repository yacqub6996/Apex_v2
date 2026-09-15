from __future__ import annotations

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import KycStatus, TransactionStatus, User, UserCreate
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(session: Session, *, email: str, password: str, full_name: str) -> User:
    user_in = UserCreate(email=email, password=password, full_name=full_name)
    return crud.create_user(session=session, user_create=user_in)


def _login_headers(client: TestClient, *, email: str, password: str) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    response.raise_for_status()
    token = response.json()["access_token"]
    return {"Authorization": "Bearer " + token}


def test_admin_can_approve_main_wallet_withdrawal_request(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Main Wallet User")
    user.wallet_balance = 500.0
    user.balance = 500.0
    db.add(user)
    db.commit()
    db.refresh(user)

    user_headers = _login_headers(client, email=email, password=password,)
    request_response = client.post(
        f"{settings.API_V1_STR}/transactions/",
        headers=user_headers,
        json={
            "amount": 150.0,
            "transaction_type": "WITHDRAWAL",
            "status": "PENDING",
            "description": "Main wallet withdrawal",
            "withdrawal_source": "MAIN_WALLET",
        },
    )
    assert request_response.status_code == 200
    transaction_id = request_response.json()["id"]

    approve_response = client.post(
        f"{settings.API_V1_STR}/admin/simulations/withdrawals/{transaction_id}/approve",
        headers=superuser_token_headers,
    )
    assert approve_response.status_code == 200

    db.refresh(user)
    assert user.wallet_balance == 350.0
    assert user.balance == 350.0


def test_admin_can_approve_copy_wallet_withdrawal_request(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Copy Wallet User")
    user.wallet_balance = 100.0
    user.balance = 100.0
    user.kyc_status = KycStatus.APPROVED
    db.add(user)
    db.commit()
    db.refresh(user, attribute_names=["copy_trading_wallet"])
    assert user.copy_trading_wallet is not None
    user.copy_trading_wallet.balance = 200.0
    db.add(user.copy_trading_wallet)
    db.commit()

    user_headers = _login_headers(client, email=email, password=password,)
    request_response = client.post(
        f"{settings.API_V1_STR}/copy-trading/request-withdrawal",
        headers=user_headers,
        json={"amount": 50.0, "description": "Copy wallet withdrawal"},
    )
    assert request_response.status_code == 200
    transaction_id = request_response.json()["transaction_id"]

    approve_response = client.post(
        f"{settings.API_V1_STR}/admin/simulations/withdrawals/{transaction_id}/approve",
        headers=superuser_token_headers,
    )
    assert approve_response.status_code == 200

    db.refresh(user)
    db.refresh(user, attribute_names=["copy_trading_wallet"])
    assert user.copy_trading_wallet is not None
    assert user.wallet_balance == 150.0
    assert user.balance == 150.0
    assert float(user.copy_trading_wallet.balance) == 150.0


def test_rejecting_long_term_wallet_withdrawal_restores_reserved_funds(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Long-Term Wallet User")
    user.wallet_balance = 100.0
    user.balance = 100.0
    user.long_term_balance = 300.0
    user.kyc_status = KycStatus.APPROVED
    db.add(user)
    db.commit()
    db.refresh(user, attribute_names=["long_term_wallet"])
    assert user.long_term_wallet is not None
    user.long_term_wallet.balance = 300.0
    db.add(user.long_term_wallet)
    db.commit()

    user_headers = _login_headers(client, email=email, password=password,)
    request_response = client.post(
        f"{settings.API_V1_STR}/long-term/request-withdrawal",
        headers=user_headers,
        json={"amount": 75.0, "description": "Long-term wallet withdrawal"},
    )
    assert request_response.status_code == 200
    transaction_id = request_response.json()["transaction_id"]

    db.refresh(user)
    db.refresh(user, attribute_names=["long_term_wallet"])
    assert user.long_term_wallet is not None
    assert float(user.long_term_wallet.balance) == 225.0
    assert user.long_term_balance == 225.0

    reject_response = client.post(
        f"{settings.API_V1_STR}/admin/simulations/withdrawals/{transaction_id}/reject",
        headers=superuser_token_headers,
    )
    assert reject_response.status_code == 200
    assert reject_response.json()["status"] == TransactionStatus.FAILED.value

    db.refresh(user)
    db.refresh(user, attribute_names=["long_term_wallet"])
    assert user.long_term_wallet is not None
    assert float(user.long_term_wallet.balance) == 300.0
    assert user.long_term_balance == 300.0


def test_superuser_override_updates_wallet_balances_and_can_clear_accounts(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Override User")
    user.wallet_balance = 20.0
    user.balance = 20.0
    user.copy_trading_balance = 30.0
    user.long_term_balance = 40.0
    db.add(user)
    db.commit()

    copy_override = client.post(
        f"{settings.API_V1_STR}/admin/ledger/balance/override",
        headers=superuser_token_headers,
        json={
            "user_id": str(user.id),
            "balance_field": "copy_wallet",
            "new_value": 120.0,
            "reason": "Seed copy wallet",
        },
    )
    assert copy_override.status_code == 200
    db.refresh(user, attribute_names=["copy_trading_wallet"])
    assert user.copy_trading_wallet is not None
    assert float(user.copy_trading_wallet.balance) == 120.0
    assert user.copy_trading_balance == 30.0
    assert user.long_term_balance == 40.0

    long_term_override = client.post(
        f"{settings.API_V1_STR}/admin/ledger/balance/override",
        headers=superuser_token_headers,
        json={
            "user_id": str(user.id),
            "balance_field": "long_term_wallet",
            "new_value": 80.0,
            "reason": "Seed long-term wallet",
        },
    )
    assert long_term_override.status_code == 200
    db.refresh(user, attribute_names=["long_term_wallet"])
    assert user.long_term_wallet is not None
    assert float(user.long_term_wallet.balance) == 80.0
    assert user.copy_trading_balance == 30.0
    assert user.long_term_balance == 40.0

    clear_override = client.post(
        f"{settings.API_V1_STR}/admin/ledger/balance/override",
        headers=superuser_token_headers,
        json={
            "user_id": str(user.id),
            "balance_field": "total",
            "new_value": 0.0,
            "reason": "Clear balances",
        },
    )
    assert clear_override.status_code == 200

    db.refresh(user)
    db.refresh(user, attribute_names=["copy_trading_wallet", "long_term_wallet"])
    assert user.copy_trading_wallet is not None
    assert user.long_term_wallet is not None
    assert user.wallet_balance == 0.0
    assert user.balance == 0.0
    assert user.copy_trading_balance == 0.0
    assert user.long_term_balance == 0.0
    assert float(user.copy_trading_wallet.balance) == 0.0
    assert float(user.long_term_wallet.balance) == 0.0
