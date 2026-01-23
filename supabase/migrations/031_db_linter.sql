-- ============================================
-- DB LINTER VIEW
-- Purpose: Find tables that violate DATABASE_GUIDELINES.md
-- ============================================

CREATE OR REPLACE VIEW public.v_db_standards_violations AS
WITH table_stats AS (
    SELECT 
        t.table_name,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'created_at') as has_created_at,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'updated_at') as has_updated_at,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'player_id') as has_player_ref,
        EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name = 'user_id') as has_legacy_user_id
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
        WHEN has_legacy_user_id THEN 'Using deprecated user_id'
        ELSE 'MISC STANDARDS VIOLATION'
    END as violation_type,
    'Urgent' as severity
FROM table_stats
WHERE NOT has_created_at 
   OR NOT has_updated_at 
   OR has_legacy_user_id;

GRANT SELECT ON public.v_db_standards_violations TO authenticated;
