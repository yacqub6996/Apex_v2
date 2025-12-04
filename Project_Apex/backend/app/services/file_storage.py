"""
File Storage Service for KYC Document Uploads
Supports local storage and external services like Dropbox
"""

import os
import uuid
from pathlib import Path
from typing import Optional
import logging
from abc import ABC, abstractmethod


logger = logging.getLogger(__name__)


class FileStorageProvider(ABC):
    """Abstract base class for file storage providers"""
    
    @abstractmethod
    async def upload_file(self, file_content: bytes, filename: str, user_id: str, document_type: str) -> str:
        """Upload file and return URL/path"""
        pass
    
    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """Get accessible URL for the file"""
        pass


class LocalFileStorage(FileStorageProvider):
    """Local file system storage provider supporting categories (e.g., kyc_documents, profile_pictures)."""

    def __init__(self, base_path: str = "storage"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _optimize_image(self, content: bytes, extension: str, max_size: int = 1024) -> tuple[bytes, str]:
        """Resize and convert image to a web-friendly format. Returns (bytes, extension)."""
        try:
            from PIL import Image  # type: ignore
            import io

            with Image.open(io.BytesIO(content)) as img:
                img_format = "JPEG" if extension in {".jpg", ".jpeg"} else "PNG"
                # Resize maintaining aspect ratio
                img.thumbnail((max_size, max_size))
                output = io.BytesIO()
                # Prefer WebP if available
                try:
                    img.save(output, format="WEBP", quality=85)
                    return output.getvalue(), ".webp"
                except Exception:
                    output = io.BytesIO()
                    img.save(output, format=img_format, optimize=True, quality=85 if img_format == "JPEG" else None)
                    return output.getvalue(), (".jpg" if img_format == "JPEG" else ".png")
        except Exception:
            # If Pillow is not installed or processing fails, return original
            return content, extension

    async def upload_file(self, file_content: bytes, filename: str, user_id: str, document_type: str) -> str:
        """Upload file to local storage under kyc_documents by default."""
        return await self.upload_image(file_content, filename, user_id, category="kyc_documents", label=document_type)

    async def upload_image(self, file_content: bytes, filename: str, user_id: str, *, category: str, label: str = "image") -> str:
        """Upload an image or file under a specific category directory (e.g., profile_pictures).

        Performs basic image optimization when possible.
        """
        category_dir = self.base_path / category / str(user_id)
        category_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory: {category_dir}")

        extension = Path(filename).suffix.lower()
        # If likely an image, try to optimize/resize
        if extension in {".jpg", ".jpeg", ".png", ".webp"}:
            file_content, extension = self._optimize_image(file_content, extension)

        unique_name = f"{label}_{uuid.uuid4().hex}{extension or ''}"
        destination = category_dir / unique_name
        destination.write_bytes(file_content)
        logger.info(f"Saved file to: {destination}, size: {len(file_content)} bytes")

        # Return web-accessible URL path with leading slash
        # The FastAPI mount is: /storage -> ./storage directory
        # Files are stored at: ./storage/{category}/{user_id}/{filename}
        # So URLs must be: /storage/{category}/{user_id}/{filename}
        url_path = f"/storage/{category}/{user_id}/{unique_name}"
        logger.info(f"Returning url_path: {url_path}")
        return url_path
    
    def get_file_url(self, file_path: str) -> str:
        """Get local file URL for web access"""
        # Ensure path starts with / for absolute URL
        if file_path.startswith('/'):
            return file_path
        # Prepend / if missing (backwards compatibility)
        return f"/{file_path}"




class FileStorageService:
    """Main file storage service that handles different providers"""
    
    def __init__(self):
        self.provider: Optional[FileStorageProvider] = None
        self._initialize_provider()
    
    def _initialize_provider(self):
        """Initialize the appropriate storage provider"""
        storage_type = os.getenv("FILE_STORAGE_TYPE", "local").lower()
        
        # For now, prefer local storage. If DROPBOX is requested, log and fallback.
        if storage_type == "dropbox":
            logger.warning("Dropbox storage not configured in this environment. Falling back to local storage.")
        self.provider = LocalFileStorage()
        logger.info("Using local file storage provider")
    
    async def upload_document(self, file_content: bytes, filename: str, user_id: str, document_type: str) -> str:
        """Upload document using the configured provider"""
        if not self.provider:
            self._initialize_provider()
        assert self.provider is not None
        return await self.provider.upload_file(file_content, filename, user_id, document_type)
    
    def get_document_url(self, file_path: str) -> str:
        """Get document URL from storage provider"""
        if not self.provider:
            self._initialize_provider()
        assert self.provider is not None
        return self.provider.get_file_url(file_path)

    async def upload_profile_picture(self, file_content: bytes, filename: str, user_id: str) -> str:
        """Upload a profile picture with image optimization under profile_pictures category."""
        # For non-local providers, we fallback to standard upload under a different label/category if supported
        if isinstance(self.provider, LocalFileStorage):
            return await self.provider.upload_image(file_content, filename, user_id, category="profile_pictures", label="profile")
        # Fallback: use document upload with a different document_type label
        if not self.provider:
            self._initialize_provider()
        assert self.provider is not None
        return await self.provider.upload_file(file_content, filename, user_id, document_type="profile_picture")

    async def upload_trader_avatar(self, file_content: bytes, filename: str, trader_id: str) -> str:
        """Upload a trader avatar under trader_avatars category."""
        if isinstance(self.provider, LocalFileStorage):
            return await self.provider.upload_image(file_content, filename, trader_id, category="trader_avatars", label="trader")
        if not self.provider:
            self._initialize_provider()
        assert self.provider is not None
        return await self.provider.upload_file(file_content, filename, trader_id, document_type="trader_avatar")


# Global instance
file_storage_service = FileStorageService()
