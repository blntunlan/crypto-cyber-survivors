-- 1. Weekly Leaderboard View
-- Resets every Monday at 00:00 UTC
CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT 
  p.id as player_id,
  p.display_name,
  MAX(gs.survival_time_ms) as high_score,
  SUM(gs.total_kills) as total_kills,
  COUNT(gs.id) as total_sessions,
  p.avatar_url,
  RANK() OVER (ORDER BY MAX(gs.survival_time_ms) DESC) as rank
FROM public.players p
JOIN public.game_sessions gs ON p.id = gs.player_id
WHERE 
  gs.session_timestamp >= date_trunc('week', now())
  AND p.is_banned = false
  AND (p.is_shadow_banned = false OR p.is_shadow_banned IS NULL)
  AND gs.is_verified = true -- Critical: Only verified scores count
GROUP BY p.id, p.display_name, p.avatar_url
ORDER BY high_score DESC
LIMIT 100;

-- 2. Daily Leaderboard View (Optional but good for engagement)
-- Resets every day at 00:00 UTC
CREATE OR REPLACE VIEW public.daily_leaderboard AS
SELECT 
  p.id as player_id,
  p.display_name,
  MAX(gs.survival_time_ms) as high_score,
  SUM(gs.total_kills) as total_kills,
  COUNT(gs.id) as total_sessions,
  p.avatar_url,
  RANK() OVER (ORDER BY MAX(gs.survival_time_ms) DESC) as rank
FROM public.players p
JOIN public.game_sessions gs ON p.id = gs.player_id
WHERE 
  gs.session_timestamp >= date_trunc('day', now())
  AND p.is_banned = false
  AND (p.is_shadow_banned = false OR p.is_shadow_banned IS NULL)
  AND gs.is_verified = true
GROUP BY p.id, p.display_name, p.avatar_url
ORDER BY high_score DESC
LIMIT 100;

COMMENT ON VIEW public.weekly_leaderboard IS 'Top players of the current week (Verified sessions only)';
COMMENT ON VIEW public.daily_leaderboard IS 'Top players of the current day (Verified sessions only)';
