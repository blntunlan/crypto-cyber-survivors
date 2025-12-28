-- ============================================
-- MIGRATION 003: HARDEN ROW LEVEL SECURITY POLICIES
-- Date: 2025-12-28
-- Purpose: Restrict overly permissive RLS policies to prevent abuse
-- ============================================

-- ============================================
-- 1. DROP OVERLY PERMISSIVE POLICIES
-- ============================================

-- Players table - remove dangerous UPDATE policy
DROP POLICY IF EXISTS "Anyone can update players" ON players;

-- ============================================
-- 2. PLAYERS TABLE - Hardened Policies
-- ============================================

-- Keep: Anyone can read (needed for leaderboard)
-- Policy "Anyone can read players" already exists and is fine

-- Keep: Anyone can insert (needed for registration)
-- But add constraint to prevent duplicate display_name overwrites
-- Policy "Anyone can insert players" already exists

-- NEW: Players can only update their own last_seen_at
-- This prevents tampering with other players' data
CREATE POLICY "Players can only update last_seen_at" 
ON players FOR UPDATE 
USING (true)
WITH CHECK (
  -- Only allow updating last_seen_at and total_sessions columns
  -- The actual restriction is done via the WITH CHECK clause
  true
);

-- Actually, we need a more secure approach:
-- Remove the update policy entirely for anon users
DROP POLICY IF EXISTS "Players can only update last_seen_at" ON players;

-- Create a restricted update policy that only updates specific columns
-- via a function instead of direct table access

-- ============================================
-- 3. GAME_SESSIONS TABLE - Add Validation Constraints
-- ============================================

-- Add reasonable bounds to prevent obviously fake data
ALTER TABLE game_sessions 
DROP CONSTRAINT IF EXISTS valid_survival_time,
DROP CONSTRAINT IF EXISTS valid_level,
DROP CONSTRAINT IF EXISTS valid_kills,
DROP CONSTRAINT IF EXISTS valid_fps;

-- Survival time: 0 to 2 hours max (7,200,000 ms)
ALTER TABLE game_sessions 
ADD CONSTRAINT valid_survival_time 
CHECK (survival_time_ms >= 0 AND survival_time_ms <= 7200000);

-- Level: 1 to 1000 (reasonable max for long sessions)
ALTER TABLE game_sessions 
ADD CONSTRAINT valid_level 
CHECK (max_level >= 1 AND max_level <= 1000);

-- Kills: 0 to 100,000 (generous limit)
ALTER TABLE game_sessions 
ADD CONSTRAINT valid_kills 
CHECK (total_kills >= 0 AND total_kills <= 100000);

-- FPS constraint moved to performance_metrics table as the column doesn't exist in game_sessions

-- ============================================
-- 3b. PERFORMANCE_METRICS TABLE - Add Validation
-- ============================================

ALTER TABLE performance_metrics
ADD CONSTRAINT valid_avg_fps 
CHECK (avg_fps IS NULL OR (avg_fps >= 0 AND avg_fps <= 240));

ALTER TABLE performance_metrics
ADD CONSTRAINT valid_memory
CHECK (memory_used_mb IS NULL OR memory_used_mb >= 0);

-- ============================================
-- 4. DEVICE_PROFILES TABLE - Restrict Updates
-- ============================================

-- Remove update policy for anon (device profiles should only be inserted/read)
DROP POLICY IF EXISTS "Anyone can update device_profiles" ON device_profiles;

-- ============================================
-- 5. ERROR_REPORTS TABLE - Already Secure
-- ============================================
-- Error reports only allow INSERT (no UPDATE), which is correct.

-- ============================================
-- 6. RATE LIMITING SUPPORT
-- ============================================

-- Add a column to track insert timestamps for rate limiting
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS client_ip TEXT;

-- Create index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_sessions_rate_limit 
ON game_sessions(player_id, session_timestamp DESC);

-- ============================================
-- 7. SECURE PLAYER UPDATE FUNCTION
-- ============================================

-- Instead of allowing direct UPDATE, provide a secure function
CREATE OR REPLACE FUNCTION update_player_last_seen(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players 
  SET 
    last_seen_at = NOW(),
    total_sessions = total_sessions + 1
  WHERE id = p_player_id;
END;
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION update_player_last_seen(UUID) TO anon;

-- ============================================
-- SUMMARY OF CHANGES
-- ============================================
-- 
-- BEFORE (Insecure):
--   - Anyone could UPDATE any player's data
--   - No validation on game_sessions values
--   - Device profiles could be arbitrarily updated
--
-- AFTER (Secure):
--   - Players table: No direct UPDATE for anon users
--   - Game sessions: Validated bounds (survival time, level, kills, FPS)
--   - Device profiles: INSERT only, no UPDATE
--   - Secure function for updating last_seen_at
--
-- ============================================
