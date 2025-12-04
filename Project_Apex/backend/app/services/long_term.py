"""Utility helpers for the managed long-term investment service."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timezone

from sqlmodel import Session, select

from app.models import (
    CopyStatus,
    LongTermPlan,
    LongTermPlanTier,
    LongTermWallet,
    User,
    UserLongTermInvestment,
    LongTermPlanCatalogVersion,
    LONG_TERM_PLAN_CATALOG_VERSION_ID,
)
from app.core.time import utc_now


@dataclass(frozen=True)
class DefaultPlanDefinition:
    name: str
    tier: LongTermPlanTier
    minimum_deposit: float
    maximum_deposit: float | None
    description: str


DEFAULT_PLAN_DEFINITIONS: tuple[DefaultPlanDefinition, ...] = (
    DefaultPlanDefinition(
        name="Foundation",
        tier=LongTermPlanTier.FOUNDATION,
        minimum_deposit=3_000.0,
        maximum_deposit=25_000.0,
        description="Entry plan focused on capital preservation with AI-assisted hedging.",
    ),
    DefaultPlanDefinition(
        name="Growth",
        tier=LongTermPlanTier.GROWTH,
        minimum_deposit=20_000.0,
        maximum_deposit=100_000.0,
        description="Balanced allocation combining momentum capture and defensive overlays.",
    ),
    DefaultPlanDefinition(
        name="Elite",
        tier=LongTermPlanTier.ELITE,
        minimum_deposit=50_000.0,
        maximum_deposit=250_000.0,
        description="High conviction strategy leveraging AI execution for asymmetric upside.",
    ),
)


def ensure_default_plans(session: Session) -> list[LongTermPlan]:
    """Ensure the three reference long-term plans exist and return the ordered list."""

    existing_plans = session.exec(select(LongTermPlan)).all()
    plans_by_tier = {plan.tier: plan for plan in existing_plans}

    has_changes = False
    for definition in DEFAULT_PLAN_DEFINITIONS:
        if definition.tier not in plans_by_tier:
            plan = LongTermPlan(
                name=definition.name,
                tier=definition.tier,
                minimum_deposit=definition.minimum_deposit,
                maximum_deposit=definition.maximum_deposit,
                description=definition.description,
            )
            session.add(plan)
            has_changes = True
        else:
            plan = plans_by_tier[definition.tier]
            updated = False
            if plan.maximum_deposit is None and definition.maximum_deposit is not None:
                plan.maximum_deposit = definition.maximum_deposit
                updated = True
            if not plan.description and definition.description:
                plan.description = definition.description
                updated = True
            if updated:
                session.add(plan)
                has_changes = True

    if has_changes:
        bump_plan_catalog_version(session)
        session.commit()
        existing_plans = session.exec(select(LongTermPlan)).all()

    return sorted(existing_plans, key=lambda plan: plan.minimum_deposit)


def active_investments_for_plan(
    session: Session,
    *,
    plan_id: uuid.UUID,
    lock: bool = False,
) -> list[UserLongTermInvestment]:
    """Fetch all active investments for a given plan."""

    stmt = (
        select(UserLongTermInvestment)
        .where(UserLongTermInvestment.plan_id == plan_id)
        .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
    )
    if lock:
        stmt = stmt.with_for_update()

    results = session.exec(stmt).all()
    return list(results) if results else []


def projected_plan_allocation(
    session: Session,
    *,
    plan_id: uuid.UUID,
    additional: float = 0.0,
    lock: bool = False,
) -> tuple[float, float]:
    """Return the current and projected total allocation for a plan."""

    investments = active_investments_for_plan(session, plan_id=plan_id, lock=lock)
    current_total = sum(float(inv.allocation or 0.0) for inv in investments)
    additional = round(additional, 2)
    projected = round(current_total + additional, 2)
    return round(current_total, 2), projected


def get_plan_catalog_version(session: Session) -> LongTermPlanCatalogVersion | None:
    return session.get(LongTermPlanCatalogVersion, LONG_TERM_PLAN_CATALOG_VERSION_ID)


def ensure_plan_catalog_version(session: Session, *, commit_on_missing: bool = False) -> LongTermPlanCatalogVersion:
    version_entry = get_plan_catalog_version(session)
    if version_entry:
        return version_entry
    version_entry = LongTermPlanCatalogVersion(id=LONG_TERM_PLAN_CATALOG_VERSION_ID)
    session.add(version_entry)
    if commit_on_missing:
        session.commit()
        session.refresh(version_entry)
    return version_entry


def current_plan_catalog_version(session: Session) -> LongTermPlanCatalogVersion:
    version_entry = get_plan_catalog_version(session)
    if version_entry:
        return version_entry
    return ensure_plan_catalog_version(session, commit_on_missing=True)


def bump_plan_catalog_version(session: Session) -> LongTermPlanCatalogVersion:
    version_entry = get_plan_catalog_version(session)
    if not version_entry:
        version_entry = LongTermPlanCatalogVersion(id=LONG_TERM_PLAN_CATALOG_VERSION_ID)
    current_value = version_entry.version or 0
    version_entry.version = current_value + 1
    version_entry.updated_at = utc_now()
    session.add(version_entry)
    return version_entry


__all__ = [
    "DEFAULT_PLAN_DEFINITIONS",
    "ensure_default_plans",
    "active_investments_for_plan",
    "projected_plan_allocation",
    "get_plan_catalog_version",
    "ensure_plan_catalog_version",
    "current_plan_catalog_version",
    "bump_plan_catalog_version",
    "mature_due_investments",
]


def mature_due_investments(session: Session, *, user: User) -> float:
    """Move matured user long-term investments into the user's Long-Term Wallet.

    Returns the total amount transferred.
    """
    now = utc_now()
    # Fetch all ACTIVE investments without date filtering (do it in Python for timezone safety)
    all_active = session.exec(
        select(UserLongTermInvestment)
        .where(UserLongTermInvestment.user_id == user.id)
        .where(UserLongTermInvestment.status == CopyStatus.ACTIVE)
    ).all()

    # Filter for due investments in Python (handle timezone-aware comparison safely)
    investments = []
    for inv in all_active:
        if inv.investment_due_date is None:
            continue
        # Normalize naive datetime to UTC-aware if needed
        due_date = inv.investment_due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        # Now both are aware, safe to compare
        if due_date <= now:
            investments.append(inv)

    if not investments:
        return 0.0

    # Ensure wallet
    session.refresh(user, attribute_names=["long_term_wallet"])  # type: ignore[arg-type]
    if user.long_term_wallet is None:
        user.long_term_wallet = LongTermWallet(user_id=user.id, balance=0.0)
        session.add(user.long_term_wallet)

    total = 0.0
    for inv in investments:
        amt = float(inv.allocation or 0.0)
        if amt <= 0:
            continue
        total += amt
        inv.allocation = 0.0
        inv.status = CopyStatus.STOPPED
        session.add(inv)

    if total > 0:
        current = float(user.long_term_wallet.balance or 0.0)
        user.long_term_wallet.balance = round(current + total, 2)
        session.add(user.long_term_wallet)
        session.add(user)
        session.commit()
    return total
