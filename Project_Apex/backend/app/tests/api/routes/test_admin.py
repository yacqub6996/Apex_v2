from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.models import (
    KycStatus,
    TransactionCreate,
    TransactionStatus,
    TransactionType,
)
from app.core.time import utc_now
from app.tests.utils.user import create_random_user


def test_admin_dashboard_requires_admin(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get('/api/v1/admin/dashboard', headers=normal_user_token_headers)
    assert response.status_code == 403


def test_admin_dashboard_summary(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    user = create_random_user(db)
    user.last_login_at = utc_now()
    user.kyc_status = KycStatus.PENDING
    user.kyc_notes = 'Passport uploaded'
    db.add(user)
    db.commit()
    db.refresh(user)

    completed_deposit = TransactionCreate(
        amount=250.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.COMPLETED,
        description='Seed deposit',
        user_id=user.id,
    )
    crud.create_transaction(session=db, tx_in=completed_deposit, owner_id=user.id)

    completed_withdrawal = TransactionCreate(
        amount=75.0,
        transaction_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.COMPLETED,
        description='Seed withdrawal',
        user_id=user.id,
    )
    crud.create_transaction(session=db, tx_in=completed_withdrawal, owner_id=user.id)

    pending_deposit = TransactionCreate(
        amount=125.0,
        transaction_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PENDING,
        description='Awaiting approval',
        user_id=user.id,
    )
    tx_pending = crud.create_transaction(session=db, tx_in=pending_deposit, owner_id=user.id)

    response = client.get('/api/v1/admin/dashboard', headers=superuser_token_headers)
    assert response.status_code == 200
    payload = response.json()

    totals = payload['totals']
    assert totals['total_users'] >= 1
    assert totals['total_deposits'] >= 250.0
    assert totals['total_withdrawals'] >= 75.0

    online_users = payload['online_users']
    assert any(entry['id'] == str(user.id) for entry in online_users)

    pending_kyc = payload['pending_kyc']
    assert any(entry['id'] == str(user.id) and entry['kyc_status'] == 'pending' for entry in pending_kyc)

    pending_deposits = payload['pending_deposits']
    assert any(entry['id'] == str(tx_pending.id) for entry in pending_deposits)
