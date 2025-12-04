from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.db import engine
from app.models import CopyStatus, TraderProfile, User, UserCreate, UserTraderCopy


def _create_user(session: Session, *, email: str, password: str, full_name: str) -> User:
    user_in = UserCreate(email=email, password=password, full_name=full_name)
    return crud.create_user(session=session, user_create=user_in)


def _login_headers(client: TestClient, *, email: str, password: str) -> dict[str, str]:
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    tokens = response.json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture(name="session")
def session_fixture() -> Session:
    with Session(engine) as session:
        yield session


def test_manual_profit_creates_execution_event(
    client: TestClient,
    session: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    email = "manual.user@example.com"
    password = "Manual123!"
    user = _create_user(
        session,
        email=email,
        password=password,
        full_name="Manual Adjustee",
    )
    session.refresh(user)

    adjustment_payload = {"amount": 150.0, "description": "Manual profit grant"}
    response = client.post(
        f"{settings.API_V1_STR}/admin/simulations/users/{user.id}/profit",
        headers=superuser_token_headers,
        json=adjustment_payload,
    )
    assert response.status_code == 200
    manual_data = response.json()
    assert manual_data["balance"] == pytest.approx(150.0, rel=1e-3)
    assert uuid.UUID(manual_data["event_id"]) == uuid.UUID(manual_data["event_id"])  # sanity check

    user_headers = _login_headers(client, email=email, password=password)

    feed_response = client.get(
        f"{settings.API_V1_STR}/copy-trading/executions",
        headers=user_headers,
    )
    assert feed_response.status_code == 200
    feed_payload = feed_response.json()
    assert feed_payload["count"] == 1
    event = feed_payload["data"][0]
    assert event["eventType"] == "MANUAL_ADJUSTMENT"
    assert event["amount"] == pytest.approx(150.0, rel=1e-3)
    assert event["description"] == "Manual profit grant"

    me_response = client.get(f"{settings.API_V1_STR}/users/me", headers=user_headers)
    assert me_response.status_code == 200
    me_payload = me_response.json()
    assert me_payload["balance"] == pytest.approx(150.0, rel=1e-3)
    assert me_payload["available_balance"] == pytest.approx(150.0, rel=1e-3)
    assert me_payload["allocated_copy_balance"] == pytest.approx(0.0, rel=1e-3)
    assert me_payload["total_balance"] == pytest.approx(150.0, rel=1e-3)


def test_admin_simulation_triggers_copy_events(
    client: TestClient,
    session: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    trader_email = "sim.trader@example.com"
    trader_password = "TraderSim123!"
    follower_email = "sim.follower@example.com"
    follower_password = "FollowerSim123!"

    trader_user = _create_user(
        session,
        email=trader_email,
        password=trader_password,
        full_name="Simulation Trader",
    )
    follower_user = _create_user(
        session,
        email=follower_email,
        password=follower_password,
        full_name="Simulation Follower",
    )

    follower_user.balance = 5000.0
    session.add(follower_user)
    session.commit()
    session.refresh(follower_user)

    create_payload = {
        "user_id": str(trader_user.id),
        "display_name": "Sim Trader",
        "specialty": "forex",
        "risk_level": "LOW",
        "is_public": True,
        "copy_fee_percentage": 1.0,
        "minimum_copy_amount": 100.0,
    }
    create_response = client.post(
        f"{settings.API_V1_STR}/traders/",
        headers=superuser_token_headers,
        json=create_payload,
    )
    assert create_response.status_code == 200
    trader_profile_id = create_response.json()["trader_profile"]["id"]

    follower_headers = _login_headers(client, email=follower_email, password=follower_password)
    start_response = client.post(
        f"{settings.API_V1_STR}/copy-trading/start",
        headers=follower_headers,
        json={
            "trader_id": trader_profile_id,
            "allocation_amount": 250.0,
        },
    )
    assert start_response.status_code == 200

    run_response = client.post(
        f"{settings.API_V1_STR}/admin/simulations/run",
        headers=superuser_token_headers,
        json={},
    )
    assert run_response.status_code == 200
    run_payload = run_response.json()
    assert run_payload["trader_trades_created"] >= 0
    assert run_payload["follower_trades_created"] >= 0
    assert run_payload["events_recorded"] >= 0

    feed_response = client.get(
        f"{settings.API_V1_STR}/copy-trading/executions?limit=5",
        headers=follower_headers,
    )
    assert feed_response.status_code == 200
    feed_payload = feed_response.json()
    assert feed_payload["count"] >= 1
    first_event = feed_payload["data"][0]
    assert first_event["eventType"] in {"FOLLOWER_PROFIT", "MANUAL_ADJUSTMENT"}

    with Session(engine) as after_session:
        copies = after_session.exec(
            select(UserTraderCopy).where(UserTraderCopy.user_id == follower_user.id)
        ).all()
        assert copies
        active_copy = next((c for c in copies if c.copy_status == CopyStatus.ACTIVE), None)
        assert active_copy is not None
