#!/usr/bin/env python3
"""
Test script to debug KYC schema validation
"""

from app.api.routes.kyc import KycSubmission

# Test different payloads to see what validation errors we get
test_payloads = [
    # Test 1: Complete valid payload
    {
        "legal_first_name": "John",
        "legal_last_name": "Doe",
        "date_of_birth": "1990-01-01",
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
    },
    # Test 2: Missing required field
    {
        "legal_first_name": "John",
        "legal_last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "phone_number": "+1234567890",
        "address_line_1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001",
        "country": "US",
        "tax_id_number": "123-45-6789",
        "occupation": "Software Engineer",
        "source_of_funds": "employment_income"
    }
]

print("Testing KYC schema validation...")

for i, payload in enumerate(test_payloads, 1):
    print(f"\n--- Test {i} ---")
    print(f"Payload: {payload}")
    
    try:
        kyc_submission = KycSubmission(**payload)
        print("✅ Validation successful")
        print(f"Validated data: {kyc_submission.model_dump()}")
    except Exception as e:
        print(f"❌ Validation failed: {e}")
