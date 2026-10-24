# ADR 0004: Local runtime, health endpoints and observability baseline

- Status: Accepted
- Date: 2026-10-23

## Context

M0 needs a reproducible local stack and health endpoints without implying that database or market
data dependencies are ready. Health checks must not lie about capabilities.

## Decision

1. `compose.yaml` runs PostgreSQL 17 and Redis 8 with named volumes and health checks. Application
   containers are deferred; developers run API, dashboard and Python locally against Compose
   infrastructure.
2. Ports are configurable through `.env`: API 4000, dashboard 3000, Python 8000, PostgreSQL 5432,
   Redis 6379.
3. Both applications expose `/health/live` and `/health/ready`. In M0 readiness validates
   configuration only; the response names the check instead of claiming database or Redis
   connectivity. M1 adds real dependency checks.
4. The API emits structured JSON logs, supports request IDs, returns structured errors, redacts
   sensitive headers, and exposes OpenAPI 3.1 at `/docs`.
5. CORS allows only the configured dashboard origin.
6. `/api/v1/system/info` publishes mode, version and explicit M0 limitations. The dashboard renders
   real API availability and never invents market or account data.
7. Secrets are supplied only through the environment. `.env` files and exchange credentials are
   excluded from Git and are never exposed to the browser or Python service.

## Consequences

- Local startup is simple and the Compose stack can be validated in CI.
- Readiness semantics are honest: green M0 readiness does not mean trading is ready.
- A future full-stack Compose profile must add migrations, health-gated startup and separate
  PAPER/LIVE deployment configuration.
