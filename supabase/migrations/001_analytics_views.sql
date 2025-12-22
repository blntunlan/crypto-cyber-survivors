-- ============================================
-- CRYPTO CYBER SURVIVORS - ANALYTICS VIEWS
-- Phase 6: Analytics Dashboard
-- ============================================

-- ============================================
-- VIEW: Daily Active Users (DAU)
-- ============================================
CREATE OR REPLACE VIEW analytics_dau AS
SELECT 
    DATE(last_seen_at) AS date,
    COUNT(DISTINCT id) AS dau,
    COUNT(*) FILTER (WHERE DATE(created_at) = DATE(last_seen_at)) AS new_users
FROM players
WHERE last_seen_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(last_seen_at)
ORDER BY date DESC;

-- ============================================
-- VIEW: Session Statistics
-- ============================================
CREATE OR REPLACE VIEW analytics_sessions AS
SELECT 
    DATE(session_timestamp) AS date,
    COUNT(*) AS total_sessions,
    AVG(survival_time_ms) / 1000 AS avg_survival_seconds,
    MAX(survival_time_ms) / 1000 AS max_survival_seconds,
    AVG(max_level) AS avg_max_level,
    MAX(max_level) AS highest_level,
    AVG(total_kills) AS avg_kills,
    SUM(total_kills) AS total_kills,
    AVG(avg_fps) AS avg_fps,
    AVG(min_fps) AS avg_min_fps
FROM game_sessions
WHERE session_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(session_timestamp)
ORDER BY date DESC;

-- ============================================
-- VIEW: Session Duration Distribution
-- ============================================
CREATE OR REPLACE VIEW analytics_session_duration AS
SELECT 
    CASE 
        WHEN survival_time_ms < 30000 THEN '< 30 sec'
        WHEN survival_time_ms < 60000 THEN '30-60 sec'
        WHEN survival_time_ms < 120000 THEN '1-2 min'
        WHEN survival_time_ms < 180000 THEN '2-3 min'
        WHEN survival_time_ms < 300000 THEN '3-5 min'
        WHEN survival_time_ms < 600000 THEN '5-10 min'
        ELSE '> 10 min'
    END AS duration_bucket,
    COUNT(*) AS session_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM game_sessions
WHERE session_timestamp > NOW() - INTERVAL '7 days'
GROUP BY 
    CASE 
        WHEN survival_time_ms < 30000 THEN '< 30 sec'
        WHEN survival_time_ms < 60000 THEN '30-60 sec'
        WHEN survival_time_ms < 120000 THEN '1-2 min'
        WHEN survival_time_ms < 180000 THEN '2-3 min'
        WHEN survival_time_ms < 300000 THEN '3-5 min'
        WHEN survival_time_ms < 600000 THEN '5-10 min'
        ELSE '> 10 min'
    END
ORDER BY MIN(survival_time_ms);

-- ============================================
-- VIEW: Performance by Device Type
-- ============================================
CREATE OR REPLACE VIEW analytics_performance_by_device AS
SELECT 
    COALESCE(d.device_type, 'unknown') AS device_type,
    COALESCE(d.recommended_profile, 'UNKNOWN') AS optimization_profile,
    COUNT(DISTINCT g.id) AS session_count,
    ROUND(AVG(g.avg_fps)::numeric, 1) AS avg_fps,
    ROUND(AVG(g.min_fps)::numeric, 1) AS avg_min_fps,
    ROUND(AVG(g.survival_time_ms / 1000.0)::numeric, 1) AS avg_survival_seconds
FROM game_sessions g
LEFT JOIN device_profiles d ON g.device_fingerprint = d.fingerprint
WHERE g.session_timestamp > NOW() - INTERVAL '7 days'
GROUP BY d.device_type, d.recommended_profile
ORDER BY session_count DESC;

-- ============================================
-- VIEW: Top Errors (Last 24 Hours)
-- ============================================
CREATE OR REPLACE VIEW analytics_top_errors AS
SELECT 
    error_type,
    error_message,
    COUNT(*) AS occurrence_count,
    COUNT(DISTINCT player_id) AS affected_players,
    MAX(reported_at) AS last_seen,
    MIN(reported_at) AS first_seen,
    status
FROM error_reports
WHERE reported_at > NOW() - INTERVAL '24 hours'
GROUP BY error_type, error_message, status
ORDER BY occurrence_count DESC
LIMIT 50;

-- ============================================
-- VIEW: Error Trends (Hourly)
-- ============================================
CREATE OR REPLACE VIEW analytics_error_trends AS
SELECT 
    DATE_TRUNC('hour', reported_at) AS hour,
    error_type,
    COUNT(*) AS error_count
