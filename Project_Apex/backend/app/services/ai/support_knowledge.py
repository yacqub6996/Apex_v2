from __future__ import annotations

from typing import Any, Dict, List, Optional


def _normalise_route(route: str) -> str:
    """Normalise a frontend route string for lookup."""
    route = (route or "").strip()
    if not route:
        return "/dashboard"
    if "?" in route:
        route = route.split("?", 1)[0]
    if "#" in route:
        route = route.split("#", 1)[0]
    if not route.startswith("/"):
        route = "/" + route
    if route != "/" and route.endswith("/"):
        route = route[:-1]
    return route.lower()


# Canonical description of key Apex Trading user-facing routes.
#
# This is intentionally structured and conservative – it only encodes behaviour
# that exists in the current dashboard implementation, so the agent does not
# hallucinate marketing features from the landing page.
ROUTE_HELP: Dict[str, Dict[str, Any]] = {
    "/dashboard": {
        "label": "User Dashboard",
        "description": (
            "The main overview of the user's Apex account, showing portfolio value, "
            "recent performance, wallet balances, copy-trading activity and recent transactions."
        ),
        "key_features": [
            {
                "id": "portfolio_overview",
                "label": "Portfolio Overview Cards",
                "description": (
                    "Top cards that show total portfolio value, main wallet balance, "
                    "long-term wallet balance and copy trading wallet balance."
                ),
                "user_actions": [
                    "Confirm your balances at a glance before making deposits or withdrawals.",
                    "Use these cards to understand how much is allocated to copy trading vs long-term plans.",
                ],
            },
            {
                "id": "roi_chart",
                "label": "ROI / Performance Chart",
                "description": (
                    "A performance chart driven by execution events and copy-trading history, "
                    "showing daily profit/loss over time."
                ),
                "user_actions": [
                    "Change the time range (7d / 30d / all) to understand short vs long-term performance.",
                    "Use this chart to verify that ROI payouts reflected in your history line up with overall growth.",
                ],
            },
            {
                "id": "executions_preview",
                "label": "Recent Executions & Transactions Preview",
                "description": (
                    "A table or list of recent copy-trading executions and transaction events "
                    "with amounts, dates and descriptions."
                ),
                "user_actions": [
                    "Click through to the Executions page if you need full details on a specific event.",
                    "Cross‑check ROI credits or withdrawals against individual events here.",
                ],
            },
            {
                "id": "kyc_banners",
                "label": "KYC and Pending Deposit Banners",
                "description": (
                    "Banners that remind the user to complete verification, review pending deposits, "
                    "or wait for under‑review KYC checks."
                ),
                "user_actions": [
                    "Follow the banner links to complete KYC before attempting withdrawals.",
                    "Use these cues when asking support about why a withdrawal or feature may be blocked.",
                ],
            },
        ],
    },
    "/dashboard/executions": {
        "label": "Executions",
        "description": (
            "A detailed list of execution events such as copy-trading fills, ROI credits and "
            "system adjustments."
        ),
        "key_features": [
            {
                "id": "executions_table",
                "label": "Executions Table",
                "description": (
                    "Tabular view showing each execution's date, type, amount and related trader or plan."
                ),
                "user_actions": [
                    "Filter or scan the table to find a specific ROI credit or trade fill.",
                    "Use exact timestamps and amounts from this table when raising a dispute or question.",
                ],
            }
        ],
    },
    "/dashboard/copy-trading": {
        "label": "Copy Trading Dashboard",
        "description": (
            "Screen for managing copy-trading allocations, followed traders and copy wallet funding."
        ),
        "key_features": [
            {
                "id": "copy_positions",
                "label": "Active Copy Positions",
                "description": (
                    "List of traders you are currently copying, including allocation amounts, "
                    "status (ACTIVE/PAUSED/STOPPED) and performance metrics."
                ),
                "user_actions": [
                    "Pause or stop copying a trader when you want to reduce risk.",
                    "Check a trader's performance and risk level before increasing your allocation.",
                ],
            },
            {
                "id": "copy_wallet",
                "label": "Copy Trading Wallet Funding",
                "description": (
                    "Controls and forms for moving money into the copy trading wallet from your main wallet."
                ),
                "user_actions": [
                    "Fund the copy wallet before attempting to start a new copy-trading allocation.",
                    "Use the wallet balance and funding history to verify that transfers succeeded.",
                ],
            },
        ],
    },
    "/plans": {
        "label": "Long-Term Plans",
        "description": (
            "Page for reviewing and managing long-term investment plans, including allocations and maturities."
        ),
        "key_features": [
            {
                "id": "plan_cards",
                "label": "Plan Overview Cards",
                "description": (
                    "Cards summarising each long-term plan tier, minimum deposits, expected duration and description."
                ),
                "user_actions": [
                    "Review minimum deposit requirements before moving funds into a plan.",
                    "Use plan descriptions to understand lock-up periods and when ROI is credited.",
                ],
            }
        ],
    },
    "/dashboard/account": {
        "label": "Account Profile",
        "description": (
            "User account details including personal information, KYC details and profile picture."
        ),
        "key_features": [
            {
                "id": "profile_details",
                "label": "Profile & Contact Details",
                "description": (
                    "Fields for your name, email and profile picture that the support team may reference "
                    "when verifying your account."
                ),
                "user_actions": [
                    "Keep your email up to date so you can receive notifications and password reset links.",
                ],
            }
        ],
    },
    "/dashboard/settings": {
        "label": "Settings",
        "description": (
            "Area for managing notification preferences and other platform-level settings."
        ),
        "key_features": [
            {
                "id": "notification_preferences",
                "label": "Notification Preferences",
                "description": (
                    "Toggle which events generate email or in-app notifications (deposits, withdrawals, ROI, etc.)."
                ),
                "user_actions": [
                    "Enable security alerts and withdrawal notifications for better account safety.",
                ],
            }
        ],
    },
    "/support": {
        "label": "Support",
        "description": (
            "The dedicated support page combining the AI assistant, email contact and a manual message form."
        ),
        "key_features": [
            {
                "id": "ai_support_assistant",
                "label": "AI Support Assistant",
                "description": (
                    "Embedded Apex Support Agent chat that can answer questions about your account, "
                    "balances, KYC status and platform features."
                ),
                "user_actions": [
                    "Use the AI assistant for quick, account-aware answers before submitting a ticket.",
                ],
            },
            {
                "id": "email_contact",
                "label": "Email Contact",
                "description": (
                    "Links for contacting Support@apex-portfolios.org for general or privacy enquiries."
                ),
                "user_actions": [
                    "Use email when you need a formal record, attachments, or escalation beyond Tier 1 support.",
                ],
            },
        ],
    },
}


