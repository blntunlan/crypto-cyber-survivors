-- ============================================
-- 🏛️ RENAISSANCE MASTER SCHEMA: ULTIMATE STANDARD
-- Purpose: Convert all ID keys to UUID for performance & integrity
-- ============================================

-- 1. SHOP ITEMS
ALTER TABLE public.profile_inventory DROP CONSTRAINT IF EXISTS player_inventory_item_id_fkey;
ALTER TABLE public.profile_inventory DROP CONSTRAINT IF EXISTS profile_inventory_item_id_fkey;

ALTER TABLE public.shop_items ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE public.shop_items ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 2. ACHIEVEMENTS
ALTER TABLE public.profile_achievements DROP CONSTRAINT IF EXISTS player_achievements_achievement_id_fkey;
ALTER TABLE public.profile_achievements DROP CONSTRAINT IF EXISTS profile_achievements_achievement_id_fkey;

ALTER TABLE public.achievements ALTER COLUMN id TYPE UUID USING id::UUID;
ALTER TABLE public.achievements ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 3. PROFILE_INVENTORY
ALTER TABLE public.profile_inventory ALTER COLUMN item_id TYPE UUID USING item_id::UUID;
ALTER TABLE public.profile_inventory ADD CONSTRAINT profile_inventory_item_id_fkey 
    FOREIGN KEY (item_id) REFERENCES public.shop_items(id);

-- 4. PROFILE_ACHIEVEMENTS
ALTER TABLE public.profile_achievements ALTER COLUMN achievement_id TYPE UUID USING achievement_id::UUID;
ALTER TABLE public.profile_achievements ADD CONSTRAINT profile_achievements_achievement_id_fkey 
    FOREIGN KEY (achievement_id) REFERENCES public.achievements(id);

-- 5. RPC FUNCTIONS (Ensure UUID types)
CREATE OR REPLACE FUNCTION public.purchase_item(
    p_profile_id UUID,
    p_item_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_item_cost INTEGER;
    v_current_balance BIGINT;
    v_max_purchases INTEGER;
    v_owned_count INTEGER;
BEGIN
    SELECT cost_gold, max_purchases INTO v_item_cost, v_max_purchases
    FROM public.shop_items
    WHERE id = p_item_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found or inactive');
    END IF;

    SELECT gold_balance INTO v_current_balance
    FROM public.virtual_accounts
    WHERE profile_id = p_profile_id
    FOR UPDATE;

    IF v_current_balance < v_item_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient gold balance');
    END IF;

    SELECT COALESCE(SUM(purchase_count), 0) INTO v_owned_count
    FROM public.profile_inventory
    WHERE profile_id = p_profile_id AND item_id = p_item_id;

    IF v_owned_count >= v_max_purchases THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum purchase limit reached');
    END IF;

    UPDATE public.virtual_accounts
    SET gold_balance = gold_balance - v_item_cost,
        total_spent_gold = total_spent_gold + v_item_cost,
        updated_at = NOW()
    WHERE profile_id = p_profile_id;

    INSERT INTO public.profile_inventory (profile_id, item_id, purchase_count)
    VALUES (p_profile_id, p_item_id, 1)
    ON CONFLICT (profile_id, item_id) 
    DO UPDATE SET 
        purchase_count = public.profile_inventory.purchase_count + 1,
        updated_at = NOW();

    INSERT INTO public.ledger (profile_id, amount, currency, transaction_type, reference_id, balance_after, metadata)
    VALUES (
        p_profile_id, 
        -v_item_cost, 
        'gold', 
        'purchase', 
        p_item_id::TEXT, 
        v_current_balance - v_item_cost,
        jsonb_build_object('item_id', p_item_id)
    );

    RETURN jsonb_build_object(
        'success', true, 
        'balance_after', v_current_balance - v_item_cost,
        'item_id', p_item_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
