import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core.time import utc_now
from app.models import (
    Trade,
    TradeCreate,
    TradePublic,
    Message,
    TradeStatus,
    TradeUpdate,
    TradesPublic,
    UserRole,
)

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("/", response_model=TradesPublic)
def read_trades(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    if current_user.is_superuser or current_user.role == UserRole.ADMIN:
        count_statement = select(func.count()).select_from(Trade)
        count = session.exec(count_statement).one()
        statement = select(Trade).offset(skip).limit(limit)
        trades = session.exec(statement).all()
    else:
        count_statement = (
            select(func.count())
            .select_from(Trade)
            .where(Trade.user_id == current_user.id)
        )
        count = session.exec(count_statement).one()
        statement = (
            select(Trade)
            .where(Trade.user_id == current_user.id)
            .offset(skip)
            .limit(limit)
        )
        trades = session.exec(statement).all()
    return TradesPublic(data=[TradePublic.model_validate(trade) for trade in trades], count=count)


@router.post("/", response_model=TradePublic)
def create_trade(
    *, session: SessionDep, current_user: CurrentUser, trade_in: TradeCreate
) -> Trade:
    owner_id = None if current_user.is_superuser or current_user.role == UserRole.ADMIN else current_user.id
    if owner_id:
        trade_in.user_id = owner_id
    trade = crud.create_trade(session=session, trade_in=trade_in, owner_id=owner_id)
    return trade


@router.put("/{trade_id}", response_model=TradePublic)
def update_trade(
    *, session: SessionDep, current_user: CurrentUser, trade_id: uuid.UUID, trade_in: TradeUpdate
) -> Trade:
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and trade.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    payload = trade_in.model_dump(exclude_unset=True)
    if payload.get("status") == TradeStatus.CLOSED and payload.get("closed_at") is None:
        payload["closed_at"] = utc_now()
    trade_update = TradeUpdate.model_validate(payload)
    trade = crud.update_trade(session=session, db_trade=trade, trade_in=trade_update)
    return trade


@router.delete("/{trade_id}")
def delete_trade(
    session: SessionDep, current_user: CurrentUser, trade_id: uuid.UUID
) -> Message:
    trade = session.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if not (current_user.is_superuser or current_user.role == UserRole.ADMIN) and trade.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    session.delete(trade)
    session.commit()
    return Message(message="Trade deleted successfully")


