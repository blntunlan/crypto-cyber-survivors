-- Migration 001: Meta Progression + Daily Challenges + Replay System
-- Date: 2026-03-17
-- Adds 5 new tables, 2 views, 3 functions, 1 trigger

-- ============================================================
-- 12. meta_progression (server-side persistent upgrades)
-- ============================================================
-- Cheat-proof: upgrade state lives on server, not localStorage.
-- One row per profile. JSONB upgrades map: { "DAMAGE_BOOST": 2, "HP_RESERVOIR": 1, ... }

CREATE TABLE IF NOT EXISTS meta_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meta_coins BIGINT NOT NULL DEFAULT 0,
  upgrades JSONB NOT NULL DEFAULT '{}',
  total_runs_completed INTEGER NOT NULL DEFAULT 0,
  total_meta_coins_earned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_progression_profile ON meta_progression(profile_id);

-- Auto-create meta_progression row when a profile is created
CREATE OR REPLACE FUNCTION handle_new_meta_progression()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meta_progression (profile_id, meta_coins, upgrades)
  VALUES (NEW.id, 0, '{}')
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_meta ON profiles;
CREATE TRIGGER on_profile_created_meta
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_meta_progression();

-- ============================================================
-- 13. daily_challenges (challenge definitions)
-- ============================================================
-- Admin-seeded or auto-generated challenge definitions.
-- One row per day (daily) or per week (weekly).

CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,                    -- "2026-03-17-daily" or "2026-W12-weekly"
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '[]',  -- [{ type: 'position', value: 'SHORT' }, ...]
  objectives JSONB NOT NULL DEFAULT '[]',   -- [{ type: 'survive_seconds', target: 300 }, ...]
  reward JSONB NOT NULL DEFAULT '{}',       -- { metaCoins: 200, bonusXp: 100 }
  expires_at TIMESTAMPTZ NOT NULL,
  seed BIGINT NOT NULL,                     -- deterministic RNG seed (date hash)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_type ON daily_challenges(type);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_expires ON daily_challenges(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active ON daily_challenges(is_active) WHERE is_active = true;

-- ============================================================
-- 14. challenge_completions (player challenge results)
-- ============================================================
-- Tracks who completed which challenge, with score for leaderboard.
-- UNIQUE(profile_id, challenge_id) = one completion per challenge per player.

CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,         -- kills * level * survival_seconds
  survival_seconds INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  level_reached INTEGER NOT NULL DEFAULT 1,
  objectives_completed JSONB NOT NULL DEFAULT '[]',  -- snapshot of completed objectives
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_profile ON challenge_completions(profile_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge ON challenge_completions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_score ON challenge_completions(score DESC);

-- ============================================================
-- 15. game_replays (compressed replay storage)
-- ============================================================
-- Stores compressed replay data per session. Top 5 per player, auto-pruned.
-- Max 500KB per replay (enforced at API level).

CREATE TABLE IF NOT EXISTS game_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  final_level INTEGER NOT NULL DEFAULT 1,
  total_kills INTEGER NOT NULL DEFAULT 0,
  pair TEXT NOT NULL,
  position TEXT NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  replay_data BYTEA NOT NULL,             -- compressed binary replay
  replay_size INTEGER NOT NULL DEFAULT 0, -- uncompressed size in bytes
  version INTEGER NOT NULL DEFAULT 2,     -- replay format version
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id)                      -- one replay per session
);

