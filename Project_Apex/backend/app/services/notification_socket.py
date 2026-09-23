"""In-process WebSocket connection registry and fanout for notifications.

Keeps a per-user set of live WebSocket connections and fans notification
events out to every connection belonging to a user. This is intentionally a
single-process implementation: a Redis pub/sub backplane can be layered in
later when horizontal scaling requires it.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_HEARTBEAT_INTERVAL_SECONDS = 25.0


class NotificationConnection:
    """A single live WebSocket connection for one user."""

    __slots__ = ("user_id", "websocket", "queue", "loop", "send_task")

    def __init__(
        self,
        user_id: uuid.UUID,
        websocket: WebSocket,
        queue: asyncio.Queue,
        loop: asyncio.AbstractEventLoop,
        send_task: asyncio.Task | None,
    ) -> None:
        self.user_id = user_id
        self.websocket = websocket
        self.queue = queue
        self.loop = loop
        self.send_task = send_task


class NotificationSocketManager:
    """Registry of user notification WebSocket connections with fanout."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[NotificationConnection]] = {}

    def _remove(self, user_id: uuid.UUID, conn: NotificationConnection) -> None:
        conns = self._connections.get(user_id)
        if conns is not None:
            conns.discard(conn)
            if not conns:
                self._connections.pop(user_id, None)

    async def connect(
        self,
        user_id: uuid.UUID,
        websocket: WebSocket,
    ) -> NotificationConnection:
        """Accept a socket and register it for fanout."""
        await websocket.accept()
        loop = asyncio.get_running_loop()
        conn = NotificationConnection(
            user_id=user_id,
            websocket=websocket,
            queue=asyncio.Queue(),
            loop=loop,
            send_task=None,
        )
        conn.send_task = asyncio.create_task(self._sender(conn))
        self._connections.setdefault(user_id, set()).add(conn)
        return conn

    def disconnect(self, user_id: uuid.UUID, conn: NotificationConnection) -> None:
        """Deregister a connection and stop its sender task."""
        self._remove(user_id, conn)
        if conn.send_task is not None:
            try:
                conn.loop.call_soon_threadsafe(conn.send_task.cancel)
            except Exception:  # pragma: no cover - loop may already be closed
                pass

    async def _sender(self, conn: NotificationConnection) -> None:
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(
                        conn.queue.get(),
                        timeout=_HEARTBEAT_INTERVAL_SECONDS,
                    )
                except asyncio.TimeoutError:
                    payload = {"type": "ping"}
                await conn.websocket.send_json(payload)
        except Exception:
            logger.debug(
                "notification_socket_sender_stopped",
                exc_info=True,
                extra={"user_id": str(conn.user_id)},
            )
        finally:
            self._remove(conn.user_id, conn)

    def send_to_user(self, user_id: uuid.UUID, payload: dict) -> None:
        """Fan a payload out to every live connection for a user.

        Safe to call from synchronous code and other threads; enqueues onto
        each connection's event loop and never raises into the caller.
        """
        conns = self._connections.get(user_id)
        if not conns:
            return
        for conn in list(conns):
            try:
                conn.loop.call_soon_threadsafe(conn.queue.put_nowait, payload)
            except Exception:
                logger.debug(
                    "notification_socket_send_skipped",
                    exc_info=True,
                    extra={"user_id": str(user_id)},
                )


notification_socket_manager = NotificationSocketManager()
