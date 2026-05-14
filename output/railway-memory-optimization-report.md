# Railway Memory Usage Optimization Report

> Date: 2026-05-13
> Scope: Railway receipt `Receipt-2912-4136.pdf`, Railway MCP read-only inspection, and local code review.

## Executive Summary

The April 9-May 9, 2026 Railway receipt shows **$14.40 paid** after the Hobby plan included usage credit. The largest billed line is **Agent Usage: $10.96**. Memory is the largest infra runtime line at **$3.26**, but it is not the largest total charge.

The memory line is **14,073,515 MB-min**, which averages to about **326 MB continuously across the billing window**. That is low for a project running four always-on services (`Postgres`, `crypto-survivors`, `market-server`, `market-aggregator`). The realistic near-term memory saving is therefore limited unless services are consolidated, slept, or a real leak is found.

Most actionable memory work is in `market-aggregator`: PostgreSQL pool sizing, unbounded history cache behavior, production-mode configuration, and SSE/client caps.

## Receipt Findings

| Line item | Period | Quantity | Amount | Share of subtotal |
|---|---:|---:|---:|---:|
| Agent Usage | Apr 22-May 9, 2026 | 10,961,092 | $10.96 | 56.5% |
| Hobby plan | May 9-Jun 9, 2026 | 1 | $5.00 | 25.8% |
| Memory | Apr 9-May 9, 2026 | 14,073,515 MB-min | $3.26 | 16.8% |
| vCPU | Apr 9-May 9, 2026 | 24,351 vCPU-min | $0.11 | 0.6% |
| Network | Apr 9-May 9, 2026 | 897 | $0.04 | 0.2% |
| Disk | Apr 9-May 9, 2026 | 9,741 GB-min | $0.03 | 0.2% |

Subtotal was **$19.40**. The Hobby included usage credit removed **$5.00**, producing **$14.40 paid**.

Memory math:

- `14,073,515 MB-min / 43,200 minutes = ~325.8 MB average`.
- `14,073,515 MB-min = ~229.1 GB-hours`.
- A 20-35% memory reduction at this invoice level saves about **$0.65-$1.14/month**.
- Reducing Agent Usage has a larger billing impact than memory work.

## Railway MCP Scope Checked

Railway MCP found one project:

| Project | ID | Environment | Services |
|---|---|---|---|
| `crypto-survivors` | `7e349459-edc0-46b1-9e22-908b278ced1e` | `production` | `Postgres`, `crypto-survivors`, `market-server`, `market-aggregator` |

Service deployment snapshot:

| Service | Latest relevant status | Runtime/config notes |
|---|---|---|
| `crypto-survivors` | `SUCCESS`, deployment `f7eddda5-9026-4ce0-b7e8-35889e8666e9` | Nixpacks, `npm start`, `/health`, 1 replica, sleep disabled |
| `market-server` | `SUCCESS`, deployment `842ba384-1eed-4ee5-a5b3-a715fcb0c89e` | Dockerfile, `npm start`, 1 replica, `europe-west4`, sleep disabled |
| `market-aggregator` | `SUCCESS`, deployment `cded4d6f-7763-4dfc-bd99-293ca3820b15` | Dockerfile, `node dist/index.js`, 1 replica, `europe-west4`, sleep disabled |
| `Postgres` | `SUCCESS`, deployment `da6cc1c7-ea7f-44f9-ac40-3adb794d37ef` | Railway Postgres image, mounted volume |

The current MCP tool set does not expose Railway resource metrics directly. The Railway GraphQL metrics endpoint is documented in the `use-railway` skill, but direct shell network access to `backboard.railway.com` is blocked in this sandbox. Service-level memory attribution therefore still needs either Railway dashboard metrics or a metrics-enabled MCP/CLI run outside this network sandbox.

## Operational Signals

### `crypto-survivors`

Runtime logs show static asset serving and regular public traffic. They also show repeated WordPress/CMS probe traffic:

- `/wp-admin/install.php`
- `/xmlrpc.php`
- `/wp-includes/wlwmanifest.xml`
- `/wordpress/`, `/backup/`, `/old/`

The app returns `418` and `429` for many blocked probes. This is useful security behavior, but it still consumes process memory/CPU per request.

Relevant code:

- `server.js:262` keeps an in-memory `rateLimitMap`.
- `server.js:365` adds a random 100-600 ms delay for blocked paths.
- `server.js:431` reads static files into memory per request.
- `server.js:467` / `server.js:470` compresses with Brotli/gzip synchronously per request.

