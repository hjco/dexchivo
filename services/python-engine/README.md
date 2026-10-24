# Chivo Python Engine

FastAPI service for deterministic analytics and signal proposals.

## M0 scope

- Health endpoints: `/health/live`, `/health/ready`.
- Runtime metadata: `/api/v1/system/info`.
- Pydantic validation of the shared `strategy.signal.created` fixture.
- No exchange credentials, venue clients, signing code or order submission.
- LIVE mode is rejected at startup.

Indicators, strategy evaluation and backtesting are implemented in M2.

## Local development

From this directory:

```bash
uv sync
CHIVO_RELOAD=true uv run python -m chivo_python_engine
```

Checks:

```bash
uv run ruff check .
uv run ruff format --check .
uv run pyright
uv run pytest
```

Environment variables use the `CHIVO_` prefix. See the repository root `.env.example`.
