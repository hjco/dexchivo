from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class EngineSettings(BaseSettings):
    """Server-side configuration. LIVE mode is rejected in M0."""

    model_config = SettingsConfigDict(
        env_prefix="CHIVO_",
        env_file=(".env", "../../.env"),
        extra="ignore",
    )

    execution_mode: Literal["PAPER", "LIVE"] = "PAPER"
    enable_live_trading: bool = False
    host: str = Field(default="0.0.0.0", min_length=1)
    port: int = Field(default=8000, ge=1, le=65535)
    log_level: Literal["critical", "error", "warning", "info", "debug", "trace"] = "info"
    reload: bool = False
    app_version: str = Field(default="0.1.0", pattern=r"^\d+\.\d+\.\d+$")

    @model_validator(mode="after")
    def reject_live_trading(self) -> "EngineSettings":
        if self.execution_mode != "PAPER":
            raise ValueError("M0 supports PAPER execution only; LIVE cannot be enabled")
        if self.enable_live_trading:
            raise ValueError(
                "LIVE trading is not implemented; CHIVO_ENABLE_LIVE_TRADING must be false"
            )
        return self
