"""Merge ROI fields migration

Revision ID: 1a46c7089617
Revises: 001_add_roi_fields_to_transaction, e3b74bb42a51
Create Date: 2025-10-15 12:23:02.354115

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '1a46c7089617'
down_revision = ('001_add_roi_txn', 'e3b74bb42a51')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