ROUTE_ALIASES: Dict[str, str] = {
    "/": "/dashboard",
    "/dashboard/": "/dashboard",
    "/copy-trading": "/dashboard/copy-trading",
    "/dashboard/copy-trading/": "/dashboard/copy-trading",
}


def resolve_route(route: str) -> str:
    """Resolve a route (with aliases) to its canonical key."""
    normalised = _normalise_route(route)
    if normalised in ROUTE_HELP:
        return normalised
    if normalised in ROUTE_ALIASES:
        return ROUTE_ALIASES[normalised]
    return normalised


def get_route_help(route: str) -> Dict[str, Any]:
    """Return structured help for a full route.

    The agent can call this when a user asks: "What can I do on the Executions page?"
    """
    key = resolve_route(route)
    info = ROUTE_HELP.get(key)
    if info is None:
        return {
            "route": key,
            "label": "Unknown or unsupported route",
            "description": (
                "This route is not part of the main Apex Trading dashboard. "
                "I can still help with general account, balances, KYC and transactions."
            ),
            "key_features": [],
        }

    return {
        "route": key,
        **info,
    }


def get_feature_help(route: str, feature_id: Optional[str] = None) -> Dict[str, Any]:
    """Return detailed help for a specific feature on a route.

    If feature_id is omitted, this returns all known features for the route.
    """
    route_info = get_route_help(route)
    features: List[Dict[str, Any]] = route_info.get("key_features", [])

    if feature_id is None:
        return {
            "route": route_info["route"],
            "label": route_info["label"],
            "features": features,
        }

    for feature in features:
        if feature.get("id") == feature_id:
            return {
                "route": route_info["route"],
                "label": route_info["label"],
                "feature": feature,
            }

    return {
        "route": route_info["route"],
        "label": route_info["label"],
        "feature": None,
        "error": (
            "This route exists, but I don't have structured documentation for the "
            f"feature id '{feature_id}'. I can still answer general questions about it."
        ),
    }


__all__ = ["get_route_help", "get_feature_help"]

