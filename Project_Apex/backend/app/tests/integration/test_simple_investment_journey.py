"""
Simplified integration test for investment strategy functionality
"""

import uuid
from datetime import date, datetime, timedelta

import pytest
from sqlmodel import select

from app.models import (
    User,
    UserProfile,
    KycStatus,
    InvestmentStrategy,
    Transaction,
    TransactionType,
    TransactionStatus,
    DailyPerformance
)
from app.services.roi_calculator import ROICalculator
from app.core.security import get_password_hash


class TestSimpleInvestmentJourney:
    """Simplified integration tests for investment strategy functionality"""
    
    def test_investment_strategy_basics(self, db, client):
        """Test basic investment strategy functionality"""
        # Create test user
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="simple_test@example.com",
            hashed_password=get_password_hash("password123"),
            wallet_balance=1000.0
        )
        db.add(user)
        
        # Test different investment strategies
        strategies = [
            InvestmentStrategy.ACTIVE_PORTFOLIO,
            InvestmentStrategy.LONG_TERM_GROWTH,
            InvestmentStrategy.BALANCED
        ]
        
        for strategy in strategies:
            profile = UserProfile(
                user_id=user_id,
                legal_first_name="Simple",
                legal_last_name="Test",
                investment_strategy=strategy
            )
            db.add(profile)
            db.commit()
            
            # Verify strategy was saved correctly
            saved_profile = db.exec(
                select(UserProfile).where(UserProfile.user_id == user_id)
            ).first()
            assert saved_profile.investment_strategy == strategy
            
            # Test ROI calculator with this strategy
            benchmarks = ROICalculator.get_strategy_based_benchmarks(strategy)
            assert benchmarks is not None
            assert "target_monthly_return" in benchmarks
            
            # Clean up for next iteration
            db.delete(profile)
            db.commit()
        
        print("✅ Basic investment strategy functionality verified")
    
    def test_roi_calculation_simple(self, db, client):
        """Test simple ROI calculation"""
        # Create test user with profile
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="roi_simple@example.com",
            hashed_password=get_password_hash("password123"),
            wallet_balance=5000.0
        )
        db.add(user)
        
        profile = UserProfile(
            user_id=user_id,
            legal_first_name="ROI",
            legal_last_name="Simple",
            investment_strategy=InvestmentStrategy.BALANCED
        )
        db.add(profile)
        
        # Add a deposit
        deposit = Transaction(
            user_id=user_id,
            amount=5000.0,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED
        )
        db.add(deposit)
        
        db.commit()
        
        # Test ROI calculation
        roi_metrics = ROICalculator.calculate_portfolio_roi(db, user_id)
        
        # Basic verification
        assert roi_metrics["total_deposits"] == 5000.0
        assert roi_metrics["current_portfolio_value"] == 5000.0
        assert roi_metrics["roi_percentage"] == 0.0  # No profit yet
        
        print("✅ Simple ROI calculation verified")
    
    def test_mathematical_plausibility_simple(self, db, client):
        """Test mathematical plausibility verification"""
        # Create test user
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="math_test@example.com",
            hashed_password=get_password_hash("password123"),
            wallet_balance=1000.0
        )
        db.add(user)
        
        profile = UserProfile(
            user_id=user_id,
            legal_first_name="Math",
            legal_last_name="Test",
            investment_strategy=InvestmentStrategy.LONG_TERM_GROWTH
        )
        db.add(profile)
        
        # Add consistent transactions
        deposit = Transaction(
            user_id=user_id,
            amount=1000.0,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED
        )
        db.add(deposit)
        
        db.commit()
        
        # Test mathematical plausibility
        is_plausible, issues = ROICalculator.verify_mathematical_plausibility(db, user_id)
        assert is_plausible, f"Mathematical plausibility check failed: {issues}"
        
        print("✅ Mathematical plausibility verification working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
