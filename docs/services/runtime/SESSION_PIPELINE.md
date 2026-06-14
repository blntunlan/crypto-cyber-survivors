# :Activity: Runtime Session Pipeline

> **Status** live
> Owner: Backend & Data Engineering


Domain: session lifecycle, persistence, and verification

## Scope

This document describes the Railway-backed session flow shared by `GameSessionService`, `MetricsStorage`, `CoinService`, and the market sync queue.

## Start path

1. `App.tsx` checks nickname and live market readiness.
2. `GameStateManager.initializeNewGame(...)` prepares local session state.
3. `GameSessionService.startSession(...)` posts to `/api/v1/sessions/start`.
4. The backend returns `sessionId`, `startTime`, and `sessionSecret`.
5. The client stores the session secret for later HMAC verification.

## During the run

- `CoinService` tracks session-local reward totals.
- `MetricsStorage` persists session data locally and posts session or telemetry data to Railway endpoints when available.
- `MarketSyncQueue` batches runtime market audit records so transient disconnects do not break deterministic verification.

## Verification path

1. `GameSessionService.submitSession(...)` flushes `MarketSyncQueue` before it sends the final payload.
2. The client signs the payload with `sessionSecret`.
3. The signed request is posted to `/api/v1/sessions/verify`.
4. The backend verifies reward and session claims, then returns the authoritative result.
5. The client clears active session state after completion.

## Related endpoints

- `POST /api/v1/sessions/start`
- `POST /api/v1/sessions/verify`
- `POST /api/v1/sessions/sync`
- `POST /api/v1/telemetry/performance-metrics`
- `POST /api/v1/telemetry/device-profiles`

## Notes

- `MetricsStorage.syncToRailway()` posts session telemetry to Railway.
- Optimistic reward UI is allowed, but the backend remains the source of truth for durable rewards.
- Queue flushing before verification is mandatory if you want replayable, ordered audit data on the server.
