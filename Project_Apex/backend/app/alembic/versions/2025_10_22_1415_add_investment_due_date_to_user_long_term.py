"""add investment_due_date to userlongterminvestment

Revision ID: 9b8c7d6e5f4a
Revises: 7a1b2c3d4e5f
Create Date: 2025-10-22 14:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9b8c7d6e5f4a'
down_revision = '7a1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('userlongterminvestment', sa.Column('investment_due_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('userlongterminvestment', 'investment_due_date')

