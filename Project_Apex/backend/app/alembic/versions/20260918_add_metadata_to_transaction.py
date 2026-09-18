"""add metadata to transaction

Revision ID: 20260918_metadata_tx
Revises: 20260915_main_wallet_src
Create Date: 2026-09-18 13:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260918_metadata_tx"
down_revision = "20260915_main_wallet_src"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transaction", sa.Column("metadata", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("transaction", "metadata")
