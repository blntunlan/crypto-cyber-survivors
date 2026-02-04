-- 1. ERROR REPORTS SCHEMA ALIGNMENT
ALTER TABLE public.error_reports 
ADD COLUMN IF NOT EXISTS browser_info TEXT,
ADD COLUMN IF NOT EXISTS page_url TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS session_id UUID;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='error_reports' AND column_name='player_id') THEN
    ALTER TABLE public.error_reports ADD COLUMN player_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. LEADERBOARD VIEW
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

-- 3. PROFILE TRACKER COMPATIBILITY
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS high_score BIGINT DEFAULT 0;

-- 4. PERMISSIONS
GRANT INSERT ON public.error_reports TO anon;
GRANT INSERT ON public.error_reports TO authenticated;
GRANT SELECT ON public.v_leaderboard TO anon;
GRANT SELECT ON public.v_leaderboard TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;
;
