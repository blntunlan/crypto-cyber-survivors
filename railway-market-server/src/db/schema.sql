-- ============================================================
-- Railway PostgreSQL Schema for Crypto Survivors
-- ============================================================
-- Current-state snapshot after migrations 000-010.
-- Source of truth: src/db/migrate.ts (runMigrations applies them).
-- This file is regenerated from migrate.ts — do not edit by hand.
--
-- 27 tables + 2 views + 2 materialized views + 13 functions + 3 triggers
-- ============================================================

-- ============================================================
-- 0. _migrations (internal migration tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 1. accounts (Railway-native account foundation)
-- ============================================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL DEFAULT 'anonymous',
  status TEXT NOT NULL DEFAULT 'active',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_accounts_type CHECK (account_type IN ('anonymous', 'registered', 'service')),
  CONSTRAINT ck_accounts_status CHECK (status IN ('active', 'suspended', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_last_seen ON accounts(last_seen_at DESC);

-- ============================================================
-- 2. account_identities (Railway-native OAuth links)
-- ============================================================

CREATE TABLE IF NOT EXISTS account_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  provider_username TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_account_identities_account ON account_identities(account_id);
CREATE INDEX IF NOT EXISTS idx_account_identities_provider ON account_identities(provider);

-- ============================================================
-- 3. profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  nickname TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  primary_auth_provider TEXT DEFAULT 'railway',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- ============================================================
-- 4. identities (OAuth provider connections)
-- ============================================================

CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_identities_profile_id ON identities(profile_id);

-- ============================================================
-- 5. wallets (Railway-native balance — supersedes virtual_accounts)
-- ============================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'gold',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_wallets_balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wallets_profile ON wallets(profile_id);

-- ============================================================
-- 6. virtual_accounts (legacy gold balance — read-only, kept for wallet_address future)
-- ============================================================

CREATE TABLE IF NOT EXISTS virtual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gold_balance BIGINT NOT NULL DEFAULT 0 CHECK (gold_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. ledger (legacy transaction log — read-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}',
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_profile_id ON ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at DESC);

-- ============================================================
-- 8. ledger_entries (Railway-native immutable transaction log)
-- ============================================================

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  entry_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_ledger_entries_balance_after_non_negative CHECK (balance_after >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_idempotency
  ON ledger_entries(account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created ON ledger_entries(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_wallet_created ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_profile ON ledger_entries(profile_id);

-- ============================================================
-- 9. reward_claims (Railway-native idempotent reward claims)
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimed',
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_reward_claims_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT ck_reward_claims_status CHECK (status IN ('claimed', 'reversed', 'rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_claims_idempotency
  ON reward_claims(account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reward_claims_account_created ON reward_claims(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_claims_profile ON reward_claims(profile_id);

-- ============================================================
-- 10. idempotency_keys (API idempotency vault)
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  request_hash TEXT,
  response_body JSONB,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  UNIQUE(scope, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_account ON idempotency_keys(account_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ============================================================
-- 11. sessions (game sessions for verification + leaderboard)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('LONG', 'SHORT')),
  leverage INTEGER NOT NULL CHECK (leverage >= 1 AND leverage <= 500),
  entry_price DOUBLE PRECISION,
  exit_price DOUBLE PRECISION,
  session_secret TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  reward_amount INTEGER DEFAULT 0 CHECK (reward_amount >= 0),
  survival_seconds INTEGER DEFAULT 0 CHECK (survival_seconds >= 0),
  kills INTEGER DEFAULT 0 CHECK (kills >= 0),
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  exit_type TEXT,
  portal_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_verified ON sessions(is_verified);
CREATE INDEX IF NOT EXISTS idx_sessions_verified_pair_survival ON sessions(is_verified, pair, survival_seconds DESC);

-- ============================================================
-- 12. market_state (live market indicators, 1 row per pair)
-- ============================================================

CREATE TABLE IF NOT EXISTS market_state (
  pair TEXT PRIMARY KEY,
  price DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0,
  high DOUBLE PRECISION NOT NULL DEFAULT 0,
  low DOUBLE PRECISION NOT NULL DEFAULT 0,
  rsi DOUBLE PRECISION NOT NULL DEFAULT 50,
  rsi_state TEXT NOT NULL DEFAULT 'NEUTRAL',
  atr DOUBLE PRECISION NOT NULL DEFAULT 0,
  atr_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  spawn_rate_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1,
  normalized_volume DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_percentile DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_z_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_mean DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_std_dev DOUBLE PRECISION NOT NULL DEFAULT 0,
  whale_tier INTEGER NOT NULL DEFAULT 0,
  volume_history_min DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_history_max DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_history_count INTEGER NOT NULL DEFAULT 0,
  enemy_aggro_multiplier_long DOUBLE PRECISION NOT NULL DEFAULT 1,
  enemy_aggro_multiplier_short DOUBLE PRECISION NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. market_runtime_audit (Railway-native runtime audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS market_runtime_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  run_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  pair TEXT NOT NULL,
  source TEXT,
  run_constants JSONB NOT NULL,
  tick JSONB NOT NULL,
  snapshot JSONB NOT NULL,
  tick_hash TEXT,
  snapshot_checksum TEXT,
  client_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_market_runtime_audit_seq CHECK (seq >= 0),
  UNIQUE(account_id, run_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_market_runtime_audit_account_run
  ON market_runtime_audit(account_id, run_id, seq);
CREATE INDEX IF NOT EXISTS idx_market_runtime_audit_profile_created
  ON market_runtime_audit(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_runtime_audit_session_seq
  ON market_runtime_audit(session_id, seq)
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_runtime_audit_pair_created
  ON market_runtime_audit(pair, created_at DESC);

-- ============================================================
-- 14. price_history (24h retention for anti-cheat)
-- ============================================================

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  pair TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  UNIQUE(pair, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_price_history_pair_ts ON price_history(pair, timestamp DESC);

-- ============================================================
-- 15. error_reports
-- ============================================================

CREATE TABLE IF NOT EXISTS error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'runtime',
  page_url TEXT,
  browser_info TEXT,
  context_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON error_reports(created_at DESC);

-- ============================================================
-- 16. cheat_attempts
-- ============================================================

CREATE TABLE IF NOT EXISTS cheat_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  cheat_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cheat_attempts_profile_id ON cheat_attempts(profile_id);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_session_id ON cheat_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_created_at ON cheat_attempts(created_at DESC);

-- ============================================================
-- 17. device_profiles (analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS device_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT UNIQUE NOT NULL,
  device_type TEXT,
  browser TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  hardware_concurrency INTEGER,
  device_memory NUMERIC,
  recommended_profile TEXT,
  benchmark_score NUMERIC,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_profiles_fingerprint ON device_profiles(fingerprint);

-- ============================================================
-- 18. performance_metrics (analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  device_platform TEXT,
  device_model TEXT,
  os_info TEXT,
  memory_gb NUMERIC,
  cpu_cores INTEGER,
  avg_fps NUMERIC,
  min_fps NUMERIC,
  max_fps NUMERIC,
  frame_drops INTEGER DEFAULT 0,
  resolution TEXT,
  gpu_info TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_profile ON performance_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- ============================================================
-- 19. product_telemetry_events (investor traction analytics)
-- ============================================================

CREATE TABLE IF NOT EXISTS product_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'wallet_connected',
    'wallet_connect_failed',
    'season_joined',
    'quest_completed',
    'leaderboard_submitted',
    'leaderboard_viewed',
    'referral_joined'
  )),
  season_id TEXT,
  quest_id TEXT,
  referral_code TEXT,
  wallet_provider TEXT,
  wallet_address_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_created ON product_telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_type_created ON product_telemetry_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_season_created ON product_telemetry_events(season_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_profile_created ON product_telemetry_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_wallet_hash ON product_telemetry_events(wallet_address_hash);
CREATE INDEX IF NOT EXISTS idx_product_events_session ON product_telemetry_events(session_id);

-- ============================================================
-- 20. audit_events (Railway-native structured audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  resource TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_audit_events_severity CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_audit_events_account_created ON audit_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_profile_created ON audit_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type_created ON audit_events(event_type, created_at DESC);

-- ============================================================
-- 21. audit_log (legacy audit table — kept for cleanup_old_audit_logs cron)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_profile ON audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- ============================================================
-- 22. meta_progression (server-side persistent upgrades)
-- ============================================================

CREATE TABLE IF NOT EXISTS meta_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meta_coins BIGINT NOT NULL DEFAULT 0 CHECK (meta_coins >= 0),
  upgrades JSONB NOT NULL DEFAULT '{}',
  total_runs_completed INTEGER NOT NULL DEFAULT 0 CHECK (total_runs_completed >= 0),
  total_meta_coins_earned BIGINT NOT NULL DEFAULT 0 CHECK (total_meta_coins_earned >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_progression_profile ON meta_progression(profile_id);

-- ============================================================
-- 23. daily_challenges
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '[]',
  objectives JSONB NOT NULL DEFAULT '[]',
  reward JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  seed BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_type ON daily_challenges(type);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_expires ON daily_challenges(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active ON daily_challenges(is_active) WHERE is_active = true;

-- ============================================================
-- 24. challenge_completions
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  survival_seconds INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER NOT NULL DEFAULT 1,
  objectives_completed JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_profile ON challenge_completions(profile_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge ON challenge_completions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_score ON challenge_completions(score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_session_id ON challenge_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge_score ON challenge_completions(challenge_id, score DESC);

-- ============================================================
-- 25. game_replays
-- ============================================================

CREATE TABLE IF NOT EXISTS game_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  final_level INTEGER NOT NULL DEFAULT 1,
  total_kills INTEGER NOT NULL DEFAULT 0,
  pair TEXT NOT NULL,
  position TEXT NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  replay_data BYTEA NOT NULL,
  replay_size INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_game_replays_profile ON game_replays(profile_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_score ON game_replays(profile_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_replays_created ON game_replays(created_at DESC);

-- ============================================================
-- 26. challenge_seed_log (audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS challenge_seed_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly')),
  seed BIGINT NOT NULL,
  challenge_id TEXT REFERENCES daily_challenges(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_date, challenge_type)
);

CREATE INDEX IF NOT EXISTS idx_challenge_seed_log_challenge_id ON challenge_seed_log(challenge_id);

-- ============================================================
-- MATERIALIZED VIEW: v_leaderboard (one row per player, pair-agnostic)
-- Refreshed by the API server's LeaderboardRefreshCron (REFRESH CONCURRENTLY,
-- ~2 min). Reads are an indexed scan instead of re-aggregating all sessions.
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_leaderboard AS
SELECT
  p.id AS profile_id,
  COALESCE(p.display_name, p.nickname) AS display_name,
  p.avatar_url,
  p.primary_auth_provider,
  MAX(s.survival_seconds) AS max_survival_time,
  SUM(s.kills) AS total_kills,
  MAX(s.level) AS high_score,
  COUNT(s.id) AS total_sessions,
  MAX(s.created_at) AS last_played_at
FROM sessions s
JOIN profiles p ON s.profile_id = p.id
WHERE s.is_verified = true
GROUP BY p.id, p.display_name, p.nickname, p.avatar_url, p.primary_auth_provider
WITH DATA;

-- UNIQUE index is required for REFRESH ... CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS uq_v_leaderboard_profile ON v_leaderboard (profile_id);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_survival ON v_leaderboard (max_survival_time DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_kills ON v_leaderboard (total_kills DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_score ON v_leaderboard (high_score DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_sessions ON v_leaderboard (total_sessions DESC);

-- ============================================================
-- MATERIALIZED VIEW: v_leaderboard_by_pair (one row per player per pair)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS v_leaderboard_by_pair AS
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
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v_leaderboard_by_pair ON v_leaderboard_by_pair (profile_id, pair);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_by_pair_survival ON v_leaderboard_by_pair (pair, max_survival_time DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_by_pair_kills ON v_leaderboard_by_pair (pair, total_kills DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_by_pair_score ON v_leaderboard_by_pair (pair, high_score DESC);
CREATE INDEX IF NOT EXISTS idx_v_leaderboard_by_pair_sessions ON v_leaderboard_by_pair (pair, total_sessions DESC);

-- ============================================================
-- VIEW: v_challenge_leaderboard
-- ============================================================

CREATE OR REPLACE VIEW v_challenge_leaderboard AS
SELECT
  p.nickname,
  p.avatar_url,
  cc.challenge_id,
  dc.name AS challenge_name,
  dc.type AS challenge_type,
  cc.score,
  cc.survival_seconds,
  cc.kills,
  cc.level_reached,
  cc.completed_at
FROM challenge_completions cc
JOIN profiles p ON cc.profile_id = p.id
JOIN daily_challenges dc ON cc.challenge_id = dc.id
ORDER BY cc.challenge_id, cc.score DESC;

-- ============================================================
-- VIEW: v_meta_leaderboard
-- ============================================================

CREATE OR REPLACE VIEW v_meta_leaderboard AS
SELECT
  p.nickname,
  p.avatar_url,
  mp.meta_coins,
  mp.total_runs_completed,
  mp.total_meta_coins_earned,
  mp.upgrades,
  mp.updated_at
FROM meta_progression mp
JOIN profiles p ON mp.profile_id = p.id
ORDER BY mp.total_meta_coins_earned DESC;

-- ============================================================
-- FUNCTION: handle_new_profile (auto-create virtual_account)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO virtual_accounts (profile_id, gold_balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile();

-- ============================================================
-- FUNCTION: handle_new_meta_progression (auto-create meta_progression)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_meta_progression()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meta_progression (profile_id, meta_coins, upgrades)
  VALUES (NEW.id, 0, '{}')
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_meta ON profiles;
CREATE TRIGGER on_profile_created_meta
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_meta_progression();

-- ============================================================
-- FUNCTION: prune_old_replays (keep top 5 per player)
-- ============================================================

CREATE OR REPLACE FUNCTION prune_old_replays()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM game_replays
  WHERE profile_id = NEW.profile_id
    AND id NOT IN (
      SELECT id FROM game_replays
      WHERE profile_id = NEW.profile_id
      ORDER BY score DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_replay_insert ON game_replays;
CREATE TRIGGER after_replay_insert
  AFTER INSERT ON game_replays
  FOR EACH ROW
  EXECUTE FUNCTION prune_old_replays();

-- ============================================================
-- FUNCTION: purchase_meta_upgrade
-- ============================================================

CREATE OR REPLACE FUNCTION purchase_meta_upgrade(
  p_profile_id UUID,
  p_upgrade_id TEXT,
  p_cost BIGINT,
  p_max_level INTEGER
) RETURNS TABLE(
  new_meta_coins BIGINT,
  new_level INTEGER,
  upgrade_id TEXT
) AS $$
DECLARE
  v_current_level INTEGER;
  v_meta_coins BIGINT;
  v_new_level INTEGER;
BEGIN
  SELECT meta_coins,
         COALESCE((upgrades->>p_upgrade_id)::INTEGER, 0)
  INTO v_meta_coins, v_current_level
  FROM meta_progression
  WHERE profile_id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile meta_progression not found';
  END IF;

  IF v_current_level >= p_max_level THEN
    RAISE EXCEPTION 'Upgrade already at max level (%)' , p_max_level;
  END IF;

  IF v_meta_coins < p_cost THEN
    RAISE EXCEPTION 'Insufficient meta coins: have %, need %', v_meta_coins, p_cost;
  END IF;

  v_new_level := v_current_level + 1;

  UPDATE meta_progression
  SET meta_coins = meta_coins - p_cost,
      upgrades = jsonb_set(upgrades, ARRAY[p_upgrade_id], to_jsonb(v_new_level)),
      updated_at = now()
  WHERE profile_id = p_profile_id;

  RETURN QUERY SELECT
    (v_meta_coins - p_cost)::BIGINT,
    v_new_level,
    p_upgrade_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: transfer_meta_coins
-- ============================================================

CREATE OR REPLACE FUNCTION transfer_meta_coins(
  p_profile_id UUID,
  p_earned_coins BIGINT,
  p_transfer_rate NUMERIC DEFAULT 0.15
) RETURNS TABLE(
  meta_share BIGINT,
  new_meta_balance BIGINT,
  new_total_earned BIGINT,
  new_runs_completed INTEGER
) AS $$
DECLARE
  v_share BIGINT;
  v_balance BIGINT;
  v_total BIGINT;
  v_runs INTEGER;
BEGIN
  v_share := FLOOR(p_earned_coins * p_transfer_rate);

  INSERT INTO meta_progression (profile_id, meta_coins, total_meta_coins_earned, total_runs_completed)
  VALUES (p_profile_id, v_share, v_share, 1)
  ON CONFLICT (profile_id)
  DO UPDATE SET
    meta_coins = meta_progression.meta_coins + v_share,
    total_meta_coins_earned = meta_progression.total_meta_coins_earned + v_share,
    total_runs_completed = meta_progression.total_runs_completed + 1,
    updated_at = now()
  RETURNING meta_coins, total_meta_coins_earned, total_runs_completed
  INTO v_balance, v_total, v_runs;

  RETURN QUERY SELECT v_share, v_balance, v_total, v_runs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_price_history (24h retention, used by cron)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_price_history(
  p_cutoff TIMESTAMPTZ,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM price_history
    WHERE id IN (
      SELECT id FROM price_history
      WHERE timestamp < p_cutoff
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_error_reports (30-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_error_reports(
  p_days_ago INTEGER DEFAULT 30,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM error_reports
    WHERE id IN (
      SELECT id FROM error_reports
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_performance_metrics (30-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(
  p_days_ago INTEGER DEFAULT 30,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM performance_metrics
    WHERE id IN (
      SELECT id FROM performance_metrics
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_cheat_attempts (60-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_cheat_attempts(
  p_days_ago INTEGER DEFAULT 60,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM cheat_attempts
    WHERE id IN (
      SELECT id FROM cheat_attempts
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_audit_logs (90-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_ago INT DEFAULT 90, batch_size INT DEFAULT 5000)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH to_delete AS (
    SELECT id FROM audit_log
    WHERE created_at < NOW() - (days_ago || ' days')::INTERVAL
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM audit_log WHERE id IN (SELECT id FROM to_delete);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_market_runtime_audit (30-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_market_runtime_audit(
  p_days_ago INTEGER DEFAULT 30,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM market_runtime_audit
    WHERE id IN (
      SELECT id FROM market_runtime_audit
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_audit_events (90-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_events(
  p_days_ago INTEGER DEFAULT 90,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_events
    WHERE id IN (
      SELECT id FROM audit_events
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: cleanup_old_product_telemetry_events (365-day retention)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_product_telemetry_events(
  p_days_ago INTEGER DEFAULT 365,
  p_batch_size INTEGER DEFAULT 5000
) RETURNS BIGINT AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM product_telemetry_events
    WHERE id IN (
      SELECT id FROM product_telemetry_events
      WHERE created_at < (now() - (p_days_ago || ' days')::INTERVAL)
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUTOVACUUM TUNING (high-write tables)
-- ============================================================

ALTER TABLE ledger SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);
ALTER TABLE price_history SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);
ALTER TABLE performance_metrics SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE error_reports SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE market_runtime_audit SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);
