# Database Architecture Review & Hardening — July 2026

Full review of the shared Railway PostgreSQL layer (API server + market
aggregator + frontend contract), followed by the first implementation wave
(migration `014_db_hardening` + operational fixes). This document records what
changed, why, and the prioritized roadmap for what was intentionally deferred.

## System shape (verified)

- **One Postgres**, two writers: `railway-market-server` (owns the schema,
  inline migrations 000–014 applied at startup) and `railway-market-aggregator`
  (pure writer: `market_state` ~3 upserts/sec, `price_history` ~26k rows/day,
  `error_reports`).
- Connection budget: server pool 10 + aggregator pool 5 = 15 of ~100
  `max_connections` (overridable via `PG_POOL_MAX`, documented in both
  `.env.example` files). Rule of thumb: keep `sum(pool max × replicas)` ≤ 50%
  of `max_connections`; introduce PgBouncer before scaling the API server past
  ~4 replicas.
- Economy is server-authoritative: `/sessions/verify` HMAC check →
  `price_history` reconciliation → `RewardCalculator` → one transaction over
  `sessions` (FOR UPDATE) / `wallets` / `reward_claims` / `ledger_entries`
  with idempotency keys.

## Changes shipped in this wave

### Migration `014_db_hardening` (`railway-market-server/src/db/migrate.ts`)
| Change | Why |
| --- | --- |
| `sessions.max_streak` (INTEGER, NULL legacy) | Server-trusted streak was only inside `reward_claims.metadata` JSONB — unqueryable for anti-cheat analytics. |
| `sessions.price_check` (`'ok'│'partial'│'skipped'`, NULL legacy) | The price cross-check silently degrades when `price_history` has gaps (aggregator downtime = the exact window an attacker targets). Now every verified session records whether reconciliation ran; `/verify` also warns on non-`ok`. Alert if the `skipped` rate rises. |
| Drop `product_telemetry_events.event_type` CHECK enum | New product events needed a schema migration. The app whitelist (`PRODUCT_EVENT_TYPES`, `routes/telemetry.ts`) is authoritative. |
| `market_state` fillfactor 70 + fixed autovacuum thresholds | 3-row table taking ~259k updates/day; default scale-factor autovacuum + fillfactor 100 bloats under long-lived snapshots (MV refresh). |
| Drop `idx_price_history_pair_ts`, `idx_sessions_is_verified`, `idx_meta_progression_profile` | All redundant (covered by UNIQUE constraint indexes / composite leading column); pure write amplification on hot paths. |
| `pg_stat_statements` (best-effort) | Query observability; harmless no-op if the library isn't preloaded. |

### Migration runner
- `pg_advisory_lock(771001)` held on a dedicated client for the whole run;
  each migration's apply+record is one transaction. Fixes the
  replica/rolling-redeploy race (012/013 contain `DROP … CASCADE`).
- Consequence: migration SQL must stay transaction-safe — **no
  `CREATE INDEX CONCURRENTLY` / `VACUUM` / `REFRESH … CONCURRENTLY` inside a
  migration**. Runner raises its own `statement_timeout` to 300s.

### Retention ownership moved to the API server
- The schema owner now runs the cleanup cron
  (`railway-market-server/src/cron/cleanup.ts`, started in `index.ts`):
  every 6h, all 8 `cleanup_old_*` functions, each step independently
  try/caught, on a dedicated client with `statement_timeout = 60s`, guarded by
  `pg_try_advisory_lock(771002)` so overlapping instances never double-delete.
- `price_history` retention extended 24h → **72h**: sessions verified late
  should not lose their anti-cheat reference prices (~78k rows steady state,
  trivial).
- The aggregator's cleanup cron and `POST /cleanup` endpoint were removed —
  it is a pure writer now.

### Cron & pool hardening (server)
- `LeaderboardRefreshCron`: `pg_try_advisory_lock(771003)` per run (replica
  scale-out no longer duplicates MV refreshes); refresh client uses 120s
  timeout.
- Pool: `statement_timeout = 30s` default (`POOL_STATEMENT_TIMEOUT_MS`);
  maintenance clients must `SET` back to it before release (a bare `RESET`
  falls back to server *unlimited*).
- `query()` retry-on-connection-error now only fires for pure `SELECT`s —
  codes `57P01`/`08006` can arrive after commit, so retrying an INSERT could
  double-credit; SQL functions invoked via `SELECT` (`purchase_*`,
  `transfer_*`, `cleanup_old_*`, …) are excluded.
- SSL: explicit `DATABASE_SSL`/`PGSSLMODE` override; default heuristic now
  also matches `*.rlwy.net` (the old `railway.app` substring missed modern
  Railway hostnames, silently sending public-proxy traffic without TLS).
  Same logic mirrored in the aggregator pool.

### Health & shutdown
- Both `/health` endpoints return **503 when the DB check fails** (was: 200
  with `status:'degraded'`, invisible to Railway's healthcheck). Aggregator
  feed-staleness stays a 200 `degraded` — a container restart wouldn't fix
  Binance.
- Aggregator shutdown calls `server.closeAllConnections()` so long-lived SSE
  streams can't pin `server.close()` — deploys previously always rode the 10s
  force-exit, killing in-flight DB writes.

### Advisory lock key registry
| Key | Holder |
| --- | --- |
| 771001 | Migration runner (blocking lock) |
| 771002 | Retention cleanup cron (try-lock, skip) |
| 771003 | Leaderboard MV refresh cron (try-lock, skip) |

## Deferred (prioritized roadmap)

1. **Backup/DR runbook** — nothing in the repo verifies Railway backups or
   documents restore order (server must migrate before the aggregator writes).
   Wallets/ledger are the economy source of truth; verify platform backups,
   add a scheduled `pg_dump` of durable tables, test a restore.
2. **Feed failover quality** — `PriceLogger.switchToPrimary` drops a working
   Coinbase feed every 60s while Binance is down (punches holes exactly where
   `price_check` looks); Coinbase fallback writes `volume: 0`, poisoning the
   volume z-score window. Probe-before-switch + skip volume samples on
   fallback + a `source` column/SSE tag.
3. **Legacy table consolidation** — `profiles`/`accounts`,
   `identities`/`account_identities`, `ledger`/`ledger_entries`,
   `audit_log`/`audit_events` dualities remain; hot paths still write legacy
   `audit_log`. Migrate writers to the new tables, then retire the legacy ones.
4. **Dead pipeline code in the server** — unmounted copies of
   `priceLogger`/`indicatorService`/`marketStream` remain in
   `railway-market-server/src`; delete to remove the latent dual-writer.
5. **Shared schema package** — `market_state`/`price_history` shapes still
   live in 3 places (server migrate.ts SQL, server Drizzle, aggregator
   Drizzle). Extract a shared package or add an aggregator startup assertion
   against `information_schema`.
6. **Seasons/quests/referrals** — telemetry already carries `season_id` /
   `quest_id` / `referral_code` columns (indexed); create the real tables when
   the features land, not speculatively.
7. **Partitioning** — not needed at current volumes (largest tables are
   bounded by retention). Revisit `market_runtime_audit` /
   `product_telemetry_events` if they approach ~50M rows.
