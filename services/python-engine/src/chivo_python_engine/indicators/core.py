import math

import numpy as np
import pandas as pd


def ema(series: pd.Series, length: int) -> pd.Series:
    return series.ewm(span=length, adjust=False).mean()


def sma(series: pd.Series, length: int) -> pd.Series:
    return series.rolling(window=length).mean()


def volume_sma(volume: pd.Series, length: int) -> pd.Series:
    return volume.rolling(window=length).mean()


def vwma(close: pd.Series, volume: pd.Series, length: int) -> pd.Series:
    pv = close * volume
    return pv.rolling(window=length).sum() / volume.rolling(window=length).sum()


def rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / length, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / length, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi_vals = 100 - (100 / (1 + rs))
    return rsi_vals.fillna(50.0)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14) -> pd.Series:
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / length, adjust=False).mean()


def fvg_zones(df: pd.DataFrame) -> list[dict]:
    zones = []
    if len(df) < 3:
        return zones
    for i in range(2, len(df)):
        # Bullish FVG: gap between candle i-2 high and candle i low
        prev_high = df.iloc[i - 2]["high"]
        curr_low = df.iloc[i]["low"]
        if curr_low > prev_high:
            zones.append(
                {
                    "type": "BULLISH_FVG",
                    "bottom": float(prev_high),
                    "top": float(curr_low),
                    "index": i,
                    "mitigated": False,
                }
            )
        # Bearish FVG
        prev_low = df.iloc[i - 2]["low"]
        curr_high = df.iloc[i]["high"]
        if curr_high < prev_low:
            zones.append(
                {
                    "type": "BEARISH_FVG",
                    "bottom": float(curr_high),
                    "top": float(prev_low),
                    "index": i,
                    "mitigated": False,
                }
            )
    return zones


def identify_bos_choch(df: pd.DataFrame, lookback: int = 20) -> list[dict]:
    events = []
    if len(df) < lookback + 2:
        return events
    for i in range(lookback, len(df)):
        window = df.iloc[i - lookback : i]
        recent_high = window["high"].max()
        recent_low = window["low"].min()
        if df.iloc[i]["close"] > recent_high and df.iloc[i - 1]["close"] <= recent_high:
            events.append({"type": "BOS", "index": i, "side": "BULLISH"})
        elif df.iloc[i]["close"] < recent_low and df.iloc[i - 1]["close"] >= recent_low:
            events.append({"type": "BOS", "index": i, "side": "BEARISH"})
        # CHoCH: change of character
        if df.iloc[i]["close"] > window.iloc[-5:]["high"].max() * 0.999:
            if df.iloc[max(0, i - 10) : i]["close"].min() < window["low"].min() * 1.001:
                events.append({"type": "CHOCH", "index": i, "side": "BULLISH"})
    return events
