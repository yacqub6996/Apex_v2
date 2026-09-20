from __future__ import annotations

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import (
    CopyTradingWallet,
    User,
    UserCreate,
    UserTraderCopy,
)
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(session: Session, *, email: str, password: str, full_name: str) -> User:
    user_in = UserCreate(email=email, password=password, full_name=full_name)
    return crud.create_user(session=session, user_create=user_in)


def _login_headers(client: TestClient, *, email: str, password: str) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    tokens: dict[str, Any] = response.json()
    access_token = tokens["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


def test_copy_trading_top_up_flow(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    trader_email = random_email()
    trader_password = random_lower_string()
    follower_email = random_email()
    follower_password = random_lower_string()

    trader_user = _create_user(
        db,
        email=trader_email,
        password=trader_password,
        full_name="TopUp Trader",
    )
    follower_user = _create_user(
        db,
        email=follower_email,
        password=follower_password,
        full_name="Follower TopUp",
    )

    # Fund follower copy wallet
    follower_user.balance = 1000.0
    db.add(follower_user)
    db.commit()
    db.refresh(follower_user)

    # Ensure CopyTradingWallet exists with balance
    ct_wallet = CopyTradingWallet(user_id=follower_user.id, balance=800.0)
    db.add(ct_wallet)
    db.commit()

    create_payload = {
        "user_id": str(trader_user.id),
        "display_name": "TopUp FX",
        "specialty": "crypto",
        "risk_level": "LOW",
        "is_public": True,
        "copy_fee_percentage": 2.0,
        "minimum_copy_amount": 100.0,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/traders/",
        headers=superuser_token_headers,
        json=create_payload,
    )
    assert create_response.status_code == 200
    trader_data = create_response.json()
    trader_profile_id = trader_data["trader_profile"]["id"]

    follower_headers = _login_headers(
        client, email=follower_email, password=follower_password
    )

    # Start copy trading with 300.0 (drawn from copy wallet 800.0 -> leaves 500.0)
    start_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/start",
        headers=follower_headers,
        json={
            "trader_id": trader_profile_id,
            "allocation_amount": 300.0,
        },
    )
    assert start_res.status_code == 200
    copy_id = start_res.json()["copied_trader"]["copy_id"]
    assert start_res.json()["copied_trader"]["allocation"] == 300.0

    # 1. Top up with invalid amounts (negative, zero, decimal)
    neg_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": -50.0},
    )
    assert neg_res.status_code == 400

    dec_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": 50.50},
    )
    assert dec_res.status_code == 400

    # 2. Top up exceeding copy wallet balance (copy wallet has 500.0, try 999.0)
    exceed_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": 999.0},
    )
    assert exceed_res.status_code == 400
    assert "Insufficient Copy Trading Wallet balance" in exceed_res.json()["detail"]

    # 3. Successful top up of $200
    top_up_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": 200.0},
    )
    assert top_up_res.status_code == 200
    top_up_data = top_up_res.json()
    assert top_up_data["success"] is True
    assert top_up_data["available_balance"] == 300.0  # 500 - 200 = 300
    assert top_up_data["copied_trader"]["allocation"] == 500.0  # 300 + 200 = 500

    # Verify DB state
    db.expire_all()
    copy_record = db.get(UserTraderCopy, uuid.UUID(copy_id))
    assert copy_record is not None
    assert copy_record.copy_amount == 500.0

    updated_follower = db.get(User, follower_user.id)
    assert updated_follower.copy_trading_wallet.balance == 300.0

    # 4. Top up while PAUSED is also supported
    pause_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/pause",
        headers=follower_headers,
    )
    assert pause_res.status_code == 200

    paused_top_up = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": 100.0},
    )
    assert paused_top_up.status_code == 200
    assert paused_top_up.json()["copied_trader"]["allocation"] == 600.0
    assert paused_top_up.json()["available_balance"] == 200.0

    # 5. Stop copy relationship - subsequent top up must fail
    stop_res = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/stop",
        headers=follower_headers,
    )
    assert stop_res.status_code == 200

    stopped_top_up = client.post(
        f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/top-up",
        headers=follower_headers,
        json={"amount": 50.0},
    )
    assert stopped_top_up.status_code == 400
    assert "Cannot top up a stopped copy relationship" in stopped_top_up.json()["detail"]
