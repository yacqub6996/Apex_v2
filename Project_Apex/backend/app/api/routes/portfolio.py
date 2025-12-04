from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.trading_simulator import TradingSimulator

router = APIRouter()


@router.get("/simulate-trades/{user_id}")
def simulate_daily_trades(user_id: str, count: int = 3, db: Session = Depends(get_db)):
    simulator = TradingSimulator(db)
    trades = simulator.generate_daily_trades(user_id, count)
    return {"message": f"Generated {len(trades)} trades", "trades": trades}


@router.get("/market-prices")
def get_current_market_prices(db: Session = Depends(get_db)):
    simulator = TradingSimulator(db)
    symbols = ['BTC/USD', 'ETH/USD', 'SPX500', 'AAPL', 'GOOGL', 'MSFT']
    prices = {symbol: simulator.get_current_market_price(symbol) for symbol in symbols}
    return prices
