from fastapi import APIRouter

from app.api.routes import (
    admin,
    admin_executions,
    admin_ledger,
    admin_long_term,
    admin_plans,
    admin_simulations,
    copy_trading,
    crypto_deposits,
    customer_service_chatkit,
    email_sender,
    execution_events,
    items,
    kyc,
    login,
    long_term,
    long_term_roi,
    long_term_worker,
    notifications,
    performance,
    private,
    roi_calculations,
    roi_reversal,
    trades,
    transactions,
    traders,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(admin.router)
api_router.include_router(admin_ledger.router)
api_router.include_router(admin_long_term.router)
api_router.include_router(admin_plans.router)
api_router.include_router(admin_executions.router)
api_router.include_router(admin_simulations.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(transactions.router)
api_router.include_router(crypto_deposits.router)
api_router.include_router(trades.router)
api_router.include_router(performance.router)
api_router.include_router(traders.router)
api_router.include_router(copy_trading.router)
api_router.include_router(long_term.router)
api_router.include_router(execution_events.router)
api_router.include_router(kyc.router)
api_router.include_router(notifications.router)
api_router.include_router(roi_calculations.router)
api_router.include_router(roi_reversal.router)
api_router.include_router(long_term_roi.router)
api_router.include_router(long_term_worker.router)
api_router.include_router(email_sender.router)
api_router.include_router(email_sender.router)
api_router.include_router(customer_service_chatkit.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
