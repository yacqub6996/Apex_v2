#!/usr/bin/env python3
"""
Test script to debug the trader API endpoint
"""

import requests
import json

# Test the trader creation endpoint directly
BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "your_admin_token_here"  # You'll need to get this from a successful login

def test_trader_creation():
    """Test the trader creation endpoint with sample data"""
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Sample trader data that should work
    trader_data = {
        "user_id": "12345678-1234-1234-1234-123456789012",  # This needs to be a valid UUID
        "display_name": "Test Trader",
        "specialty": "forex",
        "risk_level": "MEDIUM",
        "is_public": False,
        "copy_fee_percentage": 0.0,
        "minimum_copy_amount": 100.0
    }
    
    print("Testing trader creation endpoint...")
    print(f"Request data: {json.dumps(trader_data, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/traders/",
            headers=headers,
            json=trader_data
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Trader creation successful!")
        else:
            print("❌ Trader creation failed!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Note: You need to update the TOKEN variable with a valid admin JWT token")
    print("You can get this by logging in as an admin user first")
    test_trader_creation()
