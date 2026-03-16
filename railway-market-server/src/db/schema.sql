-- Railway PostgreSQL Schema for Crypto Survivors
-- Migrated from Supabase (10 tables + 1 view + 2 functions)

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,           -- maps to Supabase Auth user id
  nickname TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  primary_auth_provider TEXT DEFAULT 'supabase',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);

-- 2. identities (OAuth provider connections)
CREATE TABLE IF NOT EXISTS identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- 'twitter', 'google', etc.
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

-- 3. virtual_accounts (gold balance)
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gold_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ledger (immutable transaction history)
CREATE TABLE IF NOT EXISTS ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,    -- 'game_reward', 'purchase', 'refund', etc.
  reference_id TEXT,                 -- session_id or other reference
  metadata JSONB DEFAULT '{}',
  balance_after BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_profile_id ON ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference_id ON ledger(reference_id);

-- 5. sessions (game sessions for verification + leaderboard)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  position TEXT NOT NULL,
  leverage INTEGER NOT NULL,
  entry_price DOUBLE PRECISION,
  exit_price DOUBLE PRECISION,
  session_secret TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  reward_amount INTEGER DEFAULT 0,
  survival_seconds INTEGER DEFAULT 0,
  kills INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  exit_type TEXT,
  portal_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_verified ON sessions(is_verified);

-- 6. market_state (live market indicators, 1 row per pair)
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

-- 7. price_history (24h retention for anti-cheat)
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

-- 8. error_reports
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

-- 9. cheat_attempts
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

-- 10. device_profiles (analytics)
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

-- 11. performance_metrics (analytics)
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

-- ============================================================
-- VIEW: v_leaderboard
-- ============================================================
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
  p.nickname,
  p.avatar_url,
  s.pair,
  s.survival_seconds,
  s.kills,
  s.level,
  s.reward_amount,
  s.exit_type,
  s.portal_type,
  s.created_at AS played_at
FROM sessions s
JOIN profiles p ON s.profile_id = p.id
WHERE s.is_verified = true
ORDER BY s.survival_seconds DESC;

-- ============================================================
-- FUNCTION: credit_coins (atomic gold crediting)
-- ============================================================
CREATE OR REPLACE FUNCTION credit_coins(
  p_profile_id UUID,
  p_amount BIGINT,
  p_transaction_type TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(new_balance BIGINT) AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- Atomically update balance
  UPDATE virtual_accounts
  SET gold_balance = gold_balance + p_amount,
      updated_at = now()
  WHERE profile_id = p_profile_id
  RETURNING gold_balance INTO v_new_balance;

  -- If no row existed, create one
  IF NOT FOUND THEN
    INSERT INTO virtual_accounts (profile_id, gold_balance)
    VALUES (p_profile_id, GREATEST(0, p_amount))
    RETURNING gold_balance INTO v_new_balance;
  END IF;

  -- Record in ledger
  INSERT INTO ledger (profile_id, amount, transaction_type, reference_id, metadata, balance_after)
  VALUES (p_profile_id, p_amount, p_transaction_type, p_reference_id, p_metadata, v_new_balance);

  RETURN QUERY SELECT v_new_balance;
END;
$$ LANGUAGE plpgsql;

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
-- FUNCTION: cleanup_old_price_history (used by cron)
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
