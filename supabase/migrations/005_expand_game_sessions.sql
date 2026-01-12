-- Migration 005: Expand game_sessions for verification data
-- Date: 2026-01-12
-- Aligning schema with verify-game edge function requirements

ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS claimed_entry_price NUMERIC,
ADD COLUMN IF NOT EXISTS claimed_exit_price NUMERIC,
ADD COLUMN IF NOT EXISTS claimed_pnl NUMERIC,
ADD COLUMN IF NOT EXISTS verified_entry_price NUMERIC,
ADD COLUMN IF NOT EXISTS verified_exit_price NUMERIC,
ADD COLUMN IF NOT EXISTS verified_pnl NUMERIC,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_error TEXT,
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS survival_seconds INTEGER,
ADD COLUMN IF NOT EXISTS gold_collected INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_diff_entry NUMERIC,
ADD COLUMN IF NOT EXISTS price_diff_exit NUMERIC,
ADD COLUMN IF NOT EXISTS pnl_diff NUMERIC,
ADD COLUMN IF NOT EXISTS time_diff_ms INTEGER,
ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- Rename user_id to player_id if needed (verify-game uses user_id)
-- However, our schema uses player_id. We should update verify-game to use player_id or keep both.
-- Let's add user_id alias for compatibility with existing edge function logic
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES players(id);

COMMENT ON TABLE game_sessions IS 'Stores game session results with verification metadata';