CREATE INDEX IF NOT EXISTS idx_game_replays_profile ON game_replays(profile_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_score ON game_replays(profile_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_replays_created ON game_replays(created_at DESC);

-- ============================================================
-- 16. challenge_seed_log (audit: generated challenge seeds)
-- ============================================================
-- Tracks what challenges were generated for which dates (audit trail).

CREATE TABLE IF NOT EXISTS challenge_seed_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly')),
  seed BIGINT NOT NULL,
  challenge_id TEXT REFERENCES daily_challenges(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_date, challenge_type)
);

-- ============================================================
-- VIEW: v_challenge_leaderboard
-- ============================================================
-- Ranked leaderboard per challenge (top scores).

CREATE OR REPLACE VIEW v_challenge_leaderboard AS
SELECT
  p.nickname,
  p.avatar_url,
  cc.challenge_id,
  dc.name AS challenge_name,
  dc.type AS challenge_type,
  cc.score,
  cc.survival_seconds,
  cc.kills,
  cc.level_reached,
  cc.completed_at
FROM challenge_completions cc
JOIN profiles p ON cc.profile_id = p.id
JOIN daily_challenges dc ON cc.challenge_id = dc.id
ORDER BY cc.challenge_id, cc.score DESC;

-- ============================================================
-- VIEW: v_meta_leaderboard (total meta progression ranking)
-- ============================================================

CREATE OR REPLACE VIEW v_meta_leaderboard AS
SELECT
  p.nickname,
  p.avatar_url,
  mp.meta_coins,
  mp.total_runs_completed,
  mp.total_meta_coins_earned,
  mp.upgrades,
  mp.updated_at
FROM meta_progression mp
JOIN profiles p ON mp.profile_id = p.id
ORDER BY mp.total_meta_coins_earned DESC;

-- ============================================================
-- FUNCTION: purchase_meta_upgrade (atomic upgrade purchase)
-- ============================================================
-- Validates cost, deducts meta_coins, increments upgrade level.
-- Returns new state or raises exception.

CREATE OR REPLACE FUNCTION purchase_meta_upgrade(
  p_profile_id UUID,
  p_upgrade_id TEXT,
  p_cost BIGINT,
  p_max_level INTEGER
) RETURNS TABLE(
  new_meta_coins BIGINT,
  new_level INTEGER,
  upgrade_id TEXT
) AS $$
DECLARE
  v_current_level INTEGER;
  v_meta_coins BIGINT;
  v_new_level INTEGER;
BEGIN
  -- Lock row for update (prevent race conditions)
  SELECT meta_coins,
         COALESCE((upgrades->>p_upgrade_id)::INTEGER, 0)
  INTO v_meta_coins, v_current_level
  FROM meta_progression
  WHERE profile_id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile meta_progression not found';
  END IF;

  -- Validate max level
  IF v_current_level >= p_max_level THEN
    RAISE EXCEPTION 'Upgrade already at max level (%)' , p_max_level;
  END IF;

  -- Validate balance
  IF v_meta_coins < p_cost THEN
    RAISE EXCEPTION 'Insufficient meta coins: have %, need %', v_meta_coins, p_cost;
  END IF;

  v_new_level := v_current_level + 1;

  -- Atomic update: deduct coins + bump level
  UPDATE meta_progression
  SET meta_coins = meta_coins - p_cost,
      upgrades = jsonb_set(upgrades, ARRAY[p_upgrade_id], to_jsonb(v_new_level)),
      updated_at = now()
  WHERE profile_id = p_profile_id;

  RETURN QUERY SELECT
    (v_meta_coins - p_cost)::BIGINT,
    v_new_level,
    p_upgrade_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: transfer_meta_coins (run end → meta coin transfer)
-- ============================================================
-- Called after session verification. Transfers % of run reward to meta wallet.

CREATE OR REPLACE FUNCTION transfer_meta_coins(
  p_profile_id UUID,
  p_earned_coins BIGINT,
  p_transfer_rate NUMERIC DEFAULT 0.15
) RETURNS TABLE(
  meta_share BIGINT,
  new_meta_balance BIGINT,
  new_total_earned BIGINT,
  new_runs_completed INTEGER
) AS $$
DECLARE
  v_share BIGINT;
  v_balance BIGINT;
  v_total BIGINT;
  v_runs INTEGER;
BEGIN
  v_share := FLOOR(p_earned_coins * p_transfer_rate);

  -- Upsert: create if not exists
  INSERT INTO meta_progression (profile_id, meta_coins, total_meta_coins_earned, total_runs_completed)
  VALUES (p_profile_id, v_share, v_share, 1)
  ON CONFLICT (profile_id)
  DO UPDATE SET
    meta_coins = meta_progression.meta_coins + v_share,
    total_meta_coins_earned = meta_progression.total_meta_coins_earned + v_share,
    total_runs_completed = meta_progression.total_runs_completed + 1,
    updated_at = now()
  RETURNING meta_coins, total_meta_coins_earned, total_runs_completed
  INTO v_balance, v_total, v_runs;

  RETURN QUERY SELECT v_share, v_balance, v_total, v_runs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNCTION: prune_old_replays (keep top 5 per player)
-- ============================================================
-- Triggered after replay insert. Deletes excess replays beyond top 5 by score.

CREATE OR REPLACE FUNCTION prune_old_replays()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM game_replays
  WHERE profile_id = NEW.profile_id
    AND id NOT IN (
      SELECT id FROM game_replays
      WHERE profile_id = NEW.profile_id
      ORDER BY score DESC
      LIMIT 5
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_replay_insert ON game_replays;
CREATE TRIGGER after_replay_insert
  AFTER INSERT ON game_replays
  FOR EACH ROW
  EXECUTE FUNCTION prune_old_replays();
