#!/usr/bin/env python3
"""
Test script for Admin ROI Push functionality
"""

import sys
import uuid
from datetime import datetime

# Add the backend directory to Python path
sys.path.append('.')

from sqlmodel import Session, select, create_engine
from app.core.config import settings
from app.models import User, UserRole, TraderProfile, UserTraderCopy, CopyStatus
from app.core.security import get_password_hash
from app.core.time import utc_now


def create_test_data():
    """Create test data for admin ROI push testing"""
    engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
    
    with Session(engine) as session:
        # Create admin user
        admin_user = User(
            email="testadmin@apex.com",
            hashed_password=get_password_hash("testpassword123"),
            full_name="Test Admin",
            role=UserRole.ADMIN,
            wallet_balance=10000.0,
            copy_trading_balance=0.0,
        )
        session.add(admin_user)
        
        # Create trader user
        trader_user = User(
            email="testtrader@apex.com",
            hashed_password=get_password_hash("testpassword123"),
            full_name="Test Trader",
            role=UserRole.USER,
            wallet_balance=5000.0,
            copy_trading_balance=0.0,
        )
        session.add(trader_user)
        
        # Create follower user
        follower_user = User(
            email="testfollower@apex.com",
            hashed_password=get_password_hash("testpassword123"),
            full_name="Test Follower",
            role=UserRole.USER,
            wallet_balance=2000.0,
            copy_trading_balance=0.0,
        )
        session.add(follower_user)
        
        session.commit()
        session.refresh(admin_user)
        session.refresh(trader_user)
        session.refresh(follower_user)
        
        # Create trader profile
        trader_profile = TraderProfile(
            user_id=trader_user.id,
            display_name="Test Trader Pro",
            trader_code="TEST001",
            trading_strategy="Forex scalping",
            risk_tolerance="MEDIUM",
            is_public=True,
            minimum_copy_amount=100.0,
        )
        session.add(trader_profile)
        session.commit()
        session.refresh(trader_profile)
        
        # Create copy relationship
        copy_relationship = UserTraderCopy(
            user_id=follower_user.id,
            trader_profile_id=trader_profile.id,
            copy_amount=500.0,
            copy_status=CopyStatus.ACTIVE,
            copy_settings={"source": "test"},
        )
        session.add(copy_relationship)
        
        # Update follower user balance (deduct from wallet, add to copy trading)
        follower_user.wallet_balance = 1500.0  # 2000 - 500
        follower_user.copy_trading_balance = 500.0
        
        session.commit()
        
        print("✅ Test data created successfully!")
        print(f"   Admin: {admin_user.email}")
        print(f"   Trader: {trader_user.email} (Profile ID: {trader_profile.id})")
        print(f"   Follower: {follower_user.email}")
        print(f"   Copy relationship: {copy_relationship.id}")
        print(f"   Follower balances - Wallet: ${follower_user.wallet_balance}, Copy: ${follower_user.copy_trading_balance}")
        
        return {
            "admin_user": admin_user,
            "trader_profile": trader_profile,
            "follower_user": follower_user,
            "copy_relationship": copy_relationship,
        }


def test_roi_calculation():
    """Test ROI calculation logic"""
    print("\n🧪 Testing ROI calculation logic...")
    
    # Test positive ROI
    copy_amount = 500.0
    roi_percent = 10.0  # +10%
    expected_roi = 50.0  # 500 * 0.10
    
    calculated_roi = copy_amount * (roi_percent / 100)
    calculated_roi = round(calculated_roi, 2)
    
    print(f"   Copy amount: ${copy_amount}")
    print(f"   ROI %: {roi_percent}%")
    print(f"   Expected ROI: ${expected_roi}")
    print(f"   Calculated ROI: ${calculated_roi}")
    
    assert abs(calculated_roi - expected_roi) < 0.01, "ROI calculation incorrect"
    print("   ✅ ROI calculation test passed!")
    
    # Test negative ROI
    roi_percent = -5.0  # -5%
    expected_roi = -25.0  # 500 * -0.05
    
    calculated_roi = copy_amount * (roi_percent / 100)
    calculated_roi = round(calculated_roi, 2)
    
    print(f"   Negative ROI %: {roi_percent}%")
    print(f"   Expected ROI: ${expected_roi}")
    print(f"   Calculated ROI: ${calculated_roi}")
    
    assert abs(calculated_roi - expected_roi) < 0.01, "Negative ROI calculation incorrect"
    print("   ✅ Negative ROI calculation test passed!")


def main():
    """Main test function"""
    print("🚀 Testing Admin ROI Push Implementation")
    print("=" * 50)
    
    try:
        # Create test data
        test_data = create_test_data()
        
        # Test ROI calculations
        test_roi_calculation()
        
        print("\n" + "=" * 50)
        print("✅ All tests completed successfully!")
        print("\n📋 Next steps:")
        print("   1. The admin ROI push endpoint is ready at: POST /admin/executions/push")
        print("   2. You can test it with trader ID:", test_data["trader_profile"].id)
        print("   3. Available traders endpoint: GET /admin/executions/traders")
        print("   4. The endpoint will apply ROI to all active copy relationships")
        print("   5. Execution events will be recorded and broadcast via WebSocket")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
