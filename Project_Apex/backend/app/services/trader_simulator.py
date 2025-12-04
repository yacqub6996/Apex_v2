import random
import uuid
import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List

from sqlmodel import Session, select
from app.core.time import utc_now

from app.models import (
    AccountSummary,
    CopyStatus,
    RiskTolerance,
    Trade,
    TradeSide,
    TradeStatus,
    TraderProfile,
    TraderTrade,
    User,
    UserTraderCopy,
)
from app.services.notification_service import notify_copy_trade_executed

logger = logging.getLogger(__name__)


@dataclass
class CopiedTradeRecord:
    trade: Trade
    source_trade: TraderTrade


@dataclass
class SimulationRun:
    trader_trades: List[TraderTrade]
    follower_trades: List[CopiedTradeRecord]


class TraderSimulator:
    """Simulates trader performance, intraday trades, and copy trading."""

    def __init__(self) -> None:
        self.specialty_symbols: Dict[str, List[str]] = {
            "forex": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD"],
            "crypto": ["BTC/USD", "ETH/USD", "ADA/USD", "SOL/USD", "DOT/USD"],
            "stocks": ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"],
            "indices": ["SPX500", "NASDAQ", "DJI", "FTSE", "DAX"],
        }

        self.base_prices: Dict[str, float] = {
            "EUR/USD": 1.08,
            "GBP/USD": 1.26,
            "USD/JPY": 150.0,
            "AUD/USD": 0.65,
            "USD/CAD": 1.35,
            "BTC/USD": 65_000.0,
            "ETH/USD": 3_500.0,
            "ADA/USD": 0.45,
            "SOL/USD": 120.0,
            "DOT/USD": 6.5,
            "AAPL": 180.0,
            "TSLA": 250.0,
            "MSFT": 420.0,
            "GOOGL": 140.0,
            "AMZN": 175.0,
            "NVDA": 900.0,
            "SPX500": 5_200.0,
            "NASDAQ": 18_000.0,
            "DJI": 38_000.0,
            "FTSE": 7_500.0,
            "DAX": 17_500.0,
        }

        self.volatility_factors: Dict[str, float] = {
            "forex": 0.005,
            "crypto": 0.03,
            "stocks": 0.02,
            "indices": 0.015,
        }

        # Sessions loosely aligned with global market opens.
        self.session_windows: List[tuple[str, time, time]] = [
            ("asia", time(0, 30), time(6, 0)),
            ("europe", time(6, 0), time(12, 0)),
            ("us", time(12, 0), time(17, 0)),
            ("after_hours", time(17, 0), time(23, 0)),
        ]
        self.session_minimums: Dict[str, int] = {
            "asia": 2,
            "europe": 3,
            "us": 4,
            "after_hours": 1,
        }

    def _generate_unique_trader_code(self, db: Session) -> str:
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        length_options = (6, 7, 8)

        while True:
            length = random.choice(length_options)
            candidate = "".join(random.choice(alphabet) for _ in range(length))
            existing = db.exec(select(TraderProfile).where(TraderProfile.trader_code == candidate)).first()
            if existing is None:
                return candidate

    def _get_symbol_type(self, symbol: str) -> str:
        if symbol.endswith("/USD") and len(symbol.split("/")) == 2:
            if symbol in self.specialty_symbols["crypto"]:
                return "crypto"
            return "forex"
        if symbol in self.specialty_symbols["indices"]:
            return "indices"
        return "stocks"

    def _get_realistic_price(self, symbol: str) -> float:
        base_price = self.base_prices.get(symbol, 100.0)
        symbol_type = self._get_symbol_type(symbol)
        volatility = self.volatility_factors.get(symbol_type, 0.01)
        price_move = random.uniform(-volatility, volatility)
        return base_price * (1 + price_move)

    def _random_time_in_window(self, trading_day: date, start: time, end: time) -> datetime:
        start_dt = datetime.combine(trading_day, start)
        end_dt = datetime.combine(trading_day, end)
        if end_dt <= start_dt:
            end_dt = start_dt + timedelta(hours=1)
        delta_seconds = int((end_dt - start_dt).total_seconds())
        if delta_seconds <= 0:
            return start_dt
        return start_dt + timedelta(seconds=random.randint(0, delta_seconds - 1))

    def _generate_trade_schedule(self, trading_day: date, trade_count: int) -> List[datetime]:
        distribution = {name: minimum for name, minimum in self.session_minimums.items()}
        extras = max(trade_count - sum(distribution.values()), 0)
        session_keys = [name for name, *_ in self.session_windows]
        while extras > 0:
            distribution[random.choice(session_keys)] += 1
            extras -= 1

        schedule: List[datetime] = []
        for name, start, end in self.session_windows:
            for _ in range(distribution[name]):
                schedule.append(self._random_time_in_window(trading_day, start, end))
        schedule.sort()
        return schedule

    def _select_symbol_for_trader(self, trader_profile: TraderProfile) -> tuple[str, str]:
        if trader_profile.risk_tolerance == RiskTolerance.LOW:
            categories = ["forex", "indices"]
        elif trader_profile.risk_tolerance == RiskTolerance.MEDIUM:
            categories = ["forex", "indices", "stocks"]
        else:
            categories = ["crypto", "stocks"]
        category = random.choice(categories)
        symbol = random.choice(self.specialty_symbols[category])
        return symbol, category

    def _determine_trade_outcome(self, trader_profile: TraderProfile) -> tuple[bool, float]:
        base_rate = {
            RiskTolerance.LOW: 0.65,
            RiskTolerance.MEDIUM: 0.6,
            RiskTolerance.HIGH: 0.55,
        }.get(trader_profile.risk_tolerance, 0.6)

        metrics = trader_profile.performance_metrics or {}
        historical = metrics.get("win_rate")
        if isinstance(historical, (int, float)):
            historical_rate = max(0.0, min(float(historical) / 100.0, 1.0))
            effective_rate = (base_rate + historical_rate) / 2
        else:
            effective_rate = base_rate

        effective_rate = max(0.4, min(effective_rate, 0.85))
        is_win = random.random() < effective_rate
        if is_win:
            percent_move = random.uniform(0.01, 0.05)
        else:
            percent_move = -random.uniform(0.01, 0.03)
        return is_win, percent_move

    def _determine_trade_volume(self, trader_profile: TraderProfile) -> float:
        typical_volume = 1_000.0
        metrics = trader_profile.performance_metrics or {}
        avg_return = metrics.get("average_return_per_trade")
        if isinstance(avg_return, (int, float)) and avg_return:
            typical_volume = max(100.0, min(10_000.0, abs(float(avg_return)) * 10))
        risk_multiplier = {
            RiskTolerance.LOW: 0.8,
            RiskTolerance.MEDIUM: 1.0,
            RiskTolerance.HIGH: 1.2,
        }.get(trader_profile.risk_tolerance, 1.0)
        base = typical_volume * risk_multiplier
        return round(random.uniform(base * 0.6, base * 1.4), 2)

    def _calculate_performance_metrics(self, trader_trades: List[TraderTrade]) -> Dict[str, Any]:
        if not trader_trades:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "total_profit_loss": 0.0,
                "average_return_per_trade": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
            }

        closed = [t for t in trader_trades if t.status == TradeStatus.CLOSED and t.profit_loss is not None]
        if not closed:
            return {
                "total_trades": len(trader_trades),
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "total_profit_loss": 0.0,
                "average_return_per_trade": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
            }

        profits = [t.profit_loss for t in closed if t.profit_loss is not None]
        winning = [p for p in profits if p > 0]
        losing = [p for p in profits if p < 0]
        total_profit = sum(profits)
        win_rate = len(winning) / len(closed) if closed else 0
        avg_return = total_profit / len(closed) if closed else 0
        variance = sum((p - avg_return) ** 2 for p in profits) / len(profits) if profits else 0
        std_dev = variance ** 0.5 if variance > 0 else 1
        sharpe_ratio = avg_return / std_dev if std_dev else 0

        running_total = 0.0
        peak = 0.0
        max_drawdown = 0.0
        for profit in profits:
            running_total += profit
            if running_total > peak:
                peak = running_total
            drawdown = peak - running_total
            max_drawdown = max(max_drawdown, drawdown)

        return {
            "total_trades": len(trader_trades),
            "winning_trades": len(winning),
            "losing_trades": len(losing),
            "win_rate": round(win_rate * 100, 2),
            "total_profit_loss": round(total_profit, 2),
            "average_return_per_trade": round(avg_return, 2),
            "largest_win": round(max(winning) if winning else 0.0, 2),
            "largest_loss": round(min(losing) if losing else 0.0, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "max_drawdown": round(max_drawdown, 2),
        }

    def _update_daily_win_rate(self, db: Session, trader_profile: TraderProfile, trading_day: date) -> None:
        previous_day = trading_day - timedelta(days=1)
        start = datetime.combine(previous_day, time.min)
        end = start + timedelta(days=1)
        statement = (
            select(TraderTrade)
            .where(TraderTrade.trader_profile_id == trader_profile.id)
            .where(TraderTrade.executed_at >= start)
            .where(TraderTrade.executed_at < end)
            .where(TraderTrade.status == TradeStatus.CLOSED)
        )
        trades = db.exec(statement).all()

        metrics = trader_profile.performance_metrics or {}
        if trades:
            closed = [t for t in trades if t.profit_loss is not None]
            wins = sum(1 for t in closed if t.profit_loss and t.profit_loss > 0)
            total = len(closed)
            daily_win_rate = round((wins / total) * 100, 2) if total else 0.0
            metrics.update(
                {
                    "win_rate": daily_win_rate,
                    "previous_day_wins": wins,
                    "previous_day_trades": total,
                    "last_win_rate_calculated_at": utc_now().isoformat(),
                }
            )
        else:
            metrics.setdefault("previous_day_wins", 0)
            metrics.setdefault("previous_day_trades", 0)
            metrics["last_win_rate_calculated_at"] = utc_now().isoformat()

        trader_profile.performance_metrics = metrics
        trader_profile.updated_at = utc_now()
        db.add(trader_profile)

    def generate_trader_performance(self, db: Session) -> int:
        trader_profiles = db.exec(select(TraderProfile)).all()
        for trader_profile in trader_profiles:
            trades = db.exec(select(TraderTrade).where(TraderTrade.trader_profile_id == trader_profile.id)).all()
            performance_metrics = self._calculate_performance_metrics(trades)
            existing_metrics = trader_profile.performance_metrics or {}
            performance_metrics["overall_win_rate"] = performance_metrics["win_rate"]
            performance_metrics["win_rate"] = existing_metrics.get("win_rate", performance_metrics["win_rate"])
            performance_metrics["previous_day_wins"] = existing_metrics.get("previous_day_wins", 0)
            performance_metrics["previous_day_trades"] = existing_metrics.get("previous_day_trades", 0)
            performance_metrics["last_win_rate_calculated_at"] = existing_metrics.get(
                "last_win_rate_calculated_at"
            )
            trader_profile.performance_metrics = performance_metrics

            if trades:
                earliest = min(trade.executed_at for trade in trades)
                if earliest.tzinfo is None:
                    earliest = earliest.replace(tzinfo=timezone.utc)
                now = utc_now()
                total_days = max((now - earliest).days, 1)
                monthly_return = (performance_metrics["total_profit_loss"] / total_days) * 30
                trader_profile.average_monthly_return = round(monthly_return, 2)
            else:
                trader_profile.average_monthly_return = 0.0

            trader_profile.updated_at = utc_now()
            db.add(trader_profile)

        db.commit()
        return len(trader_profiles)

    def simulate_trader_trade(
        self,
        db: Session,
        trading_day: date | None = None,
        trader_profile_ids: list[uuid.UUID] | None = None,
    ) -> SimulationRun:
        trading_day = trading_day or utc_now().date()
        statement = select(TraderProfile).where(TraderProfile.is_public == True)
        if trader_profile_ids:
            statement = statement.where(TraderProfile.id.in_(trader_profile_ids))
        trader_profiles = db.exec(statement).all()
        created_trades: List[TraderTrade] = []
        copied_trades: List[CopiedTradeRecord] = []

        for trader_profile in trader_profiles:
            self._update_daily_win_rate(db, trader_profile, trading_day)
            trade_count = random.randint(10, 15)
            schedule = self._generate_trade_schedule(trading_day, trade_count)

            for trade_time in schedule:
                symbol, _ = self._select_symbol_for_trader(trader_profile)
                entry_price = round(self._get_realistic_price(symbol), 4)
                is_win, percent_move = self._determine_trade_outcome(trader_profile)
                exit_price = round(entry_price * (1 + percent_move), 4)
                volume = self._determine_trade_volume(trader_profile)
                profit_loss = round(volume * entry_price * percent_move, 2)

                trader_trade = TraderTrade(
                    trader_profile_id=trader_profile.id,
                    symbol=symbol,
                    side=TradeSide.BUY if percent_move >= 0 else TradeSide.SELL,
                    entry_price=entry_price,
                    exit_price=exit_price,
                    volume=round(volume, 2),
                    profit_loss=profit_loss,
                    status=TradeStatus.CLOSED,
                    executed_at=trade_time,
                    is_copyable=is_win,
                    notes=f"Simulated {'gain' if is_win else 'drawdown'} {percent_move * 100:.2f}%",
                )

                db.add(trader_trade)
                created_trades.append(trader_trade)

        db.commit()

        for trade in created_trades:
            if trade.is_copyable and (trade.profit_loss or 0) > 0:
                copied_trades.extend(self.copy_trade_to_followers(db, trade))

        return SimulationRun(trader_trades=created_trades, follower_trades=copied_trades)

    def copy_trade_to_followers(
        self, db: Session, trader_trade: TraderTrade
    ) -> List[CopiedTradeRecord]:
        copy_relationships = db.exec(
            select(UserTraderCopy).where(
                UserTraderCopy.trader_profile_id == trader_trade.trader_profile_id,
                UserTraderCopy.copy_status == CopyStatus.ACTIVE,
            )
        ).all()

        copied_trades: List[CopiedTradeRecord] = []
        for copy_relation in copy_relationships:
            if copy_relation.copy_amount <= 0:
                continue

            user = db.get(User, copy_relation.user_id)
            if not user:
                continue

            copy_amount = copy_relation.copy_amount
            copy_multiplier = copy_amount / 1_000.0
            if copy_multiplier <= 0:
                continue

            scaled_volume = trader_trade.volume * copy_multiplier
            scaled_profit_loss = (trader_trade.profit_loss or 0.0) * copy_multiplier

            trader_profile = db.get(TraderProfile, trader_trade.trader_profile_id)
            if trader_profile and trader_profile.copy_fee_percentage > 0:
                fee = scaled_profit_loss * (trader_profile.copy_fee_percentage / 100)
                scaled_profit_loss -= fee

            follower_trade = Trade(
                user_id=user.id,
                symbol=trader_trade.symbol,
                side=trader_trade.side,
                entry_price=trader_trade.entry_price,
                exit_price=trader_trade.exit_price,
                volume=round(scaled_volume, 2),
                profit_loss=round(scaled_profit_loss, 2),
                status=TradeStatus.CLOSED,
                opened_at=trader_trade.executed_at,
                closed_at=utc_now(),
                notes=f"Copied from trader {trader_profile.user_id if trader_profile else 'Unknown'}",
            )

            user.balance = round(user.balance + scaled_profit_loss, 2)
            self._update_account_summary(db, user.id, scaled_profit_loss, scaled_profit_loss > 0)

            db.add(follower_trade)
            db.add(user)
            copied_trades.append(CopiedTradeRecord(trade=follower_trade, source_trade=trader_trade))
            
            # Send notification to user about the copied trade
            try:
                trader_name = trader_profile.full_name or trader_profile.display_name or "Trader"
                notify_copy_trade_executed(
                    session=db,
                    user_id=user.id,
                    trader_name=trader_name,
                    symbol=trader_trade.symbol,
                    side=trader_trade.side.value,
                    amount=round(scaled_profit_loss, 2),
                )
            except Exception as e:
                logger.warning(f"Failed to send trade notification to user {user.id}: {e}")

        db.commit()
        return copied_trades

    def _update_account_summary(self, db: Session, user_id: uuid.UUID, profit_loss: float, is_win: bool) -> None:
        summary = db.exec(select(AccountSummary).where(AccountSummary.user_id == user_id)).first()
        if not summary:
            summary = AccountSummary(user_id=user_id)
            db.add(summary)

        summary.total_trades += 1
        summary.net_profit += profit_loss
        if is_win:
            summary.winning_trades += 1
        else:
            summary.losing_trades += 1
        summary.win_rate = (summary.winning_trades / summary.total_trades * 100) if summary.total_trades > 0 else 0
        summary.updated_at = utc_now()
        db.add(summary)

    def initialize_trader_profiles(self, db: Session) -> int:
        potential_traders = db.exec(
            select(User).where(
                User.account_tier.in_(["PREMIUM", "VIP"]),
                ~User.id.in_(select(TraderProfile.user_id)),
            )
        ).all()

        created_profiles: List[TraderProfile] = []
        for user in potential_traders:
            is_public = random.random() < 0.3
            risk_tolerance = random.choice(list(RiskTolerance))
            strategies = {
                RiskTolerance.LOW: "Conservative position sizing with focus on forex and indices",
                RiskTolerance.MEDIUM: "Balanced portfolio with mix of stocks and forex",
                RiskTolerance.HIGH: "Aggressive growth strategy focusing on crypto and tech stocks",
            }

            trader_code = self._generate_unique_trader_code(db)
            display_name = user.full_name or f"Trader {trader_code}"
            trader_profile = TraderProfile(
                user_id=user.id,
                display_name=display_name,
                trader_code=trader_code,
                trading_strategy=strategies[risk_tolerance],
                risk_tolerance=risk_tolerance,
                is_public=is_public,
                copy_fee_percentage=random.uniform(0.5, 5.0) if is_public else 0.0,
                minimum_copy_amount=random.choice([100.0, 250.0, 500.0, 1_000.0]),
            )

            db.add(trader_profile)
            created_profiles.append(trader_profile)

        db.commit()
        return len(created_profiles)
