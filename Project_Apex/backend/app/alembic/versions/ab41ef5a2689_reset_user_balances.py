"""reset_user_balances

Revision ID: ab41ef5a2689
Revises: 6113d7b9099f
Create Date: 2025-09-27 22:40:10.707951

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'ab41ef5a2689'
down_revision = '6113d7b9099f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('UPDATE "user" SET balance = 0.0')


def downgrade() -> None:
    # No automatic downgrade path for data reset
    pass
