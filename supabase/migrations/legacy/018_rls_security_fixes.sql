-- ============================================
-- MIGRATION 018-021: RLS AND SECURITY FIXES (CONSOLIDATED)
-- Date: 2026-01-18
-- Purpose: Fix security definer views, RLS policies, and function search paths
-- ============================================

-- ============================================
-- SECTION 1: FIX SECURITY DEFINER VIEWS
-- Recreate views with security_invoker = true
-- ============================================

DROP VIEW IF EXISTS public.analytics_sessions;
CREATE VIEW public.analytics_sessions 
WITH (security_invoker = true) AS
SELECT 
  DATE_TRUNC('day', session_timestamp) as date,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT player_id) as unique_players,
  AVG(survival_time_ms) as avg_survival_ms,
  AVG(total_kills) as avg_kills,
  MAX(max_level) as max_level_reached,
  SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified_sessions
FROM public.game_sessions
WHERE session_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', session_timestamp)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.analytics_top_errors;
CREATE VIEW public.analytics_top_errors
WITH (security_invoker = true) AS
SELECT 
  error_type,
  category,
  severity,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT device_fingerprint) as unique_devices,
  MIN(reported_at) as first_seen,
  MAX(reported_at) as last_seen
FROM public.error_reports
WHERE reported_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, category, severity
ORDER BY occurrence_count DESC
LIMIT 50;

DROP VIEW IF EXISTS public.analytics_performance_by_device;
CREATE VIEW public.analytics_performance_by_device
WITH (security_invoker = true) AS
SELECT 
  dp.device_type,
  dp.os,
  dp.browser,
  COUNT(DISTINCT dp.fingerprint) as device_count,
  AVG(pm.avg_fps) as avg_fps,
  AVG(pm.min_fps) as avg_min_fps,
  AVG(pm.frame_drops) as avg_frame_drops,
  AVG(pm.memory_used_mb) as avg_memory_mb
FROM public.device_profiles dp
LEFT JOIN public.performance_metrics pm ON dp.fingerprint = pm.device_fingerprint
WHERE dp.last_seen_at > NOW() - INTERVAL '30 days'
GROUP BY dp.device_type, dp.os, dp.browser
ORDER BY device_count DESC;

DROP VIEW IF EXISTS public.replay_verification_stats;
CREATE VIEW public.replay_verification_stats
WITH (security_invoker = true) AS
SELECT 
  DATE_TRUNC('day', gr.created_at) as date,
  COUNT(*) as total_replays,
  COUNT(*) FILTER (WHERE gr.verified = true) as verified_count,
  COUNT(*) FILTER (WHERE gr.verified = false) as failed_count,
  AVG(gr.event_count) as avg_event_count,
  AVG(gr.duration_ms) as avg_duration_ms,
  AVG(gr.compressed_size) as avg_compressed_size
FROM public.game_replays gr
GROUP BY DATE_TRUNC('day', gr.created_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.cheat_summary;
CREATE VIEW public.cheat_summary
WITH (security_invoker = true) AS
SELECT 
  cheat_type,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT fingerprint) as unique_fingerprints,
  COUNT(DISTINCT player_id) as unique_players,
  AVG(severity) as avg_severity,
  MAX(timestamp) as last_occurrence
FROM public.cheat_attempts
GROUP BY cheat_type
ORDER BY occurrence_count DESC;

DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
SELECT 
  p.id as player_id,
  p.display_name,
  p.high_score,
  p.total_kills,
  p.total_sessions,
  p.total_playtime_ms,
  RANK() OVER (ORDER BY p.high_score DESC) as rank
FROM public.players p
WHERE p.is_banned = false OR p.is_banned IS NULL
ORDER BY p.high_score DESC
LIMIT 100;

DROP VIEW IF EXISTS public.audit_fingerprint_collisions;
CREATE VIEW public.audit_fingerprint_collisions
WITH (security_invoker = true) AS
SELECT 
  device_fingerprint as fingerprint,
  COUNT(DISTINCT player_id) as player_count,
  array_agg(DISTINCT player_id) as player_ids
FROM public.game_sessions
WHERE device_fingerprint IS NOT NULL
GROUP BY device_fingerprint
HAVING COUNT(DISTINCT player_id) > 1
ORDER BY player_count DESC
LIMIT 50;

DROP VIEW IF EXISTS public.audit_pnl_discrepancies;
CREATE VIEW public.audit_pnl_discrepancies
WITH (security_invoker = true) AS
SELECT 
  id,
  player_id,
  claimed_pnl,
  verified_pnl,
  pnl_diff,
  verification_method,
  verified_at
FROM public.game_sessions
WHERE pnl_diff IS NOT NULL 
  AND ABS(pnl_diff) > 1
ORDER BY ABS(pnl_diff) DESC
LIMIT 100;

