from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.api.main import api_router
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.core.metrics import MetricsMiddleware
from app.core.rate_limiter import RateLimiterMiddleware
from app.services.scheduler import start_scheduler


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


configure_logging()

# if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
#     import sentry_sdk
#     sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Start the scheduler when the application starts
@app.on_event("startup")
async def startup_event():
    """Start background scheduler on application startup."""
    try:
        start_scheduler()
    except Exception as e:
        # Log error but don't crash the application
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to start scheduler: {e}")

# Stop the scheduler when the application shuts down
@app.on_event("shutdown")
async def shutdown_event():
    """Stop background scheduler on application shutdown."""
    try:
        from app.services.scheduler import stop_scheduler
        stop_scheduler()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to stop scheduler: {e}")

if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(
        RateLimiterMiddleware,
        limit=settings.RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
    )

if settings.METRICS_ENABLED:
    app.add_middleware(MetricsMiddleware)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Fallback for development - allow all origins in local environment
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Serve uploaded files under /storage (maps to ./storage) and keep /static for any other static needs.
# Storage provider returns paths like "storage/..." which will resolve under the /storage mount.
app.mount("/storage", StaticFiles(directory="storage"), name="storage")
app.mount("/static", StaticFiles(directory="static"), name="static")
