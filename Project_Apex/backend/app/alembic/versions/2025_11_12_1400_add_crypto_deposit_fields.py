"""add crypto deposit fields

Revision ID: 2025_11_12_1400
Revises: 2025_11_05_0800_add_long_term_investment_fk_to_transaction
Create Date: 2025-11-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_11_12_1400'
down_revision = 'c4f0b6d1e2a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add crypto-specific fields to transactions table (skip crypto_address as it already exists)
    op.add_column('transaction', sa.Column('crypto_network', sa.String(length=50), nullable=True))
    # crypto_address already exists, skip it
    op.add_column('transaction', sa.Column('crypto_coin', sa.String(length=20), nullable=True))
    op.add_column('transaction', sa.Column('crypto_amount', sa.String(length=50), nullable=True))
    op.add_column('transaction', sa.Column('crypto_memo', sa.String(length=100), nullable=True))
    op.add_column('transaction', sa.Column('payment_confirmed_by_user', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('transaction', sa.Column('payment_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('transaction', sa.Column('address_expires_at', sa.DateTime(), nullable=True))
    op.add_column('transaction', sa.Column('vat_amount', sa.Float(), nullable=True))
    
    # Add index for admin query performance (pending deposits with user confirmation)
    op.create_index(
        'idx_transactions_pending_confirmed',
        'transaction',
        ['status', 'payment_confirmed_by_user'],
        unique=False,
        postgresql_where=sa.text("transaction_type = 'DEPOSIT'")
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('idx_transactions_pending_confirmed', table_name='transaction')
    
    # Remove crypto-specific columns (skip crypto_address as it existed before)
    op.drop_column('transaction', 'vat_amount')
    op.drop_column('transaction', 'address_expires_at')
    op.drop_column('transaction', 'payment_confirmed_at')
    op.drop_column('transaction', 'payment_confirmed_by_user')
    op.drop_column('transaction', 'crypto_memo')
    op.drop_column('transaction', 'crypto_amount')
    op.drop_column('transaction', 'crypto_coin')
    # crypto_address already existed, don't drop it
    op.drop_column('transaction', 'crypto_network')
