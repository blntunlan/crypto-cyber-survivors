-- ============================================
-- MIGRATION 010: DATABASE TOTAL RESET & CONSOLIDATED SCHEMA
-- Date: 2026-01-12
-- Purpose: Complete fresh start with all cumulative optimizations (000-009)
-- ============================================

-- 1. DROP ALL EXISTING OBJECTS (Fresh Start)
-- ============================================
DROP VIEW IF EXISTS audit_fingerprint_collisions CASCADE;
DROP VIEW IF EXISTS audit_player_stats_drift CASCADE;
DROP VIEW IF EXISTS audit_pnl_discrepancies CASCADE;
DROP VIEW IF EXISTS leaderboard CASCADE;

DROP TABLE IF EXISTS market_state CASCADE;
DROP TABLE IF EXISTS coin_transactions CASCADE;
DROP TABLE IF EXISTS player_wallets CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS error_reports CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS device_profiles CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS price_logs CASCADE;

DROP FUNCTION IF EXISTS sync_player_lifetime_stats CASCADE;
DROP FUNCTION IF EXISTS update_wallet_timestamp CASCADE;
DROP FUNCTION IF EXISTS update_player_last_seen CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_price_logs CASCADE;

-- 2. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. TABLES
-- ============================================

-- Players Table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Auth Fields
    auth_provider TEXT NOT NULL DEFAULT 'nickname',
    auth_id TEXT,
    email TEXT,
    twitter_handle TEXT,
    twitter_id TEXT,
    wallet_address TEXT,
    wallet_chain TEXT,
    avatar_url TEXT,
    
    -- Aggregate Stats
    total_sessions INTEGER DEFAULT 0,
    total_playtime_ms BIGINT DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    high_score INTEGER DEFAULT 0,
    best_pnl_percent NUMERIC(10,4) DEFAULT 0,
    
    -- Moderation
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    
    CONSTRAINT unique_display_name UNIQUE (display_name)
);

-- Device Profiles Table
CREATE TABLE device_profiles (
    fingerprint TEXT PRIMARY KEY,
    device_type TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    pixel_ratio NUMERIC(4,2),
    hardware_concurrency INTEGER,
    device_memory NUMERIC(6,2),
    gpu_renderer TEXT,
    recommended_profile TEXT,
    benchmark_score INTEGER,
    session_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Sessions Table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT, -- Client generated nanoid
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    user_id UUID REFERENCES players(id), -- Alias for edge function compatibility
    device_fingerprint TEXT,
    client_ip TEXT,
    
    -- Game data
    crypto_pair TEXT DEFAULT 'BTC',
    position_chosen TEXT, -- 'long' or 'short'
    leverage INTEGER DEFAULT 1,
    entry_price NUMERIC,
    exit_price NUMERIC,
    pnl_percent NUMERIC(10,4),
    
    -- Verification Claims
    claimed_entry_price NUMERIC,
    claimed_exit_price NUMERIC,
    claimed_pnl NUMERIC,
    
    -- Results
    max_level INTEGER DEFAULT 1,
    total_kills INTEGER DEFAULT 0,
    survival_time_ms INTEGER DEFAULT 0,
    survival_seconds INTEGER,
    gold_collected INTEGER DEFAULT 0,
    
    -- Status
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_method TEXT,
    verification_error TEXT,
    is_suspicious BOOLEAN DEFAULT false,
    suspicion_reason TEXT,
    
    -- Internal Verification Results
    verified_entry_price NUMERIC,
    verified_exit_price NUMERIC,
    verified_pnl NUMERIC,
    price_diff_entry NUMERIC,
    price_diff_exit NUMERIC,
    pnl_diff NUMERIC,
    time_diff_ms INTEGER,
    
    -- Rewards
    reward_given BOOLEAN DEFAULT false,
    reward_amount NUMERIC DEFAULT 0,
    
    -- Metadata
    session_timestamp TIMESTAMPTZ DEFAULT NOW(),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    end_reason TEXT,
    
    -- Constraints
    CONSTRAINT unique_player_session UNIQUE (player_id, session_timestamp),
    CONSTRAINT valid_survival_time CHECK (survival_time_ms >= 0 AND survival_time_ms <= 7200000),
    CONSTRAINT valid_level CHECK (max_level >= 1 AND max_level <= 1000),
    CONSTRAINT valid_kills CHECK (total_kills >= 0 AND total_kills <= 100000)
);

