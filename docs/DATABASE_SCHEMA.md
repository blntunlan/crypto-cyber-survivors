# :Database: Database Schema Reference

> **Status** live
> Owner: Backend & Data Engineering

> **Status**: LIVE | **Version**: v2.0 | **Database**: Railway PostgreSQL
> **Schema Source**: `railway-market-server/src/db/schema.sql`
> **Migrations**: `railway-market-server/src/db/migrations/`
> **Last Updated**: 2026-03-17

## Architecture Overview

```
Client (React + Vite)
  │
  ├── [Railway JWT] ──► Railway Server /api/v1/auth/*
  ├── [SSE] ──────────► Railway Server /api/v1/market/stream
  └── [fetch] ────────► Railway Server /api/v1/*
                              │
                              ├── [pg pool] ──► Railway PostgreSQL (all data)
                              └── [WebSocket] ► Binance/Coinbase (prices)
```

- **Railway Auth**: Anonymous accounts and JWT issuance through Railway API routes.
- **Railway PostgreSQL**: All 16 tables, 3 views, 7 functions, 3 triggers.
- **Connection**: `DATABASE_URL` env var → `pg.Pool` in `railway-market-server/src/db/pool.ts`

---

## Table Reference

**1. profiles**

Central identity table. Every authenticated user has one profile. Auto-creates `virtual_accounts` and `meta_progression` rows via triggers.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK**. Internal profile ID |
| `auth_user_id` | UUID | YES | - | Maps to Railway account ID. **UNIQUE** |
| `nickname` | TEXT | YES | - | Unique display handle. **UNIQUE** |
| `display_name` | TEXT | YES | - | Friendly name (leaderboard display, falls back to nickname) |
| `avatar_url` | TEXT | YES | - | Profile picture URL |
| `wallet_address` | TEXT | YES | - | Crypto wallet address. **UNIQUE** |
| `primary_auth_provider` | TEXT | NOT NULL | `'railway'` | `'railway_anonymous'`, `'twitter'`, `'google'`, etc. |
| `last_seen_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last activity heartbeat |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Account creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last profile edit |

**Indexes**: `idx_profiles_auth_user_id(auth_user_id)`, `idx_profiles_nickname(nickname)`
**Triggers**: `on_profile_created` → `handle_new_profile()`, `on_profile_created_meta` → `handle_new_meta_progression()`
**Used by**: ALL routes (auth lookup via `auth_user_id`)

---

**2. identities**

OAuth provider connections. One profile can link multiple providers (Twitter, Google, etc.).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE) |
| `provider` | TEXT | NOT NULL | - | `'twitter'`, `'google'`, etc. |
| `provider_user_id` | TEXT | NOT NULL | - | User ID on the provider platform |
| `provider_username` | TEXT | YES | - | Username on the provider platform |
| `access_token` | TEXT | YES | - | OAuth access token |
| `refresh_token` | TEXT | YES | - | OAuth refresh token |
| `token_expires_at` | TIMESTAMPTZ | YES | - | Token expiration time |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Link creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last token refresh |

**Constraints**: `UNIQUE(provider, provider_user_id)`
**Indexes**: `idx_identities_profile_id(profile_id)`
**Used by**: `identities.ts` (POST /, DELETE /:provider)

---

**3. virtual_accounts**

Gold (in-game currency) balance per player. Auto-created by `on_profile_created` trigger. Modified atomically via `credit_coins()` function.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE). **UNIQUE** |
| `gold_balance` | BIGINT | NOT NULL | `0` | Current gold balance |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Account creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last balance change |

**Used by**: `wallet.ts` (GET /balance), `sessions.ts` (via `credit_coins()`)

---

**4. ledger**

Immutable transaction history. Every gold credit/debit is recorded. Written by `credit_coins()` function only.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE) |
| `amount` | BIGINT | NOT NULL | - | Transaction amount (positive=credit, negative=debit) |
| `transaction_type` | TEXT | NOT NULL | - | `'game_reward'`, `'purchase'`, `'refund'`, etc. |
| `reference_id` | TEXT | YES | - | Session ID or other reference for traceability |
| `metadata` | JSONB | YES | `'{}'` | Additional context (exit_type, portal_type, etc.) |
| `balance_after` | BIGINT | NOT NULL | - | Balance snapshot after this transaction |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Transaction timestamp |

**Indexes**: `idx_ledger_profile_id(profile_id)`, `idx_ledger_reference_id(reference_id)`
**Used by**: `sessions.ts` (via `credit_coins()` function — never written directly)

---

**5. sessions**

Game session records. Created at game start, verified at game end. Core table for leaderboard and anti-cheat.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE) |
| `pair` | TEXT | NOT NULL | - | Trading pair: `'BTC'`, `'ETH'`, `'SOL'` |
| `position` | TEXT | NOT NULL | - | `'LONG'` or `'SHORT'` |
| `leverage` | INTEGER | NOT NULL | - | Leverage multiplier (1-100) |
| `entry_price` | DOUBLE PRECISION | YES | - | BTC/USD price at game start |
| `exit_price` | DOUBLE PRECISION | YES | - | BTC/USD price at game end |
| `session_secret` | TEXT | NOT NULL | - | Crypto-random secret for HMAC verification |
| `is_verified` | BOOLEAN | NOT NULL | `false` | True after successful verify call |
| `reward_amount` | INTEGER | YES | `0` | Gold coins earned this session |
| `survival_seconds` | INTEGER | YES | `0` | Total survival time in seconds |
| `kills` | INTEGER | YES | `0` | Total enemy kills |
| `level` | INTEGER | YES | `1` | Final level reached |
| `exit_type` | TEXT | YES | - | `'death'`, `'cashout'`, `'portal'`, `'timeout'` |
| `portal_type` | TEXT | YES | - | Portal variant if exit_type='portal' |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Session start time |
| `verified_at` | TIMESTAMPTZ | YES | - | Verification timestamp |

**Indexes**: `idx_sessions_profile_id(profile_id)`, `idx_sessions_is_verified(is_verified)`, `idx_sessions_verified_pair_survival(is_verified, pair, survival_seconds DESC)`
**Used by**: `sessions.ts` (POST /start, /verify, /sync), `replays.ts` (ownership check), `challenges.ts` (completion link), `v_leaderboard` view

---

**6. market_state**

Live market indicators. One row per trading pair. Updated every ~1s by the price pipeline via `DatabaseService.updateMarketState()`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `pair` | TEXT | NOT NULL | - | **PK**. `'BTC'`, `'ETH'`, `'SOL'` |
| `price` | DOUBLE PRECISION | NOT NULL | `0` | Current price (USD) |
| `volume` | DOUBLE PRECISION | NOT NULL | `0` | 24h trading volume |
| `high` | DOUBLE PRECISION | NOT NULL | `0` | 24h high price |
| `low` | DOUBLE PRECISION | NOT NULL | `0` | 24h low price |
| `rsi` | DOUBLE PRECISION | NOT NULL | `50` | Relative Strength Index (0-100) |
| `rsi_state` | TEXT | NOT NULL | `'NEUTRAL'` | `'OVERSOLD'`, `'NEUTRAL'`, `'OVERBOUGHT'` |
| `atr` | DOUBLE PRECISION | NOT NULL | `0` | Average True Range (absolute) |
| `atr_percent` | DOUBLE PRECISION | NOT NULL | `0` | ATR as percentage of price |
| `spawn_rate_multiplier` | DOUBLE PRECISION | NOT NULL | `1` | Enemy spawn rate modifier from volatility |
| `normalized_volume` | DOUBLE PRECISION | NOT NULL | `0` | Volume normalized to 0-1 range |
| `volume_percentile` | DOUBLE PRECISION | NOT NULL | `0` | Volume percentile (0-100) |
| `volume_z_score` | DOUBLE PRECISION | NOT NULL | `0` | Volume z-score from rolling mean |
| `volume_mean` | DOUBLE PRECISION | NOT NULL | `0` | Rolling volume mean |
| `volume_std_dev` | DOUBLE PRECISION | NOT NULL | `0` | Rolling volume standard deviation |
| `whale_tier` | INTEGER | NOT NULL | `0` | Whale activity tier (0-3) |
| `volume_history_min` | DOUBLE PRECISION | NOT NULL | `0` | Historical volume minimum |
| `volume_history_max` | DOUBLE PRECISION | NOT NULL | `0` | Historical volume maximum |
| `volume_history_count` | INTEGER | NOT NULL | `0` | Number of volume samples collected |
| `enemy_aggro_multiplier_long` | DOUBLE PRECISION | NOT NULL | `1` | Enemy aggression modifier for LONG positions |
| `enemy_aggro_multiplier_short` | DOUBLE PRECISION | NOT NULL | `1` | Enemy aggression modifier for SHORT positions |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last update timestamp |

**Used by**: `databaseService.ts` (UPSERT, throttled 1s/pair), `marketStream.ts` (read for history warmup)

---

**7. price_history**

Rolling 24h price log for anti-cheat verification and indicator warmup. Cleaned by `cleanup_old_price_history()` cron.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | BIGSERIAL | NOT NULL | auto-increment | **PK** |
| `pair` | TEXT | NOT NULL | - | Trading pair |
| `price` | DOUBLE PRECISION | NOT NULL | - | Price at timestamp |
| `volume` | DOUBLE PRECISION | NOT NULL | `0` | Volume at timestamp |
| `timestamp` | TIMESTAMPTZ | NOT NULL | - | Price observation time |
| `metadata` | JSONB | YES | `'{}'` | Extra data (high, low) |

**Constraints**: `UNIQUE(pair, timestamp)`
**Indexes**: `idx_price_history_pair_ts(pair, timestamp DESC)`
**Used by**: `priceLogger.ts` (INSERT, 10s throttle), `marketStream.ts` (GET /history, up to 1000 rows)

---

**8. error_reports**

Client-side error logging. Public endpoint, no auth required.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `error_type` | TEXT | NOT NULL | - | Error classification |
| `message` | TEXT | NOT NULL | - | Error message |
| `stack_trace` | TEXT | YES | - | Stack trace if available |
| `severity` | TEXT | NOT NULL | `'medium'` | `'low'`, `'medium'`, `'high'`, `'critical'` |
| `category` | TEXT | NOT NULL | `'runtime'` | Error category |
| `page_url` | TEXT | YES | - | URL where error occurred |
| `browser_info` | TEXT | YES | - | User agent string |
| `context_data` | JSONB | YES | `'{}'` | Additional context |
| `status` | TEXT | NOT NULL | `'new'` | Triage status |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Report timestamp |

**Indexes**: `idx_error_reports_created_at(created_at DESC)`
**Used by**: `telemetry.ts` (POST /errors, batch up to 50)

---

**9. cheat_attempts**

Cheat detection reports. Logged by client, not currently queried or acted upon.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | YES | - | **FK → profiles.id** (SET NULL) |
| `session_id` | UUID | YES | - | **FK → sessions.id** (SET NULL) |
| `cheat_type` | TEXT | NOT NULL | - | Type of cheat detected |
| `details` | JSONB | YES | `'{}'` | Detection details |
| `severity` | TEXT | NOT NULL | `'medium'` | Severity level |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Detection timestamp |

**Indexes**: `idx_cheat_attempts_profile_id(profile_id)`
**Used by**: `telemetry.ts` (POST /cheat-reports)

---

**10. device_profiles**

Device analytics and performance profiling. UPSERT on fingerprint.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `fingerprint` | TEXT | NOT NULL | - | Device fingerprint hash. **UNIQUE** |
| `device_type` | TEXT | YES | - | `'mobile'`, `'desktop'`, `'tablet'` |
| `browser` | TEXT | YES | - | Browser name/version |
| `screen_width` | INTEGER | YES | - | Screen width in pixels |
| `screen_height` | INTEGER | YES | - | Screen height in pixels |
| `hardware_concurrency` | INTEGER | YES | - | CPU thread count |
| `device_memory` | NUMERIC | YES | - | Device RAM in GB |
| `recommended_profile` | TEXT | YES | - | Suggested performance profile |
| `benchmark_score` | NUMERIC | YES | - | Performance benchmark result |
| `first_seen_at` | TIMESTAMPTZ | NOT NULL | `now()` | First observation |
| `last_seen_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last observation |

