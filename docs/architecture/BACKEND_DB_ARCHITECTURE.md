# :Database: Backend & DB Architecture

> **Status** live
> Owner: Backend & Data Engineering

> **Status**: LIVE | **Reviewed**: 2026-03-19 | **Primary Runtime**: `railway-market-server`
> **Authoritative Sources**: `railway-market-server/src/index.ts`, `railway-market-server/src/routes/*.ts`, `railway-market-server/src/db/schema.ts`, `railway-market-server/src/db/migrate.ts`

## :Compass: Scope

This document describes the current production-facing backend and database topology after the Railway PostgreSQL migration. It is the operational reference for:

- HTTP API ownership and route clusters
- Supabase Auth to Railway backend trust boundaries
- PostgreSQL tables, views, functions, and triggers actually used at runtime
- Market ingestion, session verification, telemetry, replay, and meta-progression flows

This document should be read together with `docs/DATABASE_SCHEMA.md`.

## :Map: Topology

```text
React Client
  |- Supabase JS -> Supabase Auth only
  |- fetch -> Railway Market Server /api/v1/*
  |- SSE -> Railway Market Server /api/v1/market/stream

Railway Market Server
  |- Express route layer
  |- Supabase JWT verification middleware
  |- Drizzle + pg pool
  |- Binance/Coinbase ingestion services
  |- Indicator + price logging pipeline
  |- Cleanup cron

Railway PostgreSQL
  |- Core player/session/economy tables
  |- Telemetry and analytics tables
  |- Challenge/replay/meta-progression tables
  |- Views for leaderboards
  |- Functions for coin/meta accounting and cleanup
```

## :Shield: Ownership Boundaries

| Concern | System of Record | Notes |
|---|---|---|
| Authentication | Supabase Auth | Backend trusts Supabase JWTs via ES256 JWKS or HS256 fallback |
| Player profile/app data | Railway PostgreSQL | `profiles` is the app identity root |
| Session lifecycle | Railway backend + PostgreSQL | Start, sync, verify, replay ownership all terminate here |
| Market stream | Railway backend | Client no longer owns exchange websocket logic |
| Economy/meta progression | PostgreSQL functions + backend routes | Reward writes depend on stored procedures |
| Telemetry/error intake | Railway backend | Public write surface, persisted to PostgreSQL |

## :Building: Backend Module Layout

| Layer | Primary Files | Responsibility |
|---|---|---|
| App bootstrap | `src/index.ts` | Express wiring, CORS, route registration, health/debug endpoints, migrations, cron, price logger startup |
| Auth middleware | `src/middleware/auth.ts` | Verify Supabase JWT, populate `req.authUserId`, expose required-auth helper |
| Route layer | `src/routes/*.ts` | Thin controllers for profiles, sessions, wallet, leaderboard, telemetry, market, meta, challenges, replays |
| Validation | `src/db/validation.ts` | Zod schemas for selected payloads |
| DB access | `src/db/index.ts`, `src/db/helpers.ts`, `src/db/pool.ts` | Drizzle instance, profile lookup helpers, raw query/transaction access |
| DB schema/migrations | `src/db/schema.ts`, `src/db/migrate.ts`, `src/db/schema.sql` | Table definitions, startup migrations, SQL functions/views/triggers |
| Market services | `src/services/binanceService.ts`, `coinbaseService.ts`, `indicatorService.ts`, `priceLogger.ts`, `supabaseService.ts` | Exchange ingest, indicator computation, `market_state` upsert, `price_history` logging |
| Shared domain logic | `src/shared/RewardCalculator.ts` | Reward math reused by verification flow |

## :Link: API Surface Summary

**Authenticated route cluster**

| Route Prefix | Auth | Primary Tables | Notes |
|---|---|---|---|
| `/api/v1/profile` | Required | `profiles` | Create, fetch, patch current profile |
| `/api/v1/identities` | Required | `profiles`, `identities` | OAuth identity linking/unlinking |
| `/api/v1/wallet` | Required | `profiles`, `virtual_accounts` | Read current gold balance |
| `/api/v1/meta` | Required except leaderboard | `meta_progression` | Read/purchase/transfer meta state |
| `/api/v1/challenges/complete`, `/status` | Required | `daily_challenges`, `challenge_completions` | Challenge resolution for current user |
| `/api/v1/replays/save`, `/mine` | Required | `sessions`, `game_replays` | Replay ownership checks and per-user listing |
| `/api/v1/sessions/start` | Required | `profiles`, `sessions` | Session bootstrap and secret issuance |

**Mixed or public route cluster**

