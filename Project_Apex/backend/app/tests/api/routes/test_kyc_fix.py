import requests
import json

# Test KYC submission with authentication
base_url = 'http://localhost:8000/api/v1'

# Login first
login_data = {
    'username': 'testuser@apex.com',
    'password': 'Test123!'
}

print('Testing KYC submission flow...')
print('1. Logging in...')

response = requests.post(f'{base_url}/login/access-token', data=login_data)
if response.status_code == 200:
    token_data = response.json()
    access_token = token_data['access_token']
    print(f'✓ Login successful, token: {access_token[:20]}...')
    
    # Test KYC submission
    kyc_data = {
        'legal_first_name': 'Test',
        'legal_last_name': 'User',
        'date_of_birth': '1990-01-01',
        'phone_number': '+1234567890',
        'address_line_1': '123 Test St',
        'address_line_2': '',
        'city': 'Test City',
        'state': 'TS',
        'postal_code': '12345',
        'country': 'US',
        'tax_id_number': '123-45-6789',
        'occupation': 'Software Engineer',
        'source_of_funds': 'employment_income'
    }
    
    headers = {'Authorization': f'Bearer {access_token}'}
    print('2. Submitting KYC information...')
    
    response = requests.post(f'{base_url}/kyc/submit', json=kyc_data, headers=headers)
    print(f'KYC Submission Response: {response.status_code}')
    
    if response.status_code == 200:
        result = response.json()
        print('✓ KYC submission successful!')
        print(f'   Status: {result["status"]}')
        print(f'   Submitted at: {result["submitted_at"]}')
        print(f'   Profile created: {result["profile"]["legal_first_name"]} {result["profile"]["legal_last_name"]}')
    else:
        print(f'✗ KYC submission failed: {response.status_code}')
        print(f'   Error: {response.text}')
else:
    print(f'✗ Login failed: {response.status_code}')
    print(f'   Error: {response.text}')
