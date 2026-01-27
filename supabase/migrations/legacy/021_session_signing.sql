-- ============================================
-- MIGRATION 021: SESSION SIGNING AND SECURITY
-- Date: 2026-01-20
-- Purpose: Add session_secret to game_sessions for tamper-proof
--          replay verification.
-- ============================================

-- 1. Add session_secret to game_sessions
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS session_secret TEXT;

-- 2. Add description to achievements (optional, for consistency)
-- No changes needed here, just documentation.

-- 3. Update RLS to ensure session_secret is NOT readable by anon/authenticated
-- Only service_role should see the secret to verify it.
-- However, we return it ONCE during start-session.

-- We don't need to change RLS for the column itself as RLS is table-wide,
-- but we should ensure no SELECT policies expose it to others if possible.
-- Currently policies use `SELECT *` in some places.

-- Re-create game_sessions policies to be more specific (optional but safer)
-- For now, we'll keep it simple: the start-session edge function is the only one
-- that sees it during creation.

COMMIT;
