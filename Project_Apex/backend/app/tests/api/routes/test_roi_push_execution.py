#!/usr/bin/env python3
"""Test the actual ROI push execution"""

import requests
import json

def test_roi_push():
    print("🚀 Testing Actual ROI Push Execution via API")
    print("==================================================")
    
    # API endpoint
    url = "http://localhost:8000/api/v1/admin/executions/push"
    
    # Get trader ID first
    traders_url = "http://localhost:8000/api/v1/admin/executions/traders"
    
    try:
        # Get available traders
        response = requests.get(traders_url)
        if response.status_code == 200:
            traders = response.json()
            if traders:
                trader = traders[0]  # Use first available trader
                trader_id = trader['id']
                print(f"✅ Found trader: {trader['display_name']} (ID: {trader_id})")
                
                # Prepare ROI push request
                payload = {
                    "trader_id": trader_id,
                    "roi_percent": 10.0,
                    "symbol": "BTC/USD",
                    "note": "Test ROI push execution"
                }
                
                print(f"📤 Executing ROI push: {payload['roi_percent']}% on {payload['symbol']}")
                
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
            else:
                print("❌ No traders with active copy relationships found")
        else:
            print(f"❌ Failed to get traders: {response.status_code} - {response.text}")
            
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

if __name__ == "__main__":
    test_roi_push()
