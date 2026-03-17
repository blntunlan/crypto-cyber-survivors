-- Migration 002: Fix v_leaderboard to aggregate per-player + add performance index
-- Date: 2026-03-17
-- Problem: v_leaderboard returned per-session rows (same player appears multiple times)
-- Fix: Aggregate stats per player with best-session metrics

-- ============================================================
-- Composite index for leaderboard query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_verified_pair_survival
  ON sessions(is_verified, pair, survival_seconds DESC);

-- ============================================================
-- VIEW: v_leaderboard (aggregated per-player)
-- ============================================================
-- One row per player per pair. Shows best survival time, total kills,
-- total sessions, and profile info needed by the client.

CREATE OR REPLACE VIEW v_leaderboard AS
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
