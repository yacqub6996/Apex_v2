"""Tests for the email-verification login flow.

Covers structured login errors, unauthenticated resend with anti-enumeration
and cooldowns, verify-email handoff issuance, and the single-use handoff
exchange endpoint.
"""

from datetime import timedelta
from unittest.mock import AsyncMock, patch

import jwt
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app import crud
from app.core import security
from app.core.config import settings
from app.core.hashing import sha256_hex
from app.core.time import utc_now
from app.models import (
    EmailVerificationAttempt,
    EmailVerificationAttemptOutcome,
    EmailVerificationHandoff,
    User,
    UserCreate,
    VerificationHandoffStatus,
)
from app.tests.utils.utils import random_email, random_lower_string
from app.utils import generate_email_verification_token

GENERIC_RESEND_MESSAGE = (
    "If an account with that email exists and is not verified, "
    "a verification email has been sent."
)


def _create_user(db: Session, *, verified: bool = False) -> tuple[User, str, str]:
    email = random_email()
    password = random_lower_string()
    user = crud.create_user(
        session=db, user_create=UserCreate(email=email, password=password)
    )
    if verified:
        user.email_verified = True
        user.email_verified_at = utc_now()
        db.add(user)
        db.commit()
        db.refresh(user)
    return user, email, password


def _enable_emails() -> tuple:
    """Return patch contexts that make settings.emails_enabled evaluate True."""
    return (
        patch("app.core.config.settings.SMTP_HOST", "smtp.example.com"),
        patch("app.core.config.settings.EMAILS_FROM_EMAIL", "support@example.com"),
    )


def _clear_resend_attempts(db: Session) -> None:
    """Remove resend attempt rows so per-IP assertions stay deterministic."""
    db.exec(delete(EmailVerificationAttempt))
    db.commit()


# --- Login semantics -------------------------------------------------------


def test_login_unverified_with_emails_enabled_returns_machine_readable_code(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=False)
    with _enable_emails()[0], _enable_emails()[1]:
        r = client.post(
            f"{settings.API_V1_STR}/login/access-token",
            data={"username": email, "password": password},
        )
    assert r.status_code == 403
    assert r.json() == {
        "detail": {
            "code": "EMAIL_NOT_VERIFIED",
            "message": "Email not verified. Please check your inbox for the verification link.",
        }
    }


def test_login_unverified_with_emails_disabled_succeeds(
    client: TestClient, db: Session
) -> None:
    _, email, password = _create_user(db, verified=False)
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_invalid_credentials_returns_machine_readable_code(
    client: TestClient, db: Session
) -> None:
    _, email, _ = _create_user(db, verified=True)
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": "wrong-password"},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "INVALID_CREDENTIALS"


def test_login_inactive_returns_machine_readable_code(
    client: TestClient, db: Session
) -> None:
    user, email, password = _create_user(db, verified=True)
    user.is_active = False
    db.add(user)
    db.commit()
    r = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "INACTIVE_ACCOUNT"


# --- Unauthenticated resend -------------------------------------------------


def test_resend_unknown_email_returns_generic_message_without_sending(
    client: TestClient, db: Session
) -> None:
    _clear_resend_attempts(db)
    with patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)) as send:
        r = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": "unknown-user@example.com"},
        )
    assert r.status_code == 200
    assert r.json() == {"message": GENERIC_RESEND_MESSAGE}
    send.assert_not_awaited()


def test_resend_verified_email_returns_generic_message_without_sending(
    client: TestClient, db: Session
) -> None:
    _clear_resend_attempts(db)
    _, email, _ = _create_user(db, verified=True)
    with patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)) as send:
        r = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": email},
        )
    assert r.status_code == 200
    assert r.json() == {"message": GENERIC_RESEND_MESSAGE}
    send.assert_not_awaited()


def test_resend_unverified_email_sends_and_response_is_identical(
    client: TestClient, db: Session
) -> None:
    _clear_resend_attempts(db)
    _, email, _ = _create_user(db, verified=False)
    with (
        _enable_emails()[0],
        _enable_emails()[1],
        patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)) as send,
    ):
        r = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": email},
        )
    assert r.status_code == 200
    assert r.json() == {"message": GENERIC_RESEND_MESSAGE}
    send.assert_awaited_once()


def test_resend_cooldown_returns_429_with_retry_after(
    client: TestClient, db: Session
) -> None:
    _clear_resend_attempts(db)
    _, email, _ = _create_user(db, verified=False)
    with patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)):
        first = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": email},
        )
        second = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": email},
        )
    assert first.status_code == 200
    assert second.status_code == 429
    assert int(second.headers["Retry-After"]) == settings.VERIFICATION_RESEND_COOLDOWN_SECONDS


def test_resend_per_ip_limit_returns_429(client: TestClient, db: Session) -> None:
    _clear_resend_attempts(db)
    with patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)):
        for index in range(settings.VERIFICATION_RESEND_IP_MAX):
            r = client.post(
                f"{settings.API_V1_STR}/resend-email-verification",
                json={"email": f"unknown-{index}-{random_email()}"},
            )
            assert r.status_code == 200, f"request {index} should pass"
        r = client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": f"unknown-final-{random_email()}"},
        )
    assert r.status_code == 429


