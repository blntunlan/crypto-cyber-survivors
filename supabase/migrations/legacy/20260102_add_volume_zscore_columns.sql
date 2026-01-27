-- Migration: Add z-score based volume metrics to market_state
-- Run this in Supabase SQL Editor

-- Add new columns for z-score based whale detection
ALTER TABLE market_state 
ADD COLUMN IF NOT EXISTS volume_z_score DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS volume_mean DECIMAL(20, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS volume_std_dev DECIMAL(20, 4) DEFAULT 0;

-- Add index for whale tier queries (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_market_state_whale_tier 
ON market_state(whale_tier) WHERE whale_tier > 0;

-- Comment on new columns
COMMENT ON COLUMN market_state.volume_z_score IS 'Volume z-score (std devs from mean). 1.5+ = BABY_WHALE, 2.0+ = WHALE, 2.5+ = MEGA_WHALE';
COMMENT ON COLUMN market_state.volume_mean IS 'Rolling mean volume over 5 minute window';
COMMENT ON COLUMN market_state.volume_std_dev IS 'Rolling standard deviation of volume';

-- Verify changes
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'market_state' 
ORDER BY ordinal_position;
