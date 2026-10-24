from typing import Any

from pytest import MonkeyPatch

from chivo_python_engine.__main__ import main


def test_main_starts_uvicorn_with_configured_values(monkeypatch: MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def fake_run(app: str, **kwargs: Any) -> None:
        captured["app"] = app
        captured.update(kwargs)

    monkeypatch.setattr("uvicorn.run", fake_run)
    monkeypatch.setenv("CHIVO_HOST", "127.0.0.1")
    monkeypatch.setenv("CHIVO_PORT", "8123")
    monkeypatch.setenv("CHIVO_LOG_LEVEL", "debug")
    monkeypatch.setenv("CHIVO_RELOAD", "true")

    main()

    assert captured["app"] == "chivo_python_engine.main:app"
    assert captured["host"] == "127.0.0.1"
    assert captured["port"] == 8123
    assert captured["log_level"] == "debug"
    assert captured["reload"] is True
