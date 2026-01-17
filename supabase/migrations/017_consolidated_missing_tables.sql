-- ============================================
-- MIGRATION 017: CONSOLIDATED MISSING TABLES & FUNCTIONS
-- Date: 2026-01-17
-- Purpose: Add all missing tables, columns, functions and views
--          that frontend code references but don't exist in DB
-- ============================================

-- ============================================
-- SECTION 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- 1.1 Add gold_balance to players (WalletService.ts needs this)
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS gold_balance INTEGER NOT NULL DEFAULT 0;

-- 1.2 Add replay verification columns to game_sessions
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS replay_verified BOOLEAN DEFAULT false;

ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS replay_hash TEXT;

-- 1.3 Add shadow_ban column for anti-cheat
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS is_shadow_banned BOOLEAN DEFAULT false;

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS shadow_ban_reason TEXT;

-- ============================================
-- SECTION 2: ACHIEVEMENTS SYSTEM
-- ============================================

-- 2.1 Achievements Table (Definitions)
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY, -- e.g. 'SURVIVOR_1'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'combat', 'survival', 'trading', 'misc'
  icon_key TEXT, -- client-side icon reference
  condition_type TEXT NOT NULL, -- 'total_kills', 'survival_seconds', 'max_level', 'pnl_percent'
  condition_value NUMERIC NOT NULL, -- Threshold to unlock
  reward_gold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Player Achievements Table (Unlock State)
CREATE TABLE IF NOT EXISTS public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  UNIQUE(player_id, achievement_id)
);

-- 2.3 Indexes
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON public.player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);

-- 2.4 RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read achievements" ON public.achievements;
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Read own achievements" ON public.player_achievements;
CREATE POLICY "Read own achievements" ON public.player_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert achievements service" ON public.player_achievements;
CREATE POLICY "Insert achievements service" ON public.player_achievements
FOR INSERT WITH CHECK (true); -- Allow service role and edge functions

-- 2.5 Seed Initial Achievements
INSERT INTO public.achievements (id, name, description, category, condition_type, condition_value, reward_gold) VALUES
('SURVIVOR_1', 'Survivor I', 'Survive for 1 minute', 'survival', 'survival_seconds', 60, 100),
('SURVIVOR_2', 'Survivor II', 'Survive for 5 minutes', 'survival', 'survival_seconds', 300, 500),
('SURVIVOR_3', 'Survivor III', 'Survive for 10 minutes', 'survival', 'survival_seconds', 600, 1000),
('KILLER_1', 'First Blood', 'Kill 10 enemies', 'combat', 'total_kills', 10, 50),
('KILLER_2', 'Terminator', 'Kill 500 enemies', 'combat', 'total_kills', 500, 250),
('KILLER_3', 'Extinction Event', 'Kill 2000 enemies', 'combat', 'total_kills', 2000, 1000),
('LEVEL_10', 'Getting Stronger', 'Reach Level 10', 'misc', 'max_level', 10, 100),
('LEVEL_25', 'Veteran', 'Reach Level 25', 'misc', 'max_level', 25, 500),
('TRADER_1', 'In The Green', 'Finish with positive PnL', 'trading', 'pnl_percent', 0.01, 200),
('TRADER_2', 'Moon Mission', 'Finish with 10%+ PnL', 'trading', 'pnl_percent', 10, 1000)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 3: SHOP SYSTEM
-- ============================================

-- 3.1 Shop Items Table
CREATE TABLE IF NOT EXISTS public.shop_items (
  id TEXT PRIMARY KEY, -- e.g. 'SPEED_BOOST_1'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'stat_upgrade', 'class_unlock', 'cosmetic'
  cost_gold INTEGER NOT NULL,
  effect_type TEXT NOT NULL, -- 'speed_mult', 'start_health', 'damage_mult'
  effect_value NUMERIC NOT NULL, -- e.g. 1.05 for 5% boost
  max_purchases INTEGER DEFAULT 1,
  icon_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Player Inventory (Purchases)
CREATE TABLE IF NOT EXISTS public.player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT true,
  UNIQUE(player_id, item_id)
);

