# Crypto Trading Platform --- Software Requirements Specification

Version: 0.1.0 \| Status: Implementation baseline \| Language: English
(code/docs), Spanish UI initially

## 1. Product vision

Build a self-hosted modular crypto trading platform supporting
manual-assisted, automated, and paper trading. Target Binance USD-M
Futures first, then Hyperliquid and Aster via capability-aware adapters.
Provide a Next.js dashboard, Python analytics engine, TypeScript
execution services, Telegram notifications, and auditable risk controls.
No promise of profitability.

## 2. Delivery boundaries

### MVP v0.1 (must ship)

-   Single administrator; login, secure sessions, 2FA for sensitive
    actions.
-   Binance USD-M public market-data connection, normalized instruments,
    candles and streaming prices.
-   Paper account with configurable virtual starting balance,
    market/limit orders, commissions, configurable slippage, partial
    fills when supported by simulation, positions, PnL and trade
    history.
-   Manual paper order entry; automated paper execution from
    Python-generated signals.
-   Python indicators: EMA 20/50/200, RSI, ATR, volume SMA, pivots, BOS,
    CHoCH, bullish/bearish FVG and mitigation; all strategies versioned
    and deterministic on closed candles.
-   FVG + CHoCH sample strategy, configurable timeframe and parameters;
    backtest with fees, slippage and no lookahead.
-   Central risk manager; exposure, position count, per-trade risk,
    daily drawdown, stale-data rejection, emergency stop.
-   Dashboard overview, chart, screener (limited configured universe),
    strategies, bot instances, positions, order history, connections,
    risk settings and audit.
-   Telegram link flow, alerts, /status /balance /positions /pnl /bots
    /signals /pause. No remote LIVE enablement.
-   Docker Compose local deployment, tests, structured logs, backups and
    health checks.
-   LIVE execution disabled by default; not an MVP completion
    dependency.

### Later increments

v0.2: gated Binance LIVE after testnet, reconciliation, safety review
and operator confirmation. v0.3: Hyperliquid adapter, signing isolation,
paper then separately approved live. v0.4: Aster adapter, subject to
verified current API capabilities. v1.x: advanced screener, more
strategies, multiuser RBAC, AI, plugin SDK, mobile app, other exchanges.
Do not claim feature parity across venues; expose adapter capability
flags.

## 3. Architecture and ownership

-   `apps/dashboard`: Next.js, TypeScript, Tailwind, shadcn/ui,
    Lightweight Charts. Never hold exchange secrets or send orders to
    venues.
-   `apps/api`: Fastify REST/WebSocket, auth, orchestration, bot
    management.
-   `apps/telegram-bot`: grammY; authorized chat IDs and read-only
    monitoring plus pause.
-   `services/market-data`: exchange streams, reconnect, normalization,
    deduplication, staleness checks.
-   `services/python-engine`: Python, FastAPI, NumPy/Pandas, strategy
    evaluation and backtesting. No exchange credentials or direct order
    execution.
-   `services/risk-manager`: mandatory pre-trade policy gate; fail
    closed.
-   `services/execution-engine`: order intent state machine, durable
    submission, reconciliation.
-   `services/paper-engine`: simulated execution using the same
    normalized order and risk contracts.
-   `services/exchange-gateway`: adapters for Binance, Hyperliquid and
    Aster; capability-driven routing.
-   PostgreSQL: authoritative durable state. Redis Streams: asynchronous
    messaging; never sole record of orders. Use pnpm workspaces for TS
    and uv for Python. Prisma migrations owned by TS database package.
    Docker Compose first; avoid Kubernetes and speculative
    microservices.

## 4. Trading modes and invariants

Model two orthogonal fields: `executionMode = PAPER | LIVE`,
`controlMode = MANUAL | AUTO`. An AUTO/PAPER bot may trade automatically
only against paper account. Changing control mode MUST NOT change
execution mode. LIVE requires separate explicit admin confirmation, 2FA,
validated credentials, enabled venue, configured risk profile and
preflight checks. Never auto-resume LIVE after restart. Pause blocks new
entries, not protective exits. Kill switch blocks new exposure and
optionally triggers a separately confirmed reduce-only workflow. Never
automatically liquidate positions merely because a service is unhealthy.
All paths (manual, auto, paper, live) pass through validation, risk
policy and order intent state machine. Python outputs proposals only.

## 5. Exchange abstraction

