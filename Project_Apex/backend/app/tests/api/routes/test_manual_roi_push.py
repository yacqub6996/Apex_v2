#!/usr/bin/env python3
"""Manually test ROI push with the trader ID"""

import requests
import json

def test_roi_push():
    print("🚀 Manual ROI Push Test")
    print("==================================================")
    
    # Use the Test Trader Pro ID from our findings
    trader_id = "978f314a-7f42-44b7-8ea2-a21e012862af"
    
    # API endpoint
    url = "http://localhost:8000/api/v1/admin/executions/push"
    
    # Prepare ROI push request
    payload = {
        "trader_id": trader_id,
        "roi_percent": 10.0,
        "symbol": "BTC/USD",
        "note": "Manual ROI push test"
    }
    
    print(f"📤 Executing ROI push: {payload['roi_percent']}% on {payload['symbol']}")
    print(f"   Trader ID: {trader_id}")
    
    try:
        # Execute ROI push
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ ROI push successful!")
            print(f"   Affected users: {result['affected_users']}")
            print(f"   Total ROI amount: ${result['total_roi_amount']}")
            print(f"   Execution event ID: {result['execution_event_id']}")
            
            # Check transactions after push
            print("\n📊 Checking transactions after ROI push...")
            check_transactions()
            
        else:
            print(f"❌ ROI push failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error during ROI push test: {e}")
        import traceback
        traceback.print_exc()

def check_transactions():
    """Check recent transactions"""
    from app.core.db import engine
    from sqlmodel import text
    
    with engine.connect() as conn:
        # Check transaction counts by type
        result = conn.execute(text("SELECT transaction_type, COUNT(*) FROM transaction GROUP BY transaction_type"))
        type_counts = result.fetchall()
        print('Transaction counts by type:')
        for tx_type, count in type_counts:
            print(f'  - {tx_type}: {count}')
        
        # Check recent DEPOSIT transactions
        result = conn.execute(text("SELECT id, user_id, amount, description, created_at FROM transaction WHERE transaction_type = 'DEPOSIT' ORDER BY created_at DESC LIMIT 5"))
        deposits = result.fetchall()
        print('\nRecent DEPOSIT transactions:')
        for tx in deposits:
            print(f'  - {tx[0]}: {tx[1]} - {tx[2]} - {tx[3]} - {tx[4]}')
        
        # Check execution events
        result = conn.execute(text("SELECT COUNT(*) FROM executionevent WHERE event_type IN ('FOLLOWER_PROFIT', 'TRADER_SIMULATION')"))
        events_count = result.fetchone()[0]
        print(f'\nExecution events created: {events_count}')

if __name__ == "__main__":
    test_roi_push()
