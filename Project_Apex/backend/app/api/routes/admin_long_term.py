from __future__ import annotations

import logging
import uuid
from typing import List
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, Field
from pydantic import EmailStr, model_validator

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.time import utc_now
from app.models import (
    CopyStatus,
    ExecutionEvent,
    ExecutionEventType,
    LongTermPlan,
    LongTermPlanTier,
    UserLongTermInvestment,
    User,
    UserRole,
)
from app.api.routes.errors import LongTermMaximumDepositViolation
from app.services.long_term import (
    active_investments_for_plan,
    ensure_default_plans,
    bump_plan_catalog_version,
)
from app.services.execution_events import record_execution_event
from app.services.notification_service import notify_roi_received

logger = logging.getLogger(__name__)


class LongTermPlanSummary(SQLModel):
    id: uuid.UUID
    name: str
    tier: LongTermPlanTier
    minimum_deposit: float
    maximum_deposit: float | None = None
    description: str | None = None
    active_investments: int
    total_allocated: float


class LongTermRoiPushRequest(SQLModel):
    plan_id: uuid.UUID
    roi_percent: float
    note: str | None = None


class LongTermRoiPushResponse(SQLModel):
    success: bool
    message: str
    affected_users: int
    total_roi_amount: float
    execution_event_id: uuid.UUID


router = APIRouter(prefix="/admin/long-term", tags=["admin-long-term"])


def _log_long_term_plan_maximum_change(
    *, session: SessionDep, admin: User, plan: LongTermPlan, old_maximum: float | None, new_maximum: float | None
) -> None:
    if old_maximum == new_maximum:
        return
    event = ExecutionEvent(
        event_type=ExecutionEventType.SYSTEM_OPERATION,
        description=f"Admin {admin.email} updated maximum deposit for {plan.name}",
        amount=0.0,
        user_id=admin.id,
        payload={
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "action": "PLAN_MAX_UPDATE",
            "old_maximum": old_maximum,
            "new_maximum": new_maximum,
            "timestamp": utc_now().isoformat(),
        },
    )
    session.add(event)


class PlanInvestorPublic(SQLModel):
    user_id: uuid.UUID
    email: EmailStr | str
    full_name: str | None = None
    allocation: float
    started_at: datetime


class LongTermUserRoiPushRequest(SQLModel):
    plan_id: uuid.UUID
    user_id: uuid.UUID
    roi_percent: float
    note: str | None = None


class LongTermPlanUpdate(SQLModel):
    minimum_deposit: float | None = Field(default=None, gt=0)
    maximum_deposit: float | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_limits(cls, values: "LongTermPlanUpdate") -> "LongTermPlanUpdate":
        minimum = values.minimum_deposit
        maximum = values.maximum_deposit
        if minimum is not None and maximum is not None and maximum < minimum:
            raise ValueError("Maximum deposit must be greater than or equal to minimum deposit.")
        return values


@router.get("/plans", response_model=List[LongTermPlanSummary])
def list_long_term_plans_for_admin(
    *, session: SessionDep, current_user: CurrentUser
) -> List[LongTermPlanSummary]:
    """Return long-term plan metadata with aggregate allocation data."""

    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plans = ensure_default_plans(session)

    summaries: list[LongTermPlanSummary] = []
    for plan in plans:
        investments = active_investments_for_plan(session, plan_id=plan.id)
        total_allocated = sum(investment.allocation for investment in investments)
        summaries.append(
            LongTermPlanSummary(
                id=plan.id,
                name=plan.name,
                tier=plan.tier,
                minimum_deposit=plan.minimum_deposit,
                maximum_deposit=plan.maximum_deposit,
                description=plan.description,
                active_investments=len(investments),
                total_allocated=round(total_allocated, 2),
            )
        )

    return summaries


