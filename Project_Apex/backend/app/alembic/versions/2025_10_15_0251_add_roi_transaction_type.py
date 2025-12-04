"""add_roi_transaction_type

Revision ID: 2025_10_15_0251_add_roi_transaction_type
Revises: d5abbb14e0d1
Create Date: 2025-10-15 02:51:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_10_15_0251_add_roi_transaction_type'
down_revision = 'd5abbb14e0d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add ROI to the transactiontype enum
    op.execute("ALTER TYPE transactiontype ADD VALUE 'ROI'")


def downgrade() -> None:
    # Remove ROI from the transactiontype enum
    # Note: This is complex in PostgreSQL - we'd need to create a new enum and migrate data
    # For simplicity, we'll just document that downgrade requires manual intervention
    pass