### `market-server`

Runtime logs show API activity and repeated PostgreSQL pool connect/remove cycles. The pool is capped at `max: 10` in `railway-market-server/src/db/pool.ts:18`, which is reasonable but should be validated against actual concurrency.

### `market-aggregator`

This is the highest-priority memory candidate. Runtime logs show high-frequency market processing:

- Frequent `Logged ... price entries`.
- Frequent whale-analysis log lines.
- Cleanup deleting thousands of `price_history` rows every cycle.

Relevant code:

- `railway-market-aggregator/src/db/pool.ts:18` sets PostgreSQL pool `max: 30`.
- `railway-market-aggregator/src/services/priceLogger.ts:122` inserts price history every 10 seconds per pair.
- `railway-market-aggregator/src/services/priceLogger.ts:142` updates indicators for each kline.
- `railway-market-aggregator/src/indicators/VolumeAnalyzer.ts:41` stores rolling volume arrays.
- `railway-market-aggregator/src/indicators/VolumeAnalyzer.ts:111` and `:121` scan arrays on each update.
- `railway-market-aggregator/src/routes/marketStream.ts:44` stores SSE clients in memory.
- `railway-market-aggregator/src/routes/marketStream.ts:164` keeps `historyCache` in a `Map` without eviction of expired keys.

### `Postgres`

Postgres logs are mostly routine checkpoints. Writes are small most of the time, but one checkpoint took about 65 seconds around `2026-05-12T22:03Z`, after writing 654 buffers. This is more of a write/WAL signal than a direct memory signal, but it supports reviewing retention and write frequency.

## Primary Findings

## 1. Memory is not the true largest bill driver

Memory is **$3.26**. Agent Usage is **$10.96**. Optimizing memory is still worthwhile, but the maximum possible memory saving is capped by that $3.26 line. The billing strategy should track Agent Usage separately.

## 2. Baseline memory is driven by always-on service count

The project runs four always-on production services. The invoice average of ~326 MB across all services suggests there is no obvious runaway memory burn at invoice level. Three separate Node containers plus Postgres each have a fixed baseline.

Options:

- Keep split services for operational isolation.
- Consolidate `market-server` and `market-aggregator` only if the team accepts higher blast radius.
- Enable sleep only for non-critical public/API services if cold starts are acceptable. Do not sleep `market-aggregator` if live market state must remain warm.

## 3. `market-aggregator` PostgreSQL pool is oversized

`market-aggregator` uses `pg.Pool({ max: 30 })`. For the current pipeline, that is high:

- Three market pairs.
- Price history insert at most every 10 seconds per pair.
- Market state update about once per second per pair.
- A few HTTP/SSE endpoints.

Recommended change:

- Make pool size configurable: `PG_POOL_MAX`.
- Default `market-aggregator` to **5**.
- Keep `market-server` at **5-10** depending on real traffic.
- Watch `waitingCount` and p95 request latency after rollout.

Expected impact:

- Lower Node-side pool memory.
- Lower Postgres backend connection memory.
- Lower risk of connection churn and checkpoint pressure.

## 4. Production mode is likely not set for Docker services

Both Dockerfiles install production dependencies, but neither sets `NODE_ENV=production`.

Evidence:

- `railway-market-aggregator/Dockerfile:9-15` has no `ENV NODE_ENV=production`.
- `railway-market-server/Dockerfile:17-28` has no `ENV NODE_ENV=production`.
- Aggregator production logs include `DEBUG` cleanup lines, and `Logger.debug()` only emits when `NODE_ENV !== 'production'`.

Recommended change:

- Add `ENV NODE_ENV=production` to both runtime Docker stages.
- Set Railway variable `NODE_ENV=production` for `crypto-survivors`, `market-server`, and `market-aggregator`.

Expected impact:

- Suppresses debug logs.
- Enables production branches in Node libraries.
- Small but low-risk memory/runtime improvement.

## 5. `historyCache` can grow without a hard cap

`marketStream.ts` stores history responses in:

```typescript
const historyCache = new Map<string, { data: unknown; timestamp: number }>();
```

The cache only checks TTL when the same key is read again. Expired keys are not proactively removed. The `pair` query is not constrained to `BTC`, `ETH`, `SOL`, so many unique `pair_limit` keys can accumulate.

Recommended change:

- Validate `pair` against an allowlist.
- Add periodic cache pruning.
- Add a hard cap, e.g. 64 keys.
- Expose cache size in `/stats` or `/debug`.

