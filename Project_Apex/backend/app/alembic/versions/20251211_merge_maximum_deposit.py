"""Add index on maximum_deposit and merge long-term heads

Revision ID: 20251211_merge_maximum_deposit
Revises: 20251210_max_deposit, 5f9774a73bc0
Create Date: 2025-12-11 00:00:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "20251211_merge_maximum_deposit"
down_revision = ("5f9774a73bc0", "20251210_max_deposit")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_longtermplan_maximum_deposit",
        "longtermplan",
        ["maximum_deposit"],
    )


def downgrade() -> None:
    op.drop_index("ix_longtermplan_maximum_deposit", table_name="longtermplan")
