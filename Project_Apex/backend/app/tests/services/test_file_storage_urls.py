"""
Tests for file storage URL generation fixes.

This test module verifies that:
1. Storage service returns URLs with leading slashes
2. URLs are properly formatted for web access
3. Both new and legacy URL formats are handled correctly
"""

import pytest
from pathlib import Path
from app.services.file_storage import LocalFileStorage


class TestFileStorageURLGeneration:
    """Test suite for file storage URL generation."""

    @pytest.fixture
    def storage(self, tmp_path):
        """Create a temporary local file storage instance."""
        return LocalFileStorage(base_path=str(tmp_path))

    @pytest.mark.asyncio
    async def test_upload_returns_url_with_leading_slash(self, storage):
        """Test that upload returns URL path with leading slash."""
        path = await storage.upload_image(
            b"fake content",
            "test.jpg",
            "user-123",
            category="kyc_documents",
            label="test"
        )
        
        # URL should start with /
        assert path.startswith('/'), f"URL should start with /, got: {path}"
        
        # URL should include category and user_id
        assert path.startswith('/kyc_documents/user-123/'), \
            f"URL should include category and user_id, got: {path}"
        
        # URL should end with file extension
        assert path.endswith('.webp') or path.endswith('.jpg'), \
            f"URL should end with image extension, got: {path}"

    @pytest.mark.asyncio
    async def test_upload_different_categories(self, storage):
        """Test that different categories produce correct URLs."""
        categories = ["kyc_documents", "profile_pictures", "trader_avatars"]
        
        for category in categories:
            path = await storage.upload_image(
                b"fake content",
                "test.jpg",
                "user-456",
                category=category,
                label="test"
            )
            
            assert path.startswith(f'/{category}/user-456/'), \
                f"URL should start with /{category}/user-456/, got: {path}"

    def test_get_file_url_with_leading_slash(self, storage):
        """Test that get_file_url handles paths with leading slash."""
        url = storage.get_file_url("/storage/kyc_documents/user-123/file.jpg")
        assert url == "/storage/kyc_documents/user-123/file.jpg", \
            "URL with leading slash should be returned as-is"

    def test_get_file_url_without_leading_slash(self, storage):
        """Test that get_file_url adds leading slash when missing."""
        url = storage.get_file_url("storage/kyc_documents/user-123/file.jpg")
        assert url == "/storage/kyc_documents/user-123/file.jpg", \
            "URL without leading slash should get one added"

    def test_get_file_url_backwards_compatibility(self, storage):
        """Test that get_file_url handles legacy format."""
        # Legacy format (no leading slash)
        legacy_url = storage.get_file_url("storage/kyc_documents/user-789/old.jpg")
        assert legacy_url.startswith('/'), "Legacy URL should be normalized"
        
        # New format (with leading slash)
        new_url = storage.get_file_url("/storage/kyc_documents/user-789/new.jpg")
        assert new_url == "/storage/kyc_documents/user-789/new.jpg"

    @pytest.mark.asyncio
    async def test_pdf_upload_returns_correct_url(self, storage):
        """Test that PDF uploads get proper URLs."""
        path = await storage.upload_file(
            b"%PDF-1.4 fake pdf content",
            "document.pdf",
            "user-999",
            "passport_front"
        )
        
        assert path.startswith('/kyc_documents/user-999/'), \
            f"PDF URL should be in kyc_documents, got: {path}"
        assert path.endswith('.pdf'), f"PDF should keep extension, got: {path}"

    @pytest.mark.asyncio
    async def test_webp_conversion_returns_correct_url(self, storage):
        """Test that image conversion to WebP updates URL correctly."""
        # Upload a JPEG that will be converted to WebP
        path = await storage.upload_image(
            b"fake jpeg content",
            "photo.jpg",
            "user-111",
            category="kyc_documents",
            label="id_front"
        )
        
        assert path.startswith('/kyc_documents/user-111/'), \
            f"Converted image URL should be in correct category, got: {path}"
        
        # After conversion, extension should be .webp (if Pillow is available)
        # Or .jpg/.png if conversion fails
        assert any(path.endswith(ext) for ext in ['.webp', '.jpg', '.png']), \
            f"Converted image should have valid extension, got: {path}"


