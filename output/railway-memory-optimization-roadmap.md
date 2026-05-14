# Railway Memory Optimization Roadmap Workflow

> Date: 2026-05-14
> Scope: Memory usage reduction for `crypto-survivors`, `market-server`, `market-aggregator`, and Railway Postgres.
> Source report: `output/railway-memory-optimization-report.md`

## Goal

Reduce Railway memory usage without breaking live market data, API writes, or the public game site.

Primary target:

- Reduce memory line by 20-35% from the current invoice baseline.
- Keep all services healthy for 24 hours after each deploy.
- Avoid blind heap caps until application-level memory telemetry exists.

## Workflow Rules

- Do one phase at a time.
- Deploy `market-aggregator` changes before broader service changes.
- Do not change Railway production variables and code in the same step unless rollback is obvious.
- Every phase needs a before/after snapshot.
- If memory falls but restarts increase, revert the phase.

## Phase 0: Baseline And Instrumentation

Status: Local code implemented, deployment and baseline capture pending

Purpose:

- Establish service-level memory evidence before aggressive limits.

Tasks:

- Add `/stats` memory fields to `market-server` and `market-aggregator`:
  - `rssMB`
  - `heapUsedMB`
  - `heapTotalMB`
  - `externalMB`
  - `arrayBuffersMB`
  - `uptimeSec`
- Add `market-aggregator` runtime counters:
  - DB pool `totalCount`, `idleCount`, `waitingCount`
  - `sseClients`
  - `historyCacheSize`
- Add equivalent lightweight memory output to root `server.js` `/health` or a new `/stats` endpoint.
- Capture Railway memory metrics for the last 24h from Railway dashboard or GraphQL metrics.

Validation:

```bash
npm run build
cd railway-market-server && npm run validate
cd ../railway-market-aggregator && npm run validate
```

Success gate:

- All services deploy successfully.
- `/stats` responds without secrets.
- Baseline is captured for all services.

Rollback:

- Revert stats endpoint changes if any endpoint exposes sensitive data.

## Phase 1: Safe Runtime Defaults

Status: Local code implemented, Railway variable rollout pending

Purpose:

- Reduce obvious runtime overhead without behavior changes.

Tasks:

- Add `ENV NODE_ENV=production` to:
  - `railway-market-server/Dockerfile`
  - `railway-market-aggregator/Dockerfile`
- Set Railway variable `NODE_ENV=production` for:
  - `crypto-survivors`
  - `market-server`
  - `market-aggregator`
- Confirm debug logs disappear in production.

Validation:

```bash
cd railway-market-server && npm run validate
cd ../railway-market-aggregator && npm run validate
```

Railway MCP checks:

- List latest deployments.
- Pull deploy logs for `market-server`.
- Pull deploy logs for `market-aggregator`.
- Confirm no boot errors.

Success gate:

- No failed deployment.
- No increase in 5xx logs.
- Memory is equal or lower after 2-4 hours.

Rollback:

- Remove `NODE_ENV=production` variable or revert Dockerfile change if a route depends on non-production behavior.

## Phase 2: Database Pool Right-Sizing

Status: Local code implemented, Railway env rollout pending

Purpose:

- Lower app memory and Postgres backend connection memory.

Tasks:

- Make `market-aggregator` pool configurable:
  - env: `PG_POOL_MAX`
  - default: `5`
  - current hardcoded value: `30`
- Optionally make `market-server` pool configurable:
  - env: `PG_POOL_MAX`
  - default: `10`
  - test lower value `5` after traffic review
- Add pool values to `/stats`.

Recommended rollout:

1. Deploy code with env-driven pool but keep current values.
2. Set `market-aggregator PG_POOL_MAX=5`.
3. Observe `waitingCount` and API latency for 24h.
4. Only then test `market-server PG_POOL_MAX=5`.

Success gate:

- `waitingCount` remains `0` during normal load.
- No connection timeout spikes.
- Railway memory decreases or stays flat.

Rollback:

- Set `PG_POOL_MAX=30` for `market-aggregator`.
- Set `PG_POOL_MAX=10` for `market-server`.

## Phase 3: Cache And Request Memory Hardening

Status: Local code implemented, deployment observation pending

Purpose:

- Eliminate bounded-but-growing in-process memory paths.

Tasks:

