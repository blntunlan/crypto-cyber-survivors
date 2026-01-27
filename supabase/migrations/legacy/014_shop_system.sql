-- 1. Create Shop Items Table
CREATE TABLE public.shop_items (
  id text PRIMARY KEY, -- e.g. 'SPEED_BOOST_1'
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'stat_upgrade', 'class_unlock', 'cosmetic'
  cost_gold integer NOT NULL,
  effect_type text NOT NULL, -- 'speed_mult', 'start_health', 'damage_mult'
  effect_value numeric NOT NULL, -- e.g. 1.05 for 5% boost
  max_purchases integer DEFAULT 1, -- Can be upgraded multiple times? For now 1.
  icon_key text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Create Player Inventory (Purchases)
CREATE TABLE public.player_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  item_id text REFERENCES public.shop_items(id) ON DELETE CASCADE,
  purchased_at timestamptz DEFAULT now(),
  is_equipped boolean DEFAULT true, -- Passive upgrades are always equipped
  UNIQUE(player_id, item_id)
);

-- 3. Indexes
CREATE INDEX idx_player_inventory_player ON public.player_inventory(player_id);

-- 4. RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shop" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Read own inventory" ON public.player_inventory FOR SELECT USING (auth.uid() = player_id);

-- 5. Purchase Function (Transaction)
CREATE OR REPLACE FUNCTION public.purchase_item(
  p_player_id uuid,
  p_item_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost integer;
  v_balance integer;
  v_new_balance integer;
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

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- Check if already owned (assuming max_purchases=1 for simplistic MVP)
  IF EXISTS (SELECT 1 FROM public.player_inventory WHERE player_id = p_player_id AND item_id = p_item_id) THEN
     RETURN jsonb_build_object('success', false, 'error', 'Already owned');
  END IF;

  -- Deduct Gold using our helper function (logs mechanism)
  PERFORM public.add_gold(p_player_id, -v_cost, 'shop_purchase', p_item_id);

  -- Add to inventory
  INSERT INTO public.player_inventory (player_id, item_id, is_equipped)
  VALUES (p_player_id, p_item_id, true);

  RETURN jsonb_build_object('success', true, 'balance_after', v_balance - v_cost);
END;
$$;

-- 6. Seed Initial Shop Items
INSERT INTO public.shop_items (id, name, description, category, cost_gold, effect_type, effect_value) VALUES
('SPEED_1', 'Cyber Legs', 'Increase movement speed by 5%', 'stat_upgrade', 500, 'speed_mult', 0.05),
('HEALTH_1', 'Nanite Plating', 'Start with +20 Max HP', 'stat_upgrade', 750, 'max_hp_flat', 20),
('GREED_1', 'Mining Bot', 'Increase gold gain by 10%', 'stat_upgrade', 1000, 'gold_mult', 0.10),
('DMG_1', 'Overclocked CPU', 'Increase damage by 5%', 'stat_upgrade', 1200, 'damage_mult', 0.05)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.shop_items IS 'Items available for purchase with Gold';
