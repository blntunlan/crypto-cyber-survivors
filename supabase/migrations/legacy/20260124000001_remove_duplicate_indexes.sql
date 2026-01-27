-- ============================================
-- MIGRATION: REMOVE DUPLICATE INDEXES
-- Date: 2026-01-24
-- Purpose: Resolve "Duplicate Index" performance warnings from database linter.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index
-- ============================================

-- 1. Table: coin_transactions
-- Identical indexes: idx_coin_transactions_player and idx_transactions_standard_lookup
-- Keeping idx_transactions_standard_lookup as it follows the Migration 030 standards.
DROP INDEX IF EXISTS public.idx_coin_transactions_player;

-- 2. Table: verification_failures
-- Identical indexes: idx_verification_failures_session and idx_verification_failures_session_id
-- Keeping idx_verification_failures_session as it was the original descriptive index.
DROP INDEX IF EXISTS public.idx_verification_failures_session_id;
