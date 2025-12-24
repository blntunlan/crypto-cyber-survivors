-- ============================================
-- CRYPTO CYBER SURVIVORS - CLEAN SCHEMA
-- Supabase Database Setup (Fresh Start)
-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. DROP EXISTING OBJECTS (Clean slate)
-- ============================================
DROP TABLE IF EXISTS leaderboard CASCADE; -- Just in case it was created as a table
DROP VIEW IF EXISTS leaderboard CASCADE;
DROP VIEW IF EXISTS leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS leaderboard_daily CASCADE;
DROP VIEW IF EXISTS analytics_dau CASCADE;
DROP VIEW IF EXISTS analytics_sessions CASCADE;
DROP VIEW IF EXISTS analytics_session_duration CASCADE;
DROP VIEW IF EXISTS analytics_performance_by_device CASCADE;
DROP VIEW IF EXISTS analytics_top_errors CASCADE;
DROP VIEW IF EXISTS analytics_error_trends CASCADE;
DROP VIEW IF EXISTS analytics_crypto_pairs CASCADE;
DROP VIEW IF EXISTS analytics_player_retention CASCADE;
DROP VIEW IF EXISTS analytics_device_hardware CASCADE;
DROP VIEW IF EXISTS analytics_level_distribution CASCADE;

DROP TABLE IF EXISTS error_reports CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS device_profiles CASCADE;
DROP TABLE IF EXISTS players CASCADE;

DROP FUNCTION IF EXISTS get_player_summary CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_summary CASCADE;
DROP FUNCTION IF EXISTS increment_player_sessions CASCADE;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Players Table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    total_sessions INTEGER DEFAULT 1,
    
    CONSTRAINT unique_display_name UNIQUE (display_name)
);

-- Device Profiles Table
CREATE TABLE device_profiles (
    fingerprint TEXT PRIMARY KEY,
    device_type TEXT,
    browser TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    hardware_concurrency INTEGER,
    device_memory NUMERIC,
    recommended_profile TEXT,
    benchmark_score INTEGER,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Sessions Table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    device_fingerprint TEXT,
    
    -- Game data
    crypto_pair TEXT DEFAULT 'BTC',
    position TEXT, -- LONG or SHORT
    leverage INTEGER DEFAULT 1,
    entry_price NUMERIC,
    exit_price NUMERIC,
    pnl_percent NUMERIC,
    
    -- Performance
    max_level INTEGER DEFAULT 1,
    total_kills INTEGER DEFAULT 0,
    survival_time_ms INTEGER DEFAULT 0,
    avg_fps NUMERIC,
    min_fps NUMERIC,
    
    -- Metadata
    session_timestamp TIMESTAMPTZ DEFAULT NOW(),
    end_reason TEXT
);

-- Error Reports Table
CREATE TABLE error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    browser_info TEXT,
    page_url TEXT,
    status TEXT DEFAULT 'new',
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================
CREATE INDEX idx_players_display_name ON players(display_name);
CREATE INDEX idx_players_last_seen ON players(last_seen_at);
CREATE INDEX idx_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_sessions_timestamp ON game_sessions(session_timestamp);
CREATE INDEX idx_sessions_score ON game_sessions(survival_time_ms DESC);
CREATE INDEX idx_errors_reported ON error_reports(reported_at);

-- ============================================
-- 4. CREATE LEADERBOARD VIEW
-- ============================================
CREATE VIEW leaderboard AS
SELECT 
    gs.id,
    p.display_name AS player_name,
    (gs.max_level * 100 + gs.total_kills + FLOOR(gs.survival_time_ms / 1000)) AS score,
    gs.survival_time_ms,
    gs.max_level,
    gs.total_kills,
    gs.crypto_pair,
    gs.session_timestamp AS created_at
FROM game_sessions gs
JOIN players p ON gs.player_id = p.id
WHERE gs.survival_time_ms IS NOT NULL
ORDER BY score DESC
LIMIT 100;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- Players: Anyone can read, anyone can insert/update
CREATE POLICY "Anyone can read players" 
ON players FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert players" 
ON players FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update players" 
ON players FOR UPDATE 
USING (true);

-- Device Profiles: Anyone can upsert
CREATE POLICY "Anyone can read device_profiles" 
ON device_profiles FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert device_profiles" 
ON device_profiles FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update device_profiles" 
ON device_profiles FOR UPDATE 
USING (true);

-- Game Sessions: Anyone can read/insert
CREATE POLICY "Anyone can read game_sessions" 
ON game_sessions FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert game_sessions" 
ON game_sessions FOR INSERT 
WITH CHECK (true);

-- Error Reports: Anyone can read/insert
CREATE POLICY "Anyone can read error_reports" 
ON error_reports FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert error_reports" 
ON error_reports FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 6. GRANT ACCESS TO ANON ROLE
-- ============================================
GRANT SELECT, INSERT, UPDATE ON players TO anon;
GRANT SELECT, INSERT, UPDATE ON device_profiles TO anon;
GRANT SELECT, INSERT ON game_sessions TO anon;
GRANT SELECT, INSERT ON error_reports TO anon;
GRANT SELECT ON leaderboard TO anon;

-- ============================================
-- DONE! Your Supabase is ready.
-- ============================================