**Indexes**: `idx_device_profiles_fingerprint(fingerprint)`
**Used by**: `telemetry.ts` (POST /device-profiles)

---

**11. performance_metrics**

Per-session FPS and hardware analytics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | YES | - | **FK → profiles.id** (SET NULL) |
| `session_id` | UUID | YES | - | **FK → sessions.id** (SET NULL) |
| `device_platform` | TEXT | YES | - | OS platform |
| `device_model` | TEXT | YES | - | Device model string |
| `os_info` | TEXT | YES | - | OS version info |
| `memory_gb` | NUMERIC | YES | - | Available RAM |
| `cpu_cores` | INTEGER | YES | - | CPU core count |
| `avg_fps` | NUMERIC | YES | - | Average FPS during session |
| `min_fps` | NUMERIC | YES | - | Minimum FPS recorded |
| `max_fps` | NUMERIC | YES | - | Maximum FPS recorded |
| `frame_drops` | INTEGER | YES | `0` | Total frame drops |
| `resolution` | TEXT | YES | - | Render resolution |
| `gpu_info` | TEXT | YES | - | GPU identifier |
| `metadata` | JSONB | YES | `'{}'` | Additional metrics |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Report timestamp |

**Indexes**: `idx_performance_metrics_session(session_id)`, `idx_performance_metrics_profile(profile_id)`
**Used by**: `telemetry.ts` (POST /performance-metrics)

