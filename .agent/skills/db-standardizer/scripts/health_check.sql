-- DB Health and Standardization Check
-- Run this on Supabase SQL Editor to find inconsistencies

SELECT 
    'Naming Inconsistency' as issue_type,
    table_name || '.' || column_name as location,
    'Column name contains non-snake_case characters' as detail
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name ~ '[A-Z]'

UNION ALL

SELECT 
    'Alias Overlap' as issue_type,
    table_name as location,
    'Table has both player_id and user_id' as detail
FROM (
    SELECT table_name, count(*) 
    FROM information_schema.columns 
    WHERE column_name IN ('player_id', 'user_id') 
    GROUP BY table_name 
    HAVING count(*) > 1
) alias_check

UNION ALL

SELECT 
    'Missing Timestamps' as issue_type,
    table_name as location,
    'Table is missing updated_at or created_at' as detail
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_name = t.table_name 
    AND c.column_name = 'created_at'
);