FROM error_reports
WHERE reported_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', reported_at), error_type
ORDER BY hour DESC, error_count DESC;

-- ============================================
-- VIEW: Crypto Pair Performance
-- ============================================
CREATE OR REPLACE VIEW analytics_crypto_pairs AS
SELECT 
    crypto_pair,
    position,
    COUNT(*) AS session_count,
    ROUND(AVG(survival_time_ms / 1000.0)::numeric, 1) AS avg_survival_seconds,
    ROUND(AVG(pnl_percent)::numeric, 2) AS avg_pnl_percent,
    ROUND(AVG(max_level)::numeric, 1) AS avg_level,
    ROUND(AVG(total_kills)::numeric, 0) AS avg_kills
FROM game_sessions
WHERE session_timestamp > NOW() - INTERVAL '7 days'
  AND crypto_pair IS NOT NULL
GROUP BY crypto_pair, position
ORDER BY session_count DESC;

-- ============================================
-- VIEW: Player Retention (Cohort)
-- ============================================
CREATE OR REPLACE VIEW analytics_player_retention AS
WITH player_cohorts AS (
    SELECT 
        id,
        DATE(created_at) AS cohort_date,
        DATE(last_seen_at) AS last_active_date
    FROM players
    WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT 
    cohort_date,
    COUNT(*) AS cohort_size,
    COUNT(*) FILTER (WHERE last_active_date >= cohort_date + INTERVAL '1 day') AS day1_retained,
    COUNT(*) FILTER (WHERE last_active_date >= cohort_date + INTERVAL '7 days') AS day7_retained,
    ROUND(
        COUNT(*) FILTER (WHERE last_active_date >= cohort_date + INTERVAL '1 day') * 100.0 / COUNT(*),
        1
    ) AS day1_retention_pct,
    ROUND(
        COUNT(*) FILTER (WHERE last_active_date >= cohort_date + INTERVAL '7 days') * 100.0 / COUNT(*),
        1
    ) AS day7_retention_pct
FROM player_cohorts
GROUP BY cohort_date
ORDER BY cohort_date DESC;

-- ============================================
-- VIEW: Device Hardware Stats
-- ============================================
CREATE OR REPLACE VIEW analytics_device_hardware AS
SELECT 
    device_type,
    browser,
    COUNT(*) AS device_count,
    ROUND(AVG(screen_width)::numeric, 0) AS avg_screen_width,
    ROUND(AVG(screen_height)::numeric, 0) AS avg_screen_height,
    ROUND(AVG(hardware_concurrency)::numeric, 1) AS avg_cpu_cores,
    ROUND(AVG(device_memory)::numeric, 1) AS avg_memory_gb,
    ROUND(AVG(benchmark_score)::numeric, 0) AS avg_benchmark_score
FROM device_profiles
WHERE first_seen_at > NOW() - INTERVAL '30 days'
GROUP BY device_type, browser
ORDER BY device_count DESC;

-- ============================================
-- VIEW: Level Distribution
-- ============================================
CREATE OR REPLACE VIEW analytics_level_distribution AS
SELECT 
    max_level AS level,
    COUNT(*) AS session_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
    ROUND(AVG(survival_time_ms / 1000.0)::numeric, 1) AS avg_survival_seconds,
    ROUND(AVG(total_kills)::numeric, 0) AS avg_kills
FROM game_sessions
WHERE session_timestamp > NOW() - INTERVAL '7 days'
GROUP BY max_level
ORDER BY max_level;

-- ============================================
-- VIEW: Leaderboard - All Time Top 100
-- ============================================
CREATE OR REPLACE VIEW leaderboard_all_time AS
SELECT 
    p.display_name AS player_name,
    g.survival_time_ms / 1000 AS survival_seconds,
    g.max_level,
    g.total_kills,
    g.crypto_pair,
    g.position,
    g.pnl_percent,
    g.session_timestamp,
    RANK() OVER (ORDER BY g.survival_time_ms DESC) AS rank
FROM game_sessions g
JOIN players p ON g.player_id = p.id
WHERE g.survival_time_ms IS NOT NULL
ORDER BY g.survival_time_ms DESC
LIMIT 100;

-- ============================================
-- VIEW: Leaderboard - Daily Top 50
-- ============================================
CREATE OR REPLACE VIEW leaderboard_daily AS
SELECT 
    p.display_name AS player_name,
    g.survival_time_ms / 1000 AS survival_seconds,
    g.max_level,
    g.total_kills,
    g.crypto_pair,
    g.session_timestamp,
    RANK() OVER (ORDER BY g.survival_time_ms DESC) AS rank
FROM game_sessions g
JOIN players p ON g.player_id = p.id
WHERE g.session_timestamp > NOW() - INTERVAL '24 hours'
  AND g.survival_time_ms IS NOT NULL
ORDER BY g.survival_time_ms DESC
LIMIT 50;

-- ============================================
-- FUNCTION: Get Player Stats Summary
-- ============================================
CREATE OR REPLACE FUNCTION get_player_summary(p_player_id UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    total_playtime_minutes NUMERIC,
    avg_survival_seconds NUMERIC,
    best_survival_seconds NUMERIC,
    highest_level INTEGER,
    total_kills BIGINT,
    avg_kills_per_session NUMERIC,
    favorite_pair TEXT,
    favorite_position TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_sessions,
        ROUND(SUM(g.survival_time_ms) / 60000.0, 1) AS total_playtime_minutes,
        ROUND(AVG(g.survival_time_ms) / 1000.0, 1) AS avg_survival_seconds,
        MAX(g.survival_time_ms) / 1000.0 AS best_survival_seconds,
        MAX(g.max_level) AS highest_level,
        SUM(g.total_kills)::BIGINT AS total_kills,
        ROUND(AVG(g.total_kills)::numeric, 1) AS avg_kills_per_session,
        MODE() WITHIN GROUP (ORDER BY g.crypto_pair) AS favorite_pair,
        MODE() WITHIN GROUP (ORDER BY g.position) AS favorite_position
    FROM game_sessions g
    WHERE g.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get Dashboard Summary (Quick Stats)
-- ============================================
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS TABLE (
    total_players BIGINT,
    active_players_24h BIGINT,
    active_players_7d BIGINT,
    total_sessions BIGINT,
    sessions_today BIGINT,
    avg_session_time_seconds NUMERIC,
    total_errors_24h BIGINT,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::BIGINT FROM players) AS total_players,
        (SELECT COUNT(*)::BIGINT FROM players WHERE last_seen_at > NOW() - INTERVAL '24 hours') AS active_players_24h,
        (SELECT COUNT(*)::BIGINT FROM players WHERE last_seen_at > NOW() - INTERVAL '7 days') AS active_players_7d,
        (SELECT COUNT(*)::BIGINT FROM game_sessions) AS total_sessions,
        (SELECT COUNT(*)::BIGINT FROM game_sessions WHERE session_timestamp > NOW() - INTERVAL '24 hours') AS sessions_today,
        (SELECT ROUND(AVG(survival_time_ms) / 1000.0, 1) FROM game_sessions WHERE session_timestamp > NOW() - INTERVAL '7 days') AS avg_session_time_seconds,
        (SELECT COUNT(*)::BIGINT FROM error_reports WHERE reported_at > NOW() - INTERVAL '24 hours') AS total_errors_24h,
        (SELECT 
            CASE 
                WHEN (SELECT COUNT(*) FROM game_sessions WHERE session_timestamp > NOW() - INTERVAL '24 hours') > 0
                THEN ROUND(
                    (SELECT COUNT(*) FROM error_reports WHERE reported_at > NOW() - INTERVAL '24 hours')::NUMERIC * 100.0 /
                    (SELECT COUNT(*) FROM game_sessions WHERE session_timestamp > NOW() - INTERVAL '24 hours'),
                    2
                )
                ELSE 0
            END
        ) AS error_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Increment Player Sessions
-- (Called when player logs in with existing nickname)
-- ============================================
CREATE OR REPLACE FUNCTION increment_player_sessions(player_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE players 
    SET 
        total_sessions = total_sessions + 1,
        last_seen_at = NOW()
    WHERE id = player_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES for Analytics Performance
-- ============================================
-- These indexes optimize the analytics queries

-- Players indexes
CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_players_created ON players(created_at);

-- Game sessions indexes  
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON game_sessions(session_timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_pair ON game_sessions(crypto_pair);
CREATE INDEX IF NOT EXISTS idx_sessions_survival ON game_sessions(survival_time_ms DESC);

-- Error reports indexes
CREATE INDEX IF NOT EXISTS idx_errors_reported ON error_reports(reported_at);
CREATE INDEX IF NOT EXISTS idx_errors_type_time ON error_reports(error_type, reported_at);

-- Device profiles indexes
CREATE INDEX IF NOT EXISTS idx_devices_type ON device_profiles(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_first_seen ON device_profiles(first_seen_at);

-- ============================================
-- GRANT ACCESS (for anon/authenticated roles)
-- ============================================
-- Uncomment and adjust based on your RLS policies

-- GRANT SELECT ON analytics_dau TO authenticated;
-- GRANT SELECT ON analytics_sessions TO authenticated;
-- GRANT SELECT ON leaderboard_all_time TO anon, authenticated;
-- GRANT SELECT ON leaderboard_daily TO anon, authenticated;

-- ============================================
-- END OF MIGRATION
-- ============================================
