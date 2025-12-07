"""Add KYC_SUBMITTED notification type

Revision ID: 20251220_kyc_submitted_notif
Revises: add_plan_catalog_version
Create Date: 2025-12-20 00:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20251220_kyc_submitted_notif"
down_revision = "add_plan_catalog_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safely add enum value only if the type exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notificationtype') THEN
                ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'KYC_SUBMITTED';
            END IF;
        END$$;
        """
    )


def downgrade() -> None:
    # PostgreSQL enums do not support dropping values; add a no-op to keep downgrade consistent
    pass
