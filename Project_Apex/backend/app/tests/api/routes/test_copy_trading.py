from __future__ import annotations

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.core.db import engine
from app.models import (
    CopyStatus,
    TraderProfile,
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


def test_copy_trading_pause_and_stop_flow(
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
        full_name="Alpha Trader",
    )
    follower_user = _create_user(
        db,
        email=follower_email,
        password=follower_password,
        full_name="Follower User",
    )

    initial_balance = 2000.0
    follower_user.balance = initial_balance
    db.add(follower_user)
    db.commit()
    db.refresh(follower_user)

    copy_id: str | None = None
    trader_profile_id: str | None = None
    try:
        create_payload = {
            "user_id": str(trader_user.id),
            "display_name": "Alpha FX",
            "specialty": "forex",
            "risk_level": "MEDIUM",
            "is_public": True,
            "copy_fee_percentage": 1.5,
            "minimum_copy_amount": 200.0,
        }

        create_response = client.post(
            f"{settings.API_V1_STR}/traders/",
            headers=superuser_token_headers,
            json=create_payload,
        )
        assert create_response.status_code == 200
        trader_data = create_response.json()
        trader_profile_id = trader_data["trader_profile"]["id"]
        trader_code = trader_data["trader_code"]

        follower_headers = _login_headers(
            client, email=follower_email, password=follower_password
        )

        verify_response = client.post(
            f"{settings.API_V1_STR}/copy-trading/verify",
            headers=follower_headers,
            json={"trader_code": trader_code},
        )
        assert verify_response.status_code == 200
        verify_payload = verify_response.json()
        assert verify_payload["valid"] is True
        assert verify_payload["trader"]["display_name"] == "Alpha FX"
        assert verify_payload["trader"]["trader_code"] == trader_code

        baseline_summary = client.get(
            f"{settings.API_V1_STR}/copy-trading/summary",
            headers=superuser_token_headers,
        )
        assert baseline_summary.status_code == 200
        summary_before = baseline_summary.json()

        start_response = client.post(
            f"{settings.API_V1_STR}/copy-trading/start",
            headers=follower_headers,
            json={
                "trader_id": trader_profile_id,
                "allocation_amount": 500.0,
            },
        )
        assert start_response.status_code == 200
        start_payload = start_response.json()
        copy_id = start_payload["copied_trader"]["copy_id"]
        assert start_payload["copied_trader"]["status"] == "ACTIVE"
        assert start_payload["available_balance"] == pytest.approx(initial_balance - 500.0, rel=1e-3)

        db.refresh(follower_user)
        assert follower_user.balance == pytest.approx(initial_balance - 500.0, rel=1e-3)

        copy_query = select(UserTraderCopy).where(
            UserTraderCopy.id == copy_id
        )
        copy_entry = db.exec(copy_query).first()
        assert copy_entry is not None
        assert copy_entry.copy_status == CopyStatus.ACTIVE

        profile = db.get(TraderProfile, trader_profile_id)
        assert profile is not None
        assert profile.total_copiers == 1
        assert profile.total_assets_under_copy == 500.0

        summary_response = client.get(
            f"{settings.API_V1_STR}/copy-trading/summary",
            headers=superuser_token_headers,
        )
        assert summary_response.status_code == 200
        summary_after_start = summary_response.json()
        assert summary_after_start["active"] == summary_before["active"] + 1
        assert summary_after_start["paused"] == summary_before["paused"]
        assert summary_after_start["stopped"] == summary_before["stopped"]

        pause_response = client.post(
            f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/pause",
            headers=follower_headers,
        )
        assert pause_response.status_code == 200
        pause_payload = pause_response.json()
        assert pause_payload["available_balance"] == pytest.approx(initial_balance - 500.0, rel=1e-3)
        db.refresh(copy_entry)
        db.refresh(profile)
        assert copy_entry.copy_status == CopyStatus.PAUSED
        assert profile.total_copiers == 0
        assert profile.total_assets_under_copy == 0.0

        summary_response = client.get(
            f"{settings.API_V1_STR}/copy-trading/summary",
            headers=superuser_token_headers,
        )
        assert summary_response.status_code == 200
        summary_after_pause = summary_response.json()
        assert summary_after_pause["active"] == summary_before["active"]
        assert summary_after_pause["paused"] == summary_before["paused"] + 1
        assert summary_after_pause["stopped"] == summary_before["stopped"]

        resume_response = client.post(
            f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/resume",
            headers=follower_headers,
        )
        assert resume_response.status_code == 200
        resume_payload = resume_response.json()
        assert resume_payload["available_balance"] == pytest.approx(initial_balance - 500.0, rel=1e-3)
        db.refresh(copy_entry)
        db.refresh(profile)
        assert copy_entry.copy_status == CopyStatus.ACTIVE
        assert profile.total_copiers == 1
        assert profile.total_assets_under_copy == 500.0

        summary_response = client.get(
            f"{settings.API_V1_STR}/copy-trading/summary",
            headers=superuser_token_headers,
        )
        assert summary_response.status_code == 200
        summary_after_resume = summary_response.json()
        assert summary_after_resume["active"] == summary_before["active"] + 1
        assert summary_after_resume["paused"] == summary_before["paused"]
        assert summary_after_resume["stopped"] == summary_before["stopped"]

        stop_response = client.post(
            f"{settings.API_V1_STR}/copy-trading/copied/{copy_id}/stop",
            headers=follower_headers,
        )
        assert stop_response.status_code == 200
        stop_payload = stop_response.json()
        assert stop_payload["available_balance"] == pytest.approx(initial_balance, rel=1e-3)
        db.refresh(copy_entry)
        db.refresh(profile)
        assert copy_entry.copy_status == CopyStatus.STOPPED
        assert profile.total_copiers == 0
        assert profile.total_assets_under_copy == 0.0

        db.refresh(follower_user)
        assert follower_user.balance == pytest.approx(initial_balance, rel=1e-3)

        summary_response = client.get(
            f"{settings.API_V1_STR}/copy-trading/summary",
            headers=superuser_token_headers,
        )
        assert summary_response.status_code == 200
        summary_after_stop = summary_response.json()
        assert summary_after_stop["active"] == summary_before["active"]
        assert summary_after_stop["paused"] == summary_before["paused"]
        assert summary_after_stop["stopped"] == summary_before["stopped"] + 1


    finally:
        with Session(engine) as cleanup_session:
            if copy_id is not None:
                try:
                    copy_uuid = uuid.UUID(copy_id)
                except ValueError:
                    copy_uuid = None
                if copy_uuid:
                    copy_instance = cleanup_session.get(UserTraderCopy, copy_uuid)
                    if copy_instance is not None:
                        cleanup_session.delete(copy_instance)

            follower_copies = cleanup_session.exec(
                select(UserTraderCopy).where(UserTraderCopy.user_id == follower_user.id)
            ).all()
            for follower_copy in follower_copies:
                cleanup_session.delete(follower_copy)

            if trader_profile_id is not None:
                try:
                    profile_uuid = uuid.UUID(trader_profile_id)
                except ValueError:
                    profile_uuid = None
                if profile_uuid:
                    trader_copies = cleanup_session.exec(
                        select(UserTraderCopy).where(
                            UserTraderCopy.trader_profile_id == profile_uuid
                        )
                    ).all()
                    for trader_copy in trader_copies:
                        cleanup_session.delete(trader_copy)

                    profile = cleanup_session.get(TraderProfile, profile_uuid)
                    if profile is not None:
                        cleanup_session.delete(profile)

            for user_id in {trader_user.id, follower_user.id}:
                user_instance = cleanup_session.get(User, user_id)
                if user_instance is not None:
                    cleanup_session.delete(user_instance)

            cleanup_session.commit()



