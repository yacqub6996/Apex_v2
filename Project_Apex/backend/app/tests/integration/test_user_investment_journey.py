"""
Integration tests for complete user investment journeys including:
- User registration and profile setup
- Investment strategy selection
- KYC submission
- ROI calculations and validation
- Performance tracking

Disabled in automated suite because it requires external setup/fixtures.
"""

import pytest

pytest.skip("User investment journey integration test disabled in automated suite", allow_module_level=True)

import uuid
from datetime import date, datetime, timedelta
from typing import Dict, List

from sqlmodel import Session, select

from app.models import (
    User,
    UserProfile,
    UserRegister,
    KycStatus,
    InvestmentStrategy,
    Transaction,
    TransactionType,
    TransactionStatus,
    DailyPerformance,
    AccountSummary
)
from app.services.roi_calculator import ROICalculator
from app.core.security import get_password_hash


class TestUserInvestmentJourney:
    """Integration tests for complete user investment journeys"""
    
    def test_complete_user_onboarding_with_investment_strategy(
        self, 
        db,
        test_client
    ):
        """Test complete user onboarding flow with investment strategy selection"""
        # Step 1: User registration
        user_data = {
            "email": "investment_user@example.com",
            "password": "securepassword123",
            "full_name": "Investment Test User"
        }
        
        response = test_client.post("/api/v1/users/signup", json=user_data)
        assert response.status_code == 200
        user_response = response.json()
        user_id = uuid.UUID(user_response["id"])
        
        # Step 2: Verify user was created with default investment strategy
        user = db.get(User, user_id)
        assert user is not None
        assert user.email == user_data["email"]
        
        # Step 3: Submit KYC with investment strategy
        kyc_data = {
            "legal_first_name": "Investment",
            "legal_last_name": "User",
            "date_of_birth": "1990-01-01",
            "phone_number": "+1234567890",
            "address_line_1": "123 Investment St",
            "city": "Finance City",
            "state": "FC",
            "postal_code": "12345",
            "country": "United States",
            "tax_id_number": "123-45-6789",
            "occupation": "Software Engineer",
            "source_of_funds": "business_income",
            "investment_strategy": "ACTIVE_PORTFOLIO"
        }
        
        # Login first (simulate authentication)
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        login_response = test_client.post("/api/v1/login/access-token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Submit KYC with authentication
        headers = {"Authorization": f"Bearer {token}"}
        kyc_response = test_client.post(
            "/api/v1/kyc/submit", 
            json=kyc_data,
            headers=headers
        )
        assert kyc_response.status_code == 200
        
        # Step 4: Verify KYC submission and investment strategy
        kyc_result = kyc_response.json()
        assert kyc_result["status"] == "UNDER_REVIEW"
        
        # Verify profile was created with investment strategy
        profile = db.exec(
            select(UserProfile).where(UserProfile.user_id == user_id)
        ).first()
        assert profile is not None
        assert profile.investment_strategy == InvestmentStrategy.ACTIVE_PORTFOLIO
        assert profile.risk_assessment_score > 0
        
        # Step 5: Verify user can retrieve their profile
        profile_response = test_client.get("/api/v1/kyc/profile", headers=headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["investment_strategy"] == "ACTIVE_PORTFOLIO"
        
        print(f"✅ User onboarding with investment strategy completed successfully")
    
    def test_roi_calculation_with_investment_strategy(
        self,
        db,
        test_client
    ):
        """Test ROI calculation incorporating investment strategy benchmarks"""
        # Create test user with profile
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="roi_test@example.com",
            hashed_password=get_password_hash("password123"),
            wallet_balance=10000.0,
            copy_trading_balance=5000.0
        )
        db.add(user)
        
        profile = UserProfile(
            user_id=user_id,
            legal_first_name="ROI",
            legal_last_name="Test",
            investment_strategy=InvestmentStrategy.LONG_TERM_GROWTH
        )
        db.add(profile)
        
        # Add transactions and performance data
        deposit = Transaction(
            user_id=user_id,
            amount=10000.0,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED,
            executed_at=datetime.now() - timedelta(days=60)
        )
        db.add(deposit)
        
        # Add performance data
        for i in range(30):
            perf_date = date.today() - timedelta(days=29 - i)
            daily_perf = DailyPerformance(
                user_id=user_id,
                performance_date=perf_date,
                profit_loss=50.0 + (i * 2)  # Simulating growth
            )
            db.add(daily_perf)
        
        # Add account summary
        summary = AccountSummary(
            user_id=user_id,
            total_deposits=10000.0,
            total_withdrawals=0.0,
            net_profit=1500.0,
            total_trades=100,
            winning_trades=60,
            losing_trades=40,
            win_rate=60.0
        )
        db.add(summary)
        
        db.commit()
        
        # Test ROI calculation
        roi_metrics = ROICalculator.calculate_portfolio_roi(db, user_id)
        
        # Verify ROI metrics
        assert roi_metrics["total_deposits"] == 10000.0
        assert roi_metrics["current_portfolio_value"] == 15000.0  # 10000 + 5000
        assert roi_metrics["roi_percentage"] == 50.0  # (15000 - 10000) / 10000 * 100
        
        # Test mathematical plausibility verification
        is_plausible, issues = ROICalculator.verify_mathematical_plausibility(db, user_id)
        assert is_plausible, f"Mathematical plausibility check failed: {issues}"
        
        # Test performance vs benchmark
        performance_vs_benchmark = ROICalculator.calculate_performance_vs_benchmark(db, user_id)
        assert performance_vs_benchmark["strategy"] == "LONG_TERM_GROWTH"
        assert performance_vs_benchmark["target_annual_roi"] == 36.0
        
        print(f"✅ ROI calculation with investment strategy benchmarks completed successfully")
    
    def test_investment_strategy_validation(
        self,
        db,
        test_client
    ):
        """Test validation of investment strategy selection and ROI plausibility"""
        # Create test user
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email="validation_test@example.com",
            hashed_password=get_password_hash("password123"),
            wallet_balance=5000.0
        )
        db.add(user)
        
        # Test with different investment strategies
        strategies_to_test = [
            InvestmentStrategy.ACTIVE_PORTFOLIO,
            InvestmentStrategy.LONG_TERM_GROWTH,
            InvestmentStrategy.BALANCED
        ]
        
        for strategy in strategies_to_test:
            profile = UserProfile(
                user_id=user_id,
                legal_first_name="Validation",
                legal_last_name="Test",
                investment_strategy=strategy
            )
            db.add(profile)
            db.commit()
            
            # Get benchmarks for the strategy
            benchmarks = ROICalculator.get_strategy_based_benchmarks(strategy)
            
            # Verify benchmarks are appropriate for the strategy
            if strategy == InvestmentStrategy.ACTIVE_PORTFOLIO:
                assert benchmarks["target_monthly_return"] == 8.0
                assert benchmarks["risk_level"] == "HIGH"
            elif strategy == InvestmentStrategy.LONG_TERM_GROWTH:
                assert benchmarks["target_monthly_return"] == 3.0
                assert benchmarks["risk_level"] == "MEDIUM"
            elif strategy == InvestmentStrategy.BALANCED:
                assert benchmarks["target_monthly_return"] == 5.0
                assert benchmarks["risk_level"] == "MEDIUM_HIGH"
            
            # Clean up for next iteration
            db.delete(profile)
            db.commit()
        
        print(f"✅ Investment strategy validation completed successfully")
    
    def test_complete_user_journey_with_roi_validation(
        self,
        db,
        test_client
    ):
        """Test complete user journey from registration to ROI validation"""
        # Step 1: User registration
        user_data = {
            "email": "journey_test@example.com",
            "password": "securepassword123",
            "full_name": "Journey Test User"
        }
        
        response = test_client.post("/api/v1/users/signup", json=user_data)
        assert response.status_code == 200
        user_response = response.json()
        user_id = uuid.UUID(user_response["id"])
        
        # Step 2: Login
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"]
        }
        login_response = test_client.post("/api/v1/login/access-token", data=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 3: Submit KYC with BALANCED strategy
        kyc_data = {
            "legal_first_name": "Journey",
            "legal_last_name": "Test",
            "date_of_birth": "1985-05-15",
            "phone_number": "+1987654321",
            "address_line_1": "456 Journey Ave",
            "city": "Test City",
            "state": "TC",
            "postal_code": "54321",
            "country": "United States",
            "tax_id_number": "987-65-4321",
            "occupation": "Data Analyst",
            "source_of_funds": "investments",
            "investment_strategy": "BALANCED"
        }
        
        kyc_response = test_client.post(
            "/api/v1/kyc/submit", 
            json=kyc_data,
            headers=headers
        )
        assert kyc_response.status_code == 200
        
        # Step 4: Simulate admin approval
        user = db.get(User, user_id)
        user.kyc_status = KycStatus.APPROVED
        user.kyc_approved_at = datetime.now()
        db.add(user)
        db.commit()
        
        # Step 5: Add some trading activity
        # Simulate deposit
        deposit = Transaction(
            user_id=user_id,
            amount=10000.0,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED
        )
        db.add(deposit)
        
        # Simulate some performance
        for i in range(7):  # One week of performance
            perf_date = date.today() - timedelta(days=6 - i)
            daily_perf = DailyPerformance(
                user_id=user_id,
                performance_date=perf_date,
                profit_loss=25.0 * (i + 1)  # Increasing profits
            )
            db.add(daily_perf)
        
        db.commit()
        
        # Step 6: Test ROI calculation and validation
        roi_metrics = ROICalculator.calculate_portfolio_roi(db, user_id)
        assert roi_metrics["total_deposits"] == 10000.0
        
        # Step 7: Verify mathematical plausibility
        is_plausible, issues = ROICalculator.verify_mathematical_plausibility(db, user_id)
        assert is_plausible, f"Mathematical plausibility issues: {issues}"
        
        # Step 8: Check performance vs benchmark
        performance_data = ROICalculator.calculate_performance_vs_benchmark(db, user_id)
        assert performance_data["strategy"] == "BALANCED"
        assert performance_data["target_annual_roi"] == 60.0
        
        print(f"✅ Complete user journey with ROI validation completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
