from __future__ import annotations

import pytest
from sqlmodel import Session, select

from fastapi.testclient import TestClient

from app import crud
from app.core.config import settings
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    ExecutionEvent,
    KycStatus,
    User,
    UserCreate,
    UserLongTermInvestment,
)
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(
    session: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    wallet_balance: float,
    kyc_status: KycStatus = KycStatus.APPROVED,
) -> User:
    user_in = UserCreate(email=email, password=password, full_name=full_name)
    user = crud.create_user(session=session, user_create=user_in)
    user.wallet_balance = wallet_balance
    user.balance = wallet_balance
    user.kyc_status = kyc_status
    user.email_verified = True
    user.email_verified_at = utc_now()
    session.add(user)
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


class TestMaximumDeposit:
    def test_subscription_blocked_when_plan_maximum_reached(
        self,
        client: TestClient,
        db: Session,
        superuser_token_headers: dict[str, str],
    ) -> None:
        email = random_email()
        password = random_lower_string()
        user = _create_user(
            db,
            email=email,
            password=password,
            full_name="Max Deposit User",
            wallet_balance=50_000.0,
        )
        headers = _login_headers(client, email=email, password=password)

        plans_data = client.get(f"{settings.API_V1_STR}/long-term/plans", headers=headers)
        plan = plans_data.json()["data"][0]
        limit = float(plan["maximum_deposit"])
        capped_limit = max(limit / 2.0, plan["minimum_deposit"])

        patch = client.patch(
            f"{settings.API_V1_STR}/admin/long-term/plans/{plan['id']}",
            headers=superuser_token_headers,
            json={"maximum_deposit": capped_limit},
        )
        assert patch.status_code == 200

        subscribe = client.post(
            f"{settings.API_V1_STR}/long-term/investments",
            headers=headers,
            json={"plan_id": plan["id"], "amount": limit},
        )
        assert subscribe.status_code == 400
        assert "maximum allocation" in subscribe.json()["detail"]

    def test_admin_maximum_deposit_change_records_event(
        self,
        client: TestClient,
        db: Session,
        superuser_token_headers: dict[str, str],
    ) -> None:
        response = client.get(
            f"{settings.API_V1_STR}/long-term/plans",
            headers=superuser_token_headers,  # admin can reuse same token for demo
        )
        plan = response.json()["data"][0]
        new_maximum = float(plan["maximum_deposit"]) + 10_000

        patch = client.patch(
            f"{settings.API_V1_STR}/admin/long-term/plans/{plan['id']}",
            headers=superuser_token_headers,
            json={"maximum_deposit": new_maximum},
        )
        assert patch.status_code == 200
        updated = patch.json()
        assert updated["maximum_deposit"] == pytest.approx(new_maximum)

        events = db.exec(select(ExecutionEvent)).all()
        matching_event = next(
            (
                evt
                for evt in events
                if evt.payload
                and evt.payload.get("plan_id") == plan["id"]
                and evt.payload.get("action") == "PLAN_MAX_UPDATE"
            ),
            None,
        )
        assert matching_event is not None
        assert float(matching_event.payload["new_maximum"]) == pytest.approx(new_maximum)

    def test_increase_equity_rate_limit_triggers(
        self,
        client: TestClient,
        db: Session,
    ) -> None:
        email = random_email()
        password = random_lower_string()
        user = _create_user(
            db,
            email=email,
            password=password,
            full_name="Rate Limit User",
            wallet_balance=30_000.0,
        )
        headers = _login_headers(client, email=email, password=password)

        plan_response = client.get(f"{settings.API_V1_STR}/long-term/plans", headers=headers)
        plan = plan_response.json()["data"][0]
        investment = UserLongTermInvestment(
            user_id=user.id,
            plan_id=plan["id"],
            allocation=float(plan["minimum_deposit"]),
            status=CopyStatus.ACTIVE,
        )
        user.long_term_balance = investment.allocation
        user.long_term_wallet.balance = 1_000.0
        db.add(investment)
        db.add(user)
        db.commit()
        db.refresh(investment)
        db.refresh(user)

        limit = settings.LONG_TERM_DEPOSIT_RATE_LIMIT_MAX_ATTEMPTS
        payload = {"user_investment_id": str(investment.id), "amount": 1.0}
        for attempt in range(limit + 1):
            response = client.post(
                f"{settings.API_V1_STR}/long-term/investments/increase-equity",
                headers=headers,
                json=payload,
            )
            if attempt < limit:
                assert response.status_code == 200
            else:
                assert response.status_code == 429
                assert response.headers.get("X-Error-Code") == "LONG_TERM_DEPOSIT_RATE_LIMIT"
