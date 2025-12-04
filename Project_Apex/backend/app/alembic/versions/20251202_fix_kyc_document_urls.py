"""Fix KYC document URLs to include leading slash

This migration fixes existing KYC document records that have URLs stored
without the leading slash. The new format uses /storage/... instead of
storage/... to ensure proper URL resolution in the browser.

Revision ID: 20251202_fix_kyc_urls
Revises: e3b74bb42a51
Create Date: 2025-12-02
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251202_fix_kyc_urls'
down_revision = 'e3b74bb42a51'
branch_labels = None
depends_on = None


def upgrade():
    """
    Update existing KYC document URLs to include leading slash.
    
    This converts:
        storage/kyc_documents/... -> /storage/kyc_documents/...
        storage/profile_pictures/... -> /storage/profile_pictures/...
        storage/trader_avatars/... -> /storage/trader_avatars/...
    """
    # Update front_image_url in kycdocument table
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = '/' || front_image_url 
        WHERE front_image_url IS NOT NULL 
          AND front_image_url NOT LIKE '/%'
          AND front_image_url LIKE 'storage/%'
    """)
    
    # Update back_image_url in kycdocument table
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = '/' || back_image_url 
        WHERE back_image_url IS NOT NULL 
          AND back_image_url NOT LIKE '/%'
          AND back_image_url LIKE 'storage/%'
    """)
    
    # Also update profile_picture_url in user table if it exists
    # Check if column exists first
    connection = op.get_bind()
    result = connection.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'profile_picture_url'
        """)
    )
    if result.fetchone():
        op.execute("""
            UPDATE "user" 
            SET profile_picture_url = '/' || profile_picture_url 
            WHERE profile_picture_url IS NOT NULL 
              AND profile_picture_url NOT LIKE '/%'
              AND profile_picture_url LIKE 'storage/%'
        """)
    
    # Update trader avatar_url if it exists
    result = connection.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trader' 
            AND column_name = 'avatar_url'
        """)
    )
    if result.fetchone():
        op.execute("""
            UPDATE trader 
            SET avatar_url = '/' || avatar_url 
            WHERE avatar_url IS NOT NULL 
              AND avatar_url NOT LIKE '/%'
              AND avatar_url LIKE 'storage/%'
        """)


def downgrade():
    """
    Revert URLs back to relative format (remove leading slash).
    
    This converts:
        /storage/kyc_documents/... -> storage/kyc_documents/...
        /storage/profile_pictures/... -> storage/profile_pictures/...
        /storage/trader_avatars/... -> storage/trader_avatars/...
    """
    # Revert front_image_url
    op.execute("""
        UPDATE kycdocument 
        SET front_image_url = SUBSTRING(front_image_url FROM 2) 
        WHERE front_image_url LIKE '/storage/%'
    """)
    
    # Revert back_image_url
    op.execute("""
        UPDATE kycdocument 
        SET back_image_url = SUBSTRING(back_image_url FROM 2) 
        WHERE back_image_url LIKE '/storage/%'
    """)
    
    # Revert profile_picture_url if it exists
    connection = op.get_bind()
    result = connection.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'profile_picture_url'
        """)
    )
    if result.fetchone():
        op.execute("""
            UPDATE "user" 
            SET profile_picture_url = SUBSTRING(profile_picture_url FROM 2) 
            WHERE profile_picture_url LIKE '/storage/%'
        """)
    
    # Revert trader avatar_url if it exists
    result = connection.execute(
        sa.text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'trader' 
            AND column_name = 'avatar_url'
        """)
    )
    if result.fetchone():
        op.execute("""
            UPDATE trader 
            SET avatar_url = SUBSTRING(avatar_url FROM 2) 
            WHERE avatar_url LIKE '/storage/%'
        """)
