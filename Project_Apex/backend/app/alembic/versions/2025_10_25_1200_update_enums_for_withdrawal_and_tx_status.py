"""update enums for withdrawalsource and transactionstatus

Revision ID: 1f2e3d4c5b6a
Revises: 9b8c7d6e5f4a
Create Date: 2025-10-25 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '1f2e3d4c5b6a'
down_revision = '9b8c7d6e5f4a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add LONG_TERM_WALLET to withdrawalsource enum
    op.execute("ALTER TYPE withdrawalsource ADD VALUE IF NOT EXISTS 'LONG_TERM_WALLET'")
    # Add CANCELLED to transactionstatus enum
    op.execute("ALTER TYPE transactionstatus ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    # No downgrade for enum value removals
    pass

