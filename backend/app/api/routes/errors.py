from fastapi import HTTPException


class LongTermMaximumDepositViolation(HTTPException):
    """Consistent error for attempts that exceed a plan's maximum allocation."""

    def __init__(self, *, detail: str) -> None:
        super().__init__(
            status_code=400,
            detail=detail,
            headers={"X-Error-Code": "LONG_TERM_MAXIMUM_DEPOSIT_VIOLATION"},
        )