---

**12. meta_progression**

Server-side persistent upgrades. One row per player. Auto-created by trigger. Modified atomically via `purchase_meta_upgrade()` and `transfer_meta_coins()` functions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE). **UNIQUE** |
| `meta_coins` | BIGINT | NOT NULL | `0` | Current spendable meta coin balance |
| `upgrades` | JSONB | NOT NULL | `'{}'` | Map of upgrade levels: `{"DAMAGE_BOOST": 2, "HP_RESERVOIR": 1}` |
| `total_runs_completed` | INTEGER | NOT NULL | `0` | Lifetime run count |
| `total_meta_coins_earned` | BIGINT | NOT NULL | `0` | Lifetime meta coins earned (never decreases) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Record creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Last modification |

**Indexes**: `idx_meta_progression_profile(profile_id)`
**Used by**: `metaProgression.ts` (GET /state, POST /purchase, POST /transfer), `sessions.ts` (via `transfer_meta_coins()`), `challenges.ts` (via `transfer_meta_coins()`)

---

**13. daily_challenges**

Challenge definitions. Auto-generated with deterministic seeds from date hashes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | NOT NULL | - | **PK**. Format: `"2026-03-17-daily"` or `"2026-W12-weekly"` |
| `type` | TEXT | NOT NULL | - | `'daily'` or `'weekly'`. **CHECK constraint** |
| `name` | TEXT | NOT NULL | - | Human-readable challenge name |
| `description` | TEXT | NOT NULL | - | Challenge description |
| `constraints` | JSONB | NOT NULL | `'[]'` | `[{ type: 'position', value: 'SHORT' }, ...]` |
| `objectives` | JSONB | NOT NULL | `'[]'` | `[{ type: 'survive_seconds', target: 300 }, ...]` |
| `reward` | JSONB | NOT NULL | `'{}'` | `{ metaCoins: 200, bonusXp: 100 }` |
| `expires_at` | TIMESTAMPTZ | NOT NULL | - | Challenge expiration time |
| `seed` | BIGINT | NOT NULL | - | Deterministic RNG seed |
| `is_active` | BOOLEAN | NOT NULL | `true` | Whether challenge is active |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Creation timestamp |

