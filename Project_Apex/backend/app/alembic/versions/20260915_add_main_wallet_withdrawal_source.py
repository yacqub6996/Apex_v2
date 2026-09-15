"""add main wallet withdrawal source

Revision ID: 20260915_main_wallet_withdrawal_source
Revises: 9e2af088d74d
Create Date: 2026-09-15 19:45:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "20260915_main_wallet_withdrawal_source"
down_revision = "9e2af088d74d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE withdrawalsource ADD VALUE IF NOT EXISTS 'MAIN_WALLET'")


def downgrade() -> None:
    pass
