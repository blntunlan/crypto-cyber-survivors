# Railway Infrastructure Roadmap

> Comprehensive audit and hardening plan for Railway API Server + Market Aggregator  
> Created: 2026-04-04 | Status: **IN PROGRESS**

---

## Architecture Overview

```
Client (React)
  ├──[SSE]──────> Market Aggregator (port 3002)  ← Binance/Coinbase WS
  └──[fetch]────> API Server (port 3001)          ← 12 route files, 30+ endpoints
                       │
                       ▼
              Railway PostgreSQL (16 tables, 3 views, 6 functions)
```

- **API Server** (`railway-market-server/`): Stateless REST, Drizzle ORM, JWT auth, rate limiting
- **Market Aggregator** (`railway-market-aggregator/`): Stateful WebSocket→SSE pipeline, indicator calc
- **Client**: `RailwayClient.ts` (HTTP), `SSEMarketService.ts` (EventSource)

---

## P0 — Critical Security (IMMEDIATE)

### P0.1 — Protect `/debug` endpoint on both services
**Risk**: Both API server and aggregator expose `/debug` without authentication. Leaks table counts, pool stats, error details, auth metrics.  
**Fix**: Require `ADMIN_API_SECRET` Bearer token on `/debug` for both services.  
**Files**: `railway-market-server/src/index.ts:131`, `railway-market-aggregator/src/index.ts:83`

### P0.2 — Protect `/cleanup` endpoint on aggregator
**Risk**: `POST /cleanup` on aggregator has no auth — anyone can trigger database cleanup.  
**Fix**: Add admin auth middleware.  
**File**: `railway-market-aggregator/src/index.ts:167`

### P0.3 — SSL certificate validation on DB connections
**Risk**: Both services use `ssl: { rejectUnauthorized: false }` for Railway PostgreSQL connections, enabling MITM attacks.  
**Fix**: Use Railway's CA certificate or at minimum document the trade-off. For Railway internal networking, this is acceptable if connections are internal, but should be explicit.  
**Files**: `railway-market-server/src/db/pool.ts:22`, `railway-market-aggregator/src/db/pool.ts:22`

---

## P1 — SSE DoS Protection (HIGH)

### P1.1 — Connection limit on aggregator SSE
**Risk**: No limit on concurrent SSE connections. A single IP can open hundreds of EventSource connections, exhausting server memory.  
**Fix**: Add per-IP connection limit (max 3-5 SSE connections per IP) and global max (e.g., 500 total).  
**File**: `railway-market-aggregator/src/routes/marketStream.ts:49-73`

### P1.2 — Rate limiting on aggregator HTTP endpoints
**Risk**: Aggregator has zero rate limiting. `/api/v1/market/history` can be hammered.  
**Fix**: Add `express-rate-limit` to aggregator (global + per-endpoint limiters).  
**File**: `railway-market-aggregator/src/index.ts`

### P1.3 — Trust proxy on aggregator
**Risk**: Aggregator doesn't set `trust proxy`, so rate limiting (once added) will key on proxy IP, not client IP.  
**Fix**: Add `app.set('trust proxy', 1)`.  
**File**: `railway-market-aggregator/src/index.ts`

---

## P2 — Client Network Resilience (MEDIUM)

### P2.1 — Request timeout in RailwayClient
**Risk**: `RailwayClient.ts` uses bare `fetch()` with no timeout. A hung server will block the client indefinitely.  
**Fix**: Add `AbortSignal.timeout(10_000)` to all fetch calls.  
**File**: `services/api/RailwayClient.ts:53`

### P2.2 — Retry with exponential backoff in RailwayClient
**Risk**: Only 401 (token refresh) triggers a retry. Network errors, 503, 429 are not retried.  
**Fix**: Add retry logic for transient failures (network error, 429, 502, 503) with exponential backoff (max 2 retries).  
**File**: `services/api/RailwayClient.ts:60-90`

---

## P3 — CI/CD & Build (MEDIUM)

### P3.1 — CI Node version mismatch
**Risk**: CI uses Node 22.x but production Dockerfile uses `node:20-alpine`. Tests may pass on 22 but fail on 20.  
**Fix**: Align CI to Node 20.x to match production.  
**File**: `.github/workflows/ci.yml` (matrix: `node-version: [20.x]`)

### P3.2 — Add server-side validate step to CI
**Risk**: CI only runs client-side lint/test/build. Railway server and aggregator are not validated in CI.  
**Fix**: Add CI job that runs `cd railway-market-server && npm ci && npm run validate` and same for aggregator.  
**File**: `.github/workflows/ci.yml`

