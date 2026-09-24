"""Keyed hashing helpers for security-sensitive identifiers.

Email and IP identifiers used for resend abuse protection are stored as
HMAC-SHA256 digests keyed with the server secret so the database values are
not directly dictionary-reversible, while remaining stable for lookups as
long as SECRET_KEY is stable.
"""

import hashlib
import hmac as hmac_lib

from app.core.config import settings


def _purpose_key(purpose: str) -> bytes:
    """Derive a purpose-specific subkey from the server secret."""
    return hmac_lib.new(
        settings.SECRET_KEY.encode(), purpose.encode(), hashlib.sha256
    ).digest()


def keyed_hmac_sha256(value: str, *, purpose: str) -> str:
    """Return the hex HMAC-SHA256 of ``value`` under a purpose-scoped key."""
    return hmac_lib.new(
        _purpose_key(purpose), f"{purpose}:{value}".encode(), hashlib.sha256
    ).hexdigest()


def sha256_hex(value: str) -> str:
    """Return the plain SHA-256 hex digest of ``value``.

    Suitable only for high-entropy random secrets (e.g. handoff tokens),
    never for low-entropy identifiers like email addresses.
    """
    return hashlib.sha256(value.encode()).hexdigest()


def hmac_to_advisory_lock_key(value_hmac: str) -> int:
    """Derive a signed 64-bit PostgreSQL advisory lock key from an HMAC hex digest."""
    return int.from_bytes(bytes.fromhex(value_hmac)[:8], "big", signed=True)