| Route Prefix | Auth | Primary Tables / Runtime | Notes |
|---|---|---|---|
| `/api/v1/sessions/verify` | No JWT, signed payload required | `sessions`, `virtual_accounts`, `ledger`, `meta_progression` | HMAC-based authoritative reward verification |
| `/api/v1/sessions/sync` | No JWT | `sessions` | Client sync path with column whitelist |
| `/api/v1/leaderboard` | Public | `v_leaderboard` | Read-only aggregate leaderboard |
| `/api/v1/market/stream` | Public | SSE client registry + market pipeline | Live indicator feed |
| `/api/v1/market/history` | Public | `price_history` | Historical warmup data |
| `/api/v1/challenges/today`, `/weekly`, `/:id/leaderboard` | Public | `daily_challenges`, `v_challenge_leaderboard` | Deterministic challenge generation + view reads |
| `/api/v1/replays/:id`, `/top/:pair` | Public | `game_replays`, `profiles` | Replay retrieval/top lists |
| `/api/v1/telemetry/*` | Public | telemetry tables | Error, cheat, device, performance ingestion |

## :Flow: Core Runtime Flows

**1. Authenticated profile lookup**

```text
Client JWT
  -> requireAuth()
  -> req.authUserId
  -> getProfileId(authUserId)
  -> profile-scoped table access
```

**2. Session verification and reward crediting**

```text
POST /api/v1/sessions/start
  -> create session row + session_secret

Client run ends
  -> signed payload with session_secret

POST /api/v1/sessions/verify
  -> load session
  -> verify HMAC
  -> compute reward
  -> DB transaction
       |- credit_coins(profile_id, amount, ...)
       |- update sessions.is_verified and exit data
       |- transfer_meta_coins(profile_id, amount)
```

**3. Market ingestion and streaming**

```text
Binance/Coinbase services
  -> PriceLogger
  -> insert price_history (throttled)
  -> IndicatorService
  -> update market_state
  -> broadcast SSE payloads to clients
```

**4. Telemetry intake**

```text
Client reports
  -> /api/v1/telemetry/errors
  -> /api/v1/telemetry/cheat-reports
  -> /api/v1/telemetry/device-profiles
  -> /api/v1/telemetry/performance-metrics
  -> persisted to dedicated analytics tables
```

## :Table: Database Domain Map

**Identity and account domain**

- `profiles`
- `identities`
- `virtual_accounts`
- `ledger`
- `meta_progression`

**Session and gameplay domain**

- `sessions`
- `game_replays`
- `daily_challenges`
- `challenge_completions`
- `challenge_seed_log`

**Market and analytics domain**

- `market_state`
- `price_history`
- `error_reports`
- `cheat_attempts`
- `device_profiles`
- `performance_metrics`

## :Function: Stored Procedure and View Dependencies

| DB Asset | Used By | Purpose |
|---|---|---|
| `credit_coins(...)` | `sessions.ts` | Atomic gold credit + ledger insert |
| `transfer_meta_coins(...)` | `sessions.ts`, `metaProgression.ts`, `challenges.ts` | Move a share of run/challenge value into meta progression |
| `purchase_meta_upgrade(...)` | `metaProgression.ts` | Atomic upgrade purchase and level mutation |
| `cleanup_old_price_history(...)` | cleanup cron / SQL runtime | Trim historical market data |
| `cleanup_old_error_reports(...)` | migration hardening path | Retention helper for telemetry |
| `cleanup_old_performance_metrics(...)` | migration hardening path | Retention helper for metrics |
| `cleanup_old_cheat_attempts(...)` | migration hardening path | Retention helper for cheat telemetry |
| `v_leaderboard` | `leaderboard.ts` | Public leaderboard query surface |
| `v_meta_leaderboard` | `metaProgression.ts` | Public meta progression leaderboard |
| `v_challenge_leaderboard` | `challenges.ts` | Per-challenge leaderboard |
| `handle_new_profile()` trigger | inserts on `profiles` | Auto-create `virtual_accounts` |
| `handle_new_meta_progression()` trigger | inserts on `profiles` | Auto-create `meta_progression` |
| `prune_old_replays()` trigger | inserts on `game_replays` | Keep top replay set per player |

## :Wrench: Operational Characteristics

| Concern | Current Behavior |
|---|---|
| Migrations | Applied automatically on server startup via `_migrations` table |
| DB connectivity | Single shared `pg.Pool`, max 10 connections |
| Health endpoints | `/health`, `/stats`, `/debug` |
| SSE liveness | 5s heartbeat, in-memory client registry |
| Price retention | `price_history` cleanup function + cleanup cron |
| Error reporting | `ErrorReporter` can write DB-backed reports on backend failures |
| Exchange failover | Primary Binance, fallback Coinbase, watchdog-driven recovery |

## :Warning: Known Documentation Boundaries

This document reflects the current Railway PostgreSQL architecture. Older documents may still describe pre-migration or transitional states:

- `docs/archived/reports/RAILWAY_SUPABASE_INTEGRATION.md` contains the legacy Supabase DB and edge-function topology.
- `docs/architecture/AUTH_SYSTEM_ARCHITECTURE.md` has been reduced to the current identity/runtime boundary; use archived migration notes only when you need historical Supabase rollout context.

Use the code paths listed at the top of this file as the final authority when conflicts exist.

## :Mag: Companion Analysis

For gaps, stale docs, and recommended next documentation work, see:

- `docs/reports/BACKEND_DB_GAP_ANALYSIS_20260319.md`