- In `market-aggregator/src/routes/marketStream.ts`:
  - allow only `BTC`, `ETH`, `SOL` for `pair`
  - cap `historyCache` size, recommended max `64`
  - prune expired cache entries on interval
  - expose `historyCacheSize` in stats
- Review SSE cap:
  - current total cap: `500`
  - temporary recommended cap: `150`
  - keep per-IP cap: `3`
- In root `server.js`:
  - remove random blocked-path delay
  - keep direct `418` or `429`
  - consider serving precompressed `.br` and `.gz` assets instead of compressing every request

Success gate:

- Invalid pairs return `400`.
- Cache size remains bounded under repeated unique query attempts.
- SSE stream still works for valid clients.
- Bot traffic no longer holds delayed timers.

Rollback:

- Restore previous pair behavior only if valid clients rely on dynamic pairs.
- Restore SSE cap if real concurrent users exceed temporary cap.

## Phase 4: Measurement Window

Status: Pending

Purpose:

- Prove whether Phases 1-3 reduced memory without reducing reliability.

Observation window:

- Minimum: 24 hours.
- Preferred: 72 hours.

Metrics to compare:

- Railway average memory by service.
- Railway p95 memory by service.
- Process `rssMB`.
- Process `heapUsedMB`.
- Restarts.
- OOM or crash logs.
- DB pool `waitingCount`.
- SSE client count.
- Response latency for `/health`, `/stats`, `/api/v1/market/history`.

Decision gate:

- If memory reduction is 20% or better with no reliability regression, continue to Phase 5.
- If memory reduction is below 10%, skip heap caps and evaluate service consolidation or static hosting changes.
- If restarts increase, rollback the last phase.

## Phase 5: Controlled Node Heap Caps

Status: Blocked Until Phase 4

Purpose:

- Prevent Node processes from growing beyond measured safe limits.

Initial candidates:

- `crypto-survivors`: `NODE_OPTIONS=--max-old-space-size=128`
- `market-server`: `NODE_OPTIONS=--max-old-space-size=192`
- `market-aggregator`: `NODE_OPTIONS=--max-old-space-size=256`

Rollout:

1. Apply to one service only.
2. Observe for 24h.
3. Move to the next service.

Success gate:

- No OOM restarts.
- No latency regression.
- RSS decreases or stays bounded.

Rollback:

- Remove `NODE_OPTIONS`.

## Phase 6: Structural Savings

Status: Future

Purpose:

- Reduce baseline memory if small fixes do not move the invoice enough.

Options:

- Merge `market-server` and `market-aggregator`.
- Replace root Node static server with a smaller static runtime while preserving SEO/security.
- Sleep non-critical services if cold starts are acceptable.
- Reduce `price_history` retention from 24h to 6-12h if gameplay only needs short warmup history.

Decision criteria:

- Use only if monthly memory savings justify engineering complexity.
- Do not merge services if it makes market data and API reliability harder to isolate.

## Execution Checklist

- [x] Phase 0 instrumentation implemented locally.
- [ ] Phase 0 deployed.
- [ ] Baseline captured.
- [x] Phase 1 production runtime defaults implemented locally.
- [ ] Phase 1 deployed.
- [x] Phase 2 pool sizing implemented locally.
- [ ] `market-aggregator PG_POOL_MAX=5` tested.
- [x] Phase 3 cache and request hardening implemented locally.
- [ ] 24h measurement completed.
- [ ] Heap caps evaluated from real metrics.
- [ ] Final savings report written.

## Progress Log

- 2026-05-14: Implemented local Phase 0-3 code changes. Added memory stats to root server, `market-server`, and `market-aggregator`; made PostgreSQL pool max configurable; set Docker runtime `NODE_ENV=production`; capped and pruned aggregator history cache; validated market pairs; lowered SSE total cap; removed blocked-path random delay.
- 2026-05-14: Validation passed with `npm run validate` in `railway-market-aggregator`, `npm run validate` in `railway-market-server`, `node --check server.js`, root `npm run build`, and `npx vitest run tests/routes/marketStream.test.ts`.

## Done Criteria

The memory optimization work is complete when:

- All services are healthy.
- Average memory is down by at least 20%, or a data-backed decision says further memory work is not worth the savings.
- No service has new restart/OOM behavior.
- The final report compares invoice baseline, before metrics, after metrics, and remaining cost drivers.
