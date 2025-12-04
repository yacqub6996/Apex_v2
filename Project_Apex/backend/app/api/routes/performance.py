import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    DailyPerformance,
    DailyPerformanceCollection,
    DailyPerformanceCreate,
    DailyPerformancePublic,
    Message,
    UserRole,
)

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/", response_model=DailyPerformanceCollection)
def read_performance(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    if current_user.is_superuser or current_user.role == UserRole.ADMIN:
        count_statement = select(func.count()).select_from(DailyPerformance)
        count = session.exec(count_statement).one()
        statement = select(DailyPerformance).offset(skip).limit(limit)
        records = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(DailyPerformance)
            .where(DailyPerformance.user_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(DailyPerformance)
            .where(DailyPerformance.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        records = session.exec(statement).all()
    return DailyPerformanceCollection(
        data=[DailyPerformancePublic.model_validate(record) for record in records],
        count=count,
    )


@router.post("/", response_model=DailyPerformancePublic)
def create_performance(
    *, session: SessionDep, current_user: CurrentUser, perf_in: DailyPerformanceCreate
) -> DailyPerformance:
    is_admin = current_user.is_superuser or current_user.role == UserRole.ADMIN
    if not is_admin:
        perf_in.user_id = current_user.id
    elif perf_in.user_id is None:
        raise HTTPException(status_code=400, detail="user_id is required for admin-created performance records")
    record = crud.create_daily_performance(
        session=session,
        perf_in=perf_in,
        owner_id=None if is_admin else current_user.id,
    )
    return record


@router.delete("/{record_id}")
def delete_performance(
    session: SessionDep, current_user: CurrentUser, record_id: uuid.UUID
) -> Message:
    record = session.get(DailyPerformance, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Performance entry not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(record)
    session.commit()
    return Message(message="Performance entry deleted successfully")

