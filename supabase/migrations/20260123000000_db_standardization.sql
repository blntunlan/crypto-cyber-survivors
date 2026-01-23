-- ============================================
-- MIGRATION 028: DATABASE STANDARDIZATION
-- Date: 2026-01-23
-- Purpose: 
-- 1. Implement SKILL.md standards (Naming, Atomic Timestamps)
-- 2. Add missing updated_at columns
-- 3. Standardize view naming with v_ prefix
-- 4. Clean up duplicate logic (user_id alias)
-- ============================================

-- 1. UTILITIES
-- ============================================

-- Generalized updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATOMIC TIMESTAMPS (Update existing tables)
-- ============================================

-- Players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Game Sessions
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- session_timestamp already exists, sync it to created_at
UPDATE public.game_sessions SET created_at = session_timestamp WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_game_sessions_updated_at ON public.game_sessions;
CREATE TRIGGER trg_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Device Profiles
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.device_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.device_profiles SET created_at = first_seen_at WHERE created_at IS NULL;
UPDATE public.device_profiles SET updated_at = last_seen_at WHERE updated_at IS NULL;
DROP TRIGGER IF EXISTS trg_device_profiles_updated_at ON public.device_profiles;
CREATE TRIGGER trg_device_profiles_updated_at BEFORE UPDATE ON public.device_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Performance Metrics
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.performance_metrics SET created_at = recorded_at WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_performance_metrics_updated_at ON public.performance_metrics;
CREATE TRIGGER trg_performance_metrics_updated_at BEFORE UPDATE ON public.performance_metrics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Error Reports
ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.error_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.error_reports SET created_at = reported_at WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_error_reports_updated_at ON public.error_reports;
CREATE TRIGGER trg_error_reports_updated_at BEFORE UPDATE ON public.error_reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Coin Transactions
ALTER TABLE public.coin_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_coin_transactions_updated_at ON public.coin_transactions;
CREATE TRIGGER trg_coin_transactions_updated_at BEFORE UPDATE ON public.coin_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Withdrawal Requests
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.withdrawal_requests SET created_at = requested_at WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Achievements
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_achievements_updated_at ON public.achievements;
CREATE TRIGGER trg_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Player Achievements
ALTER TABLE public.player_achievements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.player_achievements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.player_achievements SET created_at = unlocked_at WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_player_achievements_updated_at ON public.player_achievements;
CREATE TRIGGER trg_player_achievements_updated_at BEFORE UPDATE ON public.player_achievements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Shop Items
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_shop_items_updated_at ON public.shop_items;
CREATE TRIGGER trg_shop_items_updated_at BEFORE UPDATE ON public.shop_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Player Inventory
ALTER TABLE public.player_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.player_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.player_inventory SET created_at = purchased_at WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_player_inventory_updated_at ON public.player_inventory;
CREATE TRIGGER trg_player_inventory_updated_at BEFORE UPDATE ON public.player_inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Cheat Attempts
ALTER TABLE public.cheat_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.cheat_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE public.cheat_attempts SET created_at = timestamp WHERE created_at IS NULL;
DROP TRIGGER IF EXISTS trg_cheat_attempts_updated_at ON public.cheat_attempts;
CREATE TRIGGER trg_cheat_attempts_updated_at BEFORE UPDATE ON public.cheat_attempts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Game Replays
ALTER TABLE public.game_replays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_game_replays_updated_at ON public.game_replays;
CREATE TRIGGER trg_game_replays_updated_at BEFORE UPDATE ON public.game_replays FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Verification Failures
ALTER TABLE public.verification_failures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_verification_failures_updated_at ON public.verification_failures;
CREATE TRIGGER trg_verification_failures_updated_at BEFORE UPDATE ON public.verification_failures FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. VIEW STANDARDIZATION (Naming with v_ prefix)
-- ============================================

-- Leaderboard
CREATE OR REPLACE VIEW public.v_leaderboard AS SELECT * FROM public.leaderboard;

-- Analytics Sessions
CREATE OR REPLACE VIEW public.v_analytics_sessions AS SELECT * FROM public.analytics_sessions;

-- Analytics Top Errors
CREATE OR REPLACE VIEW public.v_analytics_top_errors AS SELECT * FROM public.analytics_top_errors;

-- Analytics Performance
CREATE OR REPLACE VIEW public.v_analytics_performance_by_device AS SELECT * FROM public.analytics_performance_by_device;

-- Replay Verification Stats
CREATE OR REPLACE VIEW public.v_replay_verification_stats AS SELECT * FROM public.replay_verification_stats;

-- Cheat Summary
CREATE OR REPLACE VIEW public.v_cheat_summary AS SELECT * FROM public.cheat_summary;

-- Error Summary
CREATE OR REPLACE VIEW public.v_error_summary AS SELECT * FROM public.error_summary;

-- Audit Views
CREATE OR REPLACE VIEW public.vw_audit_pnl_discrepancies AS SELECT * FROM public.audit_pnl_discrepancies;
CREATE OR REPLACE VIEW public.vw_audit_player_stats_drift AS SELECT * FROM public.audit_player_stats_drift;
CREATE OR REPLACE VIEW public.vw_audit_fingerprint_collisions AS SELECT * FROM public.audit_fingerprint_collisions;

-- 4. CLEANUP DUPLICATE LOGIC
-- ============================================

-- user_id in game_sessions is an alias for player_id. 
-- We will keep it for now but mark it for removal by creating a cleaner view.
-- Once the Edge Function is updated, we can drop the column.
COMMENT ON COLUMN public.game_sessions.user_id IS 'DEPRECATED: Use player_id instead. Keep for legacy Edge Function compatibility.';

-- 5. GRANTS FOR NEW VIEWS
-- ============================================
GRANT SELECT ON public.v_leaderboard TO anon, authenticated;
GRANT SELECT ON public.v_analytics_sessions TO anon, authenticated;
GRANT SELECT ON public.v_analytics_top_errors TO anon, authenticated;
GRANT SELECT ON public.v_analytics_performance_by_device TO anon, authenticated;
GRANT SELECT ON public.v_replay_verification_stats TO anon, authenticated;
GRANT SELECT ON public.v_cheat_summary TO anon, authenticated;
GRANT SELECT ON public.v_error_summary TO anon, authenticated;

-- DONE!
