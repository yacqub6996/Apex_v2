from __future__ import annotations

import pytest

from sqlmodel import Session

from app import crud
from app.models import (
    CopyStatus,
    LongTermPlan,
    LongTermPlanTier,
    User,
    UserCreate,
    UserLongTermInvestment,
)
from app.services.long_term import projected_plan_allocation
from app.tests.utils.utils import random_email, random_lower_string


def _create_plan(session: Session) -> LongTermPlan:
    plan = LongTermPlan(
        name="Test Cap Plan",
        tier=LongTermPlanTier.FOUNDATION,
        minimum_deposit=500.0,
        maximum_deposit=5_000.0,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


def _create_user(session: Session) -> User:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = crud.create_user(session=session, user_create=user_in)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_projected_plan_allocation_reflects_active_investments(db: Session) -> None:
    plan = _create_plan(db)
    user = _create_user(db)

    allocations = [250.0, 750.0]
    for amt in allocations:
        investment = UserLongTermInvestment(
            user_id=user.id,
            plan_id=plan.id,
            allocation=amt,
            status=CopyStatus.ACTIVE,
        )
        db.add(investment)
    db.commit()

    current_total, projected_total = projected_plan_allocation(
        db,
        plan_id=plan.id,
        additional=100.0,
    )

    assert current_total == pytest.approx(sum(allocations))
    assert projected_total == pytest.approx(sum(allocations) + 100.0)


def test_projected_plan_allocation_locking_preserves_totals(db: Session) -> None:
    plan = _create_plan(db)
    user = _create_user(db)

    investment = UserLongTermInvestment(
        user_id=user.id,
        plan_id=plan.id,
        allocation=500.0,
        status=CopyStatus.ACTIVE,
    )
    db.add(investment)
    db.commit()

    without_lock = projected_plan_allocation(db, plan_id=plan.id, additional=25.0)
    with_lock = projected_plan_allocation(db, plan_id=plan.id, additional=25.0, lock=True)

    assert with_lock == without_lock
