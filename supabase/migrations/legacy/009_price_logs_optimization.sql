-- ============================================
-- MIGRATION 009: PRICE LOGS INDEX OPTIMIZATION
-- Date: 2026-01-12
-- Purpose: Ensure efficient cleanup and lookup for price logs
-- ============================================

-- 1. Create indexes for price_logs if they don't exist
-- This ensures the DELETE operation in CleanupCron is fast and doesn't time out
CREATE INDEX IF NOT EXISTS idx_price_logs_timestamp_desc ON price_logs (timestamp DESC);

-- This ensures the lookup for verification (pair + timestamp) is efficient
CREATE INDEX IF NOT EXISTS idx_price_logs_pair_timestamp ON price_logs (pair, timestamp DESC);

-- 2. Add comment for clarity
COMMENT ON TABLE price_logs IS 'Real-time price logs from Binance/Coinbase for session verification. Optimized for 24h retention.';
