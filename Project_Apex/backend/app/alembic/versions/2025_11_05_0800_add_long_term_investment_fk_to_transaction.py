"""add long-term investment reference to transaction table

Revision ID: c4f0b6d1e2a3
Revises: b2c3d4e5f7a8
Create Date: 2025-11-05 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c4f0b6d1e2a3"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transaction",
        sa.Column(
            "long_term_investment_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "transaction_long_term_investment_id_fkey",
        "transaction",
        "userlongterminvestment",
        ["long_term_investment_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "transaction_long_term_investment_id_fkey",
        "transaction",
        type_="foreignkey",
    )
    op.drop_column("transaction", "long_term_investment_id")
