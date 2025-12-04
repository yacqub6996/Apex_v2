"""Application logging configuration utilities."""
from __future__ import annotations

import json
import logging
import sys
from collections.abc import Mapping
from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from app.core.config import settings

try:
    from pydantic import BaseModel
except ImportError:  # pragma: no cover - pydantic is available in runtime but safe fallback
    BaseModel = None

_DEFAULT_RECORD_KEYS = {
    'name',
    'msg',
    'args',
    'levelname',
    'levelno',
    'pathname',
    'filename',
    'module',
    'exc_info',
    'exc_text',
    'stack_info',
    'lineno',
    'funcName',
    'created',
    'msecs',
    'relativeCreated',
    'thread',
    'threadName',
    'processName',
    'process',
    'message',
    'asctime',
}


def _safe_serialize(value: Any) -> Any:
    """Best-effort conversion of arbitrary values into JSON-serialisable forms."""

    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Enum):
        enum_value = getattr(value, "value", None)
        if isinstance(enum_value, (str, int, float, bool)):
            return enum_value
        return value.name
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        try:
            return value.decode('utf-8')
        except UnicodeDecodeError:
            return value.hex()
    if BaseModel is not None and isinstance(value, BaseModel):
        return {str(k): _safe_serialize(v) for k, v in value.model_dump(mode='python').items()}
    if isinstance(value, Mapping):
        return {str(k): _safe_serialize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [_safe_serialize(v) for v in value]
    if hasattr(value, 'model_dump') and callable(value.model_dump):
        try:
            return {str(k): _safe_serialize(v) for k, v in value.model_dump(mode='python').items()}
        except Exception:  # pragma: no cover - defensive conversion
            pass
    if hasattr(value, 'dict') and callable(value.dict):
        try:
            return {str(k): _safe_serialize(v) for k, v in value.dict().items()}
        except Exception:  # pragma: no cover - defensive conversion
            pass
    try:
        json.dumps(value)
        return value
    except TypeError:
        return str(value)


class JsonFormatter(logging.Formatter):
    """Format log records as structured JSON for easier ingestion."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401 - inherited docstring
        log_payload: dict[str, Any] = {
            'timestamp': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if record.exc_info:
            log_payload['exc_info'] = self.formatException(record.exc_info)
        if record.stack_info:
            log_payload['stack'] = record.stack_info

        record_dict = {k: v for k, v in record.__dict__.items() if k not in log_payload}
        extra = {k: _safe_serialize(v) for k, v in record_dict.items() if k not in _DEFAULT_RECORD_KEYS}
        if extra:
            log_payload['extra'] = extra
        try:
            return json.dumps(log_payload, ensure_ascii=False)
        except TypeError:
            serialisable_payload = {k: _safe_serialize(v) for k, v in log_payload.items()}
            return json.dumps(serialisable_payload, ensure_ascii=False)


def configure_logging() -> None:
    """Configure application-wide logging according to settings."""

    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_JSON:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        )

    logging.basicConfig(level=log_level, handlers=[handler], force=True)
