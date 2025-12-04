"""Merge heads

Revision ID: 108ffa5ad0a2
Revises: 07c8a661364e, 2025_10_03_1930
Create Date: 2025-10-05 15:23:18.294057

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '108ffa5ad0a2'
down_revision = ('07c8a661364e', '2025_10_03_1930')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
