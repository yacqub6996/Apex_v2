from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp.

    Using this helper avoids the deprecated ``datetime.utcnow`` and ensures
    all persisted timestamps carry explicit UTC information.
    """
    return datetime.now(timezone.utc)


__all__ = ["utc_now"]