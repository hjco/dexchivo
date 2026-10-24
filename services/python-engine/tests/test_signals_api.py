from fastapi.testclient import TestClient

from chivo_python_engine.main import create_app


def test_signals_endpoint():
    app = create_app()
    client = TestClient(app)
    candles = []
    for i in range(60):
        candles.append(
            {
                "open_time": f"t{i}",
                "close_time": f"c{i}",
                "open": 100 + i * 0.1,
                "high": 101 + i * 0.1,
                "low": 99 + i * 0.1,
                "close": 100.5 + i * 0.1,
                "volume": 1000,
                "is_closed": True,
            }
        )
    resp = client.post(
        "/api/v1/signals/evaluate",
        json={"instrument_id": "BINANCE:USD-M:BTCUSDT", "exchange": "BINANCE", "timeframe": "15m", "candles": candles},
    )
    assert resp.status_code == 200
    assert "signals" in resp.json()


def test_backtest_endpoint():
    app = create_app()
    client = TestClient(app)
    candles = []
    for i in range(80):
        candles.append(
            {
                "open_time": f"t{i}",
                "close_time": f"c{i}",
                "open": 100 + i * 0.1,
                "high": 101 + i * 0.1,
                "low": 99 + i * 0.1,
                "close": 100.2 + i * 0.1,
                "volume": 1000,
                "is_closed": True,
            }
        )
    resp = client.post("/api/v1/backtest/run", json={"candles": candles})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_trades" in data
    assert "fees_paid" in data
    assert "slippage_cost" in data
