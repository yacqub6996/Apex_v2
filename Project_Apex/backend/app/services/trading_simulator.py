# File: backend/app/services/trading_simulator.py
import random
import uuid
from datetime import datetime
from typing import List, cast

from sqlmodel import Session, select

from app.core.time import utc_now
from app.models import MarketDataCache, TradeSimulation, User

class TradingSimulator:
    def __init__(self, db: Session):
        self.db = db
        self.win_rate = 0.65  # 65% win rate
        
    def get_current_market_price(self, symbol: str) -> float:
        # Try to get real price from cache, fallback to simulation
        cached = self.db.exec(
            select(MarketDataCache).where(MarketDataCache.symbol == symbol)
        ).first()
        if cached:
            # Use timezone-aware clock and total_seconds for robust thresholding
            age_seconds = (utc_now() - cached.last_updated).total_seconds()
            if age_seconds < 300 and cached.current_price is not None:  # 5 minutes
                price: float = float(cached.current_price)
                return price
        
        # Simulate realistic price based on symbol type
        base_prices = {
            'BTC/USD': 65000, 'ETH/USD': 3500, 'SPX500': 5200,
            'AAPL': 180, 'GOOGL': 140, 'MSFT': 420
        }
        base = base_prices.get(symbol, 100)
        volatility = random.uniform(-0.02, 0.02)  # ±2% daily movement
        simulated_price: float = float(base * (1 + volatility))
        return simulated_price
    
    def simulate_trade_for_user(self, user_id: uuid.UUID) -> TradeSimulation:
        symbols = ['BTC/USD', 'ETH/USD', 'SPX500', 'AAPL', 'GOOGL', 'MSFT']
        symbol = random.choice(symbols)
        current_price = self.get_current_market_price(symbol)
        
        # Determine trade outcome based on win rate
        is_win = random.random() < self.win_rate
        price_move = random.uniform(0.005, 0.03) if is_win else random.uniform(-0.02, -0.005)
        exit_price = current_price * (1 + price_move)
        
        # Realistic volume based on user balance
        user_raw = self.db.get(User, user_id)
        if not user_raw:
            raise ValueError("User not found")
        user = cast(User, user_raw)
        max_volume = float(user.balance) * 0.1  # Max 10% of balance per trade (legacy field)
        # Ensure a sane lower bound to avoid ValueError when balance is very low or zero
        if max_volume <= 0.01:
            volume = 0.01
        else:
            volume = random.uniform(0.01, max_volume)
        
        # P/L is proportional to price change; exit - entry already carries the sign
        profit_loss = volume * (exit_price - current_price)
        
        trade = TradeSimulation(
            user_id=user_id,
            symbol=symbol,
            direction='BUY' if is_win else 'SELL',  # Simplified logic
            volume=volume,
            entry_price=current_price,
            exit_price=exit_price,
            profit_loss=profit_loss,
            status='closed',
            closed_at=utc_now(),
        )
        
        # Update user balance with real data
        user.balance += profit_loss
        try:
            self.db.add(user)
            self.db.add(trade)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        
        return trade
    
    def generate_daily_trades(self, user_id: uuid.UUID, count: int = 3) -> List[TradeSimulation]:
        """Generate 1-5 trades per day for a user"""
        trades = []
        for _ in range(random.randint(1, count)):
            trade = self.simulate_trade_for_user(user_id)
            trades.append(trade)
        return trades