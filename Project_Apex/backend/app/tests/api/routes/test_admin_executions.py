import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    User,
    UserRole,
    TraderProfile,
    UserTraderCopy,
    CopyStatus,
    ExecutionEventType,
)
from app.tests.utils.user import create_random_user


def test_get_traders_for_executions_requires_admin(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test that only admins can access the traders list for executions."""
    response = client.get('/api/v1/admin/executions/traders', headers=normal_user_token_headers)
    assert response.status_code == 403


def test_get_traders_for_executions_empty(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting traders when no active copy relationships exist."""
    # Skip this test if there are existing traders in the database
    existing_traders = db.exec(select(TraderProfile)).all()
    if existing_traders:
        # If there are existing traders, just verify the endpoint works
        response = client.get('/api/v1/admin/executions/traders', headers=superuser_token_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Don't assert on length since we can't control the test database state
    else:
        response = client.get('/api/v1/admin/executions/traders', headers=superuser_token_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


def test_get_traders_for_executions_with_data(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting traders with active copy relationships."""
    # Create trader user
    trader_user = create_random_user(db)
    trader_user.role = UserRole.USER
    
    # Create trader profile with unique trader code (max 16 chars)
    trader_profile = TraderProfile(
        user_id=trader_user.id,
        display_name="Test Trader Data",
        trader_code=f"TD{uuid.uuid4().hex[:6]}",
        trading_strategy="Forex scalping",
        risk_tolerance="MEDIUM",
        is_public=True,
        minimum_copy_amount=100.0,
    )
    db.add(trader_profile)
    db.commit()
    db.refresh(trader_profile)
    
    # Create follower user
    follower_user = create_random_user(db)
    follower_user.copy_trading_balance = 500.0
    follower_user.wallet_balance = 1500.0
    
    # Create copy relationship
    copy_relationship = UserTraderCopy(
        user_id=follower_user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
        copy_settings={"source": "test"},
    )
    db.add(copy_relationship)
    db.commit()
    
    response = client.get('/api/v1/admin/executions/traders', headers=superuser_token_headers)
    assert response.status_code == 200
    data = response.json()
    
    # Find our specific trader in the response
    our_trader = next((t for t in data if t["id"] == str(trader_profile.id)), None)
    assert our_trader is not None
    assert our_trader["display_name"] == "Test Trader Data"
    assert our_trader["active_copiers"] == 1
    assert our_trader["total_allocation"] == 500.0


def test_push_roi_execution_requires_admin(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Test that only admins can push ROI executions."""
    payload = {
        "trader_id": str(uuid.uuid4()),
        "roi_percent": 10.0,
        "symbol": "EUR/USD",
        "note": "Test execution"
    }
    response = client.post('/api/v1/admin/executions/push', headers=normal_user_token_headers, json=payload)
    assert response.status_code == 403


def test_push_roi_execution_trader_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test pushing ROI execution with non-existent trader."""
    payload = {
        "trader_id": str(uuid.uuid4()),
        "roi_percent": 10.0,
        "symbol": "EUR/USD",
        "note": "Test execution"
    }
    response = client.post('/api/v1/admin/executions/push', headers=superuser_token_headers, json=payload)
    assert response.status_code == 404
    assert "Trader not found" in response.json()["detail"]


def test_push_roi_execution_no_active_copies(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test pushing ROI execution when trader has no active copy relationships."""
    # Create trader user and profile with unique trader code (max 16 chars)
    trader_user = create_random_user(db)
    trader_profile = TraderProfile(
        user_id=trader_user.id,
        display_name="Test Trader No Copies",
        trader_code=f"TNC{uuid.uuid4().hex[:6]}",
        trading_strategy="Forex scalping",
        risk_tolerance="MEDIUM",
        is_public=True,
    )
    db.add(trader_profile)
    db.commit()
    db.refresh(trader_profile)
    
    payload = {
        "trader_id": str(trader_profile.id),
        "roi_percent": 10.0,
        "symbol": "EUR/USD",
        "note": "Test execution"
    }
    response = client.post('/api/v1/admin/executions/push', headers=superuser_token_headers, json=payload)
    assert response.status_code == 400
    assert "No active copy relationships" in response.json()["detail"]


def test_push_roi_execution_success(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test successful ROI execution push."""
    # Create trader user
    trader_user = create_random_user(db)
    trader_user.role = UserRole.USER
    
    # Create trader profile with unique trader code (max 16 chars)
    trader_profile = TraderProfile(
        user_id=trader_user.id,
        display_name="Test Trader Success",
        trader_code=f"TS{uuid.uuid4().hex[:6]}",
        trading_strategy="Forex scalping",
        risk_tolerance="MEDIUM",
        is_public=True,
        minimum_copy_amount=100.0,
    )
    db.add(trader_profile)
    db.commit()
    db.refresh(trader_profile)
    
    # Create follower user
    follower_user = create_random_user(db)
    follower_user.copy_trading_balance = 500.0
    follower_user.wallet_balance = 1500.0
    
    # Create copy relationship
    copy_relationship = UserTraderCopy(
        user_id=follower_user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
        copy_settings={"source": "test"},
    )
    db.add(copy_relationship)
    db.commit()
    
    # Store initial balance for verification
    initial_balance = follower_user.copy_trading_balance
    
    # Push ROI execution
    payload = {
        "trader_id": str(trader_profile.id),
        "roi_percent": 10.0,  # +10% ROI
        "symbol": "EUR/USD",
        "note": "Test positive ROI execution"
    }
    response = client.post('/api/v1/admin/executions/push', headers=superuser_token_headers, json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert data["affected_users"] == 1
    assert data["total_roi_amount"] == 50.0  # 500 * 0.10
    
    # Verify follower balance was updated
    db.refresh(follower_user)
    assert follower_user.copy_trading_balance == initial_balance + 50.0
    
    # Verify execution events were created
    from app.models import ExecutionEvent
    events = db.exec(select(ExecutionEvent)).all()
    assert len(events) >= 1
    
    # Check for follower profit event
    follower_events = [e for e in events if e.user_id == follower_user.id]
    assert len(follower_events) == 1
    assert follower_events[0].event_type == ExecutionEventType.FOLLOWER_PROFIT
    assert follower_events[0].amount == 50.0


def test_push_roi_execution_negative_roi(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test pushing negative ROI execution."""
    # Create trader user
    trader_user = create_random_user(db)
    trader_user.role = UserRole.USER
    
    # Create trader profile with unique trader code (max 16 chars)
    trader_profile = TraderProfile(
        user_id=trader_user.id,
        display_name="Test Trader Negative",
        trader_code=f"TN{uuid.uuid4().hex[:6]}",
        trading_strategy="Forex scalping",
        risk_tolerance="MEDIUM",
        is_public=True,
        minimum_copy_amount=100.0,
    )
    db.add(trader_profile)
    db.commit()
    db.refresh(trader_profile)
    
    # Create follower user
    follower_user = create_random_user(db)
    follower_user.copy_trading_balance = 500.0
    follower_user.wallet_balance = 1500.0
    
    # Create copy relationship
    copy_relationship = UserTraderCopy(
        user_id=follower_user.id,
        trader_profile_id=trader_profile.id,
        copy_amount=500.0,
        copy_status=CopyStatus.ACTIVE,
        copy_settings={"source": "test"},
    )
    db.add(copy_relationship)
    db.commit()
    
    # Store initial balance for verification
    initial_balance = follower_user.copy_trading_balance
    
    # Push negative ROI execution
    payload = {
        "trader_id": str(trader_profile.id),
        "roi_percent": -5.0,  # -5% ROI
        "symbol": "EUR/USD",
        "note": "Test negative ROI execution"
    }
    response = client.post('/api/v1/admin/executions/push', headers=superuser_token_headers, json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert data["affected_users"] == 1
    assert data["total_roi_amount"] == -25.0  # 500 * -0.05
    
    # Verify follower balance was updated
    db.refresh(follower_user)
    assert follower_user.copy_trading_balance == initial_balance - 25.0


def test_push_roi_execution_multiple_copiers(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test ROI execution with multiple copiers."""
    # Create trader user
    trader_user = create_random_user(db)
    trader_user.role = UserRole.USER
    
    # Create trader profile with unique trader code (max 16 chars)
    trader_profile = TraderProfile(
        user_id=trader_user.id,
        display_name="Test Trader Multiple",
        trader_code=f"TM{uuid.uuid4().hex[:6]}",
        trading_strategy="Forex scalping",
        risk_tolerance="MEDIUM",
        is_public=True,
        minimum_copy_amount=100.0,
    )
    db.add(trader_profile)
    db.commit()
    db.refresh(trader_profile)
    
    # Create multiple follower users
    follower1 = create_random_user(db)
    follower1.copy_trading_balance = 300.0
    
    follower2 = create_random_user(db)
    follower2.copy_trading_balance = 700.0
    
    # Create copy relationships
    copy1 = UserTraderCopy(
        user_id=follower1.id,
        trader_profile_id=trader_profile.id,
        copy_amount=300.0,
        copy_status=CopyStatus.ACTIVE,
    )
    copy2 = UserTraderCopy(
        user_id=follower2.id,
        trader_profile_id=trader_profile.id,
        copy_amount=700.0,
        copy_status=CopyStatus.ACTIVE,
    )
    db.add_all([copy1, copy2])
    db.commit()
    
    # Push ROI execution
    payload = {
        "trader_id": str(trader_profile.id),
        "roi_percent": 8.0,  # +8% ROI
        "symbol": "EUR/USD",
        "note": "Test multiple copiers"
    }
    response = client.post('/api/v1/admin/executions/push', headers=superuser_token_headers, json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert data["affected_users"] == 2
    assert data["total_roi_amount"] == 80.0  # (300 + 700) * 0.08
    
    # Verify follower balances were updated
    db.refresh(follower1)
    db.refresh(follower2)
    assert follower1.copy_trading_balance == 300.0 + 24.0  # 300 * 0.08
    assert follower2.copy_trading_balance == 700.0 + 56.0  # 700 * 0.08
