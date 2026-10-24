from dataclasses import dataclass

import pandas as pd

from ..strategy.fvg_choch import FVGCHOCHStrategy


@dataclass
class BacktestResult:
    total_trades: int
    win_rate: float
    total_pnl: float
    max_drawdown: float
    sharpe_ratio: float
    fees_paid: float
    slippage_cost: float


class BacktestEngine:
    def __init__(
        self,
        fee_bps: float = 4.0,
        slippage_bps: float = 2.0,
        initial_capital: float = 10000.0,
    ):
        self.fee_bps = fee_bps
        self.slippage_bps = slippage_bps
        self.initial_capital = initial_capital

    def run(self, df: pd.DataFrame, strategy: FVGCHOCHStrategy | None = None) -> BacktestResult:
        if strategy is None:
            strategy = FVGCHOCHStrategy()
        trades = []
        equity = self.initial_capital
        peak = equity
        max_dd = 0.0
        fees = 0.0
        slippage = 0.0

        # Walk forward on closed candles only, no lookahead
        closed = df.copy()
        if "is_closed" in closed.columns:
            closed = closed[closed["is_closed"] == True]
        for i in range(60, len(closed)):
            window = closed.iloc[: i + 1]
            sigs = strategy.evaluate(window, instrument_id="BTCUSDT", timeframe="15m")
            for sig in sigs:
                entry = float(closed["close"].iloc[i])
                sl = sig.stop_loss
                tp = sig.take_profit
                slip = entry * (self.slippage_bps / 10000)
                fee = entry * 0.001 * (self.fee_bps / 4)
                fees += fee
                slippage += slip
                # Simulate outcome based on next candles
                for j in range(i + 1, min(i + 20, len(closed))):
                    high = float(closed["high"].iloc[j])
                    low = float(closed["low"].iloc[j])
                    if sig.side == "LONG":
                        if low <= sl:
                            pnl = (sl - (entry + slip)) * 0.001 - fee
                            trades.append(pnl)
                            equity += pnl
                            break
                        if high >= tp:
                            pnl = (tp - (entry + slip)) * 0.001 - fee
                            trades.append(pnl)
                            equity += pnl
                            break
                    else:
                        if high >= sl:
                            pnl = ((entry - slip) - sl) * 0.001 - fee
                            trades.append(pnl)
                            equity += pnl
                            break
                        if low <= tp:
                            pnl = ((entry - slip) - tp) * 0.001 - fee
                            trades.append(pnl)
                            equity += pnl
                            break
                else:
                    # timeout - close at market
                    exit_px = float(closed["close"].iloc[min(i + 19, len(closed) - 1)])
                    if sig.side == "LONG":
                        pnl = (exit_px - (entry + slip)) * 0.001 - fee
                    else:
                        pnl = ((entry - slip) - exit_px) * 0.001 - fee
                    trades.append(pnl)
                    equity += pnl
            if equity > peak:
                peak = equity
            dd = (peak - equity) / peak if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd

        wins = sum(1 for t in trades if t > 0)
        win_rate = wins / len(trades) if trades else 0.0
        total_pnl = sum(trades)
        sharpe = (total_pnl / len(trades)) / (abs(total_pnl) / len(trades) + 1e-9) if trades else 0.0
        return BacktestResult(
            total_trades=len(trades),
            win_rate=round(win_rate, 4),
            total_pnl=round(total_pnl, 4),
            max_drawdown=round(max_dd, 4),
            sharpe_ratio=round(sharpe, 4),
            fees_paid=round(fees, 4),
            slippage_cost=round(slippage, 4),
        )
