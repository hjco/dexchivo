import pandas as pd

from chivo_python_engine.indicators.core import atr, ema, fvg_zones, identify_bos_choch, rsi, sma


def test_ema_and_rsi():
    df = pd.DataFrame({"close": [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7]})
    e = ema(df["close"], 5)
    assert len(e) == len(df)
    r = rsi(df["close"], 14)
    assert len(r) == len(df)


def test_atr_and_fvg():
    df = pd.DataFrame(
        {
            "high": [10, 11, 12, 13, 14],
            "low": [9, 10, 11, 12, 13],
            "close": [10, 11, 12, 13, 14],
        }
    )
    a = atr(df["high"], df["low"], df["close"], 3)
    assert len(a) == 5
    fvgs = fvg_zones(df)
    assert isinstance(fvgs, list)
