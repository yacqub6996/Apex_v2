from io import BytesIO

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import KycStatus, User, UserProfile


KYC_PAYLOAD = {
    "legal_first_name": "Alice",
    "legal_last_name": "Anderson",
    "date_of_birth": "1990-05-20",
    "phone_number": "+12025550123",
    "address_line_1": "123 Market Street",
    "address_line_2": "Suite 5",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US",
    "tax_id_number": "123-45-6789",
    "occupation": "Engineer",
    "source_of_funds": "employment_income",
}


def _get_seed_user(db: Session) -> User:
    statement = select(User).where(User.email == settings.EMAIL_TEST_USER)
    return db.exec(statement).first()


def test_submit_kyc_creates_profile(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    response = client.post(
        "/api/v1/kyc/submit",
        headers=normal_user_token_headers,
        json=KYC_PAYLOAD,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == KycStatus.UNDER_REVIEW.value

    profile_data = payload["profile"]
    assert profile_data["legal_first_name"] == KYC_PAYLOAD["legal_first_name"]
    assert profile_data["risk_assessment_score"] >= 0

    user = _get_seed_user(db)
    assert user is not None
    assert user.kyc_status == KycStatus.UNDER_REVIEW
    assert user.kyc_submitted_at is not None

    profile = db.exec(
        select(UserProfile).where(UserProfile.user_id == user.id)
    ).first()
    assert profile is not None
    assert profile.legal_first_name == KYC_PAYLOAD["legal_first_name"]


def test_upload_kyc_document(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    file_bytes = BytesIO(b"fake-image")
    response = client.post(
        "/api/v1/kyc/documents",
        headers=normal_user_token_headers,
        files={"file": ("id.png", file_bytes.getvalue(), "image/png")},
        data={"document_type": "passport", "side": "front"},
    )
    assert response.status_code == 200
    document = response.json()
    assert document["document_type"] == "passport"
    assert document["front_image_url"]
    assert document["verified"] is False


def test_admin_can_review_and_approve_kyc(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    # Ensure there is a fresh submission ready for review
    client.post(
        "/api/v1/kyc/submit",
        headers=normal_user_token_headers,
        json=KYC_PAYLOAD,
    )

    pending_response = client.get(
        "/api/v1/kyc/applications/pending",
        headers=superuser_token_headers,
    )
    assert pending_response.status_code == 200
    pending = pending_response.json()
    assert any(entry["email"] == settings.EMAIL_TEST_USER for entry in pending)

    user = _get_seed_user(db)
    assert user is not None

    approve_response = client.post(
        f"/api/v1/kyc/applications/{user.id}/approve",
        headers=superuser_token_headers,
    )
    assert approve_response.status_code == 200
    approved_payload = approve_response.json()
    assert approved_payload["kyc_status"] == KycStatus.APPROVED.value

    status_response = client.get(
        "/api/v1/kyc/status", headers=normal_user_token_headers
    )
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["status"] == KycStatus.APPROVED.value
    assert status_payload["approved_at"] is not None