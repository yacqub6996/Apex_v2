"""add notification system

Revision ID: a1b2c3d4e5f6
Revises: c4f0b6d1e2a3
Create Date: 2025-11-18 07:46:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'c4f0b6d1e2a3'
branch_labels = None
depends_on = None


def upgrade():
    # Create notification type enum
    notification_type_enum = postgresql.ENUM(
        'KYC_APPROVED',
        'KYC_REJECTED',
        'WITHDRAWAL_APPROVED',
        'WITHDRAWAL_REJECTED',
        'DEPOSIT_CONFIRMED',
        'ROI_RECEIVED',
        'COPY_TRADE_EXECUTED',
        'INVESTMENT_MATURED',
        'SECURITY_ALERT',
        'SYSTEM_ANNOUNCEMENT',
        name='notificationtype',
        create_type=True
    )
    notification_type_enum.create(op.get_bind(), checkfirst=True)

    # Create notification table
    op.create_table(
        'notification',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.String(length=1000), nullable=False),
        
        # --- FIX: Added create_type=False to prevent duplicate error ---
        sa.Column('notification_type', sa.Enum(
            'KYC_APPROVED',
            'KYC_REJECTED',
            'WITHDRAWAL_APPROVED',
            'WITHDRAWAL_REJECTED',
            'DEPOSIT_CONFIRMED',
            'ROI_RECEIVED',
            'COPY_TRADE_EXECUTED',
            'INVESTMENT_MATURED',
            'SECURITY_ALERT',
            'SYSTEM_ANNOUNCEMENT',
            name='notificationtype',
            create_type=False
        ), nullable=False),
        # ---------------------------------------------------------------
        
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('related_entity_type', sa.String(length=50), nullable=True),
        sa.Column('related_entity_id', sa.String(length=100), nullable=True),
        sa.Column('action_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better query performance
    op.create_index('ix_notification_id', 'notification', ['id'])
    op.create_index('ix_notification_user_id', 'notification', ['user_id'])
    op.create_index('ix_notification_created_at', 'notification', ['created_at'])

    # Add notification preference columns to user table
    op.add_column('user', sa.Column('browser_notifications_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user', sa.Column('email_notifications_enabled', sa.Boolean(), nullable=False, server_default='true'))


def downgrade():
    # Remove columns from user table
    op.drop_column('user', 'email_notifications_enabled')
    op.drop_column('user', 'browser_notifications_enabled')
    
    # Drop indexes
    op.drop_index('ix_notification_created_at', table_name='notification')
    op.drop_index('ix_notification_user_id', table_name='notification')
    op.drop_index('ix_notification_id', table_name='notification')
    
    # Drop notification table
    op.drop_table('notification')
    
    # Drop enum type
    notification_type_enum = postgresql.ENUM(name='notificationtype')
    notification_type_enum.drop(op.get_bind(), checkfirst=True)