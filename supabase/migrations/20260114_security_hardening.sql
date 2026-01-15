-- ============================================
-- MIGRATION: SECURITY & PERFORMANCE HARDENING
-- Date: 2026-01-14
-- Purpose: Address security advisor findings and optimize performance
-- ============================================

-- 1. CONVERT SECURITY DEFINER VIEWS TO SECURITY INVOKER
-- ============================================

-- Leaderboard
CREATE OR REPLACE VIEW public.leaderboard WITH (security_invoker = true) AS
SELECT 
    gs.id,
    COALESCE(p.display_name, 'Anonymous'::text) AS player_name,
    ((gs.max_level * 100) + gs.total_kills) + floor((gs.survival_time_ms / 1000))::numeric AS score,
    gs.survival_time_ms,
    gs.max_level,
    gs.total_kills,
    gs.crypto_pair,
    gs.session_timestamp AS created_at
FROM public.game_sessions gs
LEFT JOIN public.players p ON gs.player_id = p.id
WHERE gs.survival_time_ms > 0 
  AND p.display_name IS NOT NULL 
  AND p.display_name <> ''::text 
  AND (p.is_banned IS FALSE OR p.is_banned IS NULL)
ORDER BY (((gs.max_level * 100) + gs.total_kills) + floor((gs.survival_time_ms / 1000))::numeric) DESC
LIMIT 100;

-- Audit Player Stats Drift
CREATE OR REPLACE VIEW public.audit_player_stats_drift WITH (security_invoker = true) AS
WITH session_sums AS (
    SELECT 
        game_sessions.player_id,
        count(*) AS actual_sessions,
        sum(game_sessions.survival_time_ms) AS actual_playtime,
        sum(game_sessions.total_kills) AS actual_kills,
        max(game_sessions.survival_time_ms) AS actual_high_score,
        max(game_sessions.pnl_percent) AS actual_best_pnl
    FROM public.game_sessions
    GROUP BY game_sessions.player_id
)
SELECT 
    p.id,
    p.display_name,
    p.total_sessions,
    ss.actual_sessions,
    p.total_playtime_ms,
    ss.actual_playtime,
    p.total_kills,
    ss.actual_kills,
    p.high_score,
    ss.actual_high_score
FROM public.players p
JOIN session_sums ss ON p.id = ss.player_id
WHERE p.total_sessions <> ss.actual_sessions 
   OR p.total_kills <> ss.actual_kills 
   OR abs((p.total_playtime_ms - ss.actual_playtime)) > 1000;

-- Error Summary
CREATE OR REPLACE VIEW public.error_summary WITH (security_invoker = true) AS
SELECT 
    error_type,
    category,
    severity,
    status,
    count(*) AS occurrences,
    min(reported_at) AS first_seen,
    max(reported_at) AS last_seen
FROM public.error_reports
GROUP BY error_type, category, severity, status
ORDER BY (count(*)) DESC;

-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================

-- Covering index for error_reports.player_id
CREATE INDEX IF NOT EXISTS idx_error_reports_player_id ON public.error_reports (player_id);

-- Covering index for game_sessions.user_id (referenced by edge functions)
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions (user_id);

-- Covering index for withdrawal_requests.player_id
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_player_id ON public.withdrawal_requests (player_id);

-- 3. HARDEN RLS POLICIES
-- ============================================

-- Players insertion policy - add simple check (optional, but prevents completely empty inserts)
-- DROP POLICY IF EXISTS "Anyone can insert players" ON players;
-- CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (display_name IS NOT NULL AND length(display_name) >= 3);

-- Withdrawal requests - ONLY authenticated users should insert if we have real auth, 
-- but since we use nicknames, we rely on the backend/edge function to handle it.
-- For now, we keep it but ensure SELECT is restricted.
DROP POLICY IF EXISTS "Players can view own withdrawals" ON withdrawal_requests;
CREATE POLICY "Players can view own withdrawals" ON withdrawal_requests FOR SELECT 
USING (player_id IN (SELECT id FROM players WHERE display_name = current_setting('request.jwt.claims', true)::json->>'nickname') OR auth.uid() IN (SELECT id FROM players WHERE id = player_id));

-- (Note: The above policy assumes we might use JWT claims for nicknames later. 
-- For MVP, standard SELECT USING(true) was being used which is dangerous.)

-- Let's stick to simple hardening that doesn't break current anonymous flow:
ALTER VIEW public.leaderboard OWNER TO postgres;
ALTER VIEW public.audit_player_stats_drift OWNER TO postgres;
ALTER VIEW public.error_summary OWNER TO postgres;

GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT SELECT ON public.error_summary TO authenticated, service_role;