def test_resend_attempt_records_hmac_identifiers(client: TestClient, db: Session) -> None:
    _clear_resend_attempts(db)
    _, email, _ = _create_user(db, verified=False)
    with patch("app.api.routes.login.send_email", new=AsyncMock(return_value=None)):
        client.post(
            f"{settings.API_V1_STR}/resend-email-verification",
            json={"email": email},
        )
    attempts = db.exec(select(EmailVerificationAttempt)).all()
    assert len(attempts) == 1
    attempt = attempts[0]
    # Identifiers are HMAC digests, not the raw email address.
    assert attempt.email_hmac != email
    assert len(attempt.email_hmac) == 64
    assert attempt.outcome == EmailVerificationAttemptOutcome.SENT


# --- Verify-email handoff issuance -----------------------------------------


def test_verify_email_returns_handoff_and_marks_user_verified(
    client: TestClient, db: Session
) -> None:
    user, email, _ = _create_user(db, verified=False)
    token = generate_email_verification_token(email)
    r = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": token})
    assert r.status_code == 200
    body = r.json()
    assert body["message"] == "Email verified successfully"
    assert body["handoff_expires_in"] == settings.POST_VERIFICATION_HANDOFF_TTL_SECONDS
    assert isinstance(body["handoff_token"], str) and len(body["handoff_token"]) > 20

    db.refresh(user)
    assert user.email_verified is True
    assert user.email_verified_at is not None

    handoff = db.exec(
        select(EmailVerificationHandoff).where(
            EmailVerificationHandoff.token_hash == sha256_hex(body["handoff_token"])
        )
    ).first()
    assert handoff is not None
    assert handoff.status == VerificationHandoffStatus.PENDING
    assert handoff.user_id == user.id


def test_verify_email_with_garbage_token_fails(client: TestClient) -> None:
    r = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": "garbage"})
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid or expired verification link."


def test_verify_email_with_expired_token_fails(client: TestClient, db: Session) -> None:
    _, email, _ = _create_user(db, verified=False)
    expired = jwt.encode(
        {
            "exp": (utc_now() - timedelta(hours=1)).timestamp(),
            "nbf": (utc_now() - timedelta(hours=2)).timestamp(),
            "sub": email,
            "purpose": "email_verification",
        },
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    r = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": expired})
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid or expired verification link."


def test_verify_email_jwt_can_be_replayed_to_mint_a_fresh_handoff(
    client: TestClient, db: Session
) -> None:
    """Documented trade-off: the emailed 24h JWT remains replayable, but each
    use only mints a new short-lived single-use handoff, never an access token.
    """
    _, email, _ = _create_user(db, verified=False)
    token = generate_email_verification_token(email)
    first = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": token})
    second = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": token})
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["handoff_token"] != second.json()["handoff_token"]


# --- Handoff exchange -------------------------------------------------------


def _mint_handoff(client: TestClient, email: str) -> str:
    token = generate_email_verification_token(email)
    r = client.post(f"{settings.API_V1_STR}/verify-email", json={"token": token})
    assert r.status_code == 200
    return r.json()["handoff_token"]


def test_exchange_handoff_issues_access_token_and_consumes_handoff(
    client: TestClient, db: Session
) -> None:
    user, email, _ = _create_user(db, verified=False)
    handoff_token = _mint_handoff(client, email)
    r = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": handoff_token},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    handoff = db.exec(
        select(EmailVerificationHandoff).where(
            EmailVerificationHandoff.token_hash == sha256_hex(handoff_token)
        )
    ).first()
    assert handoff.status == VerificationHandoffStatus.USED
    assert handoff.used_at is not None
    db.refresh(user)
    assert user.last_login_at is not None


def test_exchange_handoff_reuse_fails(client: TestClient, db: Session) -> None:
    _, email, _ = _create_user(db, verified=False)
    handoff_token = _mint_handoff(client, email)
    first = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": handoff_token},
    )
    second = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": handoff_token},
    )
    assert first.status_code == 200
    assert second.status_code == 400
    assert second.json()["detail"] == "Verification session expired. Please log in again."


def test_exchange_unknown_handoff_fails(client: TestClient) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": "does-not-exist"},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Verification session expired. Please log in again."


def test_exchange_expired_handoff_fails(client: TestClient, db: Session) -> None:
    user, email, _ = _create_user(db, verified=False)
    handoff_token = _mint_handoff(client, email)
    handoff = db.exec(
        select(EmailVerificationHandoff).where(
            EmailVerificationHandoff.token_hash == sha256_hex(handoff_token)
        )
    ).first()
    handoff.expires_at = utc_now() - timedelta(seconds=1)
    db.add(handoff)
    db.commit()
    r = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": handoff_token},
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Verification session expired. Please log in again."


def test_exchange_handoff_for_inactive_user_fails(
    client: TestClient, db: Session
) -> None:
    user, email, _ = _create_user(db, verified=False)
    handoff_token = _mint_handoff(client, email)
    user.is_active = False
    db.add(user)
    db.commit()
    r = client.post(
        f"{settings.API_V1_STR}/login/exchange-verification",
        json={"handoff_token": handoff_token},
    )
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "INACTIVE_ACCOUNT"
