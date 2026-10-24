import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pandas as pd

from ..indicators.core import atr, ema, fvg_zones, identify_bos_choch, rsi


@dataclass
class StrategySignal:
    strategy_id: str
    strategy_version: str
    exchange: str
    instrument_id: str
    timeframe: str
    side: str
    entry_type: str
    stop_loss: float
    take_profit: float
    candle_closed_at: str
    expires_at: str
    signal_id: str


class FVGCHOCHStrategy:
    def __init__(
        self,
        strategy_id: str = "fvg_choch_v1",
        strategy_version: str = "1.0.0",
        risk_reward: float = 2.0,
        atr_mult_sl: float = 1.5,
    ):
        self.strategy_id = strategy_id
        self.strategy_version = strategy_version
        self.risk_reward = risk_reward
        self.atr_mult_sl = atr_mult_sl

    def evaluate(self, df: pd.DataFrame, instrument_id: str, exchange: str = "BINANCE", timeframe: str = "15m") -> list[StrategySignal]:
        if len(df) < 50:
            return []
        signals = []
        # Work on closed candles only
        closed = df.copy()
        if "is_closed" in closed.columns:
            closed = closed[closed["is_closed"] == True]
        if len(closed) < 50:
            return []

        ema20 = ema(closed["close"], 20)
        ema50 = ema(closed["close"], 50)
        rsi_vals = rsi(closed["close"], 14)
        atr_vals = atr(closed["high"], closed["low"], closed["close"], 14)
        fvgs = fvg_zones(closed)
        events = identify_bos_choch(closed)

        last_idx = closed.index[-1]
        last_close = float(closed["close"].iloc[-1])
        last_atr = float(atr_vals.iloc[-1]) if not pd.isna(atr_vals.iloc[-1]) else last_close * 0.01

        # Long setup: bullish BOS/CHOCH, price above EMA20/50, RSI not overbought
        bullish_event = any(e["index"] >= len(closed) - 3 and e["side"] == "BULLISH" for e in events)
        unmitigated_bull_fvg = any(f["type"] == "BULLISH_FVG" and not f["mitigated"] and f["index"] >= len(closed) - 10 for f in fvgs)

        if bullish_event and unmitigated_bull_fvg and float(ema20.iloc[-1]) < last_close < float(ema50.iloc[-1]) * 1.1 and float(rsi_vals.iloc[-1]) < 70:
            sl = last_close - last_atr * self.atr_mult_sl
            tp = last_close + (last_close - sl) * self.risk_reward
            candle_time = closed.iloc[-1].get("close_time") or datetime.now(UTC)
            if isinstance(candle_time, str):
                candle_closed_at = candle_time
            else:
                candle_closed_at = candle_time.isoformat()
            signals.append(
                StrategySignal(
                    strategy_id=self.strategy_id,
                    strategy_version=self.strategy_version,
                    exchange=exchange,
                    instrument_id=instrument_id,
                    timeframe=timeframe,
                    side="LONG",
                    entry_type="MARKET",
                    stop_loss=round(sl, 2),
                    take_profit=round(tp, 2),
                    candle_closed_at=candle_closed_at,
                    expires_at=(datetime.now(UTC) + timedelta(minutes=15)).isoformat().replace("+00:00", "Z"),
                    signal_id=str(uuid.uuid4()),
                )
            )

        # Short setup
        bearish_event = any(e["index"] >= len(closed) - 3 and e["side"] == "BEARISH" for e in events)
        unmitigated_bear_fvg = any(f["type"] == "BEARISH_FVG" and not f["mitigated"] and f["index"] >= len(closed) - 10 for f in fvgs)
        if bearish_event and unmitigated_bear_fvg and float(ema20.iloc[-1]) > last_close > float(ema50.iloc[-1]) * 0.9 and float(rsi_vals.iloc[-1]) > 30:
            sl = last_close + last_atr * self.atr_mult_sl
            tp = last_close - (sl - last_close) * self.risk_reward
            candle_time = closed.iloc[-1].get("close_time") or datetime.now(UTC)
            if isinstance(candle_time, str):
                candle_closed_at = candle_time
            else:
                candle_closed_at = candle_time.isoformat()
            signals.append(
                StrategySignal(
                    strategy_id=self.strategy_id,
                    strategy_version=self.strategy_version,
                    exchange=exchange,
                    instrument_id=instrument_id,
                    timeframe=timeframe,
                    side="SHORT",
                    entry_type="MARKET",
                    stop_loss=round(sl, 2),
                    take_profit=round(tp, 2),
                    candle_closed_at=candle_closed_at,
                    expires_at=(datetime.now(UTC) + timedelta(minutes=15)).isoformat().replace("+00:00", "Z"),
                    signal_id=str(uuid.uuid4()),
                )
            )
        return signals
