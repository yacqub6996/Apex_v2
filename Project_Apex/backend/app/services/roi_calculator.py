"""
Standardized ROI Calculation Service
Provides consistent ROI calculation methods across the platform
with mathematical plausibility verification.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from sqlmodel import Session, select

from app.models import (
    User, 
    AccountSummary, 
    Transaction, 
    TransactionType, 
    TransactionStatus,
    DailyPerformance,
    InvestmentStrategy
)
from app.core.time import utc_now


class ROICalculator:
    """Standardized ROI calculation service with mathematical plausibility verification"""
    
    @staticmethod
    def calculate_portfolio_roi(
        session: Session,
        user_id: uuid.UUID,
        period_days: int | None = 30
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive ROI metrics for a user's portfolio.
        
        Args:
            session: Database session
            user_id: User ID to calculate ROI for
            period_days: Number of days to look back for performance data
            
        Returns:
            Dictionary containing ROI metrics
        """
        user = session.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get total deposits
        total_deposits = session.exec(
            select(Transaction.amount)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_type == TransactionType.DEPOSIT)
            .where(Transaction.status == TransactionStatus.COMPLETED)
        ).all()
        
        total_deposits_amount = sum(total_deposits) if total_deposits else 0
        
        # Get current portfolio value
        current_portfolio_value = user.get_overall_equity()
        
        # Calculate ROI
        if total_deposits_amount > 0:
            roi_percentage = ((current_portfolio_value - total_deposits_amount) / total_deposits_amount) * 100
        else:
            roi_percentage = 0.0
        
        # Get recent performance data
        if period_days is not None:
            period_start = utc_now() - timedelta(days=period_days)
            recent_performance = session.exec(
                select(DailyPerformance)
                .where(DailyPerformance.user_id == user_id)
                .where(DailyPerformance.performance_date >= period_start.date())
            ).all()
        else:
            # Since inception - get all performance data
            recent_performance = session.exec(
                select(DailyPerformance)
                .where(DailyPerformance.user_id == user_id)
            ).all()
        
        recent_profit_loss = sum(entry.profit_loss for entry in recent_performance)
        
        # Calculate daily ROI for the period
        if total_deposits_amount > 0 and len(recent_performance) > 0:
            daily_roi = (recent_profit_loss / total_deposits_amount) * 100
            annualized_roi = daily_roi * 365  # Simplified annualization
        else:
            daily_roi = 0.0
            annualized_roi = 0.0
        
        return {
            "total_deposits": round(total_deposits_amount, 2),
            "current_portfolio_value": round(current_portfolio_value, 2),
            "roi_percentage": round(roi_percentage, 2),
            "recent_profit_loss": round(recent_profit_loss, 2),
            "daily_roi_percentage": round(daily_roi, 2),
            "annualized_roi_percentage": round(annualized_roi, 2),
            "period_days": period_days
        }
    
    @staticmethod
    def calculate_copy_trading_roi(
        session: Session,
        user_id: uuid.UUID,
        trader_profile_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Calculate ROI specifically for copy trading activities using actual trade data.
        
        Args:
            session: Database session
            user_id: User ID to calculate ROI for
            trader_profile_id: Optional specific trader to calculate ROI for
            
        Returns:
            Dictionary containing copy trading ROI metrics
        """
        user = session.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get copy trading balance
        copy_balance = user.copy_trading_balance or 0
        
        # Calculate ROI based on actual execution events
        if copy_balance > 0:
            # Get execution events for copy trading
            from app.models import ExecutionEvent, ExecutionEventType
            
            # Build query for copy trading execution events
            query = select(ExecutionEvent).where(
                ExecutionEvent.user_id == user_id,
                ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT
            )
            
            if trader_profile_id:
                query = query.where(ExecutionEvent.trader_profile_id == trader_profile_id)
            
            execution_events = session.exec(query).all()
            
            # Calculate total profit from execution events
            total_profit = sum(event.amount or 0 for event in execution_events)
            
            # Calculate ROI percentage based on copy balance and total profit
            roi_percentage = (total_profit / copy_balance) * 100 if copy_balance > 0 else 0.0
            
            # Calculate monthly return based on recent activity (last 30 days)
            from datetime import datetime, timedelta
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_events = [event for event in execution_events 
                           if event.created_at >= thirty_days_ago]
            monthly_profit = sum(event.amount or 0 for event in recent_events)
            
        else:
            roi_percentage = 0.0
            total_profit = 0.0
            monthly_profit = 0.0
        
        return {
            "copy_trading_balance": round(copy_balance, 2),
            "copy_trading_roi_percentage": round(roi_percentage, 2),
            "total_profit": round(total_profit, 2),
            "estimated_monthly_return": round(monthly_profit, 2),
            # Indicates whether the ROI is specific to a trader profile
            "trader_specific": bool(trader_profile_id is not None)
        }
    
    @staticmethod
    def verify_mathematical_plausibility(
        session: Session,
        user_id: uuid.UUID
    ) -> Tuple[bool, List[str]]:
        """
        Verify that all performance data maintains mathematical coherence.
        
        Args:
            session: Database session
            user_id: User ID to verify
            
        Returns:
            Tuple of (is_plausible, list_of_issues)
        """
        issues = []
        user = session.get(User, user_id)
        
        if not user:
            return False, ["User not found"]
        
        # Check balance consistency
        total_equity = user.get_overall_equity()
        
        # Get all transactions
        transactions = session.exec(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.status == TransactionStatus.COMPLETED)
        ).all()
        
        # Calculate expected balance from transactions
        expected_balance = 0
        for tx in transactions:
            if tx.transaction_type == TransactionType.DEPOSIT:
                expected_balance += tx.amount
            elif tx.transaction_type == TransactionType.WITHDRAWAL:
                expected_balance -= tx.amount
            elif tx.transaction_type == TransactionType.ADJUSTMENT:
                expected_balance += tx.amount
        
        # Allow for small rounding differences
        balance_discrepancy = abs(total_equity - expected_balance)
        if balance_discrepancy > 0.01:  # Allow for $0.01 rounding differences
            issues.append(f"Balance discrepancy: Expected ${expected_balance:.2f}, Actual ${total_equity:.2f}")
        
        # Check performance data consistency
        account_summary = session.exec(
            select(AccountSummary)
            .where(AccountSummary.user_id == user_id)
        ).first()
        
        if account_summary:
            # Verify win rate calculation
            if account_summary.total_trades > 0:
                calculated_win_rate = (account_summary.winning_trades / account_summary.total_trades) * 100
                if abs(account_summary.win_rate - calculated_win_rate) > 0.1:  # Allow 0.1% difference
                    issues.append(f"Win rate discrepancy: Calculated {calculated_win_rate:.1f}%, Stored {account_summary.win_rate:.1f}%")
            
            # Verify trade counts
            if account_summary.winning_trades + account_summary.losing_trades > account_summary.total_trades:
                issues.append("Trade count inconsistency: winning + losing trades > total trades")
        
        return len(issues) == 0, issues
    
    @staticmethod
    def get_strategy_based_benchmarks(
        investment_strategy: InvestmentStrategy
    ) -> Dict[str, float]:
        """
        Get performance benchmarks based on investment strategy.
        
        Args:
            investment_strategy: User's chosen investment strategy
            
        Returns:
            Dictionary of benchmark metrics
        """
        benchmarks = {
            InvestmentStrategy.ACTIVE_PORTFOLIO: {
                "target_monthly_return": 8.0,
                "target_annual_return": 96.0,
                "risk_level": "HIGH",
                "volatility_tolerance": 25.0
            },
            InvestmentStrategy.LONG_TERM_GROWTH: {
                "target_monthly_return": 3.0,
                "target_annual_return": 36.0,
                "risk_level": "MEDIUM",
                "volatility_tolerance": 15.0
            },
            InvestmentStrategy.BALANCED: {
                "target_monthly_return": 5.0,
                "target_annual_return": 60.0,
                "risk_level": "MEDIUM_HIGH",
                "volatility_tolerance": 20.0
            }
        }
        
        return benchmarks.get(investment_strategy, benchmarks[InvestmentStrategy.BALANCED])
    
    @staticmethod
    def calculate_performance_vs_benchmark(
        session: Session,
        user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Calculate user performance relative to their strategy benchmark.
        
        Args:
            session: Database session
            user_id: User ID to calculate for
            
        Returns:
            Dictionary with performance vs benchmark metrics
        """
        user = session.get(User, user_id)
        if not user or not user.profile:
            return {"error": "User or profile not found"}
        
        # Get user's ROI
        portfolio_roi = ROICalculator.calculate_portfolio_roi(session, user_id)
        
        # Get strategy benchmarks
        strategy_benchmarks = ROICalculator.get_strategy_based_benchmarks(
            user.profile.investment_strategy
        )
        
        # Calculate performance vs benchmark
        actual_annual_roi = portfolio_roi.get("annualized_roi_percentage", 0.0)
        target_annual_roi = strategy_benchmarks.get("target_annual_return", 0.0)
        
        performance_gap = actual_annual_roi - target_annual_roi
        performance_percentage = (actual_annual_roi / target_annual_roi * 100) if target_annual_roi > 0 else 0
        
        return {
            "strategy": user.profile.investment_strategy.value,
            "actual_annual_roi": round(actual_annual_roi, 2),
            "target_annual_roi": round(target_annual_roi, 2),
            "performance_gap": round(performance_gap, 2),
            "performance_percentage": round(performance_percentage, 2),
            "is_meeting_benchmark": actual_annual_roi >= target_annual_roi,
            "benchmarks": strategy_benchmarks
        }


    @staticmethod
    def calculate_unified_roi(
        session: Session,
        user_id: uuid.UUID,
        period_days: int | None = None
    ) -> Dict[str, Any]:
        """
        Calculate unified ROI metrics across all account segments.
        
        Args:
            session: Database session
            user_id: User ID to calculate ROI for
            period_days: Number of days to look back for performance data (None for since inception, -1 for YTD)
            
        Returns:
            Dictionary containing unified ROI metrics across all segments
        """
        user = session.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Calculate portfolio ROI with period_days
        portfolio_roi = ROICalculator.calculate_portfolio_roi(session, user_id, period_days or 30)
        
        # Calculate copy trading ROI
        copy_trading_roi = ROICalculator.calculate_copy_trading_roi(session, user_id)
        
        # Calculate overall metrics
        total_equity = user.get_overall_equity()
        total_deposits = portfolio_roi["total_deposits"]
        
        # Calculate overall ROI
        if total_deposits > 0:
            overall_roi_percentage = ((total_equity - total_deposits) / total_deposits) * 100
        else:
            overall_roi_percentage = 0.0
        
        # Calculate segment allocation percentages
        wallet_allocation = (user.wallet_balance / total_equity * 100) if total_equity > 0 else 0.0
        copy_trading_allocation = (user.copy_trading_balance / total_equity * 100) if total_equity > 0 else 0.0
        
        # Calculate actively invested ROI (copy trading + long-term allocations)
        actively_invested_balance = (user.copy_trading_balance or 0) + (user.long_term_balance or 0)

        # Calculate profit/loss based on period
        if period_days is None:
            # Since inception: use realized profit from copy trading + long-term ROI events
            copy_trading_profit = float(copy_trading_roi.get("total_profit", 0.0))

            # Long-term ROI profit derived from execution events marked as LONG_TERM
            from app.models import ExecutionEvent, ExecutionEventType  # type: ignore

            long_term_events = session.exec(
                select(ExecutionEvent)
                .where(ExecutionEvent.user_id == user_id)
                .where(ExecutionEvent.event_type == ExecutionEventType.FOLLOWER_PROFIT)
            ).all()

            def _is_long_term(ev: ExecutionEvent) -> bool:  # type: ignore[valid-type]
                payload = ev.payload or {}
                if isinstance(payload, dict):
                    if payload.get("service") == "LONG_TERM":
                        return True
                    if payload.get("balance_type") == "long_term":
                        return True
                return (
                    isinstance(ev.description, str)
                    and ev.description.lower().startswith("long-term")
                )

            long_term_profit = sum(
                float(ev.amount or 0.0) for ev in long_term_events if _is_long_term(ev)
            )

            actively_invested_profit_loss = copy_trading_profit + long_term_profit

        elif period_days == -1:
            # YTD - calculate profit from January 1st of current year
            from datetime import datetime
            current_year = datetime.now().year
            ytd_start = datetime(current_year, 1, 1).date()
            from app.models import DailyPerformance
            ytd_performance = session.exec(
                select(DailyPerformance)
                .where(DailyPerformance.user_id == user_id)
                .where(DailyPerformance.performance_date >= ytd_start)
            ).all()
            actively_invested_profit_loss = sum(entry.profit_loss for entry in ytd_performance)
        else:
            actively_invested_profit_loss = portfolio_roi["recent_profit_loss"]
        
        # Calculate actively invested ROI percentage
        if actively_invested_balance > 0:
            actively_invested_roi_percentage = (actively_invested_profit_loss / actively_invested_balance) * 100
        else:
            actively_invested_roi_percentage = 0.0
        
        # Determine period label
        if period_days == 30:
            period_label = "30D"
        elif period_days == -1:
            period_label = "YTD"
        elif period_days is None:
            period_label = "SI"
        else:
            period_label = f"{period_days}D"
        
        return {
            "overall_roi_percentage": round(overall_roi_percentage, 2),
            "total_equity": round(total_equity, 2),
            "total_deposits": round(total_deposits, 2),
            "wallet_balance": round(user.wallet_balance or 0, 2),
            "copy_trading_balance": round(user.copy_trading_balance or 0, 2),
            "wallet_allocation_percentage": round(wallet_allocation, 2),
            "copy_trading_allocation_percentage": round(copy_trading_allocation, 2),
            "portfolio_roi": portfolio_roi,
            "copy_trading_roi": copy_trading_roi,
            "is_balanced": abs(wallet_allocation - copy_trading_allocation) <= 30,  # Within 30% difference
            "recommended_action": ROICalculator._get_rebalancing_recommendation(
                wallet_allocation, copy_trading_allocation, user.profile.investment_strategy if user.profile else None
            ),
            "period_days": period_days,
            "period_label": period_label,
            "actively_invested_roi_percentage": round(actively_invested_roi_percentage, 2),
            "actively_invested_profit_loss": round(actively_invested_profit_loss, 2)
        }
    
    @staticmethod
    def _get_rebalancing_recommendation(
        wallet_allocation: float,
        copy_trading_allocation: float,
        investment_strategy: Optional[InvestmentStrategy] = None
    ) -> str:
        """
        Get rebalancing recommendation based on allocation and strategy.
        """
        allocation_diff = abs(wallet_allocation - copy_trading_allocation)
        
        if allocation_diff <= 20:
            return "Portfolio is well balanced"
        
        if investment_strategy == InvestmentStrategy.ACTIVE_PORTFOLIO:
            if copy_trading_allocation > 70:
                return "Consider reducing copy trading allocation for more active trading"
            elif wallet_allocation > 70:
                return "Consider increasing copy trading allocation for diversification"
        
        elif investment_strategy == InvestmentStrategy.LONG_TERM_GROWTH:
            if copy_trading_allocation > 60:
                return "Consider rebalancing towards more stable long-term holdings"
            elif wallet_allocation > 60:
                return "Consider diversifying with copy trading for growth"
        
        # Default balanced strategy recommendation
        if copy_trading_allocation > wallet_allocation:
            return "Consider rebalancing by transferring funds to wallet"
        else:
            return "Consider rebalancing by allocating more to copy trading"


# Global instance for easy access
roi_calculator = ROICalculator()
