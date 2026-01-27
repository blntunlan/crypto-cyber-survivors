-- 1. Add gold_balance to players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS gold_balance integer NOT NULL DEFAULT 0;

-- 2. Create Wallet Transactions Table (Audit Log)
CREATE TABLE public.player_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- Positive for earn, Negative for spend
  balance_after integer NOT NULL,
  transaction_type text NOT NULL, -- 'game_reward', 'achievement_reward', 'shop_purchase', 'admin_adjustment'
  reference_id text, -- session_id, achievement_id, or item_id
  created_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_player_wallets_player ON public.player_wallets(player_id);
CREATE INDEX idx_player_wallets_type ON public.player_wallets(transaction_type);

-- 4. RLS for Wallets
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own wallet" ON public.player_wallets
FOR SELECT USING (auth.uid() = player_id);

-- Only database triggers or service role should insert
CREATE POLICY "Service write wallet" ON public.player_wallets
FOR INSERT WITH CHECK (false); -- Effectively disables direct client inserts

-- 5. Wallet Function (Centralized Logic)
CREATE OR REPLACE FUNCTION public.add_gold(
  p_player_id uuid,
  p_amount integer,
  p_type text,
  p_reference_id text
)
RETURNS integer -- Returns new balance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Update player balance
  UPDATE public.players
  SET gold_balance = gold_balance + p_amount
  WHERE id = p_player_id
  RETURNING gold_balance INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.player_wallets (
    player_id,
    amount,
    balance_after,
    transaction_type,
    reference_id
  ) VALUES (
    p_player_id,
    p_amount,
    v_new_balance,
    p_type,
    p_reference_id
  );

  RETURN v_new_balance;
END;
$$;

-- 6. Trigger: Auto-credit Achievement Rewards
CREATE OR REPLACE FUNCTION public.trigger_achievement_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward integer;
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

CREATE TRIGGER trg_achievement_reward
AFTER INSERT ON public.player_achievements
FOR EACH ROW
EXECUTE FUNCTION public.trigger_achievement_reward();

-- 7. Trigger: Auto-credit Verified Game Rewards
-- (Assuming game_sessions has a reward_amount column, checked in previous steps)
CREATE OR REPLACE FUNCTION public.trigger_game_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only credit if verified AND status changed to verified (avoid double credit on updates)
  IF NEW.verification_status = 'verified' AND OLD.verification_status != 'verified' THEN
    -- Calculate generic reward if not present (optional fallback) or use claimed
    -- Here we assume verify-game edge function sets a 'reward_amount' column or we calculate it.
    -- Checking schema... game_sessions usually doesn't have reward_amount in the final V2 plan?
    -- V2 plan: reward calculation logic is in Edge Function.
    -- Ideally, Edge Function writes to a 'reward_amount' column in game_sessions.
    -- Let's assume we need to add that column if missing OR rely on explicit call.
    -- Strategy: Let's add 'reward_amount' to game_sessions for transparency.
    NULL; -- Placeholder. See Migration Step 8.
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Add reward_amount to game_sessions for explicit tracking
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS reward_amount integer DEFAULT 0;

-- Update trigger logic
CREATE OR REPLACE FUNCTION public.trigger_game_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.verification_status = 'verified' 
     AND OLD.verification_status != 'verified' 
     AND NEW.reward_amount > 0 THEN
     
    PERFORM public.add_gold(
      NEW.player_id,
      NEW.reward_amount,
      'game_reward',
      NEW.session_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_game_reward ON public.game_sessions;

CREATE TRIGGER trg_game_reward
AFTER UPDATE ON public.game_sessions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_game_reward();

COMMENT ON TABLE public.player_wallets IS 'Audit log of all gold transactions';
