"""add main wallet to withdrawalsource enum

Revision ID: 20260920_main_wallet_enum
Revises: 20260918_metadata_tx
Create Date: 2026-09-20 07:50:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260920_main_wallet_enum"
down_revision = "20260918_metadata_tx"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE withdrawalsource ADD VALUE IF NOT EXISTS 'MAIN_WALLET'")


def downgrade() -> None:
    pass