Expected impact:

- Prevents a small but real memory leak / attack path.
- Keeps memory predictable under bot traffic.

## 6. Static frontend server does per-request sync file read and compression

`server.js` reads and compresses assets on every request. Under normal traffic this is fine; under crawler/bot bursts it creates temporary buffers and synchronous CPU work.

Recommended change:

- Pre-compress immutable assets during build (`.br`, `.gz`) and serve precompressed files.
- Cache only small HTML templates in memory if needed.
- Do not cache all large assets in-process unless memory budget allows it.
- Remove the blocked-path random delay; return immediately for known probe paths.

Expected impact:

- Lower transient memory spikes.
- Lower CPU per request.
- Better behavior under scanner traffic.

## 7. SSE memory is bounded but should be monitored

`market-aggregator` caps SSE clients at 500 total and 3 per IP. That prevents unbounded growth, but each SSE client keeps a live `Response` object in memory.

Recommended change:

- Include `sseClients`, cache sizes, `rss`, `heapUsed`, `heapTotal`, `external`, `arrayBuffers`, and DB pool counts in `/stats`.
- Alert if `sseClients > 100` or RSS rises without matching client count.
- Consider a lower `MAX_SSE_TOTAL` until real user concurrency justifies 500.

## Recommended Optimization Plan

## Phase 0: Get service-level memory attribution

Use Railway dashboard metrics or GraphQL metrics to attribute `MEMORY_USAGE_GB` by service for Apr 9-May 9, then for the most recent 24 hours.

Target measurements:

- Average RSS / memory GB by service.
- P95 memory by service.
- Restarts/OOM events.
- `market-aggregator` `sseClients`, DB `waitingCount`, and cache size.

GraphQL measurement names from the Railway skill:

- `MEMORY_USAGE_GB`
- `MEMORY_LIMIT_GB`
- `CPU_USAGE`
- `NETWORK_RX_GB`
- `NETWORK_TX_GB`
- `DISK_USAGE_GB`

## Phase 1: Low-risk config/code fixes

1. Set `NODE_ENV=production` for all Node services.
2. Add `ENV NODE_ENV=production` to both Docker runtime stages.
3. Make DB pool caps env-driven:
   - `market-aggregator`: default `PG_POOL_MAX=5`.
   - `market-server`: default `PG_POOL_MAX=10`, optionally lower to 5 after traffic validation.
4. Add `/stats` memory detail:
   - `rssMB`
   - `heapUsedMB`
   - `heapTotalMB`
   - `externalMB`
   - `arrayBuffersMB`
   - pool totals
   - cache sizes
   - SSE client count
5. Add cache pruning and pair validation in `market-aggregator`.

## Phase 2: Runtime caps after measurement

After Phase 1 has telemetry:

- Try `NODE_OPTIONS=--max-old-space-size=128` for `crypto-survivors` static server if RSS is stable.
- Try `NODE_OPTIONS=--max-old-space-size=192` or `256` for `market-server`.
- Try `NODE_OPTIONS=--max-old-space-size=256` for `market-aggregator` only after confirming indicator/SSE load does not need more.

Do not apply Node heap caps blindly; they can convert a slow leak into hard OOM restarts.

## Phase 3: Structural savings

Only consider these if memory remains a billing concern after Phase 1:

- Merge `market-server` and `market-aggregator` into one service.
- Replace the custom frontend Node server with a smaller static-serving image while preserving SEO/security behavior.
- Sleep non-critical services if cold starts are acceptable.
- Reduce `price_history` retention from 24h to 6-12h if clients only need short warmup history.

## Verification Checklist

Before and after every change:

- Railway service status is `SUCCESS`.
- `/health` is `ok` or expected `degraded` reason is documented.
- RSS and heap do not climb across 30-60 minutes.
- No OOM restarts.
- `market-aggregator` `waitingCount` stays `0`.
- SSE clients receive updates.
- `price_history` inserts and cleanup still work.
- Run:

```bash
npm run build
cd railway-market-server && npm run validate
cd ../railway-market-aggregator && npm run validate
```

## Immediate Next Actions

1. Implement Phase 1 instrumentation and safe defaults.
2. Deploy `market-aggregator` first because it is the highest-confidence target.
3. Observe 24 hours of Railway memory metrics.
4. Apply Node heap caps only after the observed RSS/heap baseline is known.
5. Start a separate Agent Usage cost review, because it is the largest charge on this receipt.
