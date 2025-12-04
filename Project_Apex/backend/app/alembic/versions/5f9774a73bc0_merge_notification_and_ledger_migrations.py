"""merge notification and ledger migrations

Revision ID: 5f9774a73bc0
Revises: 2025_11_13_1130, a1b2c3d4e5f6
Create Date: 2025-11-21 21:33:37.525199

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5f9774a73bc0'
down_revision = ('2025_11_13_1130', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
