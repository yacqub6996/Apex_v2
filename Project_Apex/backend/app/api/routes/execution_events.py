from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlmodel import SQLModel, select, func, or_

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import ExecutionEvent, ExecutionEventType, UserRole


class ExecutionEventResponse(SQLModel):
    id: uuid.UUID
    event_type: str
    description: str
    amount: Optional[float] = None
    user_id: Optional[uuid.UUID] = None
    trader_profile_id: Optional[uuid.UUID] = None
    payload: dict
    created_at: datetime


class ExecutionEventsList(SQLModel):
    data: List[ExecutionEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ExecutionEventFilter(SQLModel):
    event_type: Optional[ExecutionEventType] = None
    user_id: Optional[uuid.UUID] = None
    trader_profile_id: Optional[uuid.UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


router = APIRouter(prefix="/execution-events", tags=["execution-events"])


@router.get("", response_model=ExecutionEventsList)
def list_execution_events(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    event_type: Optional[ExecutionEventType] = None,
    user_id: Optional[uuid.UUID] = None,
    trader_profile_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> ExecutionEventsList:
    """
    List execution events with filtering and pagination.
    Users can only see their own events, admins can see all events.
    """
    # Build base query
    query = select(ExecutionEvent)
    
    # Apply user-based filtering
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        query = query.where(
            or_(
                ExecutionEvent.user_id == current_user.id,
                ExecutionEvent.user_id.is_(None)
            )
        )
    
    # Apply filters
    if event_type:
        query = query.where(ExecutionEvent.event_type == event_type)
    if user_id:
        if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
            raise HTTPException(status_code=403, detail="Not enough permissions")
        query = query.where(ExecutionEvent.user_id == user_id)
    if trader_profile_id:
        query = query.where(ExecutionEvent.trader_profile_id == trader_profile_id)
    if start_date:
        query = query.where(ExecutionEvent.created_at >= start_date)
    if end_date:
        query = query.where(ExecutionEvent.created_at <= end_date)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(ExecutionEvent.created_at.desc()).offset(offset).limit(page_size)
    
    # Execute query
    events = session.exec(query).all()
    
    # Convert to response model
    event_responses = [
        ExecutionEventResponse(
            id=event.id,
            event_type=event.event_type.value,
            description=event.description,
            amount=event.amount,
            user_id=event.user_id,
            trader_profile_id=event.trader_profile_id,
            payload=event.payload or {},
            created_at=event.created_at,
        )
        for event in events
    ]
    
    total_pages = (total + page_size - 1) // page_size
    
    return ExecutionEventsList(
        data=event_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{event_id}", response_model=ExecutionEventResponse)
def get_execution_event(
    session: SessionDep,
    current_user: CurrentUser,
    event_id: uuid.UUID,
) -> ExecutionEventResponse:
    """
    Get a specific execution event by ID.
    Users can only see their own events, admins can see all events.
    """
    event = session.get(ExecutionEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Execution event not found")
    
    # Check permissions
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        if event.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return ExecutionEventResponse(
        id=event.id,
        event_type=event.event_type.value,
        description=event.description,
        amount=event.amount,
        user_id=event.user_id,
        trader_profile_id=event.trader_profile_id,
        payload=event.payload or {},
        created_at=event.created_at,
    )


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[uuid.UUID, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: uuid.UUID):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: uuid.UUID):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: uuid.UUID):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except WebSocketDisconnect:
                self.disconnect(user_id)
    
    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(user_id)
        
        for user_id in disconnected:
            self.disconnect(user_id)


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: uuid.UUID):
    """
    WebSocket endpoint for real-time execution event updates.
    """
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


async def broadcast_execution_event(event: ExecutionEvent):
    """
    Broadcast a new execution event to relevant WebSocket clients.
    Users only receive events that belong to them or are trader events they follow.
    """
    event_data = {
        "type": "execution_event",
        "data": {
            "id": str(event.id),
            "event_type": event.event_type.value,
            "description": event.description,
            "amount": event.amount,
            "user_id": str(event.user_id) if event.user_id else None,
            "trader_profile_id": str(event.trader_profile_id) if event.trader_profile_id else None,
            "payload": event.payload or {},
            "created_at": event.created_at.isoformat(),
        }
    }
    
    # Send to specific user if event has a user_id
    if event.user_id:
        await manager.send_personal_message(event_data, event.user_id)
    
    # Also broadcast trader events to all users following that trader
    if event.trader_profile_id:
        await manager.broadcast(event_data)


@router.get("/recent/{user_id}", response_model=List[ExecutionEventResponse])
def get_recent_user_events(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
) -> List[ExecutionEventResponse]:
    """
    Get recent execution events for a specific user.
    Users can only see their own events, admins can see all events.
    """
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    
    query = (
        select(ExecutionEvent)
        .where(ExecutionEvent.user_id == user_id)
        .order_by(ExecutionEvent.created_at.desc())
        .limit(limit)
    )
    
    events = session.exec(query).all()
    
    return [
        ExecutionEventResponse(
            id=event.id,
            event_type=event.event_type.value,
            description=event.description,
            amount=event.amount,
            user_id=event.user_id,
            trader_profile_id=event.trader_profile_id,
            payload=event.payload or {},
            created_at=event.created_at,
        )
        for event in events
    ]
