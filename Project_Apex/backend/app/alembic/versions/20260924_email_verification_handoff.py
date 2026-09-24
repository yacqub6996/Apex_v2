"""add email verification handoff and resend attempt tables

Revision ID: 20260924_email_verification_handoff
Revises: 20260922_notification_idemp
Create Date: 2026-09-24 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260924_email_verification_handoff"
down_revision = "20260922_notification_idemp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "emailverificationhandoff",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "USED", "REVOKED", name="verificationhandoffstatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_emailverificationhandoff_status_expires",
        "emailverificationhandoff",
        ["status", "expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_emailverificationhandoff_token_hash"),
        "emailverificationhandoff",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "emailverificationattempt",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email_hmac", sa.String(length=64), nullable=False),
        sa.Column("ip_hmac", sa.String(length=64), nullable=True),
        sa.Column(
            "outcome",
            sa.Enum(
                "SENT",
                "SKIPPED_UNKNOWN",
                "SKIPPED_ALREADY_VERIFIED",
                name="emailverificationattemptoutcome",
            ),
            nullable=False,
        ),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_emailverificationattempt_email_hmac_requested",
        "emailverificationattempt",
        ["email_hmac", "requested_at"],
        unique=False,
    )
    op.create_index(
        "ix_emailverificationattempt_ip_hmac_requested",
        "emailverificationattempt",
        ["ip_hmac", "requested_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_emailverificationattempt_ip_hmac_requested", table_name="emailverificationattempt"
    )
    op.drop_index(
        "ix_emailverificationattempt_email_hmac_requested", table_name="emailverificationattempt"
    )
    op.drop_table("emailverificationattempt")
    op.drop_index(
        op.f("ix_emailverificationhandoff_token_hash"), table_name="emailverificationhandoff"
    )
    op.drop_index(
        "ix_emailverificationhandoff_status_expires", table_name="emailverificationhandoff"
    )
    op.drop_table("emailverificationhandoff")
