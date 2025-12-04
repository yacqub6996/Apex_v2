"""add avatar_url to trader profile

Revision ID: 9e2af088d74d
Revises: 8161dbd83a00
Create Date: 2025-10-26 00:58:50.900642

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '9e2af088d74d'
down_revision = '8161dbd83a00'
branch_labels = None
depends_on = None


def upgrade():
    # Minimal, focused migration: add avatar_url column to traderprofile
    op.add_column('traderprofile', sa.Column('avatar_url', sqlmodel.sql.sqltypes.AutoString(length=1024), nullable=True))


def downgrade():
    # Minimal rollback: drop avatar_url column
    op.drop_column('traderprofile', 'avatar_url')
