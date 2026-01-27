-- ============================================
-- MIGRATION 016: REPLAY VERIFICATION SYSTEM
-- Date: 2026-01-16
-- Purpose: Add tables for game replay storage and verification
-- ============================================

-- 1. Game Replays Table - Stores metadata about verified replays
CREATE TABLE IF NOT EXISTS game_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    replay_id TEXT NOT NULL UNIQUE,
    event_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    final_hash TEXT NOT NULL,
    compressed_size INTEGER NOT NULL DEFAULT 0,
    game_version TEXT NOT NULL DEFAULT '1.0.0',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_event_count CHECK (event_count >= 0),
    CONSTRAINT valid_duration CHECK (duration_ms >= 0)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_game_replays_session_id ON game_replays(session_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_replay_id ON game_replays(replay_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_verified ON game_replays(verified);
CREATE INDEX IF NOT EXISTS idx_game_replays_created_at ON game_replays(created_at DESC);

-- 2. Verification Failures Table - Logs failed verification attempts for analysis
CREATE TABLE IF NOT EXISTS verification_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(session_id) ON DELETE SET NULL,
    failure_reason TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for failure analysis
CREATE INDEX IF NOT EXISTS idx_verification_failures_session ON verification_failures(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_failures_reason ON verification_failures(failure_reason);
CREATE INDEX IF NOT EXISTS idx_verification_failures_created_at ON verification_failures(created_at DESC);

-- 3. Add replay_verified column to game_sessions if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_sessions' 
        AND column_name = 'replay_verified'
    ) THEN
        ALTER TABLE game_sessions ADD COLUMN replay_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'game_sessions' 
        AND column_name = 'replay_hash'
    ) THEN
        ALTER TABLE game_sessions ADD COLUMN replay_hash TEXT;
    END IF;
END $$;

-- 4. RLS Policies

-- Enable RLS
ALTER TABLE game_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_failures ENABLE ROW LEVEL SECURITY;

-- Game Replays: Read own replays, insert via service role only
CREATE POLICY "replays_select_own" ON game_replays
    FOR SELECT
    USING (
        session_id IN (
            SELECT session_id FROM game_sessions 
            WHERE player_id = auth.uid()
        )
    );

CREATE POLICY "replays_insert_service" ON game_replays
    FOR INSERT
    WITH CHECK (
        current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
    );

-- Verification Failures: Service role only
CREATE POLICY "failures_service_only" ON verification_failures
    FOR ALL
    USING (
        current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
    );

-- 5. Cheat Attempts Table (for AntiCheatService)
CREATE TABLE IF NOT EXISTS cheat_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    cheat_type TEXT NOT NULL,
    details TEXT,
    fingerprint TEXT,
    severity INTEGER DEFAULT 5,
    user_agent TEXT,
    ip_address TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed BOOLEAN DEFAULT false,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID
);

-- Indexes for cheat analysis
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_player ON cheat_attempts(player_id);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_type ON cheat_attempts(cheat_type);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_fingerprint ON cheat_attempts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_timestamp ON cheat_attempts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_severity ON cheat_attempts(severity DESC);

-- RLS for cheat_attempts
ALTER TABLE cheat_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cheat_insert_anon" ON cheat_attempts
    FOR INSERT
    WITH CHECK (true); -- Allow anonymous inserts for client-side detection

CREATE POLICY "cheat_select_service" ON cheat_attempts
    FOR SELECT
    USING (
        current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role'
    );

-- 6. Create view for replay verification stats
CREATE OR REPLACE VIEW replay_verification_stats AS
SELECT 
    DATE_TRUNC('day', gr.created_at) as date,
    COUNT(*) as total_replays,
    COUNT(*) FILTER (WHERE gr.verified = true) as verified_count,
    COUNT(*) FILTER (WHERE gr.verified = false) as failed_count,
    AVG(gr.event_count) as avg_event_count,
    AVG(gr.duration_ms) as avg_duration_ms,
    AVG(gr.compressed_size) as avg_compressed_size
FROM game_replays gr
GROUP BY DATE_TRUNC('day', gr.created_at)
ORDER BY date DESC;

-- 7. Create view for cheat detection summary
CREATE OR REPLACE VIEW cheat_summary AS
SELECT 
    cheat_type,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT fingerprint) as unique_fingerprints,
    COUNT(DISTINCT player_id) as unique_players,
    AVG(severity) as avg_severity,
    MAX(timestamp) as last_occurrence
FROM cheat_attempts
GROUP BY cheat_type
ORDER BY occurrence_count DESC;

-- 8. Add comment
COMMENT ON TABLE game_replays IS 'Stores metadata about verified game replays for anti-cheat purposes';
COMMENT ON TABLE verification_failures IS 'Logs failed replay verification attempts for security analysis';
COMMENT ON TABLE cheat_attempts IS 'Logs client-side cheat detection events from AntiCheatService';
