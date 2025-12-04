"""merge heads

Revision ID: e3b74bb42a51
Revises: 2025_10_15_0251_add_roi_transaction_type, a9f9678b20b9
Create Date: 2025-10-15 10:51:48.086476

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'e3b74bb42a51'
down_revision = ('2025_10_15_0251_add_roi_transaction_type', 'a9f9678b20b9')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