-- Performance Metrics Table
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- FPS
    avg_fps NUMERIC(6,2) NOT NULL,
    min_fps NUMERIC(6,2) NOT NULL,
    max_fps NUMERIC(6,2),
    fps_1_percentile NUMERIC(6,2),
    fps_samples INTEGER DEFAULT 1,
    frame_drops INTEGER DEFAULT 0,
    
    -- Timing
    avg_frame_time_ms NUMERIC(8,2),
    max_frame_time_ms NUMERIC(8,2),
    
    -- Memory
    memory_used_mb INTEGER,
    memory_peak_mb INTEGER,
    
    -- Game State
    enemy_count_avg INTEGER,
    enemy_count_max INTEGER,
    bullet_count_avg INTEGER,
    particle_count_avg INTEGER,
    
    -- Optimization
    optimization_profile TEXT,
    device_fingerprint TEXT,
    
    CONSTRAINT valid_avg_fps CHECK (avg_fps >= 0 AND avg_fps <= 240)
);

-- Error Reports Table
CREATE TABLE error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
    device_fingerprint TEXT,
    fingerprint TEXT, -- Error grouping fingerprint
    
    error_type TEXT NOT NULL,
    error_message TEXT,
    error_code TEXT,
    stack_trace TEXT,
    component TEXT,
    severity TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'runtime',
    
    browser_info TEXT, -- User agent string
    user_agent TEXT,
    page_url TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    
    status TEXT DEFAULT 'new',
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Logs Table
CREATE TABLE price_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pair VARCHAR(20) NOT NULL,
    price NUMERIC(20,8) NOT NULL,
    volume NUMERIC(24,8),
    high NUMERIC(20,8),
    low NUMERIC(20,8),
    source VARCHAR(20) NOT NULL
);

-- Market State Table (Indicators)
CREATE TABLE market_state (
    pair VARCHAR(10) PRIMARY KEY,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Raw Data
    price NUMERIC(20,8) NOT NULL,
    volume NUMERIC(24,8) NOT NULL,
    high NUMERIC(20,8),
    low NUMERIC(20,8),
    
    -- RSI
    rsi NUMERIC(6,2) NOT NULL DEFAULT 50,
    rsi_state VARCHAR(20) NOT NULL DEFAULT 'NEUTRAL',
    
    -- ATR & Volatility
    atr NUMERIC(20,8) NOT NULL DEFAULT 0,
    atr_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
    spawn_rate_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    
    -- Volume Analysis
    normalized_volume NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
    volume_percentile NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
    volume_z_score NUMERIC(10,4) DEFAULT 0,
    volume_mean NUMERIC(20,4) DEFAULT 0,
    volume_std_dev NUMERIC(20,4) DEFAULT 0,
    
    -- Whale Detection
    whale_tier INTEGER NOT NULL DEFAULT 0,
    last_whale_spawn_at TIMESTAMPTZ,
    
    -- Context
    volume_history_min NUMERIC(24,8),
    volume_history_max NUMERIC(24,8),
    volume_history_count INTEGER DEFAULT 0,
    
    -- Enemy Modifiers
    enemy_aggro_multiplier_long NUMERIC(4,2) DEFAULT 1.0,
    enemy_aggro_multiplier_short NUMERIC(4,2) DEFAULT 1.0
);

-- Wallet & Transactions (006)
CREATE TABLE player_wallets (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    confirmed_balance NUMERIC DEFAULT 0,
    pending_balance NUMERIC DEFAULT 0,
    total_earned NUMERIC DEFAULT 0,
    total_withdrawn NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_confirmed_balance CHECK (confirmed_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0)
);

CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    balance_before NUMERIC,
    balance_after NUMERIC,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_transaction_type CHECK (
        type IN ('game_reward_pending', 'game_reward_confirmed', 'game_reward_rollback', 
                 'withdrawal', 'bonus', 'adjustment', 'refund')
    )
);

CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    fee NUMERIC DEFAULT 0,
    net_amount NUMERIC NOT NULL,
    wallet_address TEXT NOT NULL,
    wallet_chain TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_id UUID,
    admin_notes TEXT,
    tx_hash TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (
        status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')
    )
);

-- Add initial data for supported pairs
INSERT INTO market_state (pair, price, volume, rsi, rsi_state)
VALUES 
  ('BTC', 0, 0, 50, 'NEUTRAL'),
  ('ETH', 0, 0, 50, 'NEUTRAL'),
  ('SOL', 0, 0, 50, 'NEUTRAL');

