from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import (
    Item,
    KycDocument,
    TraderProfile,
    TraderTrade,
    Trade,
    Transaction,
    User,
    UserProfile,
    UserTraderCopy,
)
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        yield session
        session.execute(
            text(
                'TRUNCATE TABLE tradertrade, trade, usertradercopy, kycdocument, '
                'userprofile, traderprofile, item, transaction, "user" RESTART IDENTITY CASCADE'
            )
        )
        session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )


# Compatibility fixtures for legacy integration tests
@pytest.fixture(scope="module")
def token(normal_user_token_headers: dict[str, str]) -> str:
    return normal_user_token_headers["Authorization"].split(" ", 1)[1]


@pytest.fixture(scope="module")
def admin_token(superuser_token_headers: dict[str, str]) -> str:
    return superuser_token_headers["Authorization"].split(" ", 1)[1]


@pytest.fixture(scope="module")
def test_client(client: TestClient) -> TestClient:
    return client
