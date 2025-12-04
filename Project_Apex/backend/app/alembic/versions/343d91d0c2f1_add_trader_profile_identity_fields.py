"""Add persistent identity fields for trader profiles.

Revision ID: 343d91d0c2f1
Revises: 9f1440037223
Create Date: 2025-09-27 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "343d91d0c2f1"
down_revision = "9f1440037223"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "traderprofile",
        sa.Column("display_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "traderprofile",
        sa.Column("trader_code", sa.String(length=16), nullable=True),
    )
    op.create_index(
        "ix_traderprofile_trader_code",
        "traderprofile",
        ["trader_code"],
        unique=True,
    )

    op.execute(
        sa.text(
            """
            UPDATE traderprofile AS tp
            SET
                display_name = COALESCE(
                    u.full_name,
                    'Trader ' || UPPER(SUBSTRING(REPLACE(CAST(tp.id AS TEXT), '-', '') FROM 1 FOR 8))
                ),
                trader_code = UPPER(SUBSTRING(REPLACE(CAST(tp.id AS TEXT), '-', '') FROM 1 FOR 8))
            FROM "user" AS u
            WHERE u.id = tp.user_id
            """
        )
    )

    op.alter_column("traderprofile", "display_name", nullable=False)
    op.alter_column("traderprofile", "trader_code", nullable=False)


def downgrade() -> None:
    op.alter_column("traderprofile", "trader_code", nullable=True)
    op.alter_column("traderprofile", "display_name", nullable=True)
    op.drop_index("ix_traderprofile_trader_code", table_name="traderprofile")
    op.drop_column("traderprofile", "trader_code")
    op.drop_column("traderprofile", "display_name")
