from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jwt import InvalidTokenError
from sqlmodel import Session

from app import crud, models
from app.core import security
from app.core.db import engine
from app.services.ai.orchestrator import AIOrchestrator

router = APIRouter()


async def get_current_user_ws(websocket: WebSocket) -> models.User:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)
    try:
        payload = security.decode_token(token)
        raw_user_id = payload.get("sub")
        if not raw_user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)
        user_uuid = UUID(str(raw_user_id))

        with Session(engine) as session:
            user = crud.get_user_by_id(session=session, user_id=user_uuid)
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)
        return user
    except (InvalidTokenError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: UUID) -> None:
    user = await get_current_user_ws(websocket)
    if user.id != user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    orchestrator = AIOrchestrator()
    try:
        while True:
            data = await websocket.receive_text()
            response = await orchestrator.handle_message(user.id, data)
            await websocket.send_text(response)
    except WebSocketDisconnect:
        pass
