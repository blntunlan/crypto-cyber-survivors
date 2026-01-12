-- 1. Create Achievements Table (Definitions)
CREATE TABLE public.achievements (
  id text PRIMARY KEY, -- e.g. 'SURVIVOR_1'
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'combat', 'survival', 'trading', 'misc'
  icon_key text, -- client-side icon reference or url
  condition_type text NOT NULL, -- 'total_kills', 'survival_seconds', 'max_level', 'pnl_percent'
  condition_value numeric NOT NULL, -- Threshold to unlock
  reward_gold integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Player Achievements Table (Unlock State)
CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  achievement_id text REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  UNIQUE(player_id, achievement_id) -- Prevent duplicate unlocks
);

-- 3. Indexes
CREATE INDEX idx_player_achievements_player ON public.player_achievements(player_id);

-- 4. RLS Policies
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can read achievement definitions
CREATE POLICY "Public read access" ON public.achievements FOR SELECT USING (true);

-- Everyone can read their own unlocks (or public profiles if we want)
CREATE POLICY "Read own achievements" ON public.player_achievements
FOR SELECT USING (true); -- Public profiles allowed for now

-- Only trusted service role can likely insert/update (Edge Functions)
-- But for dev speed, we allow authenticated users to INSERT their own for now
-- (In prod, move this to Edge Function only)
CREATE POLICY "Insert own achievements" ON public.player_achievements
FOR INSERT WITH CHECK (auth.uid() = player_id OR auth.uid() IS NULL); -- Allow anon/service for now

-- 5. Seed Initial Data
INSERT INTO public.achievements (id, name, description, category, condition_type, condition_value, reward_gold) VALUES
('SURVIVOR_1', 'Survivor I', 'Survive for 1 minute', 'survival', 'survival_seconds', 60, 100),
('SURVIVOR_2', 'Survivor II', 'Survive for 5 minutes', 'survival', 'survival_seconds', 300, 500),
('KILLER_1', 'First Blood', 'Kill 10 enemies', 'combat', 'total_kills', 10, 50),
('KILLER_2', 'Terminator', 'Kill 500 enemies', 'combat', 'total_kills', 500, 250),
('LEVEL_10', 'Getting Stronger', 'Reach Level 10', 'misc', 'max_level', 10, 100),
('TRADER_1', 'In The Green', 'Finish with positive PnL', 'trading', 'pnl_percent', 0.01, 200)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.achievements IS 'Definitions of all earnable achievements';
COMMENT ON TABLE public.player_achievements IS 'Records of unlocked achievements by players';
