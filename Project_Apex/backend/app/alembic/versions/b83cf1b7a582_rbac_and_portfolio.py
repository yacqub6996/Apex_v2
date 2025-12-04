"""Add RBAC roles and portfolio tables"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b83cf1b7a582'
down_revision = '1737235721'
branch_labels = None
depends_on = None

user_role_enum = postgresql.ENUM('ADMIN', 'USER', name='userrole', create_type=False)
account_tier_enum = postgresql.ENUM('BASIC', 'STANDARD', 'PREMIUM', 'VIP', name='accounttier', create_type=False)
kyc_status_enum = postgresql.ENUM('PENDING', 'APPROVED', 'REJECTED', name='kycstatus', create_type=False)
transaction_type_enum = postgresql.ENUM('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', name='transactiontype', create_type=False)
transaction_status_enum = postgresql.ENUM('PENDING', 'COMPLETED', 'FAILED', name='transactionstatus', create_type=False)
trade_side_enum = postgresql.ENUM('BUY', 'SELL', name='tradeside', create_type=False)
trade_status_enum = postgresql.ENUM('OPEN', 'CLOSED', 'CANCELLED', name='tradestatus', create_type=False)


def upgrade() -> None:
    # Drop enums if they exist from a previous partial run
    op.execute("DROP TYPE IF EXISTS userrole CASCADE")
    op.execute("DROP TYPE IF EXISTS accounttier CASCADE")
    op.execute("DROP TYPE IF EXISTS kycstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS transactiontype CASCADE")
    op.execute("DROP TYPE IF EXISTS transactionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS tradeside CASCADE")
    op.execute("DROP TYPE IF EXISTS tradestatus CASCADE")

    op.execute("CREATE TYPE userrole AS ENUM ('ADMIN', 'USER')")
    op.execute("CREATE TYPE accounttier AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'VIP')")
    op.execute("CREATE TYPE kycstatus AS ENUM ('PENDING', 'APPROVED', 'REJECTED')")
    op.execute("CREATE TYPE transactiontype AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')")
    op.execute("CREATE TYPE transactionstatus AS ENUM ('PENDING', 'COMPLETED', 'FAILED')")
    op.execute("CREATE TYPE tradeside AS ENUM ('BUY', 'SELL')")
    op.execute("CREATE TYPE tradestatus AS ENUM ('OPEN', 'CLOSED', 'CANCELLED')")


    op.add_column('user', sa.Column('role', user_role_enum, nullable=False, server_default='USER'))
    op.add_column('user', sa.Column('account_tier', account_tier_enum, nullable=False, server_default='BASIC'))
    op.add_column('user', sa.Column('kyc_status', kyc_status_enum, nullable=False, server_default='PENDING'))
    op.add_column('user', sa.Column('kyc_verified_at', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('kyc_notes', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True))

    op.alter_column('user', 'role', server_default=None)
    op.alter_column('user', 'account_tier', server_default=None)
    op.alter_column('user', 'kyc_status', server_default=None)

    op.alter_column('transaction', 'type', new_column_name='transaction_type')
    op.alter_column(
        'transaction',
        'transaction_type',
        type_=transaction_type_enum,
        existing_type=sqlmodel.sql.sqltypes.AutoString(length=20),
        postgresql_using='transaction_type::text::transactiontype',
    )
    op.alter_column(
        'transaction',
        'status',
        type_=transaction_status_enum,
        existing_type=sqlmodel.sql.sqltypes.AutoString(length=20),
        postgresql_using='status::text::transactionstatus',
    )
    op.add_column('transaction', sa.Column('executed_at', sa.DateTime(), nullable=True))

    op.create_table(
        'trade',
        sa.Column('symbol', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('side', trade_side_enum, nullable=False, server_default='BUY'),
        sa.Column('entry_price', sa.Float(), nullable=False),
        sa.Column('exit_price', sa.Float(), nullable=True),
        sa.Column('volume', sa.Float(), nullable=False),
        sa.Column('profit_loss', sa.Float(), nullable=True),
        sa.Column('status', trade_status_enum, nullable=False, server_default='OPEN'),
        sa.Column('opened_at', sa.DateTime(), nullable=False),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'dailyperformance',
        sa.Column('performance_date', sa.Date(), nullable=False),
        sa.Column('profit_loss', sa.Float(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'accountsummary',
        sa.Column('total_deposits', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_withdrawals', sa.Float(), nullable=False, server_default='0'),
        sa.Column('net_profit', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('winning_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('losing_trades', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('win_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_accountsummary_user_id'),
    )

    op.alter_column('accountsummary', 'total_deposits', server_default=None)
    op.alter_column('accountsummary', 'total_withdrawals', server_default=None)
    op.alter_column('accountsummary', 'net_profit', server_default=None)
    op.alter_column('accountsummary', 'total_trades', server_default=None)
    op.alter_column('accountsummary', 'winning_trades', server_default=None)
    op.alter_column('accountsummary', 'losing_trades', server_default=None)
    op.alter_column('accountsummary', 'win_rate', server_default=None)


def downgrade() -> None:
    op.drop_table('accountsummary')
    op.drop_table('dailyperformance')
    op.drop_table('trade')

    op.drop_column('transaction', 'executed_at')
    op.alter_column(
        'transaction',
        'status',
        type_=sqlmodel.sql.sqltypes.AutoString(length=20),
        existing_type=transaction_status_enum,
        postgresql_using='status::text',
    )
    op.alter_column(
        'transaction',
        'transaction_type',
        type_=sqlmodel.sql.sqltypes.AutoString(length=20),
        existing_type=transaction_type_enum,
        postgresql_using='transaction_type::text',
    )
    op.alter_column('transaction', 'transaction_type', new_column_name='type')

    op.drop_column('user', 'kyc_notes')
    op.drop_column('user', 'kyc_verified_at')
    op.drop_column('user', 'kyc_status')
    op.drop_column('user', 'account_tier')
    op.drop_column('user', 'role')

    trade_status_enum.drop(bind, checkfirst=True)
    trade_side_enum.drop(bind, checkfirst=True)
    transaction_status_enum.drop(bind, checkfirst=True)
    transaction_type_enum.drop(bind, checkfirst=True)
    kyc_status_enum.drop(bind, checkfirst=True)
    account_tier_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)


