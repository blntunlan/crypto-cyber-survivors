-- Migration: Add missing indices for foreign keys to optimize performance
-- Based on Supabase Performance Advisor recommendations

-- 1. player_achievements table
CREATE INDEX IF NOT EXISTS idx_player_achievements_achievement_id ON public.player_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_session_id ON public.player_achievements(session_id);

-- 2. player_inventory table
CREATE INDEX IF NOT EXISTS idx_player_inventory_item_id ON public.player_inventory(item_id);

-- 3. verification_failures table
CREATE INDEX IF NOT EXISTS idx_verification_failures_session_id ON public.verification_failures(session_id);

-- 4. Cleanup unused indices (optional but recommended for storage)
-- advisor marked idx_market_state_whale_tier as unused, but since we are in early stages, 
-- we will keep them for now until we have more production data.

COMMIT;
