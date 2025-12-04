"""
ROI Calculation API Endpoints
Provides standardized ROI calculation methods and mathematical plausibility verification.
"""

import uuid
from typing import Dict, List
from sqlmodel import SQLModel, Field, select

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.services.roi_calculator import roi_calculator
from app.models import ExecutionEvent, ExecutionEventType


router = APIRouter(prefix="/roi", tags=["roi-calculations"])


class PortfolioROIResponse(SQLModel):
    total_deposits: float
    current_portfolio_value: float
    roi_percentage: float
    recent_profit_loss: float
    daily_roi_percentage: float
    annualized_roi_percentage: float
    period_days: int


class CopyTradingROIResponse(SQLModel):
    copy_trading_balance: float
    copy_trading_roi_percentage: float
    total_profit: float
    estimated_monthly_return: float
    trader_specific: bool


class MathematicalPlausibilityResponse(SQLModel):
    is_plausible: bool
    issues: List[str]


class PerformanceBenchmarkResponse(SQLModel):
    strategy: str
    actual_annual_roi: float
    target_annual_roi: float
    performance_gap: float
    performance_percentage: float
    is_meeting_benchmark: bool
    benchmarks: Dict[str, float]


class UnifiedROIResponse(SQLModel):
    overall_roi_percentage: float
    total_equity: float
    total_deposits: float
    wallet_balance: float
    copy_trading_balance: float
    wallet_allocation_percentage: float
    copy_trading_allocation_percentage: float
    portfolio_roi: PortfolioROIResponse
    copy_trading_roi: CopyTradingROIResponse
    is_balanced: bool
    recommended_action: str
    period_days: int | None = None
    period_label: str
    actively_invested_roi_percentage: float
    actively_invested_profit_loss: float


class HistoricalROIResponse(SQLModel):
    date: str
    portfolio_value: float
    roi_percentage: float
    daily_profit_loss: float


class LongTermROIEvent(SQLModel):
    id: uuid.UUID
    createdAt: str
    planName: str
    roiPercent: float
    amount: float
    description: str | None = None
    investmentId: uuid.UUID | None = Field(default=None, alias="investment_id")


class LongTermROIHistoryResponse(SQLModel):
    data: List[LongTermROIEvent]
    count: int
    totalPages: int
    currentPage: int


