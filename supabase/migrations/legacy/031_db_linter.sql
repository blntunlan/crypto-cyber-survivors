-- ============================================
-- MIGRATION 031: DATABASE LINTER & CLEANUP
-- Date: 2026-01-26
-- Purpose: 
-- 1. Remove orphan tables (player_wallets).
-- 2. Enforce integer constraints on metrics.
-- 3. Standardize player references.
-- 4. Add debug views for easier tracing.
-- ============================================

-- 1. CLEANING ORPHAN TABLES
-- player_wallets is replaced by players.gold_balance + coin_transactions
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'player_wallets') THEN
        -- Backup balance if it wasn't migrated (Safety First)
        UPDATE public.players p
        SET gold_balance = w.confirmed_balance
        FROM public.player_wallets w
        WHERE p.id = w.player_id AND p.gold_balance = 0;
        
        DROP TABLE public.player_wallets CASCADE;
    END IF;
END $$;

-- 2. HARDENING CONSTRAINTS
-- Ensure survival time is never a float and never negative
ALTER TABLE public.game_sessions 
    ALTER COLUMN survival_time_ms TYPE BIGINT,
    ADD CONSTRAINT check_survival_time_positive CHECK (survival_time_ms >= 0);

-- Ensure kills are not floats
ALTER TABLE public.game_sessions 
    ALTER COLUMN total_kills TYPE INTEGER;

-- 3. ALIGNING PLAYER REFERENCES IN ERROR REPORTS
-- Ensure consistency in error tracking
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'error_reports' AND column_name = 'user_id') THEN
        ALTER TABLE public.error_reports RENAME COLUMN user_id TO player_id;
    END IF;
END $$;

-- 4. ENHANCED DEBUG VIEW
-- This view helps developers see exactly what happened in a session including rewards
CREATE OR REPLACE VIEW public.v_debug_session_audit AS
SELECT 
    s.session_id,
    p.display_name as nickname,
    s.crypto_pair,
    s.position_chosen,
    s.leverage,
    s.pnl_percent,
    s.reward_amount,
    s.is_verified,
    s.created_at as session_start,
    (SELECT count(*) FROM public.coin_transactions t WHERE t.reference_id = s.session_id::uuid) as tx_count
FROM public.game_sessions s
LEFT JOIN public.players p ON s.player_id = p.id;

-- 5. RE-GRANT PERMISSIONS
GRANT SELECT ON public.v_debug_session_audit TO authenticated;
GRANT SELECT ON public.v_debug_session_audit TO anon;

COMMENT ON VIEW public.v_debug_session_audit IS 'Audit view for developers to track session -> reward flow';