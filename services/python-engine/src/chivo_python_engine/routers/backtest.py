from fastapi import APIRouter, HTTPException

from ..backtest.engine import BacktestEngine
from ..contracts import ContractModel
import pandas as pd


class Candle(ContractModel):
    open_time: str
    close_time: str
    open: float
    high: float
    low: float
    close: float
    volume: float
    is_closed: bool = True


class BacktestRequest(ContractModel):
    candles: list[Candle]
    fee_bps: float = 4.0
    slippage_bps: float = 2.0


router = APIRouter()


@router.post("/api/v1/backtest/run")
def run_backtest(request: BacktestRequest):
    try:
        df = pd.DataFrame([c.model_dump() for c in request.candles])
        engine = BacktestEngine(fee_bps=request.fee_bps, slippage_bps=request.slippage_bps)
        result = engine.run(df)
        return result.__dict__
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
