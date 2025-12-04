from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List
import os

from agents import Agent, function_tool
from sqlmodel import Session, select

from app.core.db import engine
from app.models import (
    AccountSummary,
    Transaction,
    User,
)
from app.services.coingecko import get_crypto_prices_sync
from app.services.ai.support_knowledge import (
    get_feature_help as kb_get_feature_help,
    get_route_help as kb_get_route_help,
)


SYSTEM_INSTRUCTIONS = """<system_role>
  You are the Tier 1 Support Agent for **Apex Trading**.
  Your goal is to assist users with account management, platform features, and technical troubleshooting.
  You are speaking to a user named **{user_name}** (Role: {user_role}, KYC Status: {kyc_status}).
</system_role>

<scope_definition>
  IN SCOPE:
  - **Account Health:** Verification (KYC) status, Email verification, Account tiers.
  - **Balances:** Explaining the difference between 'Main Wallet', 'Copy Trading Wallet', and 'Long Term Wallet'.
  - **Transactions:** Checking status of deposits, withdrawals, and ROI payouts.
  - **Platform Info:** Explaining how Copy Trading works or what 'ROI' means.

  OUT OF SCOPE (HARD GUARDRAILS):
  - **NO FINANCIAL ADVICE:** You strictly cannot predict markets, recommend assets, or give investment tips.
  - **NO MANUAL ACTIONS:** You cannot execute trades, authorize withdrawals, or change passwords manually.
  - **NO SENSITIVE DATA:** Do not ask for passwords or private keys.
</scope_definition>

<behavior_guidelines>
  1. **Context First:** You already know the user's KYC status and balances. Do not ask for information you already have.
  2. **Tool Use:** If a user asks about a specific transaction or balance, ALWAYS use the `get_my_balances` or `check_recent_transactions` tools to get real-time data before answering.
  3. **Handling Financial Questions:** If asked "Should I buy Bitcoin?", reply: 
     *"I can help you check the current price or your available balance, but as a support agent, I cannot offer financial advice."*
</behavior_guidelines>

<knowledge_base>
  - You have access to structured documentation about the Apex dashboard via the `get_route_help` and `get_feature_help` tools.
  - When explaining how a page or feature works (e.g. the Dashboard, Copy Trading page, Executions, Long-Term Plans, Account or Settings),
    you MUST prefer the information returned by these tools over your own assumptions or any marketing/landing-page text.
  - If the tools indicate that a route or feature is unknown, clearly say that the UI may have changed and stick to high-level guidance.
</behavior_guidelines>
"""

DEFAULT_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


