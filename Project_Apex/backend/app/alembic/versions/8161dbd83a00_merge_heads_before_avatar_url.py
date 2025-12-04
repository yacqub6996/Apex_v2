"""merge heads before avatar_url

Revision ID: 8161dbd83a00
Revises: 1f2e3d4c5b6a, 2a3b4c5d6e78
Create Date: 2025-10-26 00:57:58.389904

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '8161dbd83a00'
down_revision = ('1f2e3d4c5b6a', '2a3b4c5d6e78')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
