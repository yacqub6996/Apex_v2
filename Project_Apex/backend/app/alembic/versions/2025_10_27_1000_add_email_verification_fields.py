"""add email verification fields to user

Revision ID: 2025_10_27_1000_add_email_verification_fields
Revises: 2025_10_25_1200_update_enums_for_withdrawal_and_tx_status
Create Date: 2025-10-27 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f7a8'
down_revision: Union[str, Sequence[str], None] = ('1f2e3d4c5b6a', '9e2af088d74d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('user', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    # remove server_default to keep app-controlled values only
    op.alter_column('user', 'email_verified', server_default=None)


def downgrade() -> None:
    op.drop_column('user', 'email_verified_at')
    op.drop_column('user', 'email_verified')
