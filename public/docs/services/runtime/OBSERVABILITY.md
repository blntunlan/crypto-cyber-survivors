# :Eye: Runtime Observability

> **Status** live
> Owner: Backend & Data Engineering


Domain: telemetry, market health, and operator visibility

## Client telemetry

The client currently sends three main telemetry classes to Railway:

- error reports via `/api/v1/telemetry/errors`
- performance metrics via `/api/v1/telemetry/performance-metrics`
- device profile snapshots via `/api/v1/telemetry/device-profiles`

`ErrorTracker` owns privacy-safe error capture, rate limiting, offline queueing, and the telemetry circuit breaker.

## Market delivery visibility

Gameplay market data is delivered through `SSEMarketService` using `/api/v1/market/stream?pair=...`.

The client monitors:

- last data time
- total disconnect duration
- fallback usage state
- fatal disconnect escalation

This is the gameplay-facing market health signal. Admin dashboards may still use direct `MarketService` WebSocket adapters for diagnostics.

## Known API gaps

`AdminAnalyticsService` currently documents two missing endpoints that would improve operations:

- `GET /api/v1/telemetry/error-summary`
- `PATCH /api/v1/telemetry/errors/:errorType`

Until those exist, admin analytics surfaces fall back to placeholders or local connection-state checks.