-- 3.3 Indexes
CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON public.player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON public.shop_items(is_active);

-- 3.4 RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read shop" ON public.shop_items;
CREATE POLICY "Public read shop" ON public.shop_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Read own inventory" ON public.player_inventory;
CREATE POLICY "Read own inventory" ON public.player_inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert inventory service" ON public.player_inventory;
CREATE POLICY "Insert inventory service" ON public.player_inventory FOR INSERT WITH CHECK (true);

-- 3.5 Seed Initial Shop Items
INSERT INTO public.shop_items (id, name, description, category, cost_gold, effect_type, effect_value) VALUES
('SPEED_1', 'Cyber Legs', 'Increase movement speed by 5%', 'stat_upgrade', 500, 'speed_mult', 0.05),
('SPEED_2', 'Quantum Boots', 'Increase movement speed by 10%', 'stat_upgrade', 1500, 'speed_mult', 0.10),
('HEALTH_1', 'Nanite Plating', 'Start with +20 Max HP', 'stat_upgrade', 750, 'max_hp_flat', 20),
('HEALTH_2', 'Titanium Core', 'Start with +50 Max HP', 'stat_upgrade', 2000, 'max_hp_flat', 50),
('GREED_1', 'Mining Bot', 'Increase gold gain by 10%', 'stat_upgrade', 1000, 'gold_mult', 0.10),
('DMG_1', 'Overclocked CPU', 'Increase damage by 5%', 'stat_upgrade', 1200, 'damage_mult', 0.05),
('DMG_2', 'Quantum Processor', 'Increase damage by 10%', 'stat_upgrade', 3000, 'damage_mult', 0.10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SECTION 4: GOLD MANAGEMENT FUNCTIONS
-- ============================================

-- 4.1 Add Gold Function (Central wallet logic)
CREATE OR REPLACE FUNCTION public.add_gold(
  p_player_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER -- Returns new balance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT gold_balance INTO v_old_balance
  FROM public.players
  WHERE id = p_player_id;
  
  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'Player not found: %', p_player_id;
  END IF;

  -- Update player balance
  UPDATE public.players
  SET gold_balance = gold_balance + p_amount
  WHERE id = p_player_id
  RETURNING gold_balance INTO v_new_balance;

  -- Log transaction to coin_transactions table
  INSERT INTO public.coin_transactions (
    player_id,
    amount,
    type,
    reference_id,
    balance_before,
    balance_after,
    description
  ) VALUES (
    p_player_id,
    p_amount,
    p_type,
    p_reference_id::UUID,
    v_old_balance,
    v_new_balance,
    p_type || COALESCE(' - ' || p_reference_id, '')
  );

  RETURN v_new_balance;
END;
$$;

-- 4.2 Purchase Item Function
CREATE OR REPLACE FUNCTION public.purchase_item(
  p_player_id UUID,
  p_item_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost INTEGER;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check item existence and cost
  SELECT cost_gold INTO v_cost
  FROM public.shop_items
  WHERE id = p_item_id AND is_active = true;

  IF v_cost IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found');
  END IF;

  -- Check player balance
  SELECT gold_balance INTO v_balance
  FROM public.players
  WHERE id = p_player_id;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- Check if already owned
  IF EXISTS (SELECT 1 FROM public.player_inventory WHERE player_id = p_player_id AND item_id = p_item_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already owned');
  END IF;

  -- Deduct Gold using helper function
  v_new_balance := public.add_gold(p_player_id, -v_cost, 'shop_purchase', p_item_id);

  -- Add to inventory
  INSERT INTO public.player_inventory (player_id, item_id, is_equipped)
  VALUES (p_player_id, p_item_id, true);

  RETURN jsonb_build_object('success', true, 'balance_after', v_new_balance);
END;
$$;

-- ============================================
-- SECTION 5: ANTI-CHEAT & REPLAY VERIFICATION
-- ============================================

-- 5.1 Cheat Attempts Table
CREATE TABLE IF NOT EXISTS public.cheat_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
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

-- 5.2 Game Replays Table
CREATE TABLE IF NOT EXISTS public.game_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  replay_id TEXT NOT NULL UNIQUE,
  event_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  final_hash TEXT NOT NULL,
  compressed_size INTEGER NOT NULL DEFAULT 0,
  game_version TEXT NOT NULL DEFAULT '1.0.0',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_event_count CHECK (event_count >= 0),
  CONSTRAINT valid_duration CHECK (duration_ms >= 0)
);

-- 5.3 Verification Failures Table
CREATE TABLE IF NOT EXISTS public.verification_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  failure_reason TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5.4 Indexes
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_player ON public.cheat_attempts(player_id);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_type ON public.cheat_attempts(cheat_type);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_fingerprint ON public.cheat_attempts(fingerprint);
CREATE INDEX IF NOT EXISTS idx_cheat_attempts_timestamp ON public.cheat_attempts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_game_replays_session_id ON public.game_replays(session_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_replay_id ON public.game_replays(replay_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_verified ON public.game_replays(verified);

CREATE INDEX IF NOT EXISTS idx_verification_failures_session ON public.verification_failures(session_id);
CREATE INDEX IF NOT EXISTS idx_verification_failures_reason ON public.verification_failures(failure_reason);

-- 5.5 RLS
ALTER TABLE public.cheat_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cheat_insert_anon" ON public.cheat_attempts;
CREATE POLICY "cheat_insert_anon" ON public.cheat_attempts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "cheat_select_service" ON public.cheat_attempts;
CREATE POLICY "cheat_select_service" ON public.cheat_attempts FOR SELECT 
TO authenticated USING (true);

DROP POLICY IF EXISTS "replays_select_public" ON public.game_replays;
CREATE POLICY "replays_select_public" ON public.game_replays FOR SELECT USING (true);

DROP POLICY IF EXISTS "replays_insert_service" ON public.game_replays;
CREATE POLICY "replays_insert_service" ON public.game_replays FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "failures_insert_service" ON public.verification_failures;
CREATE POLICY "failures_insert_service" ON public.verification_failures FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "failures_select_service" ON public.verification_failures;
CREATE POLICY "failures_select_service" ON public.verification_failures FOR SELECT 
TO authenticated USING (true);

-- ============================================
-- SECTION 6: ANALYTICS VIEWS
-- ============================================

-- 6.1 Analytics Sessions View
CREATE OR REPLACE VIEW public.analytics_sessions AS
SELECT 
  DATE_TRUNC('day', session_timestamp) as date,
  COUNT(*) as total_sessions,
  COUNT(DISTINCT player_id) as unique_players,
  AVG(survival_time_ms) as avg_survival_ms,
  AVG(total_kills) as avg_kills,
  MAX(max_level) as max_level_reached,
  SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified_sessions
FROM public.game_sessions
WHERE session_timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', session_timestamp)
ORDER BY date DESC;

-- 6.2 Analytics Top Errors View
CREATE OR REPLACE VIEW public.analytics_top_errors AS
SELECT 
  error_type,
  category,
  severity,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT device_fingerprint) as unique_devices,
  MIN(reported_at) as first_seen,
  MAX(reported_at) as last_seen
FROM public.error_reports
WHERE reported_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, category, severity
ORDER BY occurrence_count DESC
LIMIT 50;

-- 6.3 Analytics Performance by Device View
CREATE OR REPLACE VIEW public.analytics_performance_by_device AS
SELECT 
  dp.device_type,
  dp.os,
  dp.browser,
  COUNT(DISTINCT dp.fingerprint) as device_count,
  AVG(pm.avg_fps) as avg_fps,
  AVG(pm.min_fps) as avg_min_fps,
  AVG(pm.frame_drops) as avg_frame_drops,
  AVG(pm.memory_used_mb) as avg_memory_mb
FROM public.device_profiles dp
LEFT JOIN public.performance_metrics pm ON dp.fingerprint = pm.device_fingerprint
WHERE dp.last_seen_at > NOW() - INTERVAL '30 days'
GROUP BY dp.device_type, dp.os, dp.browser
ORDER BY device_count DESC;

-- 6.4 Replay Verification Stats View
CREATE OR REPLACE VIEW public.replay_verification_stats AS
SELECT 
  DATE_TRUNC('day', gr.created_at) as date,
  COUNT(*) as total_replays,
  COUNT(*) FILTER (WHERE gr.verified = true) as verified_count,
  COUNT(*) FILTER (WHERE gr.verified = false) as failed_count,
  AVG(gr.event_count) as avg_event_count,
  AVG(gr.duration_ms) as avg_duration_ms,
  AVG(gr.compressed_size) as avg_compressed_size
FROM public.game_replays gr
GROUP BY DATE_TRUNC('day', gr.created_at)
ORDER BY date DESC;

-- 6.5 Cheat Summary View
CREATE OR REPLACE VIEW public.cheat_summary AS
SELECT 
  cheat_type,
  COUNT(*) as occurrence_count,
  COUNT(DISTINCT fingerprint) as unique_fingerprints,
  COUNT(DISTINCT player_id) as unique_players,
  AVG(severity) as avg_severity,
  MAX(timestamp) as last_occurrence
FROM public.cheat_attempts
GROUP BY cheat_type
ORDER BY occurrence_count DESC;

-- ============================================
-- SECTION 7: ACHIEVEMENT REWARD TRIGGER
-- ============================================

-- 7.1 Trigger function to credit gold when achievement unlocked
CREATE OR REPLACE FUNCTION public.trigger_achievement_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward INTEGER;
BEGIN
  -- Get reward amount from definition
  SELECT reward_gold INTO v_reward
  FROM public.achievements
  WHERE id = NEW.achievement_id;

  IF v_reward > 0 THEN
    PERFORM public.add_gold(
      NEW.player_id,
      v_reward,
      'achievement_reward',
      NEW.achievement_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 7.2 Create trigger
DROP TRIGGER IF EXISTS trg_achievement_reward ON public.player_achievements;
CREATE TRIGGER trg_achievement_reward
AFTER INSERT ON public.player_achievements
FOR EACH ROW
EXECUTE FUNCTION public.trigger_achievement_reward();

-- ============================================
-- SECTION 8: GRANTS
-- ============================================

-- Tables
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT SELECT ON public.player_achievements TO anon, authenticated;
GRANT INSERT ON public.player_achievements TO anon, authenticated;

GRANT SELECT ON public.shop_items TO anon, authenticated;
GRANT SELECT ON public.player_inventory TO anon, authenticated;

GRANT INSERT ON public.cheat_attempts TO anon, authenticated;
GRANT SELECT, INSERT ON public.game_replays TO anon, authenticated;
GRANT INSERT ON public.verification_failures TO anon, authenticated;

-- Views
GRANT SELECT ON public.analytics_sessions TO anon, authenticated;
GRANT SELECT ON public.analytics_top_errors TO anon, authenticated;
GRANT SELECT ON public.analytics_performance_by_device TO anon, authenticated;
GRANT SELECT ON public.replay_verification_stats TO anon, authenticated;
GRANT SELECT ON public.cheat_summary TO anon, authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION public.add_gold(UUID, INTEGER, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_item(UUID, TEXT) TO anon, authenticated;

-- ============================================
-- SECTION 9: COMMENTS
-- ============================================

COMMENT ON TABLE public.achievements IS 'Definitions of all earnable achievements';
COMMENT ON TABLE public.player_achievements IS 'Records of unlocked achievements by players';
COMMENT ON TABLE public.shop_items IS 'Items available for purchase with Gold';
COMMENT ON TABLE public.player_inventory IS 'Player owned items from the shop';
COMMENT ON TABLE public.cheat_attempts IS 'Logs client-side cheat detection events';
COMMENT ON TABLE public.game_replays IS 'Stores metadata about verified game replays';
COMMENT ON TABLE public.verification_failures IS 'Logs failed replay verification attempts';

COMMENT ON FUNCTION public.add_gold IS 'Central function to add/subtract gold with full audit trail';
COMMENT ON FUNCTION public.purchase_item IS 'Secure transaction for purchasing shop items';

-- ============================================
-- DONE!
-- ============================================
