# ADR 0001: Monorepo, package boundaries and M0 scaffolding

- Status: Accepted
- Date: 2026-10-23
- Deciders: Project owner, implementation agent

## Context

The platform combines TypeScript orchestration and UI with a Python analytics engine. Financial
contracts must agree across languages, while exchange credentials and order submission must stay
outside Python. M0 must provide a working foundation without pretending that later services exist.

## Decision

1. Use a single pnpm workspace for TypeScript applications and packages.
2. Keep the Python engine as an independent uv project under `services/python-engine`.
3. Put cross-service financial and event contracts in `packages/contracts`.
4. Keep `packages/contracts` source-only for now. TypeScript consumers import its source directly;
   the API bundles it with tsup, and Next.js transpiles it. This avoids a stale build artifact
   during early development.
5. Do not scaffold empty placeholder services for market data, risk, execution, paper trading,
   exchange gateways or Telegram. Each arrives in its milestone with real interfaces.
6. Keep Python free of exchange clients, credentials, signing code and order-submission code. Its
   role is deterministic analytics and signal proposals.
7. Use PostgreSQL as authoritative durable state and Redis Streams for asynchronous messaging in
   later milestones. Neither is used as an order record in M0.

## Consequences

- Contract changes are immediately visible to TypeScript consumers and validated in Python via a
  shared JSON fixture.
- A future package publishing or Node-native distribution requirement will need a real build step
  for `@chivo/contracts`.
- Service boundaries are documented before implementation, avoiding speculative microservices.
- M0 contains fewer directories, but every directory that exists has a working purpose.

## M0 packages

```text
apps/api                 Fastify 5 + Zod type provider + OpenAPI
apps/dashboard           Next.js 16 + React 19 + Tailwind 4
packages/contracts       Zod 4 schemas, types, shared fixtures
services/python-engine   uv + FastAPI + Pydantic 2
```
