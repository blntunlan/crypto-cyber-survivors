-- Fix for duplicate indexes on verification_failures
-- The table has both idx_verification_failures_session and idx_verification_failures_session_id
-- We keep idx_verification_failures_session as it matches our definition in 016_replay_verification.sql

DROP INDEX IF EXISTS idx_verification_failures_session_id;
