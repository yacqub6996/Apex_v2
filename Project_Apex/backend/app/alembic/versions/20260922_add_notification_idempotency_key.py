"""add notification idempotency key

Revision ID: 20260922_notification_idemp
Revises: 20260922_notification_prefs
Create Date: 2026-09-22 22:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260922_notification_idemp"
down_revision = "20260922_notification_prefs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification",
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint(
        "uq_notification_user_idempotency",
        "notification",
        ["user_id", "idempotency_key"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_notification_user_idempotency", "notification", type_="unique")
    op.drop_column("notification", "idempotency_key")
