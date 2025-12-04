#!/usr/bin/env python3
"""
Test script to debug KYC validation errors
"""

import requests
import json

# Test data that should match the frontend submission
test_payload = {
    "legal_first_name": "John",
    "legal_last_name": "Doe",
    "date_of_birth": "1990-01-01",  # String date
    "phone_number": "+1234567890",
    "address_line_1": "123 Main St",
    "address_line_2": None,
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US",
    "tax_id_number": "123-45-6789",
    "occupation": "Software Engineer",
    "source_of_funds": "employment_income"
}

print("Testing KYC submission with payload:")
print(json.dumps(test_payload, indent=2))

# Try to submit to the backend
try:
    response = requests.post(
        "http://localhost:8000/api/v1/kyc/submit",
        json=test_payload,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    
    if response.status_code != 200:
        print(f"Error response: {response.text}")
        
except Exception as e:
    print(f"Request failed: {e}")