-- 4. VIEWS
-- ============================================

-- Main Leaderboard
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    gs.id,
    COALESCE(p.display_name, 'Anonymous') AS player_name,
    (gs.max_level * 100 + gs.total_kills + FLOOR(gs.survival_time_ms / 1000)) AS score,
    gs.survival_time_ms,
    gs.max_level,
    gs.total_kills,
    gs.crypto_pair,
    gs.session_timestamp AS created_at
FROM game_sessions gs
LEFT JOIN players p ON gs.player_id = p.id
WHERE 
    gs.survival_time_ms > 0
    AND p.display_name IS NOT NULL
    AND p.display_name != ''
    AND (p.is_banned IS FALSE OR p.is_banned IS NULL)
ORDER BY score DESC
LIMIT 100;

-- Audit: PnL Discrepancy
CREATE OR REPLACE VIEW audit_pnl_discrepancies AS
SELECT 
    gs.id,
    gs.session_id,
    gs.player_id,
    gs.entry_price,
    gs.exit_price,
    gs.leverage,
    gs.pnl_percent as reported_pnl,
    CASE 
        WHEN gs.position_chosen = 'long' THEN 
            ((gs.exit_price - gs.entry_price) / gs.entry_price) * gs.leverage * 100
        ELSE 
            ((gs.entry_price - gs.exit_price) / gs.entry_price) * gs.leverage * 100
    END as calculated_pnl,
    ABS(gs.pnl_percent - (
        CASE 
            WHEN gs.position_chosen = 'long' THEN 
                ((gs.exit_price - gs.entry_price) / gs.entry_price) * gs.leverage * 100
            ELSE 
                ((gs.entry_price - gs.exit_price) / gs.entry_price) * gs.leverage * 100
        END
    )) as discrepancy_delta
FROM game_sessions gs
WHERE gs.entry_price > 0 AND gs.exit_price > 0
AND ABS(gs.pnl_percent - (
    CASE 
        WHEN gs.position_chosen = 'long' THEN 
            ((gs.exit_price - gs.entry_price) / gs.entry_price) * gs.leverage * 100
        ELSE 
            ((gs.entry_price - gs.exit_price) / gs.entry_price) * gs.leverage * 100
    END
)) > 0.5;

-- Audit: Player Stats Drift
CREATE OR REPLACE VIEW audit_player_stats_drift AS
WITH session_sums AS (
    SELECT 
        player_id,
        COUNT(*) as actual_sessions,
        SUM(survival_time_ms) as actual_playtime,
        SUM(total_kills) as actual_kills,
        MAX(survival_time_ms) as actual_high_score,
        MAX(pnl_percent) as actual_best_pnl
    FROM game_sessions
    GROUP BY player_id
)
SELECT 
    p.id,
    p.display_name,
    p.total_sessions, ss.actual_sessions,
    p.total_playtime_ms, ss.actual_playtime,
    p.total_kills, ss.actual_kills,
    p.high_score, ss.actual_high_score
FROM players p
JOIN session_sums ss ON p.id = ss.player_id
WHERE p.total_sessions != ss.actual_sessions
   OR p.total_kills != ss.actual_kills
   OR ABS(p.total_playtime_ms - ss.actual_playtime) > 1000;

-- Audit: Fingerprint Collision
CREATE OR REPLACE VIEW audit_fingerprint_collisions AS
SELECT 
    device_fingerprint,
    COUNT(DISTINCT player_id) as unique_players,
    ARRAY_AGG(DISTINCT player_id) as player_ids
FROM game_sessions
WHERE device_fingerprint IS NOT NULL
GROUP BY device_fingerprint
HAVING COUNT(DISTINCT player_id) > 2;

-- 5. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to sync player lifetime stats
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

CREATE TRIGGER on_game_session_complete
AFTER INSERT ON game_sessions
FOR EACH ROW
WHEN (NEW.player_id IS NOT NULL)
EXECUTE FUNCTION sync_player_lifetime_stats();

-- Wallet Timestamp Update
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_updated
BEFORE UPDATE ON player_wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_timestamp();

