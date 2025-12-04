from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response, StreamingResponse

from chatkit.server import NonStreamingResult, StreamingResult

from app.api.deps import CurrentUser
from app.services.ai.customer_service_chatkit import ChatContext, chatkit_server

router = APIRouter(prefix="/customer-service", tags=["customer-service"])


@router.post("/chatkit")
async def handle_chatkit_request(
    request: Request,
    current_user: CurrentUser,
) -> Response:
    """FastAPI endpoint that proxies ChatKit requests to the ChatKitServer."""

    body = await request.body()
    context: ChatContext = {"user_id": current_user.id, "user": current_user}

    result = await chatkit_server.process(body, context)

    if isinstance(result, StreamingResult):
        # Stream Server-Sent Events back to the ChatKit client
        return StreamingResponse(result.json_events, media_type="text/event-stream")

    assert isinstance(result, NonStreamingResult)
    return Response(content=result.json, media_type="application/json")