### P3.3 — Add Dockerfile for API server
**Risk**: API server has no Dockerfile (relies on Railway Nixpacks). Explicit Dockerfile ensures reproducible builds.  
**Fix**: Create `railway-market-server/Dockerfile` matching aggregator pattern.  
**File**: New `railway-market-server/Dockerfile`

---

## P4 — Database Hardening (MEDIUM)

### P4.1 — Add connection retry to aggregator pool
**Risk**: Aggregator pool has no retry on connection errors (API server already has this).  
**Fix**: Port the retry logic from API server's `pool.ts` to aggregator's `pool.ts`.  
**File**: `railway-market-aggregator/src/db/pool.ts`

### P4.2 — Pool health monitoring on aggregator
**Risk**: Aggregator pool lacks the health monitoring that API server has.  
**Fix**: Add pool connect/remove/high-usage monitoring.  
**File**: `railway-market-aggregator/src/db/pool.ts`

### P4.3 — Automated backup strategy
**Risk**: No database backup configuration documented or automated.  
**Fix**: Document Railway's automatic backup capability. Add a `pg_dump` cron option for critical data export.  
**Note**: Railway Pro provides daily automatic backups. Document how to enable/verify.

---

## P5 — Server-Side Testing (LOW-MEDIUM)

### P5.1 — Test infrastructure for API server
**Risk**: Zero server-side tests. All 30+ endpoints are untested server-side.  
**Fix**: Set up Vitest in `railway-market-server/`, add test helpers for DB mocking, create test suite for critical routes (profile, sessions, wallet).  
**Files**: New `railway-market-server/vitest.config.ts`, `railway-market-server/tests/`

### P5.2 — Test infrastructure for aggregator
**Risk**: Zero aggregator tests. Indicator calculations, SSE broadcast, cleanup cron untested.  
**Fix**: Set up Vitest in `railway-market-aggregator/`, test indicator math and broadcast logic.  
**Files**: New `railway-market-aggregator/vitest.config.ts`, `railway-market-aggregator/tests/`

---

## P6 — Observability & Operational (LOW)

### P6.1 — Structured logging format
**Risk**: Logger uses plain text. Not easily parseable by log aggregation tools (Railway logs, Datadog, etc.).  
**Fix**: Add optional JSON structured logging mode activated by `LOG_FORMAT=json` env var.  
**Files**: Both `utils/logger.ts` files

### P6.2 — Health check with dependency details
**Risk**: Aggregator health check doesn't verify WebSocket connection age or data freshness.  
**Fix**: Add `lastDataAge`, `wsConnectedSince`, `indicatorWarmupComplete` to `/health`.  
**File**: `railway-market-aggregator/src/index.ts`

### P6.3 — Graceful shutdown timeout
**Risk**: Both services call `process.exit(0)` in shutdown handlers without waiting for in-flight requests to complete.  
**Fix**: Add `server.close()` with timeout before pool close and process exit.  
**Files**: Both `src/index.ts` files

---

## Phase Execution Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|-------------|
| P0    | CRITICAL | ~30min | None |
| P1    | HIGH     | ~45min | None |
| P2    | MEDIUM   | ~20min | None |
| P3    | MEDIUM   | ~30min | None |
| P4    | MEDIUM   | ~20min | None |
| P5    | LOW-MED  | ~2h    | P0, P3 |
| P6    | LOW      | ~45min | None |

P0 → P1 → P2 → P3 → P4 can run in parallel pairs.  
P5 depends on P0+P3 being stable first.  
P6 is independent, nice-to-have.

---

## Status Tracker

- [ ] **P0.1** — Protect `/debug` endpoints
- [ ] **P0.2** — Protect `/cleanup` endpoint
- [ ] **P0.3** — SSL certificate documentation
- [ ] **P1.1** — SSE connection limits
- [ ] **P1.2** — Aggregator rate limiting
- [ ] **P1.3** — Aggregator trust proxy
- [ ] **P2.1** — RailwayClient request timeout
- [ ] **P2.2** — RailwayClient retry with backoff
- [ ] **P3.1** — CI Node version alignment
- [ ] **P3.2** — Server validate in CI
- [ ] **P3.3** — API server Dockerfile
- [ ] **P4.1** — Aggregator pool retry
- [ ] **P4.2** — Aggregator pool monitoring
- [ ] **P4.3** — Backup strategy docs
- [ ] **P5.1** — API server test suite
- [ ] **P5.2** — Aggregator test suite
- [ ] **P6.1** — Structured logging
- [ ] **P6.2** — Enhanced health checks
- [ ] **P6.3** — Graceful shutdown
