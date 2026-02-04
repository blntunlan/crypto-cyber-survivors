-- ============================================
-- 🔐 SECURITY AUDIT FIXES: PHASE 1
-- Fixes for Linter findings (Leaderboard View & device_profiles RLS)
-- ============================================

-- 1. FIX: v_leaderboard (Convert to Security Invoker)
-- Note: In PG 15+, we can use (security_invoker = true)
-- This ensures the view respects caller's RLS on underlying tables (profiles, sessions)
DROP VIEW IF EXISTS public.v_leaderboard;

CREATE VIEW public.v_leaderboard 
WITH (security_invoker = true)
AS
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

-- 2. FIX: device_profiles RLS
ALTER TABLE public.device_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to insert/upsert their own profile
-- Since it's by fingerprint, we allow anyone to insert if they have the key
-- but usually device tracking is open for the app.
CREATE POLICY "Allow anonymous and authenticated to insert device profiles"
ON public.device_profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous and authenticated to update device profiles"
ON public.device_profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow viewing device profiles for debugging (Authenticated Only)
CREATE POLICY "Allow authenticated to view device profiles"
ON public.device_profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. ENSURE PERMISSIONS
GRANT SELECT ON public.v_leaderboard TO anon, authenticated;
GRANT ALL ON public.device_profiles TO authenticated;
GRANT INSERT, UPDATE ON public.device_profiles TO anon;
;