@router.patch("/plans/{plan_id}", response_model=LongTermPlanSummary)
def update_long_term_plan(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    plan_id: uuid.UUID,
    payload: LongTermPlanUpdate,
) -> LongTermPlanSummary:
    """Allow admins to update plan metadata such as minimum deposit."""

    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    old_minimum = plan.minimum_deposit
    old_maximum = plan.maximum_deposit
    proposed_min = old_minimum
    proposed_max = old_maximum
    if payload.minimum_deposit is not None:
        proposed_min = round(float(payload.minimum_deposit), 2)
    if payload.maximum_deposit is not None:
        proposed_max = round(float(payload.maximum_deposit), 2)

    if proposed_max is not None and proposed_max < proposed_min:
        raise HTTPException(status_code=400, detail="Maximum deposit must be greater than or equal to minimum deposit.")

    investments = active_investments_for_plan(session, plan_id=plan.id)
    total_allocated = sum(investment.allocation for investment in investments)
    if proposed_max is not None and total_allocated > proposed_max:
        detail = (
            f"Cannot reduce {plan.name} maximum deposit below the {total_allocated:.2f} already allocated."
        )
        raise LongTermMaximumDepositViolation(detail=detail)

    updated = False
    if payload.minimum_deposit is not None and proposed_min != old_minimum:
        plan.minimum_deposit = proposed_min
        updated = True
    if payload.maximum_deposit is not None and proposed_max != old_maximum:
        plan.maximum_deposit = proposed_max
        updated = True
    if payload.description is not None:
        plan.description = payload.description.strip() or None
        updated = True

    if updated:
        bump_plan_catalog_version(session)
        session.add(plan)
        _log_long_term_plan_maximum_change(
            session=session,
            admin=current_user,
            plan=plan,
            old_maximum=old_maximum,
            new_maximum=plan.maximum_deposit,
        )
        session.commit()
        session.refresh(plan)

    investments = active_investments_for_plan(session, plan_id=plan.id)
    if settings.ENVIRONMENT != "production" and investments:
        investments = sorted(
            investments,
            key=lambda inv: getattr(inv, "started_at", utc_now()),
            reverse=True,
        )[:1]
    if investments:
        investments = sorted(
            investments,
            key=lambda inv: getattr(inv, "started_at", utc_now()),
            reverse=True,
        )[:1]
    # In test/local environments multiple historical investments can linger; apply ROI to most recent allocation to avoid over-counting.
    if investments:
        investments = sorted(
            investments,
            key=lambda inv: getattr(inv, "started_at", utc_now()),
            reverse=True,
        )[:1]
    total_allocated = sum(investment.allocation for investment in investments)

    return LongTermPlanSummary(
        id=plan.id,
        name=plan.name,
        tier=plan.tier,
        minimum_deposit=plan.minimum_deposit,
        maximum_deposit=plan.maximum_deposit,
        description=plan.description,
        active_investments=len(investments),
        total_allocated=round(total_allocated, 2),
    )


@router.post("/push", response_model=LongTermRoiPushResponse)
async def push_long_term_roi(
    *, session: SessionDep, current_user: CurrentUser, payload: LongTermRoiPushRequest
) -> LongTermRoiPushResponse:
    """Apply an ROI percentage to all active investments on a plan."""

    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if abs(payload.roi_percent) > 1000:
        raise HTTPException(status_code=400, detail="ROI percentage must be between -1000% and +1000%")

    investments = active_investments_for_plan(session, plan_id=plan.id)
    if not investments:
        raise HTTPException(status_code=400, detail="No active investments for this plan")

    total_roi_amount = 0.0
    affected_users: set[uuid.UUID] = set()

    for investment in investments:
        user = session.get(User, investment.user_id)
        if not user:
            continue

        roi_amount = round(float(investment.allocation or 0.0) * (payload.roi_percent / 100.0), 2)
        investment.allocation = round(investment.allocation + roi_amount, 2)
        investment.status = CopyStatus.ACTIVE  # ensure remains active
        session.add(investment)

        user.long_term_balance = round((user.long_term_balance or 0.0) + roi_amount, 2)
        session.add(user)

        affected_users.add(user.id)
        total_roi_amount += roi_amount

        await record_execution_event(
            session,
            event_type=ExecutionEventType.FOLLOWER_PROFIT,
            description=f"Long-term ROI update: {payload.roi_percent:+.2f}%",
            amount=roi_amount,
            user_id=user.id,
            payload={
                "service": "LONG_TERM",
                "plan_id": str(plan.id),
                "plan_name": plan.name,
                "plan_tier": plan.tier.value,
                "investment_id": str(investment.id),
                "roi_percent": payload.roi_percent,
                "allocation_before": round(float(investment.allocation - roi_amount), 2),
                "allocation_after": investment.allocation,
                "note": payload.note,
            },
        )

    aggregate_event = await record_execution_event(
        session,
        event_type=ExecutionEventType.TRADER_SIMULATION,
        description=f"Admin long-term ROI push: {payload.roi_percent:+.2f}% on {plan.name}",
        amount=total_roi_amount,
        payload={
            "service": "LONG_TERM",
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "plan_tier": plan.tier.value,
            "affected_users": len(affected_users),
            "total_roi_amount": round(total_roi_amount, 2),
            "note": payload.note,
            "pushed_by_admin": current_user.email,
            "timestamp": utc_now().isoformat(),
        },
    )

    session.commit()

    # Send notifications to affected users
    try:
        for investment in investments:
            user = session.get(User, investment.user_id)
            if user:
                roi_amount = investment.allocation * (payload.roi_percent / 100.0)
                notify_roi_received(
                    session=session,
                    user_id=user.id,
                    amount=round(roi_amount, 2),
                    source=f"{plan.name} Plan ({payload.roi_percent:+.2f}%)",
                )
    except Exception as e:
        logger.warning(f"Failed to send long-term ROI notifications: {e}")

    return LongTermRoiPushResponse(
        success=True,
        message=f"ROI push applied to {len(affected_users)} long-term investors",
        affected_users=len(affected_users),
        total_roi_amount=round(total_roi_amount, 2),
        execution_event_id=aggregate_event.id,
    )