@router.get("/portfolio", response_model=PortfolioROIResponse)
def get_portfolio_roi(
    session: SessionDep, 
    current_user: CurrentUser,
    period_days: int = 30
) -> PortfolioROIResponse:
    """
    Calculate comprehensive ROI metrics for the current user's portfolio.
    
    Args:
        period_days: Number of days to look back for performance data (default: 30)
    """
    try:
        roi_data = roi_calculator.calculate_portfolio_roi(
            session, current_user.id, period_days
        )
        return PortfolioROIResponse(**roi_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating ROI: {str(e)}")


@router.get("/copy-trading", response_model=CopyTradingROIResponse)
def get_copy_trading_roi(
    session: SessionDep, 
    current_user: CurrentUser,
    trader_profile_id: uuid.UUID | None = None
) -> CopyTradingROIResponse:
    """
    Calculate ROI specifically for copy trading activities.
    
    Args:
        trader_profile_id: Optional specific trader to calculate ROI for
    """
    try:
        roi_data = roi_calculator.calculate_copy_trading_roi(
            session, current_user.id, trader_profile_id
        )
        return CopyTradingROIResponse(**roi_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating copy trading ROI: {str(e)}")


@router.get("/plausibility", response_model=MathematicalPlausibilityResponse)
def verify_mathematical_plausibility(
    session: SessionDep, 
    current_user: CurrentUser
) -> MathematicalPlausibilityResponse:
    """
    Verify that all performance data maintains mathematical coherence.
    """
    try:
        is_plausible, issues = roi_calculator.verify_mathematical_plausibility(
            session, current_user.id
        )
        return MathematicalPlausibilityResponse(
            is_plausible=is_plausible,
            issues=issues
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying plausibility: {str(e)}")


@router.get("/benchmark", response_model=PerformanceBenchmarkResponse)
def get_performance_vs_benchmark(
    session: SessionDep, 
    current_user: CurrentUser
) -> PerformanceBenchmarkResponse:
    """
    Calculate user performance relative to their strategy benchmark.
    """
    try:
        benchmark_data = roi_calculator.calculate_performance_vs_benchmark(
            session, current_user.id
        )
        
        if "error" in benchmark_data:
            raise HTTPException(status_code=404, detail=benchmark_data["error"])
        
        return PerformanceBenchmarkResponse(**benchmark_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating benchmark performance: {str(e)}")


@router.get("/admin/plausibility/{user_id}", response_model=MathematicalPlausibilityResponse)
def admin_verify_mathematical_plausibility(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID
) -> MathematicalPlausibilityResponse:
    """
    Admin endpoint to verify mathematical plausibility for any user.
    """
    if not (current_user.is_superuser or current_user.role.value == "ADMIN"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        is_plausible, issues = roi_calculator.verify_mathematical_plausibility(
            session, user_id
        )
        return MathematicalPlausibilityResponse(
            is_plausible=is_plausible,
            issues=issues
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying plausibility: {str(e)}")


@router.get("/admin/portfolio/{user_id}", response_model=PortfolioROIResponse)
def admin_get_portfolio_roi(
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
    period_days: int = 30
) -> PortfolioROIResponse:
    """
    Admin endpoint to calculate ROI for any user.
    """
    if not (current_user.is_superuser or current_user.role.value == "ADMIN"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        roi_data = roi_calculator.calculate_portfolio_roi(
            session, user_id, period_days
        )
        return PortfolioROIResponse(**roi_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating ROI: {str(e)}")


@router.get("/unified", response_model=UnifiedROIResponse)
def get_unified_roi(
    session: SessionDep,
    current_user: CurrentUser,
    period_days: int | None = None
) -> UnifiedROIResponse:
    """
    Calculate unified ROI metrics across all account segments.
    
    Args:
        period_days: Number of days to look back for performance data
                    (None for since inception, -1 for YTD, 30 for 30 days)
    """
    try:
        # Handle period_days based on selection
        unified_data = roi_calculator.calculate_unified_roi(
            session, current_user.id, period_days
        )
        
        # Convert nested ROI data to response models
        portfolio_roi_response = PortfolioROIResponse(**unified_data["portfolio_roi"])
        copy_trading_roi_response = CopyTradingROIResponse(**unified_data["copy_trading_roi"])
        
        return UnifiedROIResponse(
            overall_roi_percentage=unified_data["overall_roi_percentage"],
            total_equity=unified_data["total_equity"],
            total_deposits=unified_data["total_deposits"],
            wallet_balance=unified_data["wallet_balance"],
            copy_trading_balance=unified_data["copy_trading_balance"],
            wallet_allocation_percentage=unified_data["wallet_allocation_percentage"],
            copy_trading_allocation_percentage=unified_data["copy_trading_allocation_percentage"],
            portfolio_roi=portfolio_roi_response,
            copy_trading_roi=copy_trading_roi_response,
            is_balanced=unified_data["is_balanced"],
            recommended_action=unified_data["recommended_action"],
            period_days=unified_data["period_days"],
            period_label=unified_data["period_label"],
            actively_invested_roi_percentage=unified_data["actively_invested_roi_percentage"],
            actively_invested_profit_loss=unified_data["actively_invested_profit_loss"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating unified ROI: {str(e)}")


@router.get("/historical", response_model=List[HistoricalROIResponse])
def get_historical_roi(
    session: SessionDep,
    current_user: CurrentUser,
    days: int = 30
) -> List[HistoricalROIResponse]:
    """
    Get historical ROI data for the current user.
    
    Args:
        days: Number of days of historical data to retrieve (default: 30)
    """
    try:
        from datetime import datetime, timedelta
        from app.models import DailyPerformance
        
        # Calculate date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        # Get daily performance data
        from sqlalchemy import asc
        from typing import Any, cast
        daily_performance = session.exec(
            select(DailyPerformance)
            .where(DailyPerformance.user_id == current_user.id)
            .where(DailyPerformance.performance_date >= start_date)
            .where(DailyPerformance.performance_date <= end_date)
            .order_by(asc(cast(Any, DailyPerformance.performance_date)))
        ).all()
        
        # Get user's total deposits for ROI calculation
        from app.models import Transaction, TransactionType, TransactionStatus
        total_deposits = session.exec(
            select(Transaction.amount)
            .where(Transaction.user_id == current_user.id)
            .where(Transaction.transaction_type == TransactionType.DEPOSIT)
            .where(Transaction.status == TransactionStatus.COMPLETED)
        ).all()
        
        total_deposits_amount = sum(total_deposits) if total_deposits else 0
        
        # Build historical data
        historical_data = []
        cumulative_value = total_deposits_amount
        
        for performance in daily_performance:
            cumulative_value += performance.profit_loss
            
            # Calculate ROI percentage for this day
            if total_deposits_amount > 0:
                roi_percentage = ((cumulative_value - total_deposits_amount) / total_deposits_amount) * 100
            else:
                roi_percentage = 0.0
            
            historical_data.append(HistoricalROIResponse(
                date=performance.performance_date.isoformat(),
                portfolio_value=round(cumulative_value, 2),
                roi_percentage=round(roi_percentage, 2),
                daily_profit_loss=round(performance.profit_loss, 2)
            ))
        
        return historical_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving historical ROI data: {str(e)}")


@router.get("/long-term/history", response_model=LongTermROIHistoryResponse)
def get_long_term_roi_history(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = 1,
    page_size: int = 50,
) -> LongTermROIHistoryResponse:
    """Return paginated long-term ROI events for the current user.

    We read from ExecutionEvent where:
    - user_id = current_user.id
    - event_type = FOLLOWER_PROFIT
    - payload.service == 'LONG_TERM' OR payload.balance_type == 'long_term' OR description ILIKE 'Long-term%'
    """
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 50

    # Build base query
    stmt = (
        select(ExecutionEvent)
        .where(ExecutionEvent.user_id == current_user.id)
        .where(ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT)
    )

    events_all = session.exec(stmt).all()

    def is_long_term(ev: ExecutionEvent) -> bool:
        payload = ev.payload or {}
        if isinstance(payload, dict):
            if payload.get("service") == "LONG_TERM":
                return True
            if payload.get("balance_type") == "long_term":
                return True
        return ev.description.lower().startswith("long-term") if isinstance(ev.description, str) else False

    long_term_events = [ev for ev in events_all if is_long_term(ev)]
    total = len(long_term_events)
    # Sort newest first
    long_term_events.sort(key=lambda e: e.created_at, reverse=True)
    start = (page - 1) * page_size
    end = start + page_size
    slice_events = long_term_events[start:end]

    def to_public(ev: ExecutionEvent) -> LongTermROIEvent:
        payload = ev.payload or {}
        plan_name = payload.get("plan_name") or payload.get("symbol") or "Long-term"
        try:
            roi_percent_value = payload.get("roi_percent")
            if roi_percent_value is not None:
                roi_percent = float(roi_percent_value)
            else:
                roi_percent = 0.0
        except (ValueError, TypeError):
            roi_percent = 0.0
        amount = float(ev.amount or 0.0)
        raw_investment_id = payload.get("investment_id")
        investment_id: uuid.UUID | None = None
        if raw_investment_id:
            try:
                investment_id = uuid.UUID(str(raw_investment_id))
            except (ValueError, TypeError):
                investment_id = None
        return LongTermROIEvent(
            id=ev.id,
            createdAt=ev.created_at.isoformat(),
            planName=str(plan_name),
            roiPercent=roi_percent,
            amount=amount,
            description=ev.description,
            investmentId=investment_id,
        )

    data = [to_public(ev) for ev in slice_events]
    total_pages = (total + page_size - 1) // page_size if page_size else 1

    return LongTermROIHistoryResponse(
        data=data,
        count=total,
        totalPages=total_pages,
        currentPage=page,
    )
