-- ============================================
-- MIGRATION 008: VERIFICATION AUDIT VIEWS
-- Date: 2026-01-12
-- Purpose: Provide proactive data integrity monitoring
-- ============================================

-- 1. PnL Discrepancy Audit
-- Identifies sessions where the reported PnL doesn't match the price movement
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
)) > 0.5; -- 0.5% tolerance for rounding

-- 2. Player Stats Drift Audit
-- Detects if player aggregate totals have drifted from their session sums
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
    p.nickname,
    p.total_sessions, ss.actual_sessions,
    p.total_playtime_ms, ss.actual_playtime,
    p.total_kills, ss.actual_kills,
    p.high_score, ss.actual_high_score
FROM players p
JOIN session_sums ss ON p.id = ss.player_id
WHERE p.total_sessions != ss.actual_sessions
   OR p.total_kills != ss.actual_kills
   OR ABS(p.total_playtime_ms - ss.actual_playtime) > 1000;

-- 3. Device Fingerprint Collision Audit
-- Flags if multiple different nicknames are using the same device fingerprint
CREATE OR REPLACE VIEW audit_fingerprint_collisions AS
SELECT 
    device_fingerprint,
    COUNT(DISTINCT player_id) as unique_players,
    ARRAY_AGG(DISTINCT player_id) as player_ids
FROM game_sessions
WHERE device_fingerprint IS NOT NULL
GROUP BY device_fingerprint
HAVING COUNT(DISTINCT player_id) > 2; -- Allow up to 2 for legitimate shared devices

-- 4. GRANTS
GRANT SELECT ON audit_pnl_discrepancies, audit_player_stats_drift, audit_fingerprint_collisions TO authenticated;
