-- ============================================
-- MIGRATION 004: FIX DATABASE SCHEMA MISMATCH
-- Date: 2026-01-10
-- Purpose: Bring database schema in line with ErrorTracker and MetricsStorage code
-- ============================================

-- 1. FIX players TABLE
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS high_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_kills INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_playtime_ms BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_pnl_percent NUMERIC DEFAULT 0;

-- 2. CREATE performance_metrics TABLE
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    avg_fps NUMERIC NOT NULL,
    min_fps NUMERIC NOT NULL,
    max_fps NUMERIC,
    fps_samples INTEGER DEFAULT 1,
    frame_drops INTEGER DEFAULT 0,
    memory_used_mb INTEGER,
    memory_peak_mb INTEGER,
    enemy_count_max INTEGER,
    optimization_profile TEXT,
    device_fingerprint TEXT
);

CREATE INDEX IF NOT EXISTS idx_perf_session ON performance_metrics(session_id);

-- 3. FIX error_reports TABLE
ALTER TABLE error_reports 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'runtime',
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL;

-- Rename browser_info to user_agent if browser_info exists and user_agent doesn't
-- (Safely handled by keeping both for now or migrating)
-- ALTER TABLE error_reports RENAME COLUMN browser_info TO user_agent_legacy;

-- 4. RLS FOR NEW TABLE
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read performance_metrics" 
ON performance_metrics FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert performance_metrics" 
ON performance_metrics FOR INSERT 
WITH CHECK (true);

GRANT SELECT, INSERT ON performance_metrics TO anon;

-- 5. UPDATE COMMENTS
COMMENT ON TABLE performance_metrics IS 'Oyun performans metrikleri (FPS, Memory, vs)';
COMMENT ON COLUMN error_reports.context IS 'Metadata ve oyun bağlamı (JSON format)';
