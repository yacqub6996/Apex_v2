"""add_investment_strategy_to_user_profile_fixed

Revision ID: 2025_10_03_1930
Revises: 08481d0b5f27
Create Date: 2025-10-03 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_10_03_1930'
down_revision = '08481d0b5f27'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the enum type first - ensure it matches the Python enum exactly
    op.execute("CREATE TYPE investmentstrategy AS ENUM ('ACTIVE_PORTFOLIO', 'LONG_TERM_GROWTH', 'BALANCED')")
    
    # Add the column with the enum type - ensure it matches the Python model
    op.add_column('userprofile', sa.Column('investment_strategy', sa.Enum('ACTIVE_PORTFOLIO', 'LONG_TERM_GROWTH', 'BALANCED', name='investmentstrategy', create_type=False), server_default='BALANCED', nullable=False))


def downgrade() -> None:
    # Remove the column first
    op.drop_column('userprofile', 'investment_strategy')
    
    # Drop the enum type
    op.execute("DROP TYPE investmentstrategy")
