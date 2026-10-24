from fastapi.testclient import TestClient

from chivo_python_engine.config import EngineSettings
from chivo_python_engine.main import create_app


def test_liveness_and_readiness() -> None:
    with TestClient(create_app(EngineSettings())) as client:
        live = client.get("/health/live")
        ready = client.get("/health/ready")

    assert live.status_code == 200
    assert ready.status_code == 200
    assert live.json()["status"] == "ok"
    assert live.json()["service"] == "chivo-python-engine"
    assert ready.json()["checks"] == [
        {
            "name": "configuration",
            "status": "ok",
            "detail": "PAPER only; LIVE trading disabled",
        }
    ]


def test_system_info_is_paper_only_and_has_no_exchange_access() -> None:
    with TestClient(create_app(EngineSettings())) as client:
        response = client.get("/api/v1/system/info")

    assert response.status_code == 200
    body = response.json()
    assert body["executionMode"] == "PAPER"
    assert body["liveTradingEnabled"] is False
    assert body["role"] == "SIGNAL_GENERATION_ONLY"
    assert body["exchangeCredentials"] == "NONE"
    assert body["orderExecution"] == "FORBIDDEN"
    assert body["limitations"]


def test_openapi_is_available_and_has_no_order_routes() -> None:
    with TestClient(create_app(EngineSettings())) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    document = response.json()
    assert document["info"]["title"] == "Chivo Python Engine"
    assert "/health/live" in document["paths"]
    assert "/api/v1/orders" not in document["paths"]


def test_unknown_route_returns_404() -> None:
    with TestClient(create_app(EngineSettings())) as client:
        response = client.get("/api/v1/orders")

    assert response.status_code == 404
