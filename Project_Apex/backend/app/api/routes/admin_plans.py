from __future__ import annotations

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, desc, select

from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import LongTermPlan, LongTermPlanPublic, LongTermPlanTier, UserRole


router = APIRouter(prefix="/admin/plans", tags=["admin-plans"])


class PlanCreate(SQLModel):
    name: str
    tier: LongTermPlanTier
    minimum_deposit: float
    description: str | None = None
    due_date: datetime | None = None


class PlanUpdate(SQLModel):
    name: str | None = None
    tier: LongTermPlanTier | None = None
    minimum_deposit: float | None = None
    description: str | None = None
    due_date: datetime | None = None


@router.post("/", response_model=LongTermPlanPublic)
def create_plan(*, session: SessionDep, current_user: CurrentUser, payload: PlanCreate) -> LongTermPlanPublic:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Use model_validate with a payload dict to satisfy static type checkers
    # while preserving the exact field mapping and defaults.
    plan = LongTermPlan.model_validate({
        **payload.model_dump(),
        "created_at": utc_now(),
    })
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return LongTermPlanPublic.model_validate(plan)


@router.get("/", response_model=List[LongTermPlanPublic])
def list_plans(*, session: SessionDep, current_user: CurrentUser) -> List[LongTermPlanPublic]:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plans = session.exec(select(LongTermPlan).order_by(desc(LongTermPlan.created_at))).all()
    return [LongTermPlanPublic.model_validate(p) for p in plans]


@router.get("/{plan_id}", response_model=LongTermPlanPublic)
def read_plan(*, session: SessionDep, current_user: CurrentUser, plan_id: uuid.UUID) -> LongTermPlanPublic:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return LongTermPlanPublic.model_validate(plan)


@router.put("/{plan_id}", response_model=LongTermPlanPublic)
def update_plan(
    *, session: SessionDep, current_user: CurrentUser, plan_id: uuid.UUID, payload: PlanUpdate
) -> LongTermPlanPublic:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if payload.name is not None:
        plan.name = payload.name
    if payload.tier is not None:
        plan.tier = payload.tier
    if payload.minimum_deposit is not None:
        plan.minimum_deposit = payload.minimum_deposit
    if payload.description is not None:
        plan.description = payload.description
    if payload.due_date is not None or payload.due_date is None:
        plan.due_date = payload.due_date

    session.add(plan)
    session.commit()
    session.refresh(plan)
    return LongTermPlanPublic.model_validate(plan)


@router.delete("/{plan_id}")
def delete_plan(*, session: SessionDep, current_user: CurrentUser, plan_id: uuid.UUID) -> dict:
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    plan = session.get(LongTermPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    session.delete(plan)
    session.commit()
    return {"status": "deleted", "id": str(plan_id)}