**Indexes**: `idx_daily_challenges_type(type)`, `idx_daily_challenges_expires(expires_at DESC)`, `idx_daily_challenges_active(is_active) WHERE is_active = true`
**Used by**: `challenges.ts` (GET /today, GET /weekly, POST /complete)

---

**14. challenge_completions**

Player challenge results. One completion per player per challenge.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE) |
| `challenge_id` | TEXT | NOT NULL | - | **FK → daily_challenges.id** (CASCADE) |
| `session_id` | UUID | YES | - | **FK → sessions.id** (SET NULL) |
| `score` | INTEGER | NOT NULL | `0` | Score: kills * level * survival_seconds |
| `survival_seconds` | INTEGER | NOT NULL | `0` | Survival time |
| `kills` | INTEGER | NOT NULL | `0` | Enemy kills |
| `level_reached` | INTEGER | NOT NULL | `1` | Final level |
| `objectives_completed` | JSONB | NOT NULL | `'[]'` | Snapshot of completed objectives |
| `completed_at` | TIMESTAMPTZ | NOT NULL | `now()` | Completion timestamp |

**Constraints**: `UNIQUE(profile_id, challenge_id)`
**Indexes**: `idx_challenge_completions_profile(profile_id)`, `idx_challenge_completions_challenge(challenge_id)`, `idx_challenge_completions_score(score DESC)`
**Used by**: `challenges.ts` (POST /complete, GET /status, GET /:challengeId/leaderboard), `v_challenge_leaderboard` view

