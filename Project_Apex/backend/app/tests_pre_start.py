"""Utilities executed before running the automated test suite."""
from __future__ import annotations

import logging
from typing import Any

from sqlmodel import Session, select

from app.core.db import engine

logger = logging.getLogger("app.tests_pre_start")


def init(db_engine: Any | None = None) -> None:
    """Ensure a working database connection before running the test suite."""
    current_engine = db_engine or engine
    try:
        with Session(current_engine) as session:
            session.exec(select(1))
        logger.info("Database connection ready for tests")
    except Exception as exc:  # pragma: no cover - logged and re-raised for visibility
        logger.error("Database connection failed before tests", exc_info=exc)
        raise