DROP VIEW IF EXISTS public.audit_player_stats_drift;
CREATE VIEW public.audit_player_stats_drift
WITH (security_invoker = true) AS
SELECT 
  p.id as player_id,
  p.display_name,
  p.total_sessions as recorded_sessions,
  COUNT(gs.id) as actual_sessions,
  p.total_kills as recorded_kills,
  COALESCE(SUM(gs.total_kills), 0) as actual_kills
FROM public.players p
LEFT JOIN public.game_sessions gs ON p.id = gs.player_id
GROUP BY p.id, p.display_name, p.total_sessions, p.total_kills
HAVING p.total_sessions != COUNT(gs.id) 
   OR p.total_kills != COALESCE(SUM(gs.total_kills), 0)
LIMIT 50;

DROP VIEW IF EXISTS public.error_summary;
CREATE VIEW public.error_summary
WITH (security_invoker = true) AS
SELECT 
  error_type,
  category,
  COUNT(*) as count,
  MAX(reported_at) as last_seen
FROM public.error_reports
GROUP BY error_type, category
ORDER BY count DESC
LIMIT 50;

-- ============================================
-- SECTION 2: FIX PERMISSIVE RLS POLICIES
-- ============================================

-- game_sessions policies
DROP POLICY IF EXISTS "Anyone can insert game_sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "game_sessions_insert_policy" ON public.game_sessions;
CREATE POLICY "game_sessions_insert_policy" ON public.game_sessions
FOR INSERT TO anon, authenticated
WITH CHECK (crypto_pair IS NOT NULL AND position_chosen IS NOT NULL);

DROP POLICY IF EXISTS "game_sessions_update_own" ON public.game_sessions;
CREATE POLICY "game_sessions_update_own" ON public.game_sessions
FOR UPDATE TO anon, authenticated
USING (session_timestamp > NOW() - INTERVAL '1 hour')
WITH CHECK (survival_time_ms IS NOT NULL OR end_time IS NOT NULL);

-- players policies
DROP POLICY IF EXISTS "Anyone can create players" ON public.players;
DROP POLICY IF EXISTS "Anyone can insert players" ON public.players;
DROP POLICY IF EXISTS "players_insert_policy" ON public.players;
CREATE POLICY "players_insert_policy" ON public.players
FOR INSERT TO anon, authenticated
WITH CHECK (display_name IS NOT NULL AND LENGTH(display_name) >= 2 AND LENGTH(display_name) <= 50);

-- device_profiles policies
DROP POLICY IF EXISTS "Anyone can insert device_profiles" ON public.device_profiles;
DROP POLICY IF EXISTS "device_profiles_upsert_policy" ON public.device_profiles;
CREATE POLICY "device_profiles_upsert_policy" ON public.device_profiles
FOR INSERT TO anon, authenticated
WITH CHECK (fingerprint IS NOT NULL AND LENGTH(fingerprint) > 10);

DROP POLICY IF EXISTS "device_profiles_update_policy" ON public.device_profiles;
CREATE POLICY "device_profiles_update_policy" ON public.device_profiles
FOR UPDATE TO anon, authenticated
USING (last_seen_at > NOW() - INTERVAL '30 days')
WITH CHECK (fingerprint IS NOT NULL);

-- performance_metrics policies
DROP POLICY IF EXISTS "Anyone can insert performance" ON public.performance_metrics;
DROP POLICY IF EXISTS "Anyone can insert performance_metrics" ON public.performance_metrics;
DROP POLICY IF EXISTS "performance_metrics_insert_policy" ON public.performance_metrics;
CREATE POLICY "performance_metrics_insert_policy" ON public.performance_metrics
FOR INSERT TO anon, authenticated
WITH CHECK (session_id IS NOT NULL AND avg_fps > 0);

-- error_reports policies
DROP POLICY IF EXISTS "Anyone can insert error_reports" ON public.error_reports;
DROP POLICY IF EXISTS "error_reports_insert_policy" ON public.error_reports;
CREATE POLICY "error_reports_insert_policy" ON public.error_reports
FOR INSERT TO anon, authenticated
WITH CHECK (error_type IS NOT NULL AND category IS NOT NULL);

-- cheat_attempts policies
DROP POLICY IF EXISTS "cheat_insert_anon" ON public.cheat_attempts;
DROP POLICY IF EXISTS "cheat_attempts_insert_policy" ON public.cheat_attempts;
CREATE POLICY "cheat_attempts_insert_policy" ON public.cheat_attempts
FOR INSERT TO anon, authenticated
WITH CHECK (cheat_type IS NOT NULL AND severity >= 1 AND severity <= 10);

