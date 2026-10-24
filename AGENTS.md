# AGENTS.md --- OpenCode project instructions

You are implementing the Crypto Trading Platform described in `SPEC.md`.
Read SPEC.md completely before coding. Treat it as the source of truth;
when ambiguous, ask rather than invent exchange-specific behavior.

## Non-negotiable constraints

-   Begin with milestone M0 only; do not attempt the whole platform in
    one pass.
-   Stack: pnpm/TypeScript/Next.js/Fastify/Prisma;
    Python/uv/FastAPI/NumPy/Pandas; PostgreSQL, Redis Streams, Docker
    Compose.
-   Financial amounts use decimal-safe representation and decimal
    strings at service boundaries.
-   Python may generate signals but MUST NOT possess exchange
    credentials or place orders.
-   Every order (manual/auto, paper/live) goes through a central risk
    gate and durable intent state machine.
-   PAPER and LIVE are separate execution modes; never silently switch
    to LIVE. LIVE is disabled by default.
-   No secrets in source, browser, logs, fixtures or Git. No fabricated
    exchange endpoints.
-   No blind retry of unknown order submissions; reconcile first.
-   Preserve idempotency, audit logs, immutable fills and paper ledger.
-   Use explicit adapter capabilities instead of assuming exchange
    feature parity.
-   Spanish-first dashboard; English code symbols and technical docs.

## Workflow for every milestone

1.  State scope, assumptions, dependencies, files to create/change and
    acceptance tests.
2.  Implement smallest working vertical slice, with real interfaces and
    mockable adapters.
3.  Add unit/integration tests and error-path coverage.
4.  Run lint, typecheck, tests and build; report exact commands/results.
5.  Update README, OpenAPI, `.env.example`, architecture decisions and
    milestone checklist.
6.  Stop and request approval for the next milestone.

## Suggested initial task

Implement M0: pnpm monorepo, uv Python service, typed shared
event/market/order contracts, minimal Next.js and Fastify apps, FastAPI
health endpoint, Docker Compose for Postgres/Redis, CI skeleton,
Vitest/Pytest, README and `.env.example`. No exchange credentials or
LIVE trading. Show how to run the stack locally.

## Definition of done

A feature is done only when its happy path, failures, permissions,
tests, documentation and operational visibility are implemented. Mark
incomplete functionality explicitly; do not represent mocks as real
trading integrations.
