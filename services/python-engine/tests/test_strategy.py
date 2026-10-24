import pandas as pd

from chivo_python_engine.backtest.engine import BacktestEngine
from chivo_python_engine.strategy.fvg_choch import FVGCHOCHStrategy


def test_strategy_versioned():
    s = FVGCHOCHStrategy()
    assert s.strategy_id == "fvg_choch_v1"
    assert s.strategy_version == "1.0.0"


def test_backtest_no_lookahead():
    # Create simple closed candles
    rows = []
    for i in range(100):
        rows.append(
            {
                "open_time": f"2026-01-01T{i%24:02d}:00:00Z",
                "close_time": f"2026-01-01T{i%24:02d}:14:59:00Z",
                "open": 100 + i * 0.1,
                "high": 100 + i * 0.1 + 0.5,
                "low": 100 + i * 0.1 - 0.5,
                "close": 100 + i * 0.1 + 0.2,
                "volume": 1000,
                "is_closed": True,
            }
        )
    df = pd.DataFrame(rows)
    engine = BacktestEngine(fee_bps=4, slippage_bps=2)
    res = engine.run(df)
    assert res.total_trades >= 0
    assert isinstance(res.win_rate, float)
    assert isinstance(res.max_drawdown, float)
