"""Python views of the shared event and signal contracts.

These models validate proposals emitted by Python. They deliberately contain no
exchange client, credential, signing or order-submission capability.
"""

from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

DECIMAL_PATTERN = r"^-?(?:0|[1-9]\d*)(?:\.\d+)?$"
DecimalString = Annotated[str, StringConstraints(pattern=DECIMAL_PATTERN)]

Exchange = Literal["BINANCE", "HYPERLIQUID", "ASTER"]
Timeframe = Literal["1m", "5m", "15m", "30m", "1h", "2h", "4h", "1d"]


class ContractModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class SignalCreatedPayload(ContractModel):
    strategy_id: str = Field(min_length=1, max_length=64)
    strategy_version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    exchange: Exchange
    instrument_id: str = Field(pattern=r"^[A-Z][A-Z0-9-]*:[A-Z0-9-]+:[A-Z0-9._-]+$")
    timeframe: Timeframe
    side: Literal["LONG", "SHORT"]
    entry_type: Literal["MARKET", "LIMIT"]
    entry_price: DecimalString | None = None
    stop_loss: DecimalString
    take_profit: DecimalString
    candle_closed_at: datetime
    expires_at: datetime
    confidence: float | None = Field(default=None, ge=0, le=1)

    @field_validator("stop_loss", "take_profit", "entry_price")
    @classmethod
    def require_positive_decimal(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            parsed = Decimal(value)
        except InvalidOperation as exc:  # pragma: no cover - pattern already rejects most cases
            raise ValueError("expected a decimal string") from exc
        if parsed <= 0:
            raise ValueError("expected a positive decimal string")
        return value

    @model_validator(mode="after")
    def validate_signal(self) -> "SignalCreatedPayload":
        self._require_utc(self.candle_closed_at, "candleClosedAt")
        self._require_utc(self.expires_at, "expiresAt")

        if self.expires_at <= self.candle_closed_at:
            raise ValueError("expiresAt must be later than candleClosedAt")

        if self.entry_type == "LIMIT" and self.entry_price is None:
            raise ValueError("entryPrice is required for LIMIT signals")
        if self.entry_type == "MARKET" and self.entry_price is not None:
            raise ValueError("entryPrice must be omitted for MARKET signals")

        if self.entry_price is not None:
            entry = Decimal(self.entry_price)
            stop = Decimal(self.stop_loss)
            target = Decimal(self.take_profit)
            if self.side == "LONG" and not (stop < entry < target):
                raise ValueError("LONG signals require stopLoss < entryPrice < takeProfit")
            if self.side == "SHORT" and not (target < entry < stop):
                raise ValueError("SHORT signals require takeProfit < entryPrice < stopLoss")

        return self

    @staticmethod
    def _require_utc(value: datetime, field_name: str) -> None:
        offset = value.utcoffset()
        if offset != timedelta(0) or value.tzinfo is None:
            raise ValueError(f"{field_name} must be expressed in UTC")


class EventEnvelope(ContractModel):
    event_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    event_type: str
    schema_version: Literal[1]
    occurred_at: datetime
    correlation_id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    producer: str = Field(pattern=r"^[a-z][a-z0-9-]*$", max_length=64)
    payload: Any

    @field_validator("occurred_at")
    @classmethod
    def occurred_at_must_be_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() != timedelta(0):
            raise ValueError("occurredAt must be expressed in UTC")
        return value


class SignalCreatedEvent(EventEnvelope):
    event_type: Literal["strategy.signal.created"] = "strategy.signal.created"  # type: ignore[assignment]
    payload: SignalCreatedPayload

    @model_validator(mode="after")
    def validate_payload_type(self) -> "SignalCreatedEvent":
        if self.schema_version != 1:
            raise ValueError("unsupported schemaVersion")
        return self
