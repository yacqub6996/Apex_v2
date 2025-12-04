"""Add UNDER_REVIEW to kycstatus enum

Revision ID: 07c8a661364e
Revises: 08481d0b5f27
Create Date: 2025-10-01 19:38:51.626164

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '07c8a661364e'
down_revision = '08481d0b5f27'
branch_labels = None
depends_on = None


def upgrade():
    # Add UNDER_REVIEW value to kycstatus enum
    op.execute("ALTER TYPE kycstatus ADD VALUE 'UNDER_REVIEW'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values easily
    # This would require creating a new type and migrating data
    # For safety, we'll leave this as a no-op
    pass