---

**15. game_replays**

Compressed binary replay storage. Auto-pruned to top 5 per player by trigger.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `session_id` | UUID | NOT NULL | - | **FK → sessions.id** (CASCADE). **UNIQUE** |
| `profile_id` | UUID | NOT NULL | - | **FK → profiles.id** (CASCADE) |
| `score` | INTEGER | NOT NULL | `0` | Session score |
| `duration_ms` | INTEGER | NOT NULL | `0` | Game duration in milliseconds |
| `final_level` | INTEGER | NOT NULL | `1` | Final level reached |
| `total_kills` | INTEGER | NOT NULL | `0` | Total kills in session |
| `pair` | TEXT | NOT NULL | - | Trading pair |
| `position` | TEXT | NOT NULL | - | `'LONG'` or `'SHORT'` |
| `leverage` | INTEGER | NOT NULL | `1` | Leverage multiplier |
| `replay_data` | BYTEA | NOT NULL | - | Compressed binary replay (max 500KB) |
| `replay_size` | INTEGER | NOT NULL | `0` | Uncompressed size in bytes |
| `version` | INTEGER | NOT NULL | `2` | Replay format version |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` | Save timestamp |

**Indexes**: `idx_game_replays_profile(profile_id)`, `idx_game_replays_score(profile_id, score DESC)`, `idx_game_replays_created(created_at DESC)`
**Triggers**: `after_replay_insert` → `prune_old_replays()` (keeps top 5 per player)
**Used by**: `replays.ts` (POST /save, GET /mine, GET /:replayId, GET /top/:pair)

---

**16. challenge_seed_log**

Audit trail for deterministic challenge generation. Ensures reproducibility.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | **PK** |
| `challenge_date` | DATE | NOT NULL | - | Date the challenge was generated for |
| `challenge_type` | TEXT | NOT NULL | - | `'daily'` or `'weekly'`. **CHECK constraint** |
| `seed` | BIGINT | NOT NULL | - | RNG seed used |
| `challenge_id` | TEXT | YES | - | **FK → daily_challenges.id** (SET NULL) |
| `generated_at` | TIMESTAMPTZ | NOT NULL | `now()` | Generation timestamp |

**Constraints**: `UNIQUE(challenge_date, challenge_type)`
**Used by**: `challenges.ts` (INSERT on auto-generate)

---

## Views

**v_leaderboard**

Aggregated per-player leaderboard. One row per player per pair. Only verified sessions.

```sql
SELECT
  p.id AS profile_id,
  COALESCE(p.display_name, p.nickname) AS display_name,
  p.avatar_url,
  p.primary_auth_provider,
  s.pair,
  MAX(s.survival_seconds) AS max_survival_time,
  SUM(s.kills) AS total_kills,
  MAX(s.level) AS high_score,
  COUNT(s.id) AS total_sessions,
  MAX(s.created_at) AS last_played_at
