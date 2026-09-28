"""add email verification reminder tracking

Revision ID: 20260928_verif_reminder_track
Revises: 20260924_verification_handoff
Create Date: 2026-09-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260928_verif_reminder_track"
down_revision = "20260924_verification_handoff"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("last_verification_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user", "last_verification_reminder_sent_at")
