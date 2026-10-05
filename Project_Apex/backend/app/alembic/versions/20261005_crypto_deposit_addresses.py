"""add crypto deposit address management table

Revision ID: 20261005_crypto_addresses
Revises: 20260928_verif_reminder_track
Create Date: 2026-10-05 12:00:00.000000

"""

import uuid
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20261005_crypto_addresses"
down_revision = "20260928_verif_reminder_track"
branch_labels = None
depends_on = None

INITIAL_ADDRESSES = [
    {
        "id": uuid.uuid4(),
        "coin": "BTC",
        "network": "BITCOIN",
        "address": "bc1q9demo0x9k4u5y6x7z8q2m3n4p5r6s7t8v9w0xy",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform Bitcoin Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "ETH",
        "network": "ETHEREUM_ERC20",
        "address": "0x7E57D3m0cAfE0000000000000000000000CaFe00",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform Ethereum (ERC20) Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "USDT",
        "network": "TRON_TRC20",
        "address": "TQ2DeM0Addr3ss111111111111111111111111",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform USDT (TRC20) Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "USDT",
        "network": "ETHEREUM_ERC20",
        "address": "0x1111cAFe2222babe3333dEAD4444beef5555cAFE",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform USDT (ERC20) Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "USDT",
        "network": "POLYGON",
        "address": "0x2222dEAD3333bEEF4444cAFE5555bABE6666cAFE",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform USDT (Polygon) Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "USDC",
        "network": "POLYGON",
        "address": "0x3333bEEF4444cAFE5555dEAD6666bABE7777cAFE",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform USDC (Polygon) Deposit Address",
    },
    {
        "id": uuid.uuid4(),
        "coin": "USDC",
        "network": "ETHEREUM_ERC20",
        "address": "0x4444cAFE5555dEAD6666bEEF7777bABE8888cAFE",
        "memo": None,
        "is_active": True,
        "notes": "Default Platform USDC (ERC20) Deposit Address",
    },
]


def upgrade() -> None:
    table = op.create_table(
        "cryptodepositaddress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("coin", sa.String(length=20), nullable=False),
        sa.Column("network", sa.String(length=50), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("memo", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notes", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id"), nullable=True),
    )
    op.create_index(op.f("ix_cryptodepositaddress_coin"), "cryptodepositaddress", ["coin"], unique=False)
    op.create_index(op.f("ix_cryptodepositaddress_network"), "cryptodepositaddress", ["network"], unique=False)
    op.create_index(op.f("ix_cryptodepositaddress_is_active"), "cryptodepositaddress", ["is_active"], unique=False)

    now = datetime.now(timezone.utc)
    seed_records = [
        {
            **item,
            "created_at": now,
            "updated_at": now,
            "updated_by_id": None,
        }
        for item in INITIAL_ADDRESSES
    ]
    op.bulk_insert(table, seed_records)


def downgrade() -> None:
    op.drop_index(op.f("ix_cryptodepositaddress_is_active"), table_name="cryptodepositaddress")
    op.drop_index(op.f("ix_cryptodepositaddress_network"), table_name="cryptodepositaddress")
    op.drop_index(op.f("ix_cryptodepositaddress_coin"), table_name="cryptodepositaddress")
    op.drop_table("cryptodepositaddress")
