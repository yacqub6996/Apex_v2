"""Helpers for persisting execution feed events."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlmodel import Session
from app.core.time import utc_now

from app.models import ExecutionEvent, ExecutionEventType
from app.api.routes.execution_events import broadcast_execution_event


async def record_execution_event(
    session: Session,
    *,
    event_type: ExecutionEventType,
    description: str,
    amount: float | None = None,
    user_id: uuid.UUID | None = None,
    trader_profile_id: uuid.UUID | None = None,
    payload: dict[str, Any] | None = None,
) -> ExecutionEvent:
    event = ExecutionEvent(
        event_type=event_type,
        description=description[:255],
        amount=round(amount, 2) if isinstance(amount, (int, float)) else None,
        user_id=user_id,
        trader_profile_id=trader_profile_id,
        payload=payload or {},
        created_at=utc_now(),
    )
    session.add(event)
    session.flush()  # Ensure event gets an ID
    
    # Broadcast the event to WebSocket clients
    await broadcast_execution_event(event)
    
    return event


__all__ = ["record_execution_event"]
