from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI

from .config import EngineSettings
from .contracts import ContractModel

M2_LIMITATIONS = [
    "M2: Technical indicators (EMA/RSI/ATR/SMA/VWMA), FVG/CHoCH/BOS detection, versioned strategy fvg_choch_v1, deterministic signal generation on closed candles only, backtest with fees/slippage and no lookahead.",
    "This service produces proposals only and cannot place orders.",
    "No exchange credentials, signing keys or venue clients are present.",
    "LIVE trading is unavailable and rejected at startup.",
]


class HealthCheck(ContractModel):
    name: str
    status: Literal["ok", "degraded", "error"]
    detail: str | None = None


class HealthResponse(ContractModel):
    status: Literal["ok", "degraded", "error"]
    service: str
    version: str
    checked_at: datetime
    checks: list[HealthCheck]


class EngineInfo(ContractModel):
    service: Literal["chivo-python-engine"]
    version: str
    execution_mode: Literal["PAPER"]
    live_trading_enabled: Literal[False]
    role: Literal["SIGNAL_GENERATION_ONLY"]
    exchange_credentials: Literal["NONE"]
    order_execution: Literal["FORBIDDEN"]
    limitations: list[str]


def _health_response(settings: EngineSettings) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="chivo-python-engine",
        version=settings.app_version,
        checked_at=datetime.now(UTC),
        checks=[
            HealthCheck(
                name="configuration",
                status="ok",
                detail="PAPER only; LIVE trading disabled",
            )
        ],
    )


def create_app(settings: EngineSettings | None = None) -> FastAPI:
    config = settings or EngineSettings()

    api = FastAPI(
        title="Chivo Python Engine",
        version=config.app_version,
        description=(
            "Signal-generation and analytics service. It has no exchange credentials and no "
            "order-execution path."
        ),
    )

    @api.get("/health/live", response_model=HealthResponse, tags=["health"])
    def liveness() -> HealthResponse:
        return _health_response(config)

    @api.get("/health/ready", response_model=HealthResponse, tags=["health"])
    def readiness() -> HealthResponse:
        return _health_response(config)

    @api.get("/api/v1/system/info", response_model=EngineInfo, tags=["system"])
    def system_info() -> EngineInfo:
        return EngineInfo(
            service="chivo-python-engine",
            version=config.app_version,
            execution_mode="PAPER",
            live_trading_enabled=False,
            role="SIGNAL_GENERATION_ONLY",
            exchange_credentials="NONE",
            order_execution="FORBIDDEN",
            limitations=M2_LIMITATIONS,
        )

    try:
        from .routers import backtest, signals

        api.include_router(signals.router)
        api.include_router(backtest.router)
    except Exception:
        pass

    return api


app = create_app()
