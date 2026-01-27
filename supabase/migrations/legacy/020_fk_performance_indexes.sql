-- ============================================
-- MIGRATION 020: FOREIGN KEY PERFORMANCE INDEXES
-- Date: 2026-01-20
-- Purpose: Add missing indexes for Foreign Keys to improve JOIN 
--          and filter performance as per Supabase Advisor.
-- ============================================

-- 1. game_sessions table
-- user_id is an alias for player_id used by some edge functions
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);

-- 2. error_reports table
-- player_id for filtering errors by user
CREATE INDEX IF NOT EXISTS idx_error_reports_player_id ON public.error_reports(player_id);

-- 3. coin_transactions table
-- reference_id links to game_sessions or shop_items
CREATE INDEX IF NOT EXISTS idx_coin_transactions_reference_id ON public.coin_transactions(reference_id);

-- 4. withdrawal_requests table
-- player_id for user withdrawal history
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_player_id ON public.withdrawal_requests(player_id);
-- admin_id for admin auditing
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_admin_id ON public.withdrawal_requests(admin_id);

-- 5. performance_metrics table
-- device_fingerprint for performance analysis by hardware
CREATE INDEX IF NOT EXISTS idx_performance_metrics_device_fingerprint ON public.performance_metrics(device_fingerprint);

-- 6. game_sessions metadata
-- crypto_pair lookup for pair-based analytics
CREATE INDEX IF NOT EXISTS idx_game_sessions_crypto_pair ON public.game_sessions(crypto_pair);

-- 7. Verification Results
-- is_verified combined with player_id for quick profile stats
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_verified ON public.game_sessions(player_id, is_verified);

COMMIT;
