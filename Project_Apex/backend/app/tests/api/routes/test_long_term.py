from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from sqlalchemy import text

from app import crud
from app.core.config import settings
from app.models import ExecutionEvent, User, UserCreate, UserLongTermInvestment
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(session: Session, *, email: str, password: str, full_name: str) -> User:
    user_in = UserCreate(email=email, password=password, full_name=full_name)
    user = crud.create_user(session=session, user_create=user_in)
    session.commit()
    session.refresh(user)
    return user


def _login_headers(client: TestClient, *, email: str, password: str) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    response.raise_for_status()
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture(autouse=True)
def reset_long_term_tables(db: Session) -> None:
    db.exec(text("TRUNCATE TABLE userlongterminvestment RESTART IDENTITY CASCADE"))
    db.commit()


@pytest.mark.parametrize("deposit", [1500.0])
def test_long_term_subscription_moves_balances(
    client: TestClient,
    db: Session,
    deposit: float,
) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Long Term User")
    user.wallet_balance = deposit * 2
    db.add(user)
    db.commit()
    db.refresh(user)

    headers = _login_headers(client, email=email, password=password)

    plans_response = client.get(f"{settings.API_V1_STR}/long-term/plans", headers=headers)
    assert plans_response.status_code == 200
    plans_payload = plans_response.json()
    assert plans_payload["data"], "default plans should be seeded"

    plan = plans_payload["data"][0]
    plan_id = plan["id"]
    minimum = plan["minimum_deposit"]
    amount = max(minimum, deposit)

    subscribe_response = client.post(
        f"{settings.API_V1_STR}/long-term/investments",
        headers=headers,
        json={"plan_id": plan_id, "amount": amount},
    )
    assert subscribe_response.status_code == 200
    payload = subscribe_response.json()
    assert payload["success"] is True
    assert payload["wallet_balance"] == pytest.approx(user.wallet_balance - amount, rel=1e-6)
    assert payload["long_term_balance"] == pytest.approx(amount, rel=1e-6)

    db.refresh(user)
    assert user.wallet_balance == pytest.approx(payload["wallet_balance"], rel=1e-6)
    assert user.long_term_balance == pytest.approx(payload["long_term_balance"], rel=1e-6)

    investment = db.exec(
        select(UserLongTermInvestment).where(UserLongTermInvestment.user_id == user.id)
    ).first()
    assert investment is not None
    assert pytest.approx(investment.allocation, rel=1e-6) == amount


def test_admin_long_term_roi_push(client: TestClient, db: Session, superuser_token_headers: dict[str, str]) -> None:
    email = random_email()
    password = random_lower_string()
    user = _create_user(db, email=email, password=password, full_name="Managed Investor")
    user.wallet_balance = 10_000.0
    db.add(user)
    db.commit()
    db.refresh(user)

    user_headers = _login_headers(client, email=email, password=password)
    plans_response = client.get(f"{settings.API_V1_STR}/long-term/plans", headers=user_headers)
    plan = plans_response.json()["data"][0]

    subscribe_amount = max(plan["minimum_deposit"], 5_000.0)
    subscribe_response = client.post(
        f"{settings.API_V1_STR}/long-term/investments",
        headers=user_headers,
        json={"plan_id": plan["id"], "amount": subscribe_amount},
    )
    assert subscribe_response.status_code == 200

    roi_percent = 8.0
    roi_response = client.post(
        f"{settings.API_V1_STR}/admin/long-term/push",
        headers=superuser_token_headers,
        json={
            "plan_id": plan["id"],
            "roi_percent": roi_percent,
            "note": "Quarterly update",
        },
    )
    assert roi_response.status_code == 200
    payload = roi_response.json()
    assert payload["affected_users"] >= 1
    assert payload["total_roi_amount"] == pytest.approx(subscribe_amount * (roi_percent / 100), rel=1e-6)

    db.refresh(user)
    expected_balance = subscribe_amount + subscribe_amount * (roi_percent / 100)
    assert user.long_term_balance == pytest.approx(expected_balance, rel=1e-6)

    events = db.exec(
        select(ExecutionEvent).where(ExecutionEvent.user_id == user.id)
    ).all()
    assert any((evt.payload or {}).get("service") == "LONG_TERM" for evt in events)
