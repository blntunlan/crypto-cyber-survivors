-- 1. DEVICE PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.device_profiles (
    fingerprint TEXT PRIMARY KEY,
    device_type TEXT,
    browser TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    recommended_profile TEXT,
    benchmark_score NUMERIC,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD REDUNDANT COLUMNS FOR OLD CLIENTS (If any)
-- ErrorTracker was looking for 'category' and 'fingerprint'
-- Already added in Phase 3, but ensuring here.

-- 3. PERMISSIONS FOR LEADERBOARD
-- Ensure anonymous as well as authenticated can view
GRANT SELECT ON public.v_leaderboard TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.device_profiles TO authenticated;

-- 4. ENSURE SESSIONS TABLE HAS ALL COLUMNS
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS kills INTEGER DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS leverage INTEGER DEFAULT 1;

-- 5. RPC FOR LEADERBOARD (Optional, but useful for SOLID)
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

GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER) TO anon, authenticated;
;
