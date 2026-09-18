"""Unify migration DAG across all historical branches.

This merge migration unifies three divergent heads:
1. 20251202_fix_kyc_urls (KYC document URL leading slash normalization)
2. 20260918_metadata_tx (transaction metadata column, preserving production repair state)
3. 7e3802458d80 (support chat tables and mainline feature migrations)

Revision ID: d0e9222e0d65
Revises: 20251202_fix_kyc_urls, 20260918_metadata_tx, 7e3802458d80
Create Date: 2026-09-18 18:24:45.239580

"""

# revision identifiers, used by Alembic.
revision = "d0e9222e0d65"
down_revision = ("20251202_fix_kyc_urls", "20260918_metadata_tx", "7e3802458d80")
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
