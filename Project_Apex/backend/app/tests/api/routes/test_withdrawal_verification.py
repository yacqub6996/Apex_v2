"""Tests for the verification gate on user withdrawal endpoints."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.core.time import utc_now
from app.models import KycStatus, User, UserCreate
from app.tests.utils.user import user_authentication_headers
from app.tests.utils.utils import random_email, random_lower_string


def _create_user(
    db: Session, *, verified: bool = False, kyc_approved: bool = False
) -> tuple[User, str, str]:
    email = random_email()
    password = random_lower_string()
    user = crud.create_user(
        session=db, user_create=UserCreate(email=email, password=password)
    )
    if verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
    if kyc_approved:
        user.kyc_status = KycStatus.APPROVED
    if verified or kyc_approved:
        db.add(user)
        db.commit()
        db.refresh(user)
    return user, email, password


def _headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    return user_authentication_headers(client=client, email=email, password=password)


def test_long_term_withdrawal_requires_email_verification(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=False, kyc_approved=True)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/long-term/request-withdrawal",
        json={"amount": 1, "description": "test"},
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Withdrawals require email verification"


def test_long_term_withdrawal_requires_kyc_approval(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=True, kyc_approved=False)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/long-term/request-withdrawal",
        json={"amount": 1, "description": "test"},
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Withdrawals require KYC approval"


def test_long_term_withdrawal_passes_gate_when_fully_verified(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=True, kyc_approved=True)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/long-term/request-withdrawal",
        json={"amount": 1, "description": "test"},
        headers=headers,
    )
    # Gate passed; the request now fails on wallet balance rather than verification.
    assert r.status_code == 400
    assert "Insufficient long-term wallet balance" in r.json()["detail"]


def test_copy_trading_withdrawal_requires_email_verification(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=False, kyc_approved=True)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/copy-trading/request-withdrawal",
        json={"amount": 1, "description": "test"},
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Withdrawals require email verification"


def test_investment_withdrawal_requires_email_verification(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=False, kyc_approved=True)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/long-term/investments/{uuid.uuid4()}/request-withdrawal",
        json={"amount": 1},
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Withdrawals require email verification"


def test_investment_withdrawal_requires_kyc_approval(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=True, kyc_approved=False)
    headers = _headers(client, email, password)
    r = client.post(
        f"{settings.API_V1_STR}/long-term/investments/{uuid.uuid4()}/request-withdrawal",
        json={"amount": 1},
        headers=headers,
    )
    assert r.status_code == 403
    assert r.json()["detail"] == "Withdrawals require KYC approval"
