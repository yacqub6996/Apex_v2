"""Simple in-memory rate limiting middleware for FastAPI."""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Throttle repeated requests from the same client within a time window."""

    def __init__(self, app, *, limit: int, window_seconds: int) -> None:
        super().__init__(app)
        self.limit = max(1, limit)
        self.window_seconds = max(1, window_seconds)
        self._lock = asyncio.Lock()
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path
        if path in settings.RATE_LIMIT_EXCLUDE_PATHS:
            return await call_next(request)

        identifier = self._get_identifier(request)
        now = time.monotonic()

        async with self._lock:
            bucket = self._hits[identifier]
            cutoff = now - self.window_seconds
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= self.limit:
                retry_after = max(int(bucket[0] + self.window_seconds - now), 0)
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Try again soon.",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)

        response = await call_next(request)
        return response

    @staticmethod
    def _get_identifier(request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client and request.client.host:
            return request.client.host
        return "anonymous"