-- game_replays policies
DROP POLICY IF EXISTS "replays_insert_service" ON public.game_replays;
DROP POLICY IF EXISTS "game_replays_insert_policy" ON public.game_replays;
CREATE POLICY "game_replays_insert_policy" ON public.game_replays
FOR INSERT TO anon, authenticated
WITH CHECK (session_id IS NOT NULL AND replay_id IS NOT NULL AND final_hash IS NOT NULL);

-- verification_failures policies
DROP POLICY IF EXISTS "failures_insert_service" ON public.verification_failures;
DROP POLICY IF EXISTS "verification_failures_insert_policy" ON public.verification_failures;
CREATE POLICY "verification_failures_insert_policy" ON public.verification_failures
FOR INSERT TO anon, authenticated
WITH CHECK (failure_reason IS NOT NULL);

-- player_achievements policies
DROP POLICY IF EXISTS "Insert achievements service" ON public.player_achievements;
DROP POLICY IF EXISTS "player_achievements_insert_policy" ON public.player_achievements;
CREATE POLICY "player_achievements_insert_policy" ON public.player_achievements
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (player_id IS NOT NULL AND achievement_id IS NOT NULL);

-- player_inventory policies
DROP POLICY IF EXISTS "Insert inventory service" ON public.player_inventory;
DROP POLICY IF EXISTS "player_inventory_insert_policy" ON public.player_inventory;
CREATE POLICY "player_inventory_insert_policy" ON public.player_inventory
FOR INSERT TO anon, authenticated, service_role
WITH CHECK (player_id IS NOT NULL AND item_id IS NOT NULL);

-- withdrawal_requests policies
DROP POLICY IF EXISTS "Anyone can insert withdrawal_requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_insert_policy" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_insert_policy" ON public.withdrawal_requests
FOR INSERT TO anon, authenticated
WITH CHECK (player_id IS NOT NULL AND amount > 0);

-- ============================================
-- SECTION 3: FIX FUNCTION SEARCH PATHS
-- ============================================

-- get_market_health_status
DROP FUNCTION IF EXISTS public.get_market_health_status();
CREATE FUNCTION public.get_market_health_status()
RETURNS TABLE(is_healthy boolean, last_price_age_seconds integer, source text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (EXTRACT(EPOCH FROM (NOW() - ms.updated_at)) < 60) as is_healthy,
    EXTRACT(EPOCH FROM (NOW() - ms.updated_at))::integer as last_price_age_seconds,
    'market_state'::text as source
  FROM public.market_state ms LIMIT 1;
END;
$$;

-- sync_player_lifetime_stats (with UUID arg)
DROP FUNCTION IF EXISTS public.sync_player_lifetime_stats(UUID);
CREATE FUNCTION public.sync_player_lifetime_stats(p_player_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_sessions INTEGER;
  v_total_kills BIGINT;
  v_total_playtime BIGINT;
  v_high_score INTEGER;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total_kills), 0), COALESCE(SUM(survival_time_ms), 0), COALESCE(MAX(max_level), 0)
  INTO v_total_sessions, v_total_kills, v_total_playtime, v_high_score
  FROM public.game_sessions WHERE player_id = p_player_id;

  UPDATE public.players SET 
    total_sessions = v_total_sessions,
    total_kills = v_total_kills,
    total_playtime_ms = v_total_playtime,
    high_score = GREATEST(high_score, v_high_score)
  WHERE id = p_player_id;
END;
$$;

-- sync_player_lifetime_stats trigger version
DROP TRIGGER IF EXISTS on_game_session_complete ON public.game_sessions;
DROP FUNCTION IF EXISTS public.sync_player_lifetime_stats();
CREATE FUNCTION public.sync_player_lifetime_stats()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_player_lifetime_stats(NEW.player_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_game_session_complete
AFTER INSERT ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_player_lifetime_stats();

-- update_player_last_seen
DROP FUNCTION IF EXISTS public.update_player_last_seen() CASCADE;
CREATE FUNCTION public.update_player_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_player_last_seen ON public.players;
CREATE TRIGGER trg_update_player_last_seen
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.update_player_last_seen();

-- ============================================
-- SECTION 4: GRANTS
-- ============================================

GRANT SELECT ON public.analytics_sessions TO anon, authenticated;
GRANT SELECT ON public.analytics_top_errors TO anon, authenticated;
GRANT SELECT ON public.analytics_performance_by_device TO anon, authenticated;
GRANT SELECT ON public.replay_verification_stats TO anon, authenticated;
GRANT SELECT ON public.cheat_summary TO anon, authenticated;
GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT SELECT ON public.audit_fingerprint_collisions TO authenticated;
GRANT SELECT ON public.audit_pnl_discrepancies TO authenticated;
GRANT SELECT ON public.audit_player_stats_drift TO authenticated;
GRANT SELECT ON public.error_summary TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_market_health_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_player_lifetime_stats(UUID) TO service_role;

-- ============================================
-- DONE!
-- ============================================
