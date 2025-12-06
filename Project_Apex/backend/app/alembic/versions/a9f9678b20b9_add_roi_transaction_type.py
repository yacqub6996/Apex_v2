"""add_roi_transaction_type

Revision ID: a9f9678b20b9
Revises: 078c1bc167c3
Create Date: 2025-10-15 02:40:24.452480

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a9f9678b20b9'
down_revision = '078c1bc167c3'
branch_labels = None
depends_on = None


def upgrade():
    # This migration was auto-generated incorrectly and tried to recreate existing tables.
    # We pass here to allow the revision history to update without crashing.
    pass


def downgrade():
    pass