BEGIN;

-- Leaderboard performance + correctness hardening
-- - Exclude profiles with no verified sessions from leaderboard view
-- - Add partial covering index for verified session aggregates
-- - Make RPC ordering deterministic and avoid SELECT * coupling

CREATE INDEX IF NOT EXISTS idx_sessions_verified_profile_leaderboard_cover
ON public.sessions (profile_id)
INCLUDE (reward_amount, survival_seconds, kills)
WHERE is_verified = TRUE AND profile_id IS NOT NULL;

CREATE OR REPLACE VIEW public.v_leaderboard
WITH (security_invoker = true)
AS
WITH verified_session_stats AS (
  SELECT
    s.profile_id,
    COALESCE(MAX(s.reward_amount), 0)::BIGINT AS high_score,
    COUNT(*)::INTEGER AS total_sessions,
    COALESCE(MAX(s.survival_seconds), 0)::INTEGER AS max_survival_time,
    COALESCE(SUM(s.kills), 0)::BIGINT AS total_kills
  FROM public.sessions s
  WHERE s.is_verified = TRUE
    AND s.profile_id IS NOT NULL
  GROUP BY s.profile_id
)
SELECT
  p.id AS profile_id,
  p.display_name,
  p.avatar_url,
  p.primary_auth_provider,
  vss.high_score,
  vss.total_sessions,
  vss.max_survival_time,
  vss.total_kills
FROM verified_session_stats vss
JOIN public.profiles p
  ON p.id = vss.profile_id
WHERE COALESCE(p.is_banned, FALSE) = FALSE;

DROP FUNCTION IF EXISTS public.get_leaderboard(INTEGER);

CREATE FUNCTION public.get_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  avatar_url TEXT,
  display_name TEXT,
  high_score BIGINT,
  max_survival_time INTEGER,
  profile_id UUID,
  total_kills BIGINT,
  total_sessions INTEGER
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    v.avatar_url,
    v.display_name,
    v.high_score,
    v.max_survival_time,
    v.profile_id,
    v.total_kills,
    v.total_sessions
  FROM public.v_leaderboard v
  ORDER BY
    v.high_score DESC,
    v.max_survival_time DESC,
    v.total_kills DESC,
    v.profile_id ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100);
$$;

GRANT SELECT ON public.v_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(INTEGER) TO anon, authenticated;

COMMIT;