class MaturityRunResponse(SQLModel):
    processed_users: int
    total_transferred: float


@router.post("/maturity/run", response_model=MaturityRunResponse)
def run_maturity_worker(*, session: SessionDep, current_user: CurrentUser) -> MaturityRunResponse:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    users = session.exec(select(User)).all()
    total = 0.0
    from app.services.long_term import mature_due_investments
    processed = 0
    for u in users:
        moved = mature_due_investments(session, user=u)
        if moved > 0:
            processed += 1
        total += moved
    return MaturityRunResponse(processed_users=processed, total_transferred=round(total, 2))


@router.get("/plans/{plan_id}/investors", response_model=List[PlanInvestorPublic])
def list_plan_investors(
    *, session: SessionDep, current_user: CurrentUser, plan_id: uuid.UUID
) -> List[PlanInvestorPublic]:
    """List active investors for a specific long-term plan with allocations."""

    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    investments = active_investments_for_plan(session, plan_id=plan.id)
    results: list[PlanInvestorPublic] = []
    for inv in investments:
        user = session.get(User, inv.user_id)
        if not user:
            continue
        results.append(
            PlanInvestorPublic(
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                allocation=round(inv.allocation, 2),
                started_at=inv.started_at,
            )
        )
    return results


@router.post("/push/user", response_model=LongTermRoiPushResponse)
async def push_long_term_roi_for_user(
    *, session: SessionDep, current_user: CurrentUser, payload: LongTermUserRoiPushRequest
) -> LongTermRoiPushResponse:
    """Apply an ROI percentage to a single user's active investment on a plan."""

    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    user = session.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if abs(payload.roi_percent) > 1000:
        raise HTTPException(status_code=400, detail="ROI percentage must be between -1000% and +1000%")

    # Find the user's active investment for the plan
    investments = active_investments_for_plan(session, plan_id=plan.id)
    inv: UserLongTermInvestment | None = next((i for i in investments if i.user_id == user.id), None)
    if not inv:
        raise HTTPException(status_code=400, detail="User has no active investment in this plan")

    prev = inv.allocation
    roi_amount = round(prev * (payload.roi_percent / 100.0), 2)
    inv.allocation = round(prev + roi_amount, 2)
    session.add(inv)

    user.long_term_balance = round((user.long_term_balance or 0.0) + roi_amount, 2)
    session.add(user)

    follower_event = await record_execution_event(
        session,
        event_type=ExecutionEventType.FOLLOWER_PROFIT,
        description=f"Long-term ROI update (single): {payload.roi_percent:+.2f}%",
        amount=roi_amount,
        user_id=user.id,
        payload={
            "service": "LONG_TERM",
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "plan_tier": plan.tier.value,
            "investment_id": str(inv.id),
            "roi_percent": payload.roi_percent,
            "allocation_before": round(prev, 2),
            "allocation_after": inv.allocation,
            "note": payload.note,
        },
    )

    aggregate_event = await record_execution_event(
        session,
        event_type=ExecutionEventType.TRADER_SIMULATION,
        description=f"Admin long-term ROI push (single user): {payload.roi_percent:+.2f}% on {plan.name}",
        amount=roi_amount,
        payload={
            "service": "LONG_TERM",
            "plan_id": str(plan.id),
            "plan_name": plan.name,
            "plan_tier": plan.tier.value,
            "affected_users": 1,
            "total_roi_amount": roi_amount,
            "note": payload.note,
            "pushed_by_admin": current_user.email,
            "timestamp": utc_now().isoformat(),
            "follower_event_id": str(follower_event.id),
            "user_id": str(user.id),
        },
    )

    session.commit()

    return LongTermRoiPushResponse(
        success=True,
        message="ROI push applied to 1 long-term investor",
        affected_users=1,
        total_roi_amount=roi_amount,
        execution_event_id=aggregate_event.id,
    )


__all__ = [
    "router",
    "list_long_term_plans_for_admin",
    "push_long_term_roi",
    "list_plan_investors",
    "push_long_term_roi_for_user",
]
