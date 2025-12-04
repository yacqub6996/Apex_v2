"""Add long_term_balance column only

Revision ID: d5abbb14e0d1
Revises: 108ffa5ad0a2
Create Date: 2025-10-05 15:28:31.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd5abbb14e0d1'
down_revision = '108ffa5ad0a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add long_term_balance column to user table
    op.add_column('user', sa.Column('long_term_balance', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove long_term_balance column from user table
    op.drop_column('user', 'long_term_balance')