class TestFileStoragePathResolution:
    """Test suite for file path resolution in bulk download."""

    def test_normalize_storage_path(self):
        """Test various path formats are normalized correctly."""
        test_cases = [
            # (input, expected_filesystem_path)
            ("/storage/kyc_documents/user/file.jpg", "storage/kyc_documents/user/file.jpg"),
            ("storage/kyc_documents/user/file.jpg", "storage/kyc_documents/user/file.jpg"),
            ("/static/storage/kyc_documents/user/file.jpg", "storage/kyc_documents/user/file.jpg"),
            ("static/storage/kyc_documents/user/file.jpg", "storage/kyc_documents/user/file.jpg"),
        ]
        
        for input_path, expected in test_cases:
            # Normalize the path as done in bulk_download_documents
            path_str = input_path
            
            # Remove leading slash if present
            if path_str.startswith('/'):
                path_str = path_str.lstrip('/')
            
            # Remove /static/ prefix if present
            if path_str.startswith("static/"):
                path_str = path_str[len("static/"):]
            
            assert path_str == expected, \
                f"Failed to normalize {input_path}: got {path_str}, expected {expected}"


class TestURLFormatMigration:
    """Test migration logic for existing data."""

    def test_migration_sql_logic(self):
        """Test the SQL logic used in migration."""
        # Simulate the migration WHERE clause logic
        test_cases = [
            # (url, should_be_updated)
            ("storage/kyc_documents/file.jpg", True),  # Needs update
            ("/storage/kyc_documents/file.jpg", False),  # Already correct
            ("http://example.com/file.jpg", False),  # External URL
            (None, False),  # Null value
            ("", False),  # Empty string
            ("storage/profile_pictures/avatar.png", True),  # Profile picture needs update
            ("/static/storage/file.jpg", False),  # Old static format - should not match
        ]
        
        for url, should_update in test_cases:
            # Simulate WHERE clause: url NOT LIKE '/%' AND url LIKE 'storage/%'
            needs_update = (
                url is not None 
                and url != "" 
                and not url.startswith('/')
                and url.startswith('storage/')
            )
            
            assert needs_update == should_update, \
                f"Migration logic failed for '{url}': " \
                f"expected {should_update}, got {needs_update}"


@pytest.mark.integration
class TestEndToEndFileUpload:
    """Integration tests for complete file upload flow."""

    @pytest.mark.asyncio
    async def test_upload_and_retrieve_flow(self, storage_fixture, tmp_path):
        """Test complete flow: upload file, get URL, verify it's web-accessible."""
        storage = LocalFileStorage(base_path=str(tmp_path))
        
        # Upload file
        test_content = b"This is a test image"
        url_path = await storage.upload_image(
            test_content,
            "test.jpg",
            "user-test",
            category="kyc_documents",
            label="passport_front"
        )
        
        # Verify URL format
        assert url_path.startswith('/kyc_documents/user-test/')
        
        # Get file URL (should be same as upload return)
        file_url = storage.get_file_url(url_path)
        assert file_url == url_path
        
        # Verify file exists on disk at expected location
        # Remove leading / to get filesystem path
        fs_path = Path(tmp_path) / url_path.lstrip('/')
        assert fs_path.exists(), f"File should exist at {fs_path}"
        
        # Verify content matches
        saved_content = fs_path.read_bytes()
        # Content might be different due to image optimization
        assert len(saved_content) > 0, "Saved file should not be empty"


@pytest.fixture
def storage_fixture():
    """Fixture placeholder for integration tests."""
    pass
