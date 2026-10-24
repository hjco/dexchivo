# ADR 0003: Orthogonal execution/control modes and fail-closed LIVE

- Status: Accepted
- Date: 2026-10-23

## Context

The specification requires `executionMode = PAPER | LIVE` and `controlMode = MANUAL | AUTO` to be
orthogonal. Switching to AUTO must never switch to LIVE. LIVE activation requires explicit, separate
controls and must not happen silently after restart.

## Decision

1. Both fields exist in the shared contracts from M0.
2. M0 accepts only `executionMode = PAPER`. `controlMode` may be `MANUAL` or `AUTO` in contracts,
   but no bot or order execution exists yet.
3. Both services parse a server-side LIVE feature flag and fail closed:
   - API: `EXECUTION_MODE=LIVE` or `ENABLE_LIVE_TRADING=true` aborts startup.
   - Python: `CHIVO_EXECUTION_MODE=LIVE` or `CHIVO_ENABLE_LIVE_TRADING=true` aborts startup.
4. `/api/v1/system/info` exposes `executionMode` and `liveTradingEnabled`, so the dashboard and
   operators can observe the active mode. The dashboard labels PAPER clearly in Spanish.
5. No path in M0 can submit an order to any venue. There is no exchange client or credential
   storage.
6. Future LIVE work must add explicit confirmation, 2FA, credential validation, preflight checks and
   a restart policy that keeps LIVE disabled until re-authorized. It must not reuse a PAPER order
   path with a hidden venue switch.

## Consequences

- Operators cannot accidentally enable LIVE by setting one environment variable.
- M1–M4 can build PAPER flows without carrying dormant LIVE code.
- M5 requires a separate approved design; this ADR does not authorize it.
