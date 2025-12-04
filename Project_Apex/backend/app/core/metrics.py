"""Prometheus metrics utilities and middleware."""
from __future__ import annotations

import time
from typing import Callable, Tuple

from fastapi import Request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import event
from sqlalchemy.engine import Engine
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

REQUEST_COUNT = Counter(
    "app_request_total",
    "Total HTTP requests",
    labelnames=("method", "path", "status_code"),
)
REQUEST_LATENCY = Histogram(
    "app_request_duration_seconds",
    "HTTP request latency",
    labelnames=("method", "path"),
)

DB_QUERY_COUNT = Counter(
    "app_db_query_total",
    "Total database queries",
    labelnames=("operation", "table"),
)
DB_QUERY_LATENCY = Histogram(
    "app_db_query_duration_seconds",
    "Database query latency",
    labelnames=("operation", "table"),
)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Collect request metrics for Prometheus scraping."""

    async def dispatch(self, request: Request, call_next: Callable):  # type: ignore[override]
        method = request.method
        route = request.scope.get("route")
        path_template = getattr(route, "path", request.url.path)
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            elapsed = time.perf_counter() - start
            REQUEST_LATENCY.labels(method=method, path=path_template).observe(elapsed)
            REQUEST_COUNT.labels(
                method=method,
                path=path_template,
                status_code="500",
            ).inc()
            raise
        else:
            elapsed = time.perf_counter() - start
            REQUEST_LATENCY.labels(method=method, path=path_template).observe(elapsed)
            REQUEST_COUNT.labels(
                method=method,
                path=path_template,
                status_code=str(response.status_code),
            ).inc()
            return response


def render_metrics() -> Response:
    """Return the current metrics snapshot as a Prometheus response."""

    return Response(
        content=generate_latest(),
        media_type=str(CONTENT_TYPE_LATEST),
    )


def register_sqlalchemy_metrics(engine: Engine) -> None:
    """Attach SQLAlchemy event hooks to capture query metrics."""

    if getattr(engine, "_metrics_registered", False):
        return

    engine._metrics_registered = True  # type: ignore[attr-defined]

    @event.listens_for(engine, "before_cursor_execute")
    def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._metrics_start_time = time.perf_counter()
        context._metrics_labels = _extract_db_labels(statement)

    @event.listens_for(engine, "after_cursor_execute")
    def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        start = getattr(context, "_metrics_start_time", time.perf_counter())
        operation, table = getattr(context, "_metrics_labels", ("OTHER", "unknown"))
        elapsed = max(time.perf_counter() - start, 0.0)
        DB_QUERY_COUNT.labels(operation=operation, table=table).inc()
        DB_QUERY_LATENCY.labels(operation=operation, table=table).observe(elapsed)

    @event.listens_for(engine, "handle_error")
    def _handle_error(exception_context):
        context = exception_context.execution_context
        operation, table = getattr(context, "_metrics_labels", ("OTHER", "unknown"))
        DB_QUERY_COUNT.labels(operation=operation, table=table).inc()


def _extract_db_labels(statement: str | None) -> Tuple[str, str]:
    """Best-effort parsing to identify operation and table from a SQL string."""

    if not statement:
        return "OTHER", "unknown"

    sql = statement.strip()
    if not sql:
        return "OTHER", "unknown"

    tokens = sql.split()
    operation = tokens[0].upper()
    table = "unknown"
    lowered = sql.lower()

    def clean(token: str) -> str:
        return token.strip('`"[]').split(".")[-1]

    if operation == "SELECT":
        marker = " from "
        idx = lowered.find(marker)
        if idx != -1:
            table = clean(sql[idx + len(marker) :].split()[0])
    elif operation in {"INSERT", "REPLACE"}:
        marker = " into "
        idx = lowered.find(marker)
        if idx != -1:
            table = clean(sql[idx + len(marker) :].split()[0])
    elif operation == "UPDATE":
        if len(tokens) > 1:
            table = clean(tokens[1])
    elif operation == "DELETE":
        marker = " from "
        idx = lowered.find(marker)
        if idx != -1:
            table = clean(sql[idx + len(marker) :].split()[0])

    if not table:
        table = "unknown"

    return operation, table
