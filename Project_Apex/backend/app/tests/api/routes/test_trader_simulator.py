from sqlmodel import Session, select

from app.core.db import engine
from app.models import TraderProfile, TraderTrade, Trade
from app.services.trader_simulator import TraderSimulator


def test_trader_simulator() -> None:
    """Ensure simulator runs and persists data without errors."""
    with Session(engine) as session:
        simulator = TraderSimulator()
        simulator.initialize_trader_profiles(session)
        simulator.generate_trader_performance(session)
        simulation_run = simulator.simulate_trader_trade(session)

        trader_profiles = session.exec(select(TraderProfile)).all()
        trader_trades = session.exec(select(TraderTrade)).all()
        copied_trades = session.exec(select(Trade)).all()

        assert trader_profiles, "Simulator should create trader profiles"
        assert simulation_run.trader_trades, "Simulator should create trader trades"
        assert trader_trades, "Trades should persist"
        assert copied_trades is not None  # allow zero copies but ensure query works
