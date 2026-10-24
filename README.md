# Chivo — Crypto Trading Platform

Self-hosted, modular, **PAPER-first** crypto trading platform. The dashboard is Spanish-first; code
symbols and technical documentation are English.

> **Status: M0 scaffold.** There is no exchange connectivity, authentication, database schema, risk
> engine, paper ledger or order execution yet. LIVE trading is disabled and rejected at startup.
> This project does not promise profitability and M0 is not a trading integration.

## M0 delivered

| Area           | Delivered in M0                                                          |
| -------------- | ------------------------------------------------------------------------ |
| Monorepo       | pnpm workspaces, strict TypeScript, shared ESLint/Prettier config        |
| Contracts      | Zod event/market/order/signal contracts with decimal-string safety       |
| API            | Fastify health endpoints, runtime metadata, structured errors, OpenAPI   |
| Dashboard      | Minimal Next.js + Tailwind shell; Spanish UI; explicit PAPER/LIVE banner |
| Python         | uv + FastAPI health/metadata service; Pydantic contract validation       |
| Infrastructure | Docker Compose for PostgreSQL 17 and Redis 8                             |
| Tests          | Vitest and Pytest, including cross-language shared signal fixture        |
| CI             | GitHub Actions for TypeScript, Python, and Compose validation            |
| Docs           | Architecture decision records and M0 acceptance checklist                |

## Repository layout

```text
apps/
  api/                 Fastify API (M0: health + system metadata)
  dashboard/           Next.js dashboard shell
packages/
  contracts/           Shared Zod schemas, types and fixtures
services/
  python-engine/       FastAPI signal engine (no exchange access)
docs/
  architecture/        Architecture decision records
  milestones/          Milestone acceptance checklists
compose.yaml           Local PostgreSQL and Redis
```

Future services from the specification (`market-data`, `risk-manager`, `execution-engine`,
`paper-engine`, `exchange-gateway`, `telegram-bot`) are intentionally **not** scaffolded yet. They
will be introduced in their milestones with real interfaces rather than placeholders.

## Prerequisites

- Node.js 22.12 or newer
- pnpm 12 (`corepack enable` or install pnpm)
- uv 0.13 or newer
- Docker Engine with Compose v2

## Quick start

```bash
cp .env.example .env
docker compose up -d --wait

pnpm install
(cd services/python-engine && uv sync)
```

Start each process in a separate terminal:

```bash
pnpm dev:api        # http://localhost:4000
pnpm dev:dashboard  # http://localhost:3000
pnpm dev:python     # http://localhost:8000
```

Useful URLs:

- Dashboard: <http://localhost:3000>
- API liveness: <http://localhost:4000/health/live>
- API readiness: <http://localhost:4000/health/ready>
- API OpenAPI UI: <http://localhost:4000/docs>
- Python health: <http://localhost:8000/health/live>
- Python OpenAPI UI: <http://localhost:8000/docs>

The dashboard shows “API no disponible” when the API is not running. It does not fabricate balances,
prices or PnL.

## Verification

```bash
pnpm check:ts                 # format, lint, typecheck, tests, build
pnpm check:python             # ruff, pyright, pytest
docker compose config --quiet
```

Individual commands:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build

(cd services/python-engine && uv run ruff check .)
(cd services/python-engine && uv run ruff format --check .)
(cd services/python-engine && uv run pyright)
(cd services/python-engine && uv run pytest)
```

## Configuration and security

- Copy `.env.example` to `.env` for local use. `.env` files are ignored by Git.
- All three local processes read the repository-root `.env`; variables already exported in the shell
  take precedence.
- No real exchange credentials are needed or accepted in M0.
- `EXECUTION_MODE` must be `PAPER`; `ENABLE_LIVE_TRADING` must be `false`. Both the TypeScript API
  and Python engine fail closed otherwise.
- API logs redact authorization, cookie and API-key headers.
- The Python service has no exchange client, signing code, credentials or order-submission path.
- PostgreSQL and Redis are bound to localhost ports for development only. The Compose credentials
  are development defaults, not production secrets.

See [.env.example](.env.example) and the ADRs in [docs/architecture](docs/architecture).

## M0 exclusions

- No login, sessions, 2FA or authorization.
- No Prisma schema or migrations.
- No exchange market data or adapters.
- No indicators, strategies or backtests.
- No risk manager, paper ledger, order intents, fills or positions.
- No Telegram bot, WebSocket topics or notifications.
- No LIVE order path of any kind.

## Roadmap

- **M1:** auth, database schema, Binance USD-M public market data, live dashboard chart.
- **M2:** Python indicators, versioned FVG + CHoCH strategy, closed-candle signals, backtest.
- **M3:** central risk gate, paper ledger, manual PAPER and AUTO PAPER flows.
- **M4:** Telegram, observability, fault injection, security and acceptance tests.
- **M5+:** Binance testnet and gated LIVE execution, then additional venues — each requiring
  separate approval.

Milestone status is recorded in [docs/milestones/M0.md](docs/milestones/M0.md).
# dexchivo
