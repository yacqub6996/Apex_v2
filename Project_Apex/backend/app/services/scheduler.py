"""APScheduler configuration for automated background tasks."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Protocol, runtime_checkable, cast

@runtime_checkable
class SchedulerLike(Protocol):
    def start(self) -> None: ...
    def add_job(self, func: Any, trigger: Any | str, id: str, name: str, replace_existing: bool, max_instances: int = 1, **kwargs: Any) -> Any: ...
    def get_jobs(self) -> list[Any]: ...
    def shutdown(self, wait: bool = True) -> None: ...
    def get_job(self, job_id: str) -> Any: ...

from app.core.config import settings
from app.core.db import engine
from app.services.long_term_worker import process_mature_investments

logger = logging.getLogger(__name__)


class SchedulerService:
    """Scheduler service for managing background tasks."""
    
    def __init__(self) -> None:
        self.scheduler: SchedulerLike | None = None
        self.is_running = False
    
    def start(self) -> None:
        """Start the scheduler with configured jobs."""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        # Lazy import to avoid import errors if package not yet installed/available to analyzer
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]
        from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore  # type: ignore[import-untyped]
        from apscheduler.executors.pool import ThreadPoolExecutor  # type: ignore[import-untyped]

        # Configure job store and executor
        jobstores = {
            'default': SQLAlchemyJobStore(engine=engine, tablename='apscheduler_jobs')
        }
        executors = {
            'default': ThreadPoolExecutor(20)
        }
        job_defaults = {
            'coalesce': True,
            'max_instances': 1,
            'misfire_grace_time': 300  # 5 minutes
        }

        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        # Add jobs
        self._add_jobs()
        
        # Start the scheduler
        assert self.scheduler is not None
        self.scheduler.start()
        self.is_running = True
        
        logger.info("APScheduler started successfully")
    
    def _add_jobs(self) -> None:
        """Add scheduled jobs to the scheduler."""
        # Daily maturity processing at midnight UTC
        assert self.scheduler is not None
        self.scheduler.add_job(
            func=run_maturity_processing_job,
            trigger='cron',  # use string trigger to avoid import-time editor warnings
            hour=0, minute=0, second=0,  # Midnight UTC
            id='long_term_maturity_processing',
            name='Long-Term Investment Maturity Processing',
            replace_existing=True,
            max_instances=1
        )
        
        # Health check every hour
        self.scheduler.add_job(
            func=scheduler_health_check_job,
            trigger='cron',
            hour='*', minute=0, second=0,
            id='scheduler_health_check',
            name='Scheduler Health Check',
            replace_existing=True
        )
        
        logger.info("Scheduled jobs added to APScheduler")

    
    def _get_next_maturity_run(self) -> str | None:
        """Get the next scheduled maturity processing time."""
        if not self.scheduler:
            return None
        
        try:
            job = self.scheduler.get_job('long_term_maturity_processing')
            if job and job.next_run_time:
                return cast(str, job.next_run_time.isoformat())
        except Exception as e:
            logger.error(f"Failed to get next maturity run: {e}")
        
        return None
    
    def stop(self) -> None:
        """Stop the scheduler gracefully."""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown(wait=True)
            self.is_running = False
            logger.info("APScheduler stopped")
    
    def get_status(self) -> dict[str, Any]:
        """Get scheduler status information."""
        if not self.scheduler or not self.is_running:
            return {
                "status": "stopped",
                "is_running": False,
                "active_jobs": 0,
                "next_maturity_run": None
            }
        
        try:
            assert self.scheduler is not None
            jobs = self.scheduler.get_jobs()
            active_jobs = [job for job in jobs if job.next_run_time]
            
            return {
                "status": "running",
                "is_running": True,
                "active_jobs": len(active_jobs),
                "next_maturity_run": self._get_next_maturity_run(),
                "last_checked": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get scheduler status: {e}")
            return {
                "status": "error",
                "is_running": False,
                "error": str(e),
                "last_checked": datetime.utcnow().isoformat()
            }


# Global scheduler instance
scheduler_service = SchedulerService()


def start_scheduler() -> None:
    """Start the global scheduler instance."""
    scheduler_service.start()


def stop_scheduler() -> None:
    """Stop the global scheduler instance."""
    scheduler_service.stop()


def get_scheduler_status() -> dict[str, Any]:
    """Get the global scheduler status."""
    return scheduler_service.get_status()


# Module-level job functions to avoid serializing scheduler instances (required by SQLAlchemyJobStore)
async def run_maturity_processing_job() -> None:
    """Async job entrypoint for long-term maturity processing."""
    try:
        logger.info("Starting scheduled long-term maturity processing")
        result = await process_mature_investments()
        logger.info(f"Maturity processing completed: {result}")
    except Exception as e:
        logger.error(f"Maturity processing failed: {e}", exc_info=True)


def scheduler_health_check_job() -> None:
    """Synchronous job that logs scheduler health periodically."""
    try:
        jobs = scheduler_service.scheduler.get_jobs() if scheduler_service.scheduler else []
        active_jobs = [job for job in jobs if getattr(job, 'next_run_time', None)]
        logger.info(
            f"Scheduler health check: {len(active_jobs)} active jobs, "
            f"next maturity processing at {scheduler_service._get_next_maturity_run()}"
        )
    except Exception as e:
        logger.error(f"Scheduler health check failed: {e}", exc_info=True)


__all__ = [
    "SchedulerService",
    "scheduler_service",
    "start_scheduler",
    "stop_scheduler",
    "get_scheduler_status",
]