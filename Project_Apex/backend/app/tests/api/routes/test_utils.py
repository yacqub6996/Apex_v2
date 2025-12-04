import pytest
from fastapi.testclient import TestClient

from app.core.config import settings


def test_metrics_endpoint_enabled(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    login_response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data=login_data,
    )
    assert login_response.status_code == 200

    response = client.get(f"{settings.API_V1_STR}/utils/metrics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "app_request_total" in response.text
    assert "app_db_query_duration_seconds_count" in response.text


def test_metrics_endpoint_disabled(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    monkeypatch.setattr(settings, "METRICS_ENABLED", False)
    response = client.get(f"{settings.API_V1_STR}/utils/metrics")
    assert response.status_code == 404
