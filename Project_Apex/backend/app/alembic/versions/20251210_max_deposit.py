"""Add maximum deposit column to long-term plans

Revision ID: 20251210_max_deposit
Revises: 1a46c7089617
Create Date: 2025-12-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251210_max_deposit"
down_revision = "1a46c7089617"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "longtermplan",
        sa.Column("maximum_deposit", sa.Numeric(20, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("longtermplan", "maximum_deposit")
