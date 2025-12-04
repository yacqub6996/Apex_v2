"""add ledger and admin adjustments

Revision ID: 2025_11_13_1130
Revises: 2025_11_12_1400
Create Date: 2025-11-13 11:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_11_13_1130'
down_revision = '2025_11_12_1400'
branch_labels = None
depends_on = None


def upgrade() -> None:
    ledgertype_values = (
        'DEPOSIT',
        'WITHDRAWAL',
        'COPY_TRANSFER_IN',
        'COPY_TRANSFER_OUT',
        'LONG_TERM_TRANSFER_IN',
        'LONG_TERM_TRANSFER_OUT',
        'ADJUSTMENT',
        'ROI_CREDIT',
        'FEE_DEBIT',
    )
    ledgerstatus_values = (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'COMPLETED',
    )
    adminactiontype_values = (
        'ADD_FUNDS',
        'DEDUCT_FUNDS',
        'REVERSE_TRANSACTION',
        'FORCE_COMPLETE_WITHDRAWAL',
        'MANUAL_CORRECTION',
    )

    # Create enums once (checkfirst guards reruns)
    postgresql.ENUM(*ledgertype_values, name='ledgertype').create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(*ledgerstatus_values, name='ledgerstatus').create(op.get_bind(), checkfirst=True)
    postgresql.ENUM(*adminactiontype_values, name='adminactiontype').create(op.get_bind(), checkfirst=True)

    ledgertype_enum = postgresql.ENUM(*ledgertype_values, name='ledgertype', create_type=False)
    ledgerstatus_enum = postgresql.ENUM(*ledgerstatus_values, name='ledgerstatus', create_type=False)
    adminactiontype_enum = postgresql.ENUM(*adminactiontype_values, name='adminactiontype', create_type=False)

    # Create ledgerentry table
    op.create_table(
        'ledgerentry',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('ledger_type', ledgertype_enum, nullable=False),
        sa.Column('tx_reference', sa.String(length=100), nullable=False),
        sa.Column('asset', sa.String(length=20), nullable=True),
        sa.Column('network', sa.String(length=50), nullable=True),
        sa.Column('amount_usd', sa.Float(), nullable=False),
        sa.Column('crypto_amount', sa.String(length=50), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=False),
        sa.Column('status', ledgerstatus_enum, nullable=False),
        sa.Column('created_by_admin_id', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for ledgerentry
    op.create_index('ix_ledgerentry_id', 'ledgerentry', ['id'], unique=False)
    op.create_index('ix_ledgerentry_user_id', 'ledgerentry', ['user_id'], unique=False)
    op.create_index('ix_ledgerentry_ledger_type', 'ledgerentry', ['ledger_type'], unique=False)
    op.create_index('ix_ledgerentry_created_at', 'ledgerentry', ['created_at'], unique=False)
    
    # Composite index for common queries
    op.create_index(
        'ix_ledgerentry_user_type_created',
        'ledgerentry',
        ['user_id', 'ledger_type', 'created_at'],
        unique=False
    )

    # Create adminbalanceadjustment table
    op.create_table(
        'adminbalanceadjustment',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('admin_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('action_type', adminactiontype_enum, nullable=False),
        sa.Column('previous_balance', sa.Float(), nullable=False),
        sa.Column('new_balance', sa.Float(), nullable=False),
        sa.Column('delta', sa.Float(), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=False),
        sa.Column('related_ledger_entry_id', sa.UUID(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['related_ledger_entry_id'], ['ledgerentry.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for adminbalanceadjustment
    op.create_index('ix_adminbalanceadjustment_admin_id', 'adminbalanceadjustment', ['admin_id'], unique=False)
    op.create_index('ix_adminbalanceadjustment_user_id', 'adminbalanceadjustment', ['user_id'], unique=False)
    op.create_index('ix_adminbalanceadjustment_created_at', 'adminbalanceadjustment', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_adminbalanceadjustment_created_at', table_name='adminbalanceadjustment')
    op.drop_index('ix_adminbalanceadjustment_user_id', table_name='adminbalanceadjustment')
    op.drop_index('ix_adminbalanceadjustment_admin_id', table_name='adminbalanceadjustment')
    op.drop_table('adminbalanceadjustment')
    
    op.drop_index('ix_ledgerentry_user_type_created', table_name='ledgerentry')
    op.drop_index('ix_ledgerentry_created_at', table_name='ledgerentry')
    op.drop_index('ix_ledgerentry_ledger_type', table_name='ledgerentry')
    op.drop_index('ix_ledgerentry_user_id', table_name='ledgerentry')
    op.drop_index('ix_ledgerentry_id', table_name='ledgerentry')
    op.drop_table('ledgerentry')
    
    # Drop enums
    adminactiontype_enum = postgresql.ENUM(name='adminactiontype')
    adminactiontype_enum.drop(op.get_bind(), checkfirst=True)
    
    ledgerstatus_enum = postgresql.ENUM(name='ledgerstatus')
    ledgerstatus_enum.drop(op.get_bind(), checkfirst=True)
    
    ledgertype_enum = postgresql.ENUM(name='ledgertype')
    ledgertype_enum.drop(op.get_bind(), checkfirst=True)
