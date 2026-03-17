-- Migration 003: PostgreSQL Best Practices Hardening
-- Date: 2026-03-17
-- Adds CHECK constraints, missing indexes, retention functions, autovacuum tuning

-- ============================================================
-- 1. CHECK CONSTRAINTS — Prevent invalid data at DB level
-- ============================================================

-- sessions: gameplay metrics must be non-negative
ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_leverage_range
    CHECK (leverage >= 1 AND leverage <= 500);

ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_survival_non_negative
    CHECK (survival_seconds >= 0);

ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_kills_non_negative
    CHECK (kills >= 0);

ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_level_valid
    CHECK (level >= 1);

ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_reward_non_negative
    CHECK (reward_amount >= 0);

ALTER TABLE sessions
  ADD CONSTRAINT IF NOT EXISTS ck_sessions_position_valid
    CHECK (position IN ('LONG', 'SHORT'));

-- virtual_accounts: gold balance can never go negative
ALTER TABLE virtual_accounts
  ADD CONSTRAINT IF NOT EXISTS ck_virtual_accounts_balance_non_negative
    CHECK (gold_balance >= 0);

-- meta_progression: meta coins can never go negative
ALTER TABLE meta_progression
  ADD CONSTRAINT IF NOT EXISTS ck_meta_coins_non_negative
    CHECK (meta_coins >= 0);

ALTER TABLE meta_progression
  ADD CONSTRAINT IF NOT EXISTS ck_total_meta_earned_non_negative
    CHECK (total_meta_coins_earned >= 0);

ALTER TABLE meta_progression
  ADD CONSTRAINT IF NOT EXISTS ck_total_runs_non_negative
    CHECK (total_runs_completed >= 0);

-- challenge_completions: score non-negative
ALTER TABLE challenge_completions
  ADD CONSTRAINT IF NOT EXISTS ck_challenge_score_non_negative
    CHECK (score >= 0);

ALTER TABLE challenge_completions
  ADD CONSTRAINT IF NOT EXISTS ck_challenge_survival_non_negative
    CHECK (survival_seconds >= 0);

ALTER TABLE challenge_completions
  ADD CONSTRAINT IF NOT EXISTS ck_challenge_kills_non_negative
    CHECK (kills >= 0);

ALTER TABLE challenge_completions
  ADD CONSTRAINT IF NOT EXISTS ck_challenge_level_valid
    CHECK (level_reached >= 1);

-- game_replays: replay constraints
ALTER TABLE game_replays
  ADD CONSTRAINT IF NOT EXISTS ck_replays_score_non_negative
    CHECK (score >= 0);

ALTER TABLE game_replays
  ADD CONSTRAINT IF NOT EXISTS ck_replays_replay_size_limit
    CHECK (replay_size >= 0 AND replay_size <= 512000);

ALTER TABLE game_replays
  ADD CONSTRAINT IF NOT EXISTS ck_replays_position_valid
    CHECK (position IN ('LONG', 'SHORT'));

ALTER TABLE game_replays
  ADD CONSTRAINT IF NOT EXISTS ck_replays_leverage_range
    CHECK (leverage >= 1 AND leverage <= 500);

-- ============================================================
-- 2. MISSING INDEXES — FK columns + time-series queries
-- ============================================================

-- FK indexes missing on cheat_attempts and challenge_completions
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_session_id
  ON cheat_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_session_id
  ON challenge_completions(session_id);

-- Time-series indexes for analytics/retention queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at
  ON performance_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cheat_attempts_created_at
  ON cheat_attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_created_at
  ON ledger(created_at DESC);

-- Composite index for challenge leaderboard (challenge_id + score)
CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge_score
  ON challenge_completions(challenge_id, score DESC);

-- ============================================================
-- 3. RETENTION CLEANUP FUNCTIONS — Prevent unbounded growth
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
-- 4. AUTOVACUUM TUNING — High-write tables
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

-- ============================================================
-- 5. TABLE COMMENTS — Documentation at DB level
-- ============================================================

COMMENT ON TABLE profiles IS 'User identity. Auto-creates virtual_accounts + meta_progression via triggers.';
COMMENT ON TABLE identities IS 'OAuth provider links (Twitter, Google). One profile → many identities.';
COMMENT ON TABLE virtual_accounts IS 'Gold currency balance. Modified only via credit_coins() function.';
COMMENT ON TABLE ledger IS 'Immutable transaction log. Written only by credit_coins(). Never UPDATE/DELETE.';
COMMENT ON TABLE sessions IS 'Game sessions. Created at start, verified at end. Core for leaderboard + anti-cheat.';
COMMENT ON TABLE market_state IS 'Live market indicators. 1 row per pair. Updated ~1/sec via price pipeline.';
COMMENT ON TABLE price_history IS '24h rolling price log for anti-cheat. Auto-cleanup via cleanup_old_price_history().';
COMMENT ON TABLE error_reports IS 'Client error logs. Public endpoint. 30-day retention via cleanup_old_error_reports().';
COMMENT ON TABLE cheat_attempts IS 'Cheat detection reports. Write-only (not queried yet). 60-day retention.';
COMMENT ON TABLE device_profiles IS 'Device analytics. UPSERT on fingerprint. Tracks device capabilities.';
COMMENT ON TABLE performance_metrics IS 'Per-session FPS/hardware analytics. 30-day retention.';
COMMENT ON TABLE meta_progression IS 'Server-side persistent upgrades. JSONB upgrades map. Auto-created via trigger.';
COMMENT ON TABLE daily_challenges IS 'Challenge definitions. Deterministic seed from date hash. Daily + weekly types.';
COMMENT ON TABLE challenge_completions IS 'Player challenge results. UNIQUE(profile_id, challenge_id). Stores best score.';
COMMENT ON TABLE game_replays IS 'Compressed binary replays. Max 500KB. Auto-pruned to top 5 per player.';
COMMENT ON TABLE challenge_seed_log IS 'Audit trail for challenge generation seeds.';
