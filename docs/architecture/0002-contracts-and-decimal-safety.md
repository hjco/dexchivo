# ADR 0002: Versioned contracts and decimal-string safety

- Status: Accepted
- Date: 2026-10-23

## Context

Monetary values must never be represented by JavaScript floating point. The TypeScript API and
Python engine must agree on proposal and event shapes, and events must evolve without silently
breaking consumers.

## Decision

1. Financial values cross boundaries as **base-10 decimal strings** matching
   `^-?(?:0|[1-9]\d*)(?:\.\d+)?$`.
2. Numeric JSON values, exponent notation, leading zeros, `NaN`, and infinity are rejected for
   price, quantity, notional, fee and PnL fields.
3. TypeScript uses Zod 4 schemas in `packages/contracts`. Python uses Pydantic 2 models in
   `chivo_python_engine.contracts`.
4. A shared fixture, `packages/contracts/fixtures/signal-created-event.json`, is validated by both
   test suites. Changes to the fixture must pass both languages.
5. Every event envelope has `eventId`, `eventType`, `schemaVersion`, `occurredAt` (UTC `Z`),
   `correlationId`, `producer` and `payload`.
6. `schemaVersion` starts at `1`. Incompatible payload changes require a new schema version and a
   new event type or contract, not silent mutation.
7. Decimal comparison helpers operate on strings without converting to floating point. Accounting
   code must use decimal-safe arithmetic (for example `decimal.js` or PostgreSQL `numeric`) when
   introduced in M3.
8. Signal timestamps and expiry are validated. A LIMIT signal requires an entry price; protection
   levels must be on the correct side of the entry when an entry price is present.
9. Signals are proposals only. They do not carry execution permission or exchange credentials.

## Consequences

- API and event payloads are slightly more verbose than JSON numbers, but safe by construction.
- The Python Pydantic models intentionally mirror only the contracts needed in M0. Additional
  market/order models are added as consumers need them.
- Tests assert cross-language agreement using a real fixture rather than generated prose.
