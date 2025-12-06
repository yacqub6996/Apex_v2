"""add_roi_transaction_type_fixed

Revision ID: 202510150251
Revises: d5abbb14e0d1
Create Date: 2025-10-15 02:51:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# --- FIX: Shortened the ID to fit in the database (Max 32 chars) ---
revision = '202510150251'
# -------------------------------------------------------------------
down_revision = 'd5abbb14e0d1'
branch_labels = None
depends_on = None


def upgrade():
    # This migration was a duplicate/zombie.
    # We pass to allow the database to skip it without error.
    pass


def downgrade():
    pass