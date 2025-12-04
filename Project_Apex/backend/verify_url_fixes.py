#!/usr/bin/env python3
"""
Quick verification script for file storage URL generation fixes.
This script tests the URL generation logic without requiring full pytest setup.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.file_storage import LocalFileStorage
import tempfile
import asyncio


async def test_url_generation():
    """Test URL generation with the fixes."""
    print("=" * 60)
    print("Testing File Storage URL Generation Fixes")
    print("=" * 60)
    
    # Create temporary storage
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalFileStorage(base_path=tmpdir)
        
        print("\n1. Testing upload URL generation:")
        print("-" * 60)
        
        # Test upload
        url = await storage.upload_image(
            b"fake image content",
            "test.jpg",
            "user-123",
            category="kyc_documents",
            label="passport_front"
        )
        
        print(f"   Returned URL: {url}")
        
        # Verify URL starts with /
        assert url.startswith('/'), f"❌ FAILED: URL should start with /, got: {url}"
        print(f"   ✅ PASS: URL starts with /")
        
        # Verify category in URL
        assert 'kyc_documents' in url, f"❌ FAILED: URL should contain category"
        print(f"   ✅ PASS: URL contains category")
        
        # Verify user ID in URL
        assert 'user-123' in url, f"❌ FAILED: URL should contain user_id"
        print(f"   ✅ PASS: URL contains user_id")
        
        print("\n2. Testing get_file_url() with various formats:")
        print("-" * 60)
        
        test_cases = [
            ("/storage/kyc_documents/file.jpg", "/storage/kyc_documents/file.jpg"),
            ("storage/kyc_documents/file.jpg", "/storage/kyc_documents/file.jpg"),
            ("/profile_pictures/user/avatar.png", "/profile_pictures/user/avatar.png"),
            ("profile_pictures/user/avatar.png", "/profile_pictures/user/avatar.png"),
        ]
        
        for input_path, expected in test_cases:
            result = storage.get_file_url(input_path)
            status = "✅ PASS" if result == expected else "❌ FAIL"
            print(f"   {status}: '{input_path}' -> '{result}' (expected: '{expected}')")
            assert result == expected, f"URL mismatch for {input_path}"
        
        print("\n3. Testing file actually exists on disk:")
        print("-" * 60)
        
        # Check if file was created
        # URL is /storage/category/user/file, but physical path is base_path/category/user/file
        # So we need to remove the /storage/ prefix and prepend base_path
        url_without_storage = url.replace('/storage/', '')
        fs_path = Path(tmpdir) / url_without_storage
        exists = fs_path.exists()
        print(f"   URL: {url}")
        print(f"   File path: {fs_path}")
        print(f"   {'✅ PASS: File exists' if exists else '❌ FAIL: File not found'}")
        assert exists, "File should exist on disk"
        
        print("\n4. Testing PDF upload:")
        print("-" * 60)
        
        pdf_url = await storage.upload_file(
            b"%PDF-1.4 fake pdf",
            "document.pdf",
            "user-456",
            "proof_of_address"
        )
        
        print(f"   PDF URL: {pdf_url}")
        assert pdf_url.startswith('/'), "❌ FAILED: PDF URL should start with /"
        print(f"   ✅ PASS: PDF URL starts with /")
        assert pdf_url.endswith('.pdf'), "❌ FAILED: PDF should keep extension"
        print(f"   ✅ PASS: PDF keeps .pdf extension")
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nSummary of changes:")
        print("  • URLs now start with / (e.g., /storage/kyc_documents/...)")
        print("  • Compatible with FastAPI /storage mount point")
        print("  • Backwards compatible with legacy format (storage/...)")
        print("  • Files are stored in correct filesystem locations")
        print("\nNext steps:")
        print("  1. Run database migration to fix existing records")
        print("  2. Test with actual backend server")
        print("  3. Verify images display in admin panel")
        print("  4. Test file downloads")


if __name__ == "__main__":
    try:
        asyncio.run(test_url_generation())
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
