-- ============================================
-- MIGRATION 030: MASTER SCHEMA ALIGNMENT
-- Date: 2026-01-24
-- Purpose: 
-- 1. Enforce DATABASE_GUIDELINES.md across all tables.
-- 2. Consolidate fragmented naming (user_id -> player_id).
-- 3. Standardize timestamp consistency.
-- 4. Unified security grants.
-- ============================================

-- 1. UTILITIES (Re-ensure core functions)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TABLE STANDARDIZATION HELPER (Dynamic SQL to fix common columns)
-- This ensures every table in 'public' schema has created_at/updated_at
-- ============================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name NOT IN ('schema_migrations', 'price_logs')) 
    LOOP
        -- Add created_at if missing
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);
        
        -- Add updated_at if missing
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()', r.table_name);
        
        -- Add trigger
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', r.table_name, r.table_name);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', r.table_name, r.table_name);
    END LOOP;
END $$;

-- 3. ALIGNING PLAYER REFERENCES (Consolidation)
-- ============================================

-- game_sessions: user_id is legacy, player_id is the standard.
-- We ensure player_id is never NULL if user_id exists.
UPDATE public.game_sessions SET player_id = user_id WHERE player_id IS NULL AND user_id IS NOT NULL;
COMMENT ON COLUMN public.game_sessions.user_id IS 'DEPRECATED: Use player_id. Kept for old Edge Function compatibility.';

-- error_reports: ensure consistency
UPDATE public.error_reports SET player_id = player_id; -- No-op to trigger potential metadata checks

-- 4. MASTER VIEW LAYER (v_ prefix)
-- ============================================

-- Unified Game Sessions View (The "Clean" data source)
CREATE OR REPLACE VIEW public.v_game_sessions AS
SELECT 
    id,
    session_id,
    player_id,
    crypto_pair,
    position_chosen as position,
    leverage,
    entry_price,
    exit_price,
    pnl_percent as pnl,
    max_level,
    total_kills as kills,
    survival_time_ms,
    is_verified,
    reward_amount as reward,
    created_at
FROM public.game_sessions;

-- Unified Players View
CREATE OR REPLACE VIEW public.v_players AS
SELECT 
    id,
    display_name as nickname,
    auth_id,
    identity_hash,
    total_sessions,
    total_kills,
    high_score,
    is_banned,
    created_at,
    last_seen_at
FROM public.players;

-- 5. SECURITY HARDENING (Uniform Grants)
-- ============================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') 
    LOOP
        EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', r.table_name);
    END LOOP;
END $$;

-- Specifically restrict sensitive tables
REVOKE ALL ON public.player_wallets FROM anon;
GRANT SELECT ON public.player_wallets TO authenticated;

-- 6. INDEX SQUASH (Ensure critical indexes exist)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_standard_lookup ON public.game_sessions(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_standard_lookup ON public.players(display_name);
CREATE INDEX IF NOT EXISTS idx_transactions_standard_lookup ON public.coin_transactions(player_id, created_at DESC);

-- DONE! Total Alignment Reached.
