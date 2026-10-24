import pytest
from pydantic import ValidationError

from chivo_python_engine.config import EngineSettings


def test_defaults_to_paper_with_live_disabled() -> None:
    settings = EngineSettings()

    assert settings.execution_mode == "PAPER"
    assert settings.enable_live_trading is False
    assert settings.port == 8000


def test_rejects_live_execution_mode() -> None:
    with pytest.raises(ValidationError, match="PAPER execution only"):
        EngineSettings(execution_mode="LIVE")


def test_rejects_live_feature_flag() -> None:
    with pytest.raises(ValidationError, match="CHIVO_ENABLE_LIVE_TRADING must be false"):
        EngineSettings(enable_live_trading=True)


def test_rejects_invalid_port() -> None:
    with pytest.raises(ValidationError):
        EngineSettings(port=0)
