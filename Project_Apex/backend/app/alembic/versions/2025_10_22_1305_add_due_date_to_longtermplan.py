"""add due_date to longtermplan

Revision ID: 7a1b2c3d4e5f
Revises: f42c8d1e2a34
Create Date: 2025-10-22 13:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7a1b2c3d4e5f'
down_revision = 'f42c8d1e2a34'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('longtermplan', sa.Column('due_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('longtermplan', 'due_date')

