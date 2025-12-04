"""
Configuration for file storage settings
"""

import os
from typing import Optional

from pydantic import BaseSettings


class FileStorageSettings(BaseSettings):
    """File storage configuration settings"""
    
    # Storage type: "local" or "dropbox"
    FILE_STORAGE_TYPE: str = "local"
    
    # Dropbox settings
    DROPBOX_ACCESS_TOKEN: Optional[str] = None
    
    # Local storage settings
    LOCAL_STORAGE_PATH: str = "storage/kyc_documents"
    
    # File upload limits
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_CONTENT_TYPES: list[str] = ["image/jpeg", "image/png", "application/pdf"]
    ALLOWED_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".pdf"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global instance
file_storage_settings = FileStorageSettings()
