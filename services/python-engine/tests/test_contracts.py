import json
from copy import deepcopy
from pathlib import Path

import pytest
from pydantic import ValidationError

from chivo_python_engine.contracts import SignalCreatedEvent

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE = REPO_ROOT / "packages" / "contracts" / "fixtures" / "signal-created-event.json"


def load_fixture() -> dict[str, object]:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_validates_the_shared_signal_fixture() -> None:
    event = SignalCreatedEvent.model_validate(load_fixture())

    assert event.event_type == "strategy.signal.created"
    assert event.payload.side == "LONG"
    assert event.payload.stop_loss == "67900.0"
    dumped = event.model_dump(by_alias=True, mode="json")
    assert dumped["payload"]["stopLoss"] == "67900.0"
    assert dumped["payload"]["takeProfit"] == "69300.0"


def test_rejects_numeric_and_exponent_financial_values() -> None:
    numeric = load_fixture()
    numeric["payload"]["stopLoss"] = 67900  # type: ignore[index]
    exponent = load_fixture()
    exponent["payload"]["stopLoss"] = "6.79e4"  # type: ignore[index]

    with pytest.raises(ValidationError):
        SignalCreatedEvent.model_validate(numeric)
    with pytest.raises(ValidationError):
        SignalCreatedEvent.model_validate(exponent)


def test_rejects_expiry_before_candle_close() -> None:
    fixture = load_fixture()
    fixture["payload"]["expiresAt"] = "2026-10-22T11:59:59Z"  # type: ignore[index]

    with pytest.raises(ValidationError, match="expiresAt must be later"):
        SignalCreatedEvent.model_validate(fixture)


def test_rejects_non_utc_timestamps() -> None:
    fixture = deepcopy(load_fixture())
    fixture["occurredAt"] = "2026-10-22T14:00:05+02:00"

    with pytest.raises(ValidationError, match="occurredAt must be expressed in UTC"):
        SignalCreatedEvent.model_validate(fixture)


def test_rejects_unsupported_schema_version() -> None:
    fixture = load_fixture()
    fixture["schemaVersion"] = 2

    with pytest.raises(ValidationError):
        SignalCreatedEvent.model_validate(fixture)


def test_rejects_limit_signal_without_entry_price() -> None:
    fixture = load_fixture()
    fixture["payload"]["entryType"] = "LIMIT"  # type: ignore[index]

    with pytest.raises(ValidationError, match="entryPrice is required"):
        SignalCreatedEvent.model_validate(fixture)


def test_rejects_invalid_long_protection_order() -> None:
    fixture = load_fixture()
    fixture["payload"]["entryType"] = "LIMIT"  # type: ignore[index]
    fixture["payload"]["entryPrice"] = "69000.0"  # type: ignore[index]
    fixture["payload"]["stopLoss"] = "70000.0"  # type: ignore[index]

    with pytest.raises(ValidationError, match="stopLoss < entryPrice < takeProfit"):
        SignalCreatedEvent.model_validate(fixture)
