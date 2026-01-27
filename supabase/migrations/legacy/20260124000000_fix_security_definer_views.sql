-- ============================================
-- MIGRATION: FIX SECURITY DEFINER VIEWS
-- Date: 2026-01-24
-- Purpose: Fix "Security Definer View" linter errors by setting security_invoker = true
-- This ensures views enforce RLS policies of the invoking user, not the creator.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ============================================

-- 1. Analytics & Audit Views
ALTER VIEW public.vw_audit_player_stats_drift SET (security_invoker = true);
ALTER VIEW public.vw_audit_pnl_discrepancies SET (security_invoker = true);
ALTER VIEW public.vw_audit_fingerprint_collisions SET (security_invoker = true);

-- 2. System & Error Views
ALTER VIEW public.v_db_standards_violations SET (security_invoker = true);
ALTER VIEW public.v_error_summary SET (security_invoker = true);
ALTER VIEW public.v_analytics_top_errors SET (security_invoker = true);

-- 3. Gameplay Views
ALTER VIEW public.v_leaderboard SET (security_invoker = true);
ALTER VIEW public.v_replay_verification_stats SET (security_invoker = true);
ALTER VIEW public.v_game_sessions SET (security_invoker = true);
ALTER VIEW public.v_analytics_sessions SET (security_invoker = true);
ALTER VIEW public.v_players SET (security_invoker = true);
ALTER VIEW public.v_cheat_summary SET (security_invoker = true);
ALTER VIEW public.v_analytics_performance_by_device SET (security_invoker = true);
