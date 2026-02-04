-- ============================================
-- 🏛️ RENAISSANCE MASTER SCHEMA: RPC FIX
-- Fix naming mismatch in purchase_item
-- ============================================

CREATE OR REPLACE FUNCTION public.purchase_item(
    p_profile_id UUID,
    p_item_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_item_cost INTEGER;
    v_item_id UUID;
    v_current_balance BIGINT;
    v_max_purchases INTEGER;
    v_owned_count INTEGER;
BEGIN
    -- 1. Parse and validate item_id
    BEGIN
        v_item_id := p_item_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid item ID format');
    END;

    -- 2. Get item details
    SELECT cost_gold, max_purchases INTO v_item_cost, v_max_purchases
    FROM public.shop_items
    WHERE id = v_item_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found or inactive');
    END IF;

    -- 3. Get current balance (locking)
    SELECT gold_balance INTO v_current_balance
    FROM public.virtual_accounts
    WHERE profile_id = p_profile_id
    FOR UPDATE;

    IF v_current_balance < v_item_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient gold balance');
    END IF;

    -- 4. Check purchase limit
    SELECT COUNT(*) INTO v_owned_count
    FROM public.profile_inventory -- FIXED: was player_inventory
    WHERE profile_id = p_profile_id AND item_id = v_item_id;

    IF v_owned_count >= v_max_purchases THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum purchase limit reached');
    END IF;

    -- 5. PERFORM PURCHASE (Atomic)
    -- Deduct balance
    UPDATE public.virtual_accounts
    SET gold_balance = gold_balance - v_item_cost,
        total_spent_gold = total_spent_gold + v_item_cost,
        updated_at = NOW()
    WHERE profile_id = p_profile_id;

    -- Add to inventory
    INSERT INTO public.profile_inventory (profile_id, item_id) -- FIXED: was player_inventory
    VALUES (p_profile_id, v_item_id);

    -- Log to ledger
    INSERT INTO public.ledger (profile_id, amount, currency, transaction_type, reference_id, balance_after, metadata)
    VALUES (
        p_profile_id, 
        -v_item_cost, 
        'gold', 
        'purchase', 
        v_item_id::TEXT, 
        v_current_balance - v_item_cost,
        jsonb_build_object('item_id', v_item_id)
    );

    RETURN jsonb_build_object(
        'success', true, 
        'balance_after', v_current_balance - v_item_cost,
        'item_id', v_item_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
;
