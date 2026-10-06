"""add dynamic crypto fields to cryptodepositaddress table

Revision ID: 20261006_dynamic_crypto
Revises: 20261005_crypto_addresses
Create Date: 2026-10-06 13:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20261006_dynamic_crypto"
down_revision = "20261005_crypto_addresses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cryptodepositaddress",
        sa.Column("display_name", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "cryptodepositaddress",
        sa.Column("coingecko_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "cryptodepositaddress",
        sa.Column("fallback_rate", sa.Float(), nullable=True),
    )

    # Backfill default coin metadata for existing records
    op.execute(
        """
        UPDATE cryptodepositaddress
        SET display_name = 'Bitcoin', coingecko_id = 'bitcoin', fallback_rate = 60000.0
        WHERE coin = 'BTC'
        """
    )
    op.execute(
        """
        UPDATE cryptodepositaddress
        SET display_name = 'Ethereum', coingecko_id = 'ethereum', fallback_rate = 3000.0
        WHERE coin = 'ETH'
        """
    )
    op.execute(
        """
        UPDATE cryptodepositaddress
        SET display_name = 'Tether', coingecko_id = 'tether', fallback_rate = 1.0
        WHERE coin = 'USDT'
        """
    )
    op.execute(
        """
        UPDATE cryptodepositaddress
        SET display_name = 'USD Coin', coingecko_id = 'usd-coin', fallback_rate = 1.0
        WHERE coin = 'USDC'
        """
    )


def downgrade() -> None:
    op.drop_column("cryptodepositaddress", "fallback_rate")
    op.drop_column("cryptodepositaddress", "coingecko_id")
    op.drop_column("cryptodepositaddress", "display_name")
