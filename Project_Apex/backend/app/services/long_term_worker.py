"""Automated worker for Long-Term investment maturity processing."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, List, Optional, cast

from sqlalchemy import and_, join, select as sa_select
from sqlmodel import Session, select
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.db import engine
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    ExecutionEventType,
    Transaction,
    TransactionStatus,
    TransactionType,
    LongTermPlan,
    User,
    UserLongTermInvestment,
    LongTermWallet,
)
from app.services.execution_events import record_execution_event
from app.services.long_term import mature_due_investments
from app.services.notification_service import notify_investment_matured

logger = logging.getLogger(__name__)


def get_session() -> Session:
    """Get database session for worker operations."""
    return Session(engine)


class LongTermWorkerError(Exception):
    """Base exception for Long-Term worker errors."""
    pass


class DatabaseConnectionError(LongTermWorkerError):
    """Raised when database connection fails."""
    pass


class InvestmentProcessingError(LongTermWorkerError):
    """Raised when investment processing fails."""
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(DatabaseConnectionError),
    reraise=True,
)
async def process_mature_investments() -> dict[str, Any]:
    """
    Process all due long-term investments and move them to users' Long-Term Wallets.
    
    Returns:
        dict: Processing statistics including processed users and total transferred
    """
    logger.info("Starting long-term investment maturity processing")
    
    try:
        with get_session() as session:
            # Get all users with active investments (join to avoid in_ typing issues)
            users = (
                session.exec(
                    select(User)
                    .join(
                        UserLongTermInvestment,
                        cast(Any, User.id) == UserLongTermInvestment.user_id,
                    )
                    .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
                )
                .unique()
                .all()
            )
            
            if not users:
                logger.info("No users with active investments found")
                return {
                    "processed_users": 0,
                    "total_transferred": 0.0,
                    "success": True,
                    "message": "No active investments to process"
                }
            
            total_transferred = 0.0
            processed_users = 0
            processed_investments = []
            
            for user in users:
                try:
                    amount_transferred = mature_due_investments(session, user=user)
                    
                    if amount_transferred > 0:
                        processed_users += 1
                        total_transferred += amount_transferred
                        
                        # Record execution event for the user
                        investments = session.exec(
                            select(UserLongTermInvestment)
                            .where(UserLongTermInvestment.user_id == user.id)
                            .where(UserLongTermInvestment.status == CopyStatus.STOPPED)
                            .where(UserLongTermInvestment.allocation == 0.0)
                        ).all()
                        
                        for investment in investments:
                            plan = session.get(LongTermPlan, investment.plan_id)
                            plan_name = plan.name if plan else "Long-term"
                            plan_tier = plan.tier.value if plan and plan.tier else "UNKNOWN"
                            processed_investments.append({
                                "investment_id": str(investment.id),
                                "user_id": str(user.id),
                                "amount": amount_transferred,
                                "plan_name": plan_name,
                                "matured_at": utc_now().isoformat()
                            })
                            
                            # Record individual investment maturity event
                            await record_execution_event(
                                session,
                                event_type=ExecutionEventType.INVESTMENT_MATURED,
                                description=f"Long-term investment matured: {plan_name}",
                                amount=amount_transferred,
                                user_id=user.id,
                                payload={
                                    "service": "LONG_TERM",
                                    "investment_id": str(investment.id),
                                    "plan_name": plan_name,
                                    "plan_tier": plan_tier,
                                    "matured_amount": round(amount_transferred, 2),
                                    "matured_at": utc_now().isoformat(),
                                },
                            )
                            
                            # Send notification to user
                            try:
                                notify_investment_matured(
                                    session=session,
                                    user_id=user.id,
                                    plan_name=plan_name,
                                    amount=amount_transferred,
                                )
                            except Exception as e:
                                logger.warning(f"Failed to send maturity notification to user {user.id}: {e}")

                            # Record a transaction for audit/accounting
                            session.add(
                                Transaction(
                                    user_id=user.id,
                                    amount=round(amount_transferred, 2),
                                    transaction_type=TransactionType.LONG_TERM_ROI,
                                    status=TransactionStatus.COMPLETED,
                                    description=f"Long-term maturity credit: {plan_name}",
                                    executed_at=utc_now(),
                                )
                            )
                
                except Exception as user_error:
                    logger.error(
                        f"Failed to process investments for user {user.id}: {user_error}",
                        exc_info=True
                    )
                    continue
            
            # Record aggregate execution event
            if processed_users > 0:
                await record_execution_event(
                    session,
                    event_type=ExecutionEventType.SYSTEM_OPERATION,
                    description=(
                        f"Daily maturity processing: {processed_users} users, ${total_transferred:.2f} transferred"
                    ),
                    amount=total_transferred,
                    payload={
                        "service": "LONG_TERM_WORKER",
                        "processed_users": processed_users,
                        "total_transferred": round(total_transferred, 2),
                        "processed_investments_count": len(processed_investments),
                        "processed_investments": processed_investments,
                        "processed_at": utc_now().isoformat(),
                    },
                )
            
            session.commit()
            
            result: dict[str, Any] = {
                "processed_users": processed_users,
                "total_transferred": round(total_transferred, 2),
                "processed_investments_count": len(processed_investments),
                "success": True,
                "message": f"Processed {processed_users} users, transferred ${total_transferred:.2f}"
            }
            
            logger.info(
                f"Long-term maturity processing completed: {processed_users} users processed, "
                f"${total_transferred:.2f} transferred"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"Failed to process long-term investments: {e}", exc_info=True)
        raise InvestmentProcessingError(f"Investment processing failed: {e}")


def get_upcoming_maturities(days_ahead: int = 90) -> List[dict[str, Any]]:
    """
    Get investments maturing in the next specified number of days.
    
    Args:
        days_ahead: Number of days to look ahead for maturities (default: 90)
        
    Returns:
        List[dict]: List of upcoming maturities with investment details
    """
    cutoff_date = utc_now() + timedelta(days=days_ahead)
    
    try:
        with get_session() as session:
            upcoming_investments = session.exec(
                select(UserLongTermInvestment)
                .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
                .where(cast(Any, UserLongTermInvestment.investment_due_date).is_not(None))
                .where(cast(Any, UserLongTermInvestment.investment_due_date) <= cutoff_date)
                .where(cast(Any, UserLongTermInvestment.investment_due_date) > utc_now())
            ).all()
            
            maturities: List[dict[str, Any]] = []
            for investment in upcoming_investments:
                if investment.investment_due_date is None:
                    # Safety for type checker; filtered above
                    continue
                plan = session.get(LongTermPlan, investment.plan_id)
                plan_name = plan.name if plan else "Long-term"
                plan_tier = plan.tier.value if plan and plan.tier else "UNKNOWN"
                days_until_maturity = (investment.investment_due_date - utc_now()).days
                maturities.append({
                    "investment_id": str(investment.id),
                    "user_id": str(investment.user_id),
                    "plan_name": plan_name,
                    "plan_tier": plan_tier,
                    "allocation": round(investment.allocation, 2),
                    "maturity_date": investment.investment_due_date.isoformat(),
                    "days_until_maturity": max(0, days_until_maturity),
                    "started_at": investment.started_at.isoformat(),
                })
            
            # Sort by days until maturity (ensure key is treated as int for typing)
            from typing import cast as _cast
            maturities.sort(key=lambda x: _cast(int, x["days_until_maturity"]))
            
            return maturities
            
    except Exception as e:
        logger.error(f"Failed to fetch upcoming maturities: {e}", exc_info=True)
        return []


def get_worker_health_status() -> dict[str, Any]:
    """
    Get health status of the long-term worker.
    
    Returns:
        dict: Health status information
    """
    try:
        with get_session() as session:
            # Check database connectivity
            session.execute(select(1))
            
            # Get statistics
            active_investments = session.exec(
                select(UserLongTermInvestment).where(
                    UserLongTermInvestment.status == CopyStatus.ACTIVE
                )
            ).all()
            
            due_investments = session.exec(
                select(UserLongTermInvestment)
                .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
                .where(cast(Any, UserLongTermInvestment.investment_due_date).is_not(None))
                .where(cast(Any, UserLongTermInvestment.investment_due_date) <= utc_now())
            ).all()
            
            upcoming_investments = get_upcoming_maturities(days_ahead=30)
            
            return {
                "status": "healthy",
                "database_connected": True,
                "active_investments": len(active_investments),
                "due_investments": len(due_investments),
                "upcoming_maturities_30d": len(upcoming_investments),
                "last_checked": utc_now().isoformat(),
            }
            
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "database_connected": False,
            "error": str(e),
            "last_checked": utc_now().isoformat(),
        }


__all__ = [
    "process_mature_investments",
    "get_upcoming_maturities", 
    "get_worker_health_status",
    "LongTermWorkerError",
    "DatabaseConnectionError",
    "InvestmentProcessingError",
]