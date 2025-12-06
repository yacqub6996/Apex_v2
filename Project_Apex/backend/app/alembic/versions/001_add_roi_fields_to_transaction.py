"""Add ROI fields to Transaction table

Revision ID: '001_add_roi_txn'
Revises: 
Create Date: 2025-10-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_add_roi_txn'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ROISource enum type
    roisource_enum = postgresql.ENUM(
        'ADMIN_PUSH', 'AUTO_COMPOUND', 'TRADER_EVENT', 'ADMIN_REVERSAL',
        name='roisource'
    )
    roisource_enum.create(op.get_bind())
    
    # Add new columns to transaction table
    op.add_column('transaction', sa.Column('roi_percent', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('transaction', sa.Column('symbol', sa.String(length=32), nullable=True))
    op.add_column('transaction', sa.Column('source', roisource_enum, nullable=True))
    op.add_column('transaction', sa.Column('pushed_by_admin_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('transaction', sa.Column('reversal_of', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_transaction_pushed_by_admin_id_user',
        'transaction', 'user',
        ['pushed_by_admin_id'], ['id']
    )
    op.create_foreign_key(
        'fk_transaction_reversal_of_transaction',
        'transaction', 'transaction',
        ['reversal_of'], ['id']
    )


def downgrade() -> None:
    # Drop foreign key constraints
    op.drop_constraint('fk_transaction_reversal_of_transaction', 'transaction', type_='foreignkey')
    op.drop_constraint('fk_transaction_pushed_by_admin_id_user', 'transaction', type_='foreignkey')
    
    # Drop columns
    op.drop_column('transaction', 'reversal_of')
    op.drop_column('transaction', 'pushed_by_admin_id')
    op.drop_column('transaction', 'source')
    op.drop_column('transaction', 'symbol')
    op.drop_column('transaction', 'roi_percent')
    
    # Drop ROISource enum type
    roisource_enum = postgresql.ENUM(
        'ADMIN_PUSH', 'AUTO_COMPOUND', 'TRADER_EVENT', 'ADMIN_REVERSAL',
        name='roisource'
    )
    roisource_enum.drop(op.get_bind())
