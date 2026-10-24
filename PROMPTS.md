# OpenCode milestone prompts

## Start here --- M0

Read `AGENTS.md` and `SPEC.md`. Implement ONLY milestone M0. First show
the planned file tree, technical decisions and acceptance criteria; then
scaffold the working monorepo, health endpoints, typed shared contracts,
Docker Compose, tests, README and `.env.example`. Keep LIVE trading
disabled. Run available checks and report results. Stop when M0 is
complete.

## M1

After M0 is approved, implement M1: authentication, database migrations,
Binance USD-M public market data, normalized instrument/candle schema,
reconnect/staleness handling and a real-time dashboard chart. Verify
endpoints against current official documentation. Include tests and
documentation. Do not implement order placement.

## M2

After M1 is approved, implement M2: Python indicators, versioned
FVG+CHoCH strategy, closed-candle event processing and reproducible
backtest. Add fixtures and no-lookahead tests. No order execution.

## M3

After M2 is approved, implement M3: central risk checks, paper account
ledger, durable order intents, manual PAPER and AUTO PAPER flows,
idempotency and recovery tests. Assert that paper mode cannot reach a
live adapter.

## M4

After M3 is approved, implement M4: Telegram link and commands,
notifications, monitoring, kill switch, failure injection and full
end-to-end acceptance tests. No LIVE enablement.

## M5 (explicit approval required)

Design Binance testnet execution, reconciliation, live preflight and
gated activation. Do not enable real-money trading without separate
explicit approval.
