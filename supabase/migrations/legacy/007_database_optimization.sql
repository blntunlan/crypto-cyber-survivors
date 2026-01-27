-- ============================================
-- MIGRATION 007: SCHEMA COMPLETION & OPTIMIZATION
-- Date: 2026-01-12
-- Purpose: Add missing fields from the final plan to ensure data integrity
-- ============================================

-- 1. players Table Completion
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'nickname',
ADD COLUMN IF NOT EXISTS auth_id TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS twitter_id TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_auth ON players(auth_id) WHERE auth_id IS NOT NULL;

-- 2. game_sessions Table Completion
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicion_reason TEXT;

-- 3. performance_metrics Table Completion
ALTER TABLE performance_metrics 
ADD COLUMN IF NOT EXISTS fps_1_percentile NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS avg_frame_time_ms NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS max_frame_time_ms NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS enemy_count_avg INTEGER,
ADD COLUMN IF NOT EXISTS bullet_count_avg INTEGER,
ADD COLUMN IF NOT EXISTS particle_count_avg INTEGER;

-- 4. device_profiles Table Completion
ALTER TABLE device_profiles 
ADD COLUMN IF NOT EXISTS browser_version TEXT,
ADD COLUMN IF NOT EXISTS os TEXT,
ADD COLUMN IF NOT EXISTS pixel_ratio NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS gpu_renderer TEXT,
ADD COLUMN IF NOT EXISTS session_count INTEGER NOT NULL DEFAULT 1;

-- 5. error_reports Table Completion
ALTER TABLE error_reports 
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS component TEXT;

-- 6. Add performance optimization triggers if needed
-- (Example: Update total_playtime_ms in players automatically)
CREATE OR REPLACE FUNCTION sync_player_lifetime_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE players 
    SET 
        total_sessions = total_sessions + 1,
        total_playtime_ms = total_playtime_ms + COALESCE(NEW.survival_time_ms, 0),
        total_kills = total_kills + COALESCE(NEW.total_kills, 0),
        high_score = GREATEST(high_score, COALESCE(NEW.survival_time_ms, 0)),
        best_pnl_percent = GREATEST(best_pnl_percent, COALESCE(NEW.pnl_percent, 0)),
        last_seen_at = NOW()
    WHERE id = NEW.player_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_game_session_complete ON game_sessions;
CREATE TRIGGER on_game_session_complete
AFTER INSERT ON game_sessions
FOR EACH ROW
WHEN (NEW.player_id IS NOT NULL)
EXECUTE FUNCTION sync_player_lifetime_stats();

-- 7. GRANTS
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON game_sessions, performance_metrics, error_reports TO anon;
