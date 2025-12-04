"""add withdrawal_source to transaction

Revision ID: f42c8d1e2a34
Revises: dc58151fccf4
Create Date: 2025-10-22 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f42c8d1e2a34'
down_revision = 'dc58151fccf4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create WithdrawalSource enum type
    withdrawalsource_enum = postgresql.ENUM(
        'COPY_TRADING_WALLET', 'ACTIVE_ALLOCATION',
        name='withdrawalsource'
    )
    withdrawalsource_enum.create(op.get_bind(), checkfirst=True)

    # Add new column to transaction table
    op.add_column(
        'transaction',
        sa.Column('withdrawal_source', withdrawalsource_enum, nullable=True)
    )


def downgrade() -> None:
    # Drop column
    op.drop_column('transaction', 'withdrawal_source')

    # Drop WithdrawalSource enum type
    withdrawalsource_enum = postgresql.ENUM(
        'COPY_TRADING_WALLET', 'ACTIVE_ALLOCATION',
        name='withdrawalsource'
    )
    withdrawalsource_enum.drop(op.get_bind(), checkfirst=True)