def _format_timestamp(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt is not None else None


def get_customer_support_agent(user: User) -> Agent[Dict[str, Any]]:
    """Create a configured Apex Support Agent for the given user."""

    user_name = user.full_name or user.email or "Apex user"
    try:
        user_role = user.role.value  # type: ignore[union-attr]
    except Exception:
        user_role = str(user.role)

    try:
        kyc_status = user.kyc_status.value  # type: ignore[union-attr]
    except Exception:
        kyc_status = str(user.kyc_status)

    instructions = SYSTEM_INSTRUCTIONS.format(
        user_name=user_name,
        user_role=user_role,
        kyc_status=kyc_status,
    )

    # Tools are defined inside the factory so they can capture user.id

    @function_tool
    def get_my_balances() -> Dict[str, Any]:
        """Get current wallet balances for this user."""
        with Session(engine) as session:
            db_user = session.get(User, user.id)
            if not db_user:
                return {"error": "User not found"}

            main_wallet = float(db_user.wallet_balance or db_user.balance or 0.0)
            copy_wallet = float(
                getattr(db_user, "copy_trading_wallet_balance", 0.0)
                or getattr(db_user, "copy_trading_balance", 0.0)
                or 0.0
            )
            long_term_wallet = float(
                getattr(db_user, "long_term_wallet_balance", 0.0)
                or getattr(db_user, "long_term_balance", 0.0)
                or 0.0
            )

            total = main_wallet + copy_wallet + long_term_wallet

            summary = session.exec(
                select(AccountSummary).where(AccountSummary.user_id == user.id)
            ).first()

            return {
                "user_id": str(user.id),
                "main_wallet": round(main_wallet, 2),
                "copy_trading_wallet": round(copy_wallet, 2),
                "long_term_wallet": round(long_term_wallet, 2),
                "total_balance": round(total, 2),
                "pending_long_term_withdrawal": float(
                    getattr(summary, "pending_long_term_withdrawal", 0.0)
                )
                if summary
                else 0.0,
                "currency": "USD",
            }

    @function_tool
    def check_kyc_details() -> Dict[str, Any]:
        """Return the user's KYC status and any relevant notes."""
        with Session(engine) as session:
            db_user = session.get(User, user.id)
            if not db_user:
                return {"error": "User not found"}

            return {
                "user_id": str(db_user.id),
                "kyc_status": getattr(db_user.kyc_status, "value", str(db_user.kyc_status)),
                "kyc_submitted_at": _format_timestamp(db_user.kyc_submitted_at),
                "kyc_verified_at": _format_timestamp(db_user.kyc_verified_at),
                "kyc_approved_at": _format_timestamp(db_user.kyc_approved_at),
                "kyc_rejected_reason": db_user.kyc_rejected_reason,
                "kyc_notes": db_user.kyc_notes,
                "email_verified": bool(getattr(db_user, "email_verified", False)),
            }

    @function_tool
    def check_recent_transactions(limit: int = 5) -> List[Dict[str, Any]]:
        """Return a simplified list of recent transactions for this user."""
        limit = max(1, min(limit, 25))
        with Session(engine) as session:
            stmt = (
                select(Transaction)
                .where(Transaction.user_id == user.id)
                .order_by(Transaction.created_at.desc())
                .limit(limit)
            )
            rows = session.exec(stmt).all()

        simplified: List[Dict[str, Any]] = []
        for tx in rows:
            simplified.append(
                {
                    "id": str(tx.id),
                    "created_at": _format_timestamp(tx.created_at),
                    "type": getattr(tx.transaction_type, "value", str(tx.transaction_type)),
                    "status": getattr(tx.status, "value", str(tx.status)),
                    "amount": float(tx.amount or 0.0),
                    "description": tx.description,
                }
            )
        return simplified

    @function_tool
    def get_market_price(symbol: str) -> Dict[str, Any]:
        """Get the current market price for a symbol using live CoinGecko data where available."""
        symbol_normalized = symbol.strip().upper()
        rates = get_crypto_prices_sync()

        if symbol_normalized in rates:
            price = rates[symbol_normalized]
            return {
                "symbol": symbol_normalized,
                "price": float(price),
                "currency": "USD",
                "source": "coingecko",
            }

        # For non-crypto symbols, we currently don't have live data; return a structured message.
        return {
            "symbol": symbol_normalized,
            "error": "Live market data is only available for supported crypto symbols (BTC, ETH, USDT, USDC).",
        }

    @function_tool
    def get_route_help(route: str) -> Dict[str, Any]:
        """Get structured help for a specific Apex Trading route (e.g. /dashboard/executions)."""
        return kb_get_route_help(route)

    @function_tool
    def get_feature_help(route: str, feature_id: str | None = None) -> Dict[str, Any]:
        """Get detailed help for a specific feature on a given route.

        The `feature_id` should match one of the documented keys for that route, such as
        'portfolio_overview', 'roi_chart', 'executions_table', 'copy_positions', etc.
        """
        return kb_get_feature_help(route, feature_id)

    agent = Agent[Dict[str, Any]](
        name="Apex Support",
        instructions=instructions,
        model=DEFAULT_MODEL,
        tools=[
            get_my_balances,
            check_kyc_details,
            check_recent_transactions,
            get_market_price,
            get_route_help,
            get_feature_help,
        ],
    )
    return agent


__all__ = ["SYSTEM_INSTRUCTIONS", "get_customer_support_agent"]
