"""Tests for the notification WebSocket fanout layer."""

import asyncio
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from starlette.websockets import WebSocketDisconnect

from app.api.routes.notifications import router
from app.models import NotificationType, User
from app.services.notification_service import NotificationService
from app.services.notification_socket import NotificationSocketManager


class FakeWebSocket:
    def __init__(self):
        self.accepted = False
        self.sent = []

    async def accept(self):
        self.accepted = True

    async def send_json(self, payload):
        self.sent.append(payload)


class FakeSocketManager:
    def __init__(self):
        self.sent = []

    def send_to_user(self, user_id, payload):
        self.sent.append((user_id, payload))


@pytest.fixture(name="db_session")
def db_session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def _make_user(db_session: Session) -> User:
    user = User(id=uuid.uuid4(), email="socket@example.com", hashed_password="hash")
    db_session.add(user)
    db_session.commit()
    return user


def test_manager_fanout_and_disconnect():
    async def scenario():
        manager = NotificationSocketManager()
        user_id = uuid.uuid4()
        ws1 = FakeWebSocket()
        ws2 = FakeWebSocket()

        conn1 = await manager.connect(user_id, ws1)
        conn2 = await manager.connect(user_id, ws2)
        assert ws1.accepted and ws2.accepted

        manager.send_to_user(user_id, {"type": "notification.new", "payload": {}})
        await asyncio.sleep(0.05)
        assert len(ws1.sent) == 1
        assert len(ws2.sent) == 1

        manager.disconnect(user_id, conn1)
        manager.send_to_user(user_id, {"type": "notification.read", "payload": {}})
        await asyncio.sleep(0.05)
        assert len(ws1.sent) == 1  # disconnected socket receives nothing more
        assert len(ws2.sent) == 2

        manager.disconnect(user_id, conn2)
        manager.send_to_user(user_id, {"type": "notification.deleted", "payload": {}})
        await asyncio.sleep(0.05)
        assert len(ws2.sent) == 2

    asyncio.run(scenario())


def test_notification_creation_emits_new_event_once(db_session, monkeypatch):
    user = _make_user(db_session)
    fake_manager = FakeSocketManager()
    monkeypatch.setattr(
        "app.services.notification_service.notification_socket_manager",
        fake_manager,
    )

    first = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        idempotency_key="deposit_confirmed:tx-1",
    )
    second = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.DEPOSIT_CONFIRMED,
        idempotency_key="deposit_confirmed:tx-1",
    )

    assert first.id == second.id
    assert len(fake_manager.sent) == 1
    event_user, event = fake_manager.sent[0]
    assert event_user == user.id
    assert event["type"] == "notification.new"
    assert event["payload"]["notification"]["id"] == str(first.id)
    assert event["payload"]["unread_count"] == 1


def test_read_and_mark_all_emit_events(db_session, monkeypatch):
    user = _make_user(db_session)
    fake_manager = FakeSocketManager()
    monkeypatch.setattr(
        "app.services.notification_service.notification_socket_manager",
        fake_manager,
    )

    notification = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
    )
    fake_manager.sent.clear()

    NotificationService.set_read_state(
        session=db_session,
        notification_id=notification.id,
        user_id=user.id,
        is_read=True,
    )
    assert len(fake_manager.sent) == 1
    assert fake_manager.sent[0][1]["type"] == "notification.read"
    assert fake_manager.sent[0][1]["payload"]["is_read"] is True
    assert fake_manager.sent[0][1]["payload"]["unread_count"] == 0

    fake_manager.sent.clear()
    for _ in range(2):
        NotificationService.create_notification(
            session=db_session,
            user_id=user.id,
            title="T",
            message="M",
            notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
        )
    fake_manager.sent.clear()

    NotificationService.mark_all_as_read(session=db_session, user_id=user.id)
    assert len(fake_manager.sent) == 1
    assert fake_manager.sent[0][1]["type"] == "notifications.read_all"
    assert fake_manager.sent[0][1]["payload"]["marked_read"] == 2
    assert fake_manager.sent[0][1]["payload"]["unread_count"] == 0


def test_delete_emits_event(db_session, monkeypatch):
    user = _make_user(db_session)
    fake_manager = FakeSocketManager()
    monkeypatch.setattr(
        "app.services.notification_service.notification_socket_manager",
        fake_manager,
    )

    notification = NotificationService.create_notification(
        session=db_session,
        user_id=user.id,
        title="T",
        message="M",
        notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
    )
    fake_manager.sent.clear()

    assert NotificationService.delete_notification(
        session=db_session,
        notification_id=notification.id,
        user_id=user.id,
    )
    assert len(fake_manager.sent) == 1
    assert fake_manager.sent[0][1]["type"] == "notification.deleted"
    assert fake_manager.sent[0][1]["payload"]["notification_id"] == str(
        notification.id
    )
    assert fake_manager.sent[0][1]["payload"]["unread_count"] == 0


def test_ws_route_rejects_missing_token():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/notifications/ws"):
            pass
