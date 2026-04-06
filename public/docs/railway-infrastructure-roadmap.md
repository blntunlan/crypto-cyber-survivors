# Railway Infrastructure Roadmap

> Comprehensive audit and hardening plan for Railway API Server + Market Aggregator
> Created: 2026-04-05 | Status: **ALL PHASES COMPLETE**

---

## Status Tracker

- [x] **P0.1** — Protect `/debug` endpoints (both services)
- [x] **P0.2** — Protect `/cleanup` endpoint (aggregator)
- [x] **P0.3** — SSL certificate documentation (both pool.ts)
- [x] **P1.1** — SSE connection limits (per-IP: 3, global: 500)
- [x] **P1.2** — Aggregator rate limiting (global 60/min, history 30/min)
- [x] **P1.3** — Aggregator trust proxy
- [x] **P2.1** — RailwayClient request timeout (10s AbortSignal)
- [x] **P2.2** — RailwayClient retry with exponential backoff (2 retries, 429/502/503/504)
- [x] **P3.1** — CI Node version aligned to 20.x
- [x] **P3.2** — Server validate job in CI (both services)
- [x] **P3.3** — API server Dockerfile created
- [x] **P4.1** — Aggregator pool monitoring (connect/remove events, 30s health check)
- [x] **P4.2** — Aggregator pool high-usage warnings
- [x] **P4.3** — Backup strategy docs
- [x] **P5.1** — API server test suite (vitest + 4 test files)
- [x] **P5.2** — Aggregator test suite (vitest + indicator + rate limit tests)
- [x] **P6.1** — Structured logging (already built-in: JSON in production)
- [x] **P6.2** — Enhanced health checks (data freshness, total prices logged)
- [x] **P6.3** — Graceful shutdown (server.close + 10s timeout on both services)

---

## Changes Made

### P0 — Critical Security
- `railway-market-server/src/index.ts`: Added `requireAdmin` middleware to `/debug`
- `railway-market-aggregator/src/index.ts`: Added `requireAdmin` middleware to `/debug` and `/cleanup`
- Both `db/pool.ts`: Added SSL documentation comments

### P1 — SSE DoS Protection
- `railway-market-aggregator/src/routes/marketStream.ts`: Per-IP (3) and global (500) SSE connection limits
- `railway-market-aggregator/src/middleware/rateLimit.ts`: Created global (60/min) and history (30/min) limiters
- `railway-market-aggregator/src/index.ts`: Wired rate limiters + `trust proxy`

### P2 — Client Network Resilience
- `services/api/RailwayClient.ts`: Added `AbortSignal.timeout(10_000)` to all fetch calls
- `services/api/RailwayClient.ts`: Retry loop with exponential backoff for 429/502/503/504 + network errors

### P3 — CI/CD & Build
- `.github/workflows/ci.yml`: Node 22→20 alignment, added `server-validate` job for both services
- `railway-market-server/Dockerfile`: Created multi-stage Docker build

### P4 — Database Hardening
- `railway-market-aggregator/src/db/pool.ts`: Pool connect/remove logging + 30s health monitoring interval

#### P4.3 — Backup Strategy
Railway Pro provides **automatic daily backups** with point-in-time recovery. To verify:
1. Railway Dashboard → Select your PostgreSQL service → Settings → Backups
2. Ensure "Automatic Backups" is enabled (default on Pro plan)
3. For manual snapshots: `railway run pg_dump -Fc > backup_$(date +%Y%m%d).dump`
4. To restore: `railway run pg_restore -d $DATABASE_URL backup.dump`

Critical data to prioritize: `profiles`, `sessions`, `virtual_accounts`, `ledger`, `meta_progression`

### P5 — Server-Side Testing
- `railway-market-server/`: Vitest setup + tests for rate limiting, audit logger, token encryption, validation
- `railway-market-aggregator/`: Vitest setup + tests for rate limiting, indicators, SSE client count

### P6 — Observability & Operational
- P6.1: Both loggers already output structured JSON in production (`NODE_ENV=production`)
- P6.2: Aggregator `/health` now includes `lastDataAgeSec` and `totalPricesLogged`
- P6.3: Both services use `server.close()` + 10s forced shutdown timeout