FROM sessions s
JOIN profiles p ON s.profile_id = p.id
WHERE s.is_verified = true
GROUP BY p.id, p.display_name, p.nickname, p.avatar_url, p.primary_auth_provider, s.pair
ORDER BY max_survival_time DESC;
```

**Output columns**: `profile_id`, `display_name`, `avatar_url`, `primary_auth_provider`, `pair`, `max_survival_time`, `total_kills`, `high_score`, `total_sessions`, `last_played_at`
**Used by**: `leaderboard.ts` (GET /, filterable by `pair`, sortable by `max_survival_time|total_kills|high_score|total_sessions`)

**v_challenge_leaderboard**

Per-challenge rankings by score.

```sql
SELECT p.nickname, p.avatar_url, cc.challenge_id, dc.name AS challenge_name,
       dc.type AS challenge_type, cc.score, cc.survival_seconds, cc.kills,
       cc.level_reached, cc.completed_at
FROM challenge_completions cc
JOIN profiles p ON cc.profile_id = p.id
JOIN daily_challenges dc ON cc.challenge_id = dc.id
ORDER BY cc.challenge_id, cc.score DESC;
```

**Used by**: `challenges.ts` (GET /:challengeId/leaderboard)

**v_meta_leaderboard**

Global meta progression rankings by lifetime coins earned.

```sql
SELECT p.nickname, p.avatar_url, mp.meta_coins, mp.total_runs_completed,
       mp.total_meta_coins_earned, mp.upgrades, mp.updated_at
