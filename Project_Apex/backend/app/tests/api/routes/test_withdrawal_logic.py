from sqlmodel import Session, select

from app.core.db import engine
from app.models import User, UserTraderCopy, CopyStatus


def test_withdrawal_logic() -> None:
    """Ensure copy_trading_balance is not less than allocated copy amount."""
    with Session(engine) as session:
        user = session.exec(
            select(User).where(User.copy_trading_balance > 0).limit(1)
        ).first()
        assert user is not None, "No user found with copy trading balance for withdrawal check"

        copy_relationships = session.exec(
            select(UserTraderCopy).where(
                UserTraderCopy.user_id == user.id,
                UserTraderCopy.copy_status == CopyStatus.ACTIVE,
            )
        ).all()
        total_allocated = sum(rel.copy_amount for rel in copy_relationships)

        assert user.copy_trading_balance >= total_allocated
