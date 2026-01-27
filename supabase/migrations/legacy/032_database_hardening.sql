-- ============================================
-- MIGRATION 032: DATABASE HARDENING
-- Date: 2026-01-25
-- Purpose: 
-- 1. Prevent "Empty Columns" by enforcing NOT NULL constraints.
-- 2. Add sensible defaults for numeric stats.
-- 3. Cleanup redundant nulls.
-- ============================================

-- 1. GAME SESSIONS HARDENING
-- ============================================

-- First, cleanup any sessions that are missing mandatory data manually (or set defaults)
UPDATE public.game_sessions SET position_chosen = 'long' WHERE position_chosen IS NULL;
UPDATE public.game_sessions SET leverage = 1 WHERE leverage IS NULL;
UPDATE public.game_sessions SET crypto_pair = 'BTC' WHERE crypto_pair IS NULL;

-- Now enforce constraints
ALTER TABLE public.game_sessions 
    ALTER COLUMN player_id SET NOT NULL,
    ALTER COLUMN crypto_pair SET NOT NULL,
    ALTER COLUMN position_chosen SET NOT NULL,
    ALTER COLUMN leverage SET NOT NULL,
    ALTER COLUMN is_verified SET NOT NULL,
    ALTER COLUMN max_level SET NOT NULL,
    ALTER COLUMN total_kills SET NOT NULL,
    ALTER COLUMN survival_time_ms SET NOT NULL,
    ALTER COLUMN gold_collected SET NOT NULL;

-- 2. ERROR REPORTS HARDENING
-- ============================================
ALTER TABLE public.error_reports 
    ALTER COLUMN error_type SET NOT NULL,
    ALTER COLUMN category SET NOT NULL,
    ALTER COLUMN severity SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

-- 3. PLAYERS HARDENING
-- ============================================
ALTER TABLE public.players 
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN total_sessions SET NOT NULL,
    ALTER COLUMN total_kills SET NOT NULL,
    ALTER COLUMN high_score SET NOT NULL;

-- 4. ADD LINTER CHECK FOR NULLABILITY
-- ============================================
CREATE OR REPLACE VIEW public.v_db_standards_violations AS
WITH table_stats AS (
    SELECT 
        t.table_name,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'created_at') as has_created_at,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'updated_at') as has_updated_at,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'player_id') as has_player_ref,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.is_nullable = 'YES' AND c.column_name IN ('player_id', 'error_type', 'display_name')) as critical_nullable_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('schema_migrations', 'price_logs')
)
SELECT 
    table_name,
    CASE 
        WHEN NOT has_created_at THEN 'Missing created_at'
        WHEN NOT has_updated_at THEN 'Missing updated_at'
        WHEN critical_nullable_count > 0 THEN 'Critical columns allow NULL'
        ELSE 'MISC STANDARDS VIOLATION'
    END as violation_type,
    'Urgent' as severity
FROM table_stats
WHERE NOT has_created_at 
   OR NOT has_updated_at 
   OR critical_nullable_count > 0;

-- DONE!
