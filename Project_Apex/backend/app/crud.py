import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.core.time import utc_now
from app.models import (
    AccountSummary,
    AccountSummaryBase,
    AccountTier,
    CopyTradingWallet,
    DailyPerformance,
    DailyPerformanceCreate,
    Item,
    ItemCreate,
    KycStatus,
    LongTermWallet,
    Trade,
    TradeCreate,
    TradeUpdate,
    Transaction,
    TransactionCreate,
    TransactionStatus,
    TransactionUpdate,
    User,
    UserCreate,
    UserRole,
    UserUpdate,
)


def get_user_by_id(*, session: Session, user_id: uuid.UUID) -> User | None:
    statement = select(User).where(User.id == user_id)
    return session.exec(statement).first()


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def create_user(*, session: Session, user_create: UserCreate) -> User:
    user_data = user_create.model_dump(exclude={"password"})
    enum_mapping = {
        'role': UserRole,
        'account_tier': AccountTier,
        'kyc_status': KycStatus,
    }
    for enum_field, enum_cls in enum_mapping.items():
        value = user_data.get(enum_field)
        if isinstance(value, Enum):
            user_data[enum_field] = value.value
        elif isinstance(value, str) and value is not None:
            try:
                member = enum_cls[value]
            except KeyError:
                member = enum_cls(value)
            user_data[enum_field] = member.value
    hashed_password = get_password_hash(user_create.password)
    is_superuser = bool(user_data.pop("is_superuser", False) or user_create.role == UserRole.ADMIN)
    email_verified = bool(user_data.pop("email_verified", False) or is_superuser)
    user = User(
        **user_data,
        hashed_password=hashed_password,
        is_superuser=is_superuser,
        email_verified=email_verified,
        email_verified_at=utc_now() if email_verified else None,
    )
    # Create associated wallets atomically in the same transaction
    session.add(user)
    # UUIDs are assigned client-side; safe to reference before commit
    copy_wallet = CopyTradingWallet(user_id=user.id, balance=0.0)
    long_wallet = LongTermWallet(user_id=user.id, balance=0.0)
    # Set relationships (optional but helps with in-memory consistency)
    user.copy_trading_wallet = copy_wallet
    user.long_term_wallet = long_wallet
    session.add(copy_wallet)
    session.add(long_wallet)
    session.commit()
    session.refresh(user)
    return user


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    user_data = user_in.model_dump(exclude_unset=True)
    updates: dict[str, Any] = {}
    if "password" in user_data:
        updates["hashed_password"] = get_password_hash(user_data.pop("password"))
    if "role" in user_data:
        role = user_data["role"]
        updates["is_superuser"] = db_user.is_superuser or role == UserRole.ADMIN
    db_user.sqlmodel_update(user_data, update=updates)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_transaction(
    *, session: Session, tx_in: TransactionCreate, owner_id: uuid.UUID | None = None
) -> Transaction:
    payload = tx_in.model_dump(exclude_unset=True)
    user_id = tx_in.user_id or owner_id
    if user_id is None:
        raise ValueError("user_id must be provided to create a transaction")
    payload.update({"user_id": user_id})
    transaction = Transaction(**payload)
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    return transaction


def update_transaction(
    *, session: Session, db_tx: Transaction, tx_in: TransactionUpdate
) -> Transaction:
    tx_data = tx_in.model_dump(exclude_unset=True)
    if "status" in tx_data and tx_data["status"] == TransactionStatus.COMPLETED:
        tx_data.setdefault("executed_at", utc_now())
    db_tx.sqlmodel_update(tx_data)
    session.add(db_tx)
    session.commit()
    session.refresh(db_tx)
    return db_tx


def create_trade(
    *, session: Session, trade_in: TradeCreate, owner_id: uuid.UUID | None = None
) -> Trade:
    payload = trade_in.model_dump(exclude_unset=True)
    user_id = trade_in.user_id or owner_id
    if user_id is None:
        raise ValueError("user_id must be provided to create a trade")
    payload.update({"user_id": user_id})
    trade = Trade(**payload)
    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade


def update_trade(*, session: Session, db_trade: Trade, trade_in: TradeUpdate) -> Trade:
    trade_data = trade_in.model_dump(exclude_unset=True)
    db_trade.sqlmodel_update(trade_data)
    session.add(db_trade)
    session.commit()
    session.refresh(db_trade)
    return db_trade


def create_daily_performance(
    *, session: Session, perf_in: DailyPerformanceCreate, owner_id: uuid.UUID | None = None
) -> DailyPerformance:
    payload = perf_in.model_dump(exclude_unset=True)
    user_id = perf_in.user_id or owner_id
    if user_id is None:
        raise ValueError("user_id must be provided to create daily performance")
    payload.update({"user_id": user_id})
    record = DailyPerformance(**payload)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def upsert_account_summary(
    *, session: Session, user_id: uuid.UUID, summary_in: AccountSummaryBase
) -> AccountSummary:
    statement = select(AccountSummary).where(AccountSummary.user_id == user_id)
    summary = session.exec(statement).first()
    payload = summary_in.model_dump()
    if summary:
        summary.sqlmodel_update(payload)
        session.add(summary)
        session.commit()
        session.refresh(summary)
        return summary
    summary = AccountSummary(user_id=user_id, **payload)
    session.add(summary)
    session.commit()
    session.refresh(summary)
    return summary
