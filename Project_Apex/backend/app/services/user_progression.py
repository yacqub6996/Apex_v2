"""
Progressive User Advancement System
Provides activity-based benefit unlocks, milestone tracking, and user level progression.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlmodel import Session, select

from app.models import (
    User,
    UserProfile,
    AccountTier,
    InvestmentStrategy,
    Transaction,
    TransactionType,
    TransactionStatus,
    DailyPerformance,
    UserMilestone,
    UserLevel,
    MilestoneType,
    LevelRequirement
)
from app.core.time import utc_now


class UserProgressionService:
    """Service for managing user progression, milestones, and level advancement"""
    
    @staticmethod
    def calculate_user_level(
        session: Session,
        user_id: uuid.UUID
    ) -> Dict[str, any]:
        """
        Calculate user level based on activity, performance, and account metrics.
        
        Args:
            session: Database session
            user_id: User ID to calculate level for
            
        Returns:
            Dictionary containing level progression metrics
        """
        user = session.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get user metrics
        total_deposits = session.exec(
            select(Transaction.amount)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_type == TransactionType.DEPOSIT)
            .where(Transaction.status == TransactionStatus.COMPLETED)
        ).all()
        
        total_deposits_amount = sum(total_deposits) if total_deposits else 0
        
        # Get trading activity
        total_trades = session.exec(
            select(DailyPerformance)
            .where(DailyPerformance.user_id == user_id)
        ).all()
        
        trading_volume = sum(abs(entry.profit_loss) for entry in total_trades)
        
        # Get account age
        account_age_days = 0
        if user.created_at:
            account_age_days = (utc_now() - user.created_at).days
        
        # Calculate level score
        level_score = (
            (total_deposits_amount * 0.4) +  # Deposit weight
            (trading_volume * 0.3) +         # Trading activity weight
            (account_age_days * 0.2) +       # Account age weight
            (user.wallet_balance * 0.1)      # Current balance weight
        )
        
        # Determine level based on score
        if level_score >= 10000:
            level = 5  # Expert
        elif level_score >= 5000:
            level = 4  # Advanced
        elif level_score >= 1000:
            level = 3  # Intermediate
        elif level_score >= 100:
            level = 2  # Beginner
        else:
            level = 1  # Novice
        
        # Calculate progress to next level
        level_thresholds = [0, 100, 1000, 5000, 10000]
        current_threshold = level_thresholds[level - 1] if level > 1 else 0
        next_threshold = level_thresholds[level] if level < len(level_thresholds) else level_thresholds[-1]
        
        progress_percentage = (
            (level_score - current_threshold) / 
            (next_threshold - current_threshold) * 100
        ) if next_threshold > current_threshold else 100
        
        return {
            "level": level,
            "level_score": round(level_score, 2),
            "progress_percentage": round(progress_percentage, 2),
            "next_level_threshold": next_threshold,
            "metrics": {
                "total_deposits": round(total_deposits_amount, 2),
                "trading_volume": round(trading_volume, 2),
                "account_age_days": account_age_days,
                "current_balance": round(user.wallet_balance or 0, 2)
            }
        }
    
    @staticmethod
    def check_milestone_achievements(
        session: Session,
        user_id: uuid.UUID
    ) -> List[Dict[str, any]]:
        """
        Check for new milestone achievements based on user activity.
        
        Args:
            session: Database session
            user_id: User ID to check milestones for
            
        Returns:
            List of newly achieved milestones
        """
        user = session.get(User, user_id)
        if not user:
            return []
        
        # Get existing milestones
        existing_milestones = session.exec(
            select(UserMilestone)
            .where(UserMilestone.user_id == user_id)
        ).all()
        
        existing_milestone_types = {m.milestone_type for m in existing_milestones}
        
        # Define milestone criteria
        milestone_criteria = [
            {
                "type": MilestoneType.FIRST_DEPOSIT,
                "condition": lambda: UserProgressionService._has_first_deposit(session, user_id),
                "title": "First Deposit",
                "description": "Made your first deposit",
                "reward": "Account activation bonus"
            },
            {
                "type": MilestoneType.TRADING_VOLUME_100,
                "condition": lambda: UserProgressionService._has_trading_volume(session, user_id, 100),
                "title": "Trading Apprentice",
                "description": "Reached $100 in trading volume",
                "reward": "Enhanced trading limits"
            },
            {
                "type": MilestoneType.TRADING_VOLUME_1000,
                "condition": lambda: UserProgressionService._has_trading_volume(session, user_id, 1000),
                "title": "Active Trader",
                "description": "Reached $1,000 in trading volume",
                "reward": "Priority support access"
            },
            {
                "type": MilestoneType.CONSISTENT_PROFITS,
                "condition": lambda: UserProgressionService._has_consistent_profits(session, user_id),
                "title": "Consistent Performer",
                "description": "Maintained profitable trading for 7 consecutive days",
                "reward": "Advanced analytics access"
            },
            {
                "type": MilestoneType.PORTFOLIO_DIVERSIFICATION,
                "condition": lambda: UserProgressionService._has_portfolio_diversification(session, user_id),
                "title": "Diversified Investor",
                "description": "Successfully diversified across multiple strategies",
                "reward": "Custom portfolio recommendations"
            }
        ]
        
        new_milestones = []
        
        for criteria in milestone_criteria:
            if (criteria["type"] not in existing_milestone_types and 
                criteria["condition"]()):
                
                # Create new milestone
                milestone = UserMilestone(
                    user_id=user_id,
                    milestone_type=criteria["type"],
                    title=criteria["title"],
                    description=criteria["description"],
                    reward=criteria["reward"],
                    achieved_at=utc_now()
                )
                session.add(milestone)
                new_milestones.append({
                    "type": criteria["type"].value,
                    "title": criteria["title"],
                    "description": criteria["description"],
                    "reward": criteria["reward"]
                })
        
        if new_milestones:
            session.commit()
        
        return new_milestones
    
    @staticmethod
    def _has_first_deposit(session: Session, user_id: uuid.UUID) -> bool:
        """Check if user has made their first deposit."""
        deposits = session.exec(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_type == TransactionType.DEPOSIT)
            .where(Transaction.status == TransactionStatus.COMPLETED)
        ).all()
        return len(deposits) > 0
    
    @staticmethod
    def _has_trading_volume(session: Session, user_id: uuid.UUID, threshold: float) -> bool:
        """Check if user has reached specified trading volume."""
        performance = session.exec(
            select(DailyPerformance)
            .where(DailyPerformance.user_id == user_id)
        ).all()
        total_volume = sum(abs(entry.profit_loss) for entry in performance)
        return total_volume >= threshold
    
    @staticmethod
    def _has_consistent_profits(session: Session, user_id: uuid.UUID) -> bool:
        """Check if user has maintained profits for 7 consecutive days."""
        recent_performance = session.exec(
            select(DailyPerformance)
            .where(DailyPerformance.user_id == user_id)
            .order_by(DailyPerformance.performance_date.desc())
            .limit(7)
        ).all()
        
        if len(recent_performance) < 7:
            return False
        
        # Check if all recent days were profitable
        return all(entry.profit_loss > 0 for entry in recent_performance)
    
    @staticmethod
    def _has_portfolio_diversification(session: Session, user_id: uuid.UUID) -> bool:
        """Check if user has diversified portfolio across strategies."""
        user = session.get(User, user_id)
        if not user or not user.profile:
            return False
        
        # Check if user has both wallet and copy trading balances
        has_wallet_balance = (user.wallet_balance or 0) > 0
        has_copy_balance = (user.copy_trading_balance or 0) > 0
        
        return has_wallet_balance and has_copy_balance
    
    @staticmethod
    def get_user_progression_summary(
        session: Session,
        user_id: uuid.UUID
    ) -> Dict[str, any]:
        """
        Get comprehensive user progression summary.
        
        Args:
            session: Database session
            user_id: User ID to get summary for
            
        Returns:
            Dictionary containing progression summary
        """
        level_data = UserProgressionService.calculate_user_level(session, user_id)
        
        # Get milestones
        milestones = session.exec(
            select(UserMilestone)
            .where(UserMilestone.user_id == user_id)
            .order_by(UserMilestone.achieved_at.desc())
        ).all()
        
        # Get recent achievements
        recent_milestones = [m for m in milestones][:5]
        
        # Calculate next level requirements
        next_level_requirements = UserProgressionService._get_next_level_requirements(
            level_data["level"],
            level_data["metrics"]
        )
        
        return {
            "level_summary": level_data,
            "total_milestones": len(milestones),
            "recent_achievements": [
                {
                    "title": m.title,
                    "description": m.description,
                    "reward": m.reward,
                    "achieved_at": m.achieved_at.isoformat()
                }
                for m in recent_milestones
            ],
            "next_level_requirements": next_level_requirements,
            "unlocked_features": UserProgressionService._get_unlocked_features(level_data["level"])
        }
    
    @staticmethod
    def _get_next_level_requirements(current_level: int, metrics: Dict[str, float]) -> List[str]:
        """Get requirements for next level advancement."""
        requirements = []
        
        if current_level == 1:  # Novice to Beginner
            if metrics["total_deposits"] < 100:
                requirements.append(f"Deposit ${100 - metrics['total_deposits']:.2f} more")
            if metrics["trading_volume"] < 50:
                requirements.append(f"Trade ${50 - metrics['trading_volume']:.2f} more in volume")
        
        elif current_level == 2:  # Beginner to Intermediate
            if metrics["total_deposits"] < 1000:
                requirements.append(f"Deposit ${1000 - metrics['total_deposits']:.2f} more")
            if metrics["trading_volume"] < 500:
                requirements.append(f"Trade ${500 - metrics['trading_volume']:.2f} more in volume")
            if metrics["account_age_days"] < 7:
                requirements.append(f"Wait {7 - metrics['account_age_days']} more days")
        
        elif current_level == 3:  # Intermediate to Advanced
            if metrics["total_deposits"] < 5000:
                requirements.append(f"Deposit ${5000 - metrics['total_deposits']:.2f} more")
            if metrics["trading_volume"] < 2500:
                requirements.append(f"Trade ${2500 - metrics['trading_volume']:.2f} more in volume")
        
        elif current_level == 4:  # Advanced to Expert
            if metrics["total_deposits"] < 10000:
                requirements.append(f"Deposit ${10000 - metrics['total_deposits']:.2f} more")
            if metrics["trading_volume"] < 7500:
                requirements.append(f"Trade ${7500 - metrics['trading_volume']:.2f} more in volume")
        
        return requirements
    
    @staticmethod
    def _get_unlocked_features(level: int) -> List[str]:
        """Get features unlocked at current level."""
        features = {
            1: ["Basic Trading", "Copy Trading Access"],
            2: ["Advanced Analytics", "Portfolio Insights"],
            3: ["Custom Strategies", "Priority Support"],
            4: ["Advanced Risk Management", "Market Insights"],
            5: ["VIP Features", "Dedicated Account Manager"]
        }
        
        unlocked = []
        for lvl in range(1, level + 1):
            if lvl in features:
                unlocked.extend(features[lvl])
        
        return unlocked


# Global instance for easy access
user_progression_service = UserProgressionService()
