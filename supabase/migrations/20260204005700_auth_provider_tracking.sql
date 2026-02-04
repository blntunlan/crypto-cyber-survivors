-- Migration: Add auth provider fields to players table
-- This migration adds columns to track authentication provider and verification status

-- Add auth provider column
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'anonymous';

-- Add is_verified column (true for OAuth/Phantom users, false for anonymous)
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Add auth_user_id to link with Supabase Auth
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Add avatar_url for OAuth profile pictures
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add email from OAuth providers
ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;

-- Add last_login_at for session tracking
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();

-- Add total games played counter
ALTER TABLE players ADD COLUMN IF NOT EXISTS total_games_played INTEGER DEFAULT 0;

-- Add high score field
ALTER TABLE players ADD COLUMN IF NOT EXISTS high_score INTEGER DEFAULT 0;

-- Add is_banned field for moderation
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Create index on auth_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_auth_user_id ON players(auth_user_id);

-- Create index on auth_provider for analytics
CREATE INDEX IF NOT EXISTS idx_players_auth_provider ON players(auth_provider);

-- Create unique constraint on auth_user_id (one profile per auth user)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'players_auth_user_id_unique'
    ) THEN
        ALTER TABLE players ADD CONSTRAINT players_auth_user_id_unique UNIQUE (auth_user_id);
    END IF;
END $$;

-- Update existing players to have auth_provider set
UPDATE players SET auth_provider = 'anonymous' WHERE auth_provider IS NULL;
UPDATE players SET is_verified = (wallet_address IS NOT NULL) WHERE is_verified IS NULL;

-- Add RLS policies for authenticated users
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Users can view all player nicknames (for leaderboard)
CREATE POLICY IF NOT EXISTS "Public read access for player nicknames"
ON players FOR SELECT
USING (true);

-- Users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON players;
CREATE POLICY "Users can update own profile"
ON players FOR UPDATE
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- Users can only insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON players;
CREATE POLICY "Users can insert own profile"
ON players FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Comment on columns for documentation
COMMENT ON COLUMN players.auth_provider IS 'OAuth provider: google, twitter, discord, github, phantom, email, or anonymous';
COMMENT ON COLUMN players.is_verified IS 'True if authenticated via OAuth/Phantom, false for anonymous/dev login';
COMMENT ON COLUMN players.auth_user_id IS 'Links to Supabase Auth user';
COMMENT ON COLUMN players.is_banned IS 'If true, user is banned from playing';
