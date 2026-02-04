-- ============================================
-- 🏛️ RENAISSANCE MASTER SCHEMA: STANDARDIZATION SWEEP
-- Target: Absolute Naming Consistency
-- ============================================

-- 1. RENAME TABLES FOR CONSISTENCY
-- player_achievements -> profile_achievements
-- player_inventory -> profile_inventory
ALTER TABLE IF EXISTS public.player_achievements RENAME TO profile_achievements;
ALTER TABLE IF EXISTS public.player_inventory RENAME TO profile_inventory;

-- 2. CLEAN UP ERROR REPORTS
-- Remove player_id redundant column, stick to profile_id
ALTER TABLE IF EXISTS public.error_reports DROP COLUMN IF EXISTS player_id;

-- 3. ENSURE ALL PROFILE LINKS ARE NAMED 'profile_id'
-- Performance Metrics check
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='performance_metrics' AND column_name='player_id') THEN
    ALTER TABLE public.performance_metrics RENAME COLUMN player_id TO profile_id;
  END IF;
END $$;

-- 4. UPDATE VIEWS
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT 
    p.id as profile_id,
    p.display_name,
    p.avatar_url,
    COALESCE(MAX(s.reward_amount), 0) as high_score,
    COUNT(s.id) as total_sessions,
    COALESCE(MAX(s.survival_seconds), 0) as max_survival_time,
    COALESCE(SUM(s.kills), 0) as total_kills
FROM 
    public.profiles p
LEFT JOIN 
    public.sessions s ON p.id = s.profile_id AND s.is_verified = TRUE
GROUP BY 
    p.id, p.display_name, p.avatar_url;

-- 5. UPDATE RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    profile_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    high_score BIGINT,
    total_sessions BIGINT,
    max_survival_time INTEGER,
    total_kills BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.v_leaderboard
    ORDER BY high_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PERMISSIONS
GRANT SELECT ON public.profile_achievements TO authenticated;
GRANT SELECT ON public.profile_inventory TO authenticated;
GRANT SELECT ON public.v_leaderboard TO anon, authenticated;
;
