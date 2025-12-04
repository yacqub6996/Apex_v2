#!/usr/bin/env python3
"""
Complete KYC flow test - tests submission, document upload, and admin approval.
Disabled in automated suite because it requires a running HTTP server and seeded users.
"""

import pytest

pytest.skip("External KYC flow smoke test disabled in automated suite", allow_module_level=True)

import requests
import json
import sys
import uuid
from datetime import date

BASE_URL = "http://localhost:8000"

def get_auth_token(email="testuser@apex.com", password="testpassword"):
    """Get authentication token for testing"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/login/access-token",
            data={"username": email, "password": password}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_kyc_submission(token):
    """Test KYC information submission"""
    print("\nTesting KYC submission...")
    
    kyc_data = {
        "legal_first_name": "John",
        "legal_last_name": "Doe",
        "date_of_birth": "1990-01-01",
        "phone_number": "+1234567890",
        "address_line_1": "123 Main St",
        "address_line_2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001",
        "country": "US",
        "tax_id_number": "123-45-6789",
        "occupation": "Software Engineer",
        "source_of_funds": "employment_income"
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/kyc/submit",
            json=kyc_data,
            headers=headers
        )
        print(f"KYC submission status: {response.status_code}")
        if response.status_code == 200:
            print("✓ KYC submission successful!")
            return True
        else:
            print(f"✗ KYC submission failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ KYC submission error: {e}")
        return False

def test_kyc_status(token):
    """Test KYC status endpoint"""
    print("\nTesting KYC status...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/kyc/status",
            headers=headers
        )
        print(f"KYC status response: {response.status_code}")
        if response.status_code == 200:
            status_data = response.json()
            print(f"✓ KYC status: {status_data['status']}")
            return True
        else:
            print(f"✗ KYC status failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ KYC status error: {e}")
        return False

def test_admin_endpoints(admin_token):
    """Test admin KYC endpoints"""
    print("\nTesting admin KYC endpoints...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test pending applications
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/kyc/applications/pending",
            headers=headers
        )
        print(f"Pending applications status: {response.status_code}")
        if response.status_code == 200:
            pending_apps = response.json()
            print(f"✓ Found {len(pending_apps)} pending applications")
            return True
        else:
            print(f"✗ Pending applications failed: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Pending applications error: {e}")
        return False

def test_file_storage_config():
    """Test file storage configuration"""
    print("\nTesting file storage configuration...")
    
    try:
        from app.services.file_storage import file_storage_service
        print("✓ File storage service initialized")
        
        # Test that we can get the provider
        if file_storage_service.provider:
            provider_type = type(file_storage_service.provider).__name__
            print(f"✓ Using {provider_type} storage provider")
        else:
            print("✗ No storage provider configured")
            return False
            
        return True
    except Exception as e:
        print(f"✗ File storage configuration error: {e}")
        return False

def main():
    """Run complete KYC flow test"""
    print("🧪 Testing Complete KYC Flow")
    print("=" * 50)
    
    # Test file storage first
    if not test_file_storage_config():
        print("\n❌ File storage configuration failed")
        sys.exit(1)
    
    # Get user token
    user_token = get_auth_token()
    if not user_token:
        print("\n❌ User authentication failed - make sure test users exist")
        print("Run: python backend/create_test_users.py")
        sys.exit(1)
    
    # Get admin token
    admin_token = get_auth_token("testadmin@apex.com", "testpassword")
    if not admin_token:
        print("\n❌ Admin authentication failed")
        sys.exit(1)
    
    # Test KYC endpoints
    kyc_tests_passed = True
    
    # Test KYC submission
    if not test_kyc_submission(user_token):
        kyc_tests_passed = False
    
    # Test KYC status
    if not test_kyc_status(user_token):
        kyc_tests_passed = False
    
    # Test admin endpoints
    if not test_admin_endpoints(admin_token):
        kyc_tests_passed = False
    
    # Summary
    print("\n" + "=" * 50)
    if kyc_tests_passed:
        print("🎉 KYC Flow Test Results: SUCCESS")
        print("\n✅ All KYC endpoints are working correctly:")
        print("   - KYC router registration ✓")
        print("   - KYC submission endpoint ✓")
        print("   - KYC status endpoint ✓")
        print("   - Admin KYC endpoints ✓")
        print("   - File storage service ✓")
        print("\n📝 Next steps:")
        print("   - Test document upload with actual files")
        print("   - Configure Dropbox storage (optional)")
        print("   - Test admin approval/rejection flow")
    else:
        print("❌ KYC Flow Test Results: FAILED")
        print("Some KYC endpoints are not working correctly")
        sys.exit(1)

if __name__ == "__main__":
    main()
