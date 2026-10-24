from fastapi import APIRouter, HTTPException

from ..contracts import ContractModel
from ..strategy.fvg_choch import FVGCHOCHStrategy
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


class SignalRequest(ContractModel):
    instrument_id: str
    exchange: str = "BINANCE"
    timeframe: str = "15m"
    candles: list[Candle]


router = APIRouter()


@router.post("/api/v1/signals/evaluate")
def evaluate_signals(request: SignalRequest):
    try:
        df = pd.DataFrame([c.model_dump() for c in request.candles])
        strategy = FVGCHOCHStrategy()
        signals = strategy.evaluate(
            df,
            instrument_id=request.instrument_id,
            exchange=request.exchange,
            timeframe=request.timeframe,
        )
        return {"signals": [s.__dict__ for s in signals]}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
