from __future__ import annotations

from fastapi import HTTPException


class LongTermMaximumDepositViolation(HTTPException):
    """Raised when an attempt exceeds a long-term plan's per-user maximum."""

    def __init__(self, detail: str) -> None:
        super().__init__(status_code=400, detail=detail)
