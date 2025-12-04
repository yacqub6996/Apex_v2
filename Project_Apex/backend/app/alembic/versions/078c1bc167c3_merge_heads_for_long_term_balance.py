"""Merge heads for long term balance

Revision ID: 078c1bc167c3
Revises: 3b650978d9ad, d5abbb14e0d1
Create Date: 2025-10-05 15:42:38.601839

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '078c1bc167c3'
down_revision = ('3b650978d9ad', 'd5abbb14e0d1')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
