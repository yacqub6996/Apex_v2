"""API routes for Long-Term worker management and projected unlocks."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models import UserRole
from app.services.long_term_worker import (
    process_mature_investments,
    get_upcoming_maturities,
    get_worker_health_status,
)
from app.services.scheduler import get_scheduler_status

router = APIRouter(prefix="/long-term-worker", tags=["long-term-worker"])


class WorkerStatusResponse(SQLModel):
    """Response model for worker status."""
    scheduler_status: dict
    worker_health: dict
    is_running: bool


class UpcomingMaturityItem(SQLModel):
    """Model for upcoming maturity items."""
    investment_id: str
    user_id: str
    plan_name: str
    plan_tier: str
    allocation: float
    maturity_date: str
    days_until_maturity: int
    started_at: str


class UpcomingMaturitiesResponse(SQLModel):
    """Response model for upcoming maturities."""
    maturities: List[UpcomingMaturityItem]
    total_count: int
    total_amount: float
    next_30_days: int
    next_90_days: int


@router.get("/status", response_model=WorkerStatusResponse)
def get_worker_status(*, session: SessionDep, current_user: CurrentUser) -> WorkerStatusResponse:
    """Get the status of the long-term worker and scheduler."""
    
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    scheduler_status = get_scheduler_status()
    worker_health = get_worker_health_status()
    
    return WorkerStatusResponse(
        scheduler_status=scheduler_status,
        worker_health=worker_health,
        is_running=scheduler_status.get("is_running", False)
    )


@router.post("/run-now")
async def run_maturity_processing_now(*, session: SessionDep, current_user: CurrentUser) -> dict:
    """Manually trigger maturity processing (admin only)."""
    
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        result = await process_mature_investments()
        return {
            "success": True,
            "message": "Maturity processing completed successfully",
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Maturity processing failed: {str(e)}")


@router.get("/upcoming-maturities", response_model=UpcomingMaturitiesResponse)
def get_upcoming_maturities_endpoint(
    *, 
    session: SessionDep, 
    current_user: CurrentUser,
    days_ahead: int = 90
) -> UpcomingMaturitiesResponse:
    """Get investments maturing in the next specified number of days."""
    
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if days_ahead < 1 or days_ahead > 365:
        raise HTTPException(status_code=400, detail="Days ahead must be between 1 and 365")
    
    try:
        maturities = get_upcoming_maturities(days_ahead=days_ahead)
        
        # Calculate statistics
        total_amount = sum(maturity["allocation"] for maturity in maturities)
        next_30_days = len([m for m in maturities if m["days_until_maturity"] <= 30])
        next_90_days = len([m for m in maturities if m["days_until_maturity"] <= 90])
        
        # Convert to response models
        maturity_items = [
            UpcomingMaturityItem(
                investment_id=maturity["investment_id"],
                user_id=maturity["user_id"],
                plan_name=maturity["plan_name"],
                plan_tier=maturity["plan_tier"],
                allocation=maturity["allocation"],
                maturity_date=maturity["maturity_date"],
                days_until_maturity=maturity["days_until_maturity"],
                started_at=maturity["started_at"],
            )
            for maturity in maturities
        ]
        
        return UpcomingMaturitiesResponse(
            maturities=maturity_items,
            total_count=len(maturity_items),
            total_amount=round(total_amount, 2),
            next_30_days=next_30_days,
            next_90_days=next_90_days,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch upcoming maturities: {str(e)}")


@router.get("/user/upcoming-maturities", response_model=UpcomingMaturitiesResponse)
def get_user_upcoming_maturities(
    *, 
    session: SessionDep, 
    current_user: CurrentUser,
    days_ahead: int = 90
) -> UpcomingMaturitiesResponse:
    """Get the current user's investments maturing in the next specified number of days."""
    
    if days_ahead < 1 or days_ahead > 365:
        raise HTTPException(status_code=400, detail="Days ahead must be between 1 and 365")
    
    try:
        all_maturities = get_upcoming_maturities(days_ahead=days_ahead)
        
        # Filter for current user only
        user_maturities = [
            maturity for maturity in all_maturities 
            if maturity["user_id"] == str(current_user.id)
        ]
        
        # Calculate statistics
        total_amount = sum(maturity["allocation"] for maturity in user_maturities)
        next_30_days = len([m for m in user_maturities if m["days_until_maturity"] <= 30])
        next_90_days = len([m for m in user_maturities if m["days_until_maturity"] <= 90])
        
        # Convert to response models
        maturity_items = [
            UpcomingMaturityItem(
                investment_id=maturity["investment_id"],
                user_id=maturity["user_id"],
                plan_name=maturity["plan_name"],
                plan_tier=maturity["plan_tier"],
                allocation=maturity["allocation"],
                maturity_date=maturity["maturity_date"],
                days_until_maturity=maturity["days_until_maturity"],
                started_at=maturity["started_at"],
            )
            for maturity in user_maturities
        ]
        
        return UpcomingMaturitiesResponse(
            maturities=maturity_items,
            total_count=len(maturity_items),
            total_amount=round(total_amount, 2),
            next_30_days=next_30_days,
            next_90_days=next_90_days,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch upcoming maturities: {str(e)}")


__all__ = ["router"]