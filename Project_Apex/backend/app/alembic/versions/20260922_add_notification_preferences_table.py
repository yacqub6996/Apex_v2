"""add persisted notification preferences table

Revision ID: 20260922_notification_preferences
Revises: 20260920_main_wallet_enum
Create Date: 2026-09-22 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260922_notification_preferences"
down_revision = "20260920_main_wallet_enum"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usernotificationpreferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("browser_notifications", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("copy_trading_alerts", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("withdrawal_alerts", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("market_updates", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("security_alerts", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("usernotificationpreferences")