Create `ExchangeAdapter` with connect/disconnect, getCapabilities,
getMarkets, getBalances, getPositions, getOpenOrders, getOrder,
placeOrder, cancelOrder, subscribeMarketData and healthCheck. Normalize
venue symbol, contract multiplier, tick/step size, notional minimum,
quantity units, margin mode, leverage, funding, order type,
time-in-force, position mode, precision and fees. No assumed common
behavior for Binance, Hyperliquid and Aster. Secrets and wallet signing
isolated server-side. Verify current official API documentation before
implementing any venue-specific endpoint or signing algorithm; never
fabricate endpoints. Use a separate `PaperAdapter` that cannot access
live credentials or venue order submission.

## 6. Event contract

Every event: `eventId` (UUID), `eventType`, `schemaVersion`,
`occurredAt` UTC, `correlationId`, `producer`, `payload`. Example
events: `market.candle.closed`, `strategy.signal.created`,
`strategy.signal.expired`, `risk.order.approved`, `risk.order.rejected`,
`order.intent.created`, `order.submitted`, `order.partially_filled`,
`order.filled`, `order.cancelled`, `order.rejected`, `position.updated`,
`bot.paused`, `notification.created`. Use Redis Streams consumer groups
with retries, dead-letter handling and idempotent consumers.
Transactional outbox for database-to-event publishing. Never equate
queue acknowledgement with exchange order execution.

Example signal payload:

``` json
{
  "strategyId":"fvg_choch_v1",
  "strategyVersion":"1.0.0",
  "exchange":"BINANCE",
  "instrumentId":"BINANCE:USD-M:BTCUSDT",
  "timeframe":"15m",
  "side":"LONG",
  "entryType":"MARKET",
  "stopLoss":"67900.0",
  "takeProfit":"69300.0",
  "candleClosedAt":"2026-10-22T12:00:00Z",
  "expiresAt":"2026-10-22T12:15:00Z"
}
```

Use decimal strings for financial values, never JS floating point for
monetary accounting. Confidence scores, if any, are heuristic unless
calibrated.

## 7. Order state machine

Intent states: CREATED -\> RISK_APPROVED or RISK_REJECTED -\>
SUBMISSION_PENDING -\> SUBMITTED -\> PARTIALLY_FILLED -\> FILLED; also
CANCEL_PENDING, CANCELLED, REJECTED, EXPIRED, UNKNOWN_RECONCILE.
Preserve all transitions and venue responses. Idempotency key scoped by
account, strategy, signal and action; unique DB constraint. Use venue
client order ID when supported. On submission timeout, query venue and
reconcile before retrying; never blindly resend. Fills are immutable and
position projection is derived/reconciled. Support reduce-only
protective exits where venue supports it.

## 8. Risk policy

Per account/bot configurable: risk per trade, max notional/exposure, max
concurrent positions, daily realized+unrealized drawdown policy,
leverage ceiling, allowed instruments, stale quote/candle threshold,
spread and slippage guard, mandatory stop, sufficient available margin,
precision/minimum checks, venue status and trading halt. Reject by
default on unknown balances, unavailable venue, stale data or ambiguous
position state. Risk parameters stored/versioned and audited. Sample UI
defaults are illustrative only, not financial advice.

## 9. Paper execution

Maintain independent paper ledger with immutable cash, fee, funding and
fill movements. Market orders use available bid/ask plus modeled
slippage; limit orders account for price crossing and simulated
liquidity/partial fill. Simulate funding with timestamped venue data
when available and label approximations. Persist reproducible simulation
configuration and market data references. Backtest uses only information
available at each historical candle; document gaps and limitations.

## 10. Data model

Tables (minimum): `users`, `sessions`, `exchange_connections` (encrypted
credential reference only), `instruments`, `candles`, `strategies`,
`strategy_versions`, `bot_instances`, `signals`, `risk_profiles`,
`paper_accounts`, `order_intents`, `orders`, `fills`, `positions`,
`ledger_entries`, `outbox_events`, `consumer_inbox`,
`notification_events`, `telegram_links`, `audit_logs`. Include IDs,
createdAt/updatedAt where appropriate, unique keys, indexes on
instrument/time, bot/status, account/order, eventId. Preserve raw venue
IDs and normalized IDs separately. No hard deletion of audit, fill or
ledger history. Define migration and rollback approach.

## 11. API v1