FROM meta_progression mp
JOIN profiles p ON mp.profile_id = p.id
ORDER BY mp.total_meta_coins_earned DESC;
```

**Used by**: `metaProgression.ts` (GET /leaderboard)

---

## Functions

**credit_coins(profile_id, amount, transaction_type, reference_id?, metadata?)**

Atomic gold crediting. Updates `virtual_accounts.gold_balance` and inserts `ledger` row in one transaction. Auto-creates virtual_account if missing.

- **Returns**: `new_balance BIGINT`
- **Called by**: `sessions.ts` POST /verify

**handle_new_profile() [TRIGGER]**

Auto-creates `virtual_accounts` row with `gold_balance = 0` when a new profile is inserted.

- **Trigger**: `AFTER INSERT ON profiles`

**handle_new_meta_progression() [TRIGGER]**

Auto-creates `meta_progression` row when a new profile is inserted.

- **Trigger**: `AFTER INSERT ON profiles`

**cleanup_old_price_history(cutoff, batch_size?)**

Deletes `price_history` rows older than cutoff in batches. Used by cron job for 24h retention.

- **Returns**: `deleted_count BIGINT`

**purchase_meta_upgrade(profile_id, upgrade_id, cost, max_level)**

Atomic meta upgrade purchase. Validates balance and max level, deducts coins, increments upgrade level in JSONB.

- **Returns**: `new_meta_coins, new_level, upgrade_id`
- **Called by**: `metaProgression.ts` POST /purchase

**transfer_meta_coins(profile_id, earned_coins, transfer_rate?)**

Transfers percentage of run earnings to meta wallet. Upserts meta_progression row.

- **Returns**: `meta_share, new_meta_balance, new_total_earned, new_runs_completed`
- **Default rate**: 15%
- **Called by**: `sessions.ts` POST /verify, `challenges.ts` POST /complete

**prune_old_replays() [TRIGGER]**

Keeps only top 5 replays per player (by score). Fires after each replay insert.

- **Trigger**: `AFTER INSERT ON game_replays`

---

## API Route → Table Mapping

| Route | Method | Endpoint | Tables Used | Auth |
|-------|--------|----------|-------------|------|
| profile | GET | `/api/v1/profile` | profiles | Yes |
| profile | POST | `/api/v1/profile` | profiles | Yes |
| profile | PATCH | `/api/v1/profile` | profiles | Yes |
| sessions | POST | `/api/v1/sessions/start` | profiles, sessions | Yes |
| sessions | POST | `/api/v1/sessions/verify` | sessions, virtual_accounts, ledger, meta_progression | Yes |
| sessions | POST | `/api/v1/sessions/sync` | sessions | Yes |
| wallet | GET | `/api/v1/wallet/balance` | profiles, virtual_accounts | Yes |
| leaderboard | GET | `/api/v1/leaderboard` | v_leaderboard | No |
| identities | POST | `/api/v1/identities` | profiles, identities | Yes |
| identities | DELETE | `/api/v1/identities/:provider` | profiles, identities | Yes |
| telemetry | POST | `/api/v1/errors` | error_reports | No |
| telemetry | POST | `/api/v1/cheat-reports` | cheat_attempts | No |
| telemetry | POST | `/api/v1/device-profiles` | device_profiles | No |
| telemetry | POST | `/api/v1/performance-metrics` | performance_metrics | No |
| challenges | GET | `/api/v1/challenges/today` | daily_challenges, challenge_seed_log | No |
| challenges | GET | `/api/v1/challenges/weekly` | daily_challenges, challenge_seed_log | No |
| challenges | POST | `/api/v1/challenges/complete` | profiles, daily_challenges, challenge_completions, meta_progression | Yes |
| challenges | GET | `/api/v1/challenges/:id/leaderboard` | v_challenge_leaderboard | No |
| challenges | GET | `/api/v1/challenges/status` | challenge_completions, daily_challenges | Yes |
| meta | GET | `/api/v1/meta/state` | meta_progression | Yes |
| meta | POST | `/api/v1/meta/purchase` | meta_progression | Yes |
| meta | POST | `/api/v1/meta/transfer` | meta_progression | Yes |
| meta | GET | `/api/v1/meta/leaderboard` | v_meta_leaderboard | No |
| replays | POST | `/api/v1/replays/save` | sessions, game_replays | Yes |
| replays | GET | `/api/v1/replays/mine` | game_replays | Yes |
| replays | GET | `/api/v1/replays/:replayId` | game_replays, profiles | No |
| replays | GET | `/api/v1/replays/top/:pair` | game_replays, profiles | No |
| market | GET | `/api/v1/market/stream` | None (in-memory SSE) | No |
| market | GET | `/api/v1/market/history` | price_history | No |
| (service) | - | DatabaseService.updateMarketState | market_state | - |
| (service) | - | priceLogger.insertPriceLog | price_history | - |

---

## Entity Relationship Diagram

```
profiles (1) ──┬── (N) sessions ──── (1) game_replays
               │         │
               │         └── (N) challenge_completions ── daily_challenges
               │                                              │
               ├── (1) virtual_accounts                       └── challenge_seed_log
               ├── (1) meta_progression
               ├── (N) identities
               ├── (N) ledger
               ├── (N) cheat_attempts
               └── (N) performance_metrics

market_state (standalone, 1 row per pair)
price_history (standalone, rolling 24h)
error_reports (standalone)
device_profiles (standalone)
```

---

## Migration Guide

**Running Migrations**

```bash
## Apply to Railway PostgreSQL
psql $DATABASE_URL -f railway-market-server/src/db/schema.sql        # Full schema (idempotent)
psql $DATABASE_URL -f railway-market-server/src/db/migrations/001_meta_challenges_replays.sql
psql $DATABASE_URL -f railway-market-server/src/db/migrations/002_fix_leaderboard_view.sql
```

**Adding New Tables**

1. Add `CREATE TABLE` to `schema.sql` with `IF NOT EXISTS`
2. Create numbered migration in `migrations/` (e.g., `003_my_feature.sql`)
3. Add indexes for any FK or frequently-filtered columns
4. Update this document with the new table reference
5. Add route in `railway-market-server/src/routes/`
6. Run `cd railway-market-server && npm run validate` to typecheck

**Known Issues**

1. **Reward divergence**: `credit_coins()` is called optimistically in session verify. If client crashes before verify, coins may be miscredited. Don't add more optimistic credit calls.
2. **cheat_attempts write-only**: Table is populated but never queried. No automated ban/flag system exists yet.
3. **Meta coin transfer non-atomicity**: If `transfer_meta_coins()` fails after `credit_coins()` succeeds, session is verified but meta coins are lost. Accepted as non-critical.
