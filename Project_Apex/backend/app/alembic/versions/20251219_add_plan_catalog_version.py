"""Add catalog version tracking for long-term plans

Revision ID: add_plan_catalog_version
Revises: 20251211_merge_maximum_deposit
Create Date: 2025-12-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_plan_catalog_version"
down_revision = "20251211_merge_maximum_deposit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "longtermplan_catalog_version",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.execute(
        "INSERT INTO longtermplan_catalog_version (id, version, updated_at) VALUES ('long_term_plan_catalog', 1, CURRENT_TIMESTAMP)"
    )


def downgrade() -> None:
    op.drop_table("longtermplan_catalog_version")