REST endpoints: POST `/api/v1/auth/login`, POST `/api/v1/auth/logout`,
GET `/api/v1/me`; GET `/api/v1/exchanges`, GET/POST
`/api/v1/connections`; GET `/api/v1/markets`, GET `/api/v1/candles`; GET
`/api/v1/portfolio`, GET `/api/v1/positions`; GET/POST `/api/v1/orders`,
POST `/api/v1/orders/:id/cancel`; GET/POST `/api/v1/strategies`,
GET/POST `/api/v1/bots`, POST `/api/v1/bots/:id/start`, POST
`/api/v1/bots/:id/pause`; GET/PUT `/api/v1/risk-profiles`, GET
`/api/v1/analytics`, POST `/api/v1/system/kill-switch`, GET
`/api/v1/audit`. Document all requests/responses with OpenAPI and Zod.
Pagination, filtering, validation, rate limits, request IDs and
authorization required. WebSocket authenticated topics: quotes, candles,
signals, orders, positions, balances, bot state, service health. Do not
expose secrets.

## 12. UI screens

Overview (balance, PnL, risk status, venue health); Trading Terminal
(chart, instrument/timeframe selector, manual ticket, positions, pending
orders); Screener (configured symbols and signal filters); Strategy
Manager (version, parameters, bot lifecycle, PAPER/LIVE prominently
visible); Trade History (orders, fills, ledger, export); Settings
(connections, risk, Telegram, auth, audit). Responsive Spanish-first UI;
accessible forms, loading/error/empty states, explicit paper/live visual
differentiation. All illustrative/demo data labeled.

## 13. Telegram

Link through authenticated one-time token, allowlist chat IDs. Alerts:
signal, risk rejection, fill, stop/target, disconnect, pause and
critical errors. Commands: `/status`, `/balance`, `/positions`, `/pnl`,
`/bots`, `/signals`, `/pause`, `/alerts`. No order placement, secret
disclosure, `/resume` for LIVE or LIVE activation in MVP. Rate-limit,
deduplicate and audit commands and deliveries.

## 14. Security and operations

Environment secrets excluded from git. Encrypt exchange credentials at
rest with externalized master key; never print them. Restrict API
permissions and disable withdrawals; wallet signing isolated for DEX.
CSRF/session protection as applicable, secure cookies, 2FA for sensitive
operations, authorization on every API/WebSocket route. TLS at ingress;
private DB/Redis network; backups with restore drills; dependency
scanning; least privilege; audit sensitive changes. Metrics: stream lag,
quote age, consumer lag, rejected risk checks, order reconciliation
backlog, unknown order state, API errors. Health/readiness endpoints.
LIVE default off via explicit server-side feature flag.

## 15. Testing and release gates

Unit: indicators with fixtures, strategy determinism, precision, sizing,
risk limits, state transitions. Integration: DB migrations, Redis
retry/dedup, outbox, adapters against mocks/testnet, Telegram auth. E2E:
manual PAPER order; AUTO PAPER
signal-\>risk-\>fill-\>dashboard/Telegram; restart recovery; disconnect
and stale data; duplicate signal; timeout with unknown submission; kill
switch; forbidden LIVE path. Acceptance: no duplicated live orders in
retries; no secret leakage; no order bypasses risk; paper cannot call
live adapter; positions reconcile after restart; explicit mode
isolation; test coverage on critical financial paths and documented
limitations. Never claim production-safe merely because tests pass;
require manual operational review.

## 16. Build milestones and definition of done

M0: scaffold, architecture decision records, contracts, Docker Compose,
CI, health endpoints. M1: auth, DB schema, Binance public market data,
dashboard live chart. M2: Python indicators, strategy versioning,
closed-candle signals, backtest. M3: risk manager, paper ledger, manual
and AUTO PAPER end-to-end. M4: Telegram, observability, fault-injection,
security and acceptance tests. M5 (separate approval): Binance testnet,
live execution and reconciliation. M6+: Hyperliquid and Aster adapters
separately validated. Each milestone: lint/typecheck, unit/integration
tests, migration, API docs, README instructions, `.env.example`, demo
and acceptance checklist. Do not start later milestones before previous
gates pass.

## 17. OpenCode implementation protocol

Read `AGENTS.md` and this specification first. Start with M0 only.
Before editing, propose file tree and concise implementation plan; then
implement one milestone with tests. Do not invent exchange endpoints,
production credentials, trading performance, or live permissions. Prefer
working vertical slices over placeholders. Keep public API/event
contracts backward compatible or version them. Record architecture
decisions in `docs/architecture/`. Ask for approval before any
real-money integration, external deployment or irreversible migration.
