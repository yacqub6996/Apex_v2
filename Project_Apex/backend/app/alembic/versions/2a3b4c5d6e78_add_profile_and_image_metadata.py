"""Add profile picture field to user

Revision ID: 2a3b4c5d6e78
Revises: 108ffa5ad0a2
Create Date: 2025-10-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = '2a3b4c5d6e78'
down_revision = '108ffa5ad0a2'
branch_labels = None
depends_on = None


def upgrade():
    # Add column to user table
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile_picture_url', sa.String(length=1024), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('profile_picture_url')