-- Secure Player Update Function
CREATE OR REPLACE FUNCTION update_player_last_seen(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players SET last_seen_at = NOW() WHERE id = p_player_id;
END;
$$;

-- 6. INDEXES (Performance & Maintenance)
-- ============================================
CREATE INDEX idx_players_high_score ON players(high_score DESC);
CREATE INDEX idx_players_last_seen ON players(last_seen_at);
CREATE UNIQUE INDEX idx_players_auth ON players(auth_id) WHERE auth_id IS NOT NULL;
CREATE UNIQUE INDEX idx_players_wallet_addr ON players(wallet_address) WHERE wallet_address IS NOT NULL;

CREATE INDEX idx_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_sessions_timestamp ON game_sessions(session_timestamp DESC);
CREATE UNIQUE INDEX idx_unique_session_id ON game_sessions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_sessions_verification_status ON game_sessions(is_verified, session_timestamp DESC);

CREATE INDEX idx_perf_session ON performance_metrics(session_id);
CREATE INDEX idx_errors_reported ON error_reports(reported_at);
CREATE INDEX idx_errors_session ON error_reports(session_id);

CREATE INDEX idx_market_state_pair ON market_state(pair);
CREATE INDEX idx_market_state_whale_tier ON market_state(whale_tier) WHERE whale_tier > 0;

CREATE INDEX idx_price_logs_timestamp_desc ON price_logs (timestamp DESC);
CREATE INDEX idx_price_logs_pair_timestamp ON price_logs (pair, timestamp DESC);

CREATE INDEX idx_coin_transactions_player ON coin_transactions(player_id, created_at DESC);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status, requested_at DESC);

-- Audit Views Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_pnl_audit ON game_sessions(entry_price, exit_price, pnl_percent);

-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Players Policies
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);

-- Device Profiles Policies
CREATE POLICY "Anyone can read/insert device_profiles" ON device_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert device_profiles" ON device_profiles FOR INSERT WITH CHECK (true);

-- Game Sessions Policies
CREATE POLICY "Anyone can read/insert sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON game_sessions FOR INSERT WITH CHECK (true);

-- Performance Metrics Policies
CREATE POLICY "Anyone can read/insert performance" ON performance_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert performance" ON performance_metrics FOR INSERT WITH CHECK (true);

-- Error Reports Policies
CREATE POLICY "Anyone can insert error_reports" ON error_reports FOR INSERT WITH CHECK (true);

-- Market State Policies
CREATE POLICY "Anyone can read market_state" ON market_state FOR SELECT USING (true);
CREATE POLICY "Service role can manage market_state" ON market_state FOR ALL 
TO service_role USING (true) WITH CHECK (true);

-- Price Logs Policies
CREATE POLICY "Anyone can read price_logs" ON price_logs FOR SELECT USING (true);
CREATE POLICY "Service role can manage price_logs" ON price_logs FOR ALL 
TO service_role USING (true) WITH CHECK (true);

-- Wallet & Transactions (Restricted to service role or own user)
CREATE POLICY "Players can view own wallet" ON player_wallets FOR SELECT 
USING (true); 

CREATE POLICY "Service role can manage wallets" ON player_wallets FOR ALL 
TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Players can view own transactions" ON coin_transactions FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage transactions" ON coin_transactions FOR ALL 
TO service_role USING (true) WITH CHECK (true);

-- Withdrawal Requests Policies
CREATE POLICY "Anyone can insert withdrawal_requests" ON withdrawal_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can view own withdrawals" ON withdrawal_requests FOR SELECT USING (true);
CREATE POLICY "Service role can manage withdrawals" ON withdrawal_requests FOR ALL 
TO service_role USING (true) WITH CHECK (true);

-- 8. GRANTS
-- ============================================
GRANT SELECT, INSERT ON players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON device_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON game_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON performance_metrics TO anon, authenticated;
GRANT SELECT, INSERT ON error_reports TO anon, authenticated;
GRANT SELECT ON leaderboard TO anon, authenticated;
GRANT SELECT ON market_state TO anon, authenticated;
GRANT SELECT ON player_wallets TO anon, authenticated;
GRANT SELECT ON coin_transactions TO anon, authenticated;
GRANT SELECT, INSERT ON withdrawal_requests TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_player_last_seen(UUID) TO anon, authenticated;

-- 9. CLEANUP CRON
-- ============================================
-- Retention: 24h
SELECT cron.schedule(
  'cleanup-price-logs-daily',
  '0 */6 * * *', -- Every 6 hours
  $$
    DELETE FROM public.price_logs 
    WHERE timestamp < NOW() - INTERVAL '24 hours';
  $$
);

-- DONE!
