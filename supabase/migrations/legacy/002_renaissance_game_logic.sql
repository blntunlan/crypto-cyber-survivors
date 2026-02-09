-- ============================================
-- 🏛️ RENAISSANCE MASTER SCHEMA: PHASE 2 (GAME LOGIC & ATOMICITY)
-- Date: 2026-01-27
-- Version: 1.1.0
-- ============================================

-- 1. MARKET DATA (High-Frequency & State)
-- ============================================

-- Latest snapshot of each pair (For UI & Difficulty)
CREATE TABLE IF NOT EXISTS public.market_state (
    pair TEXT PRIMARY KEY, -- e.g., 'BTC-USD'
    price NUMERIC NOT NULL,
    volume NUMERIC DEFAULT 0,
    rsi NUMERIC,
    rsi_state TEXT DEFAULT 'NEUTRAL', -- 'OVERSOLD', 'NEUTRAL', 'OVERBOUGHT'
    atr NUMERIC,
    atr_percent NUMERIC,
    spawn_rate_multiplier NUMERIC DEFAULT 1.0,
    normalized_volume NUMERIC DEFAULT 0,
    volume_percentile NUMERIC DEFAULT 0,
    whale_tier INTEGER DEFAULT 0,
    enemy_aggro_multiplier_long NUMERIC DEFAULT 1.0,
    enemy_aggro_multiplier_short NUMERIC DEFAULT 1.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-frequency price logs (For Charts & Analysis)
-- Renaming from price_history to price_logs for internal consistency
CREATE TABLE IF NOT EXISTS public.price_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    pair TEXT NOT NULL,
    price NUMERIC NOT NULL,
    volume NUMERIC DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Optimization: BRIN index for time-series data
CREATE INDEX IF NOT EXISTS idx_price_logs_timestamp_brin ON public.price_logs USING brin(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_logs_pair ON public.price_logs(pair);

-- 2. GAMEPLAY SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    crypto_pair TEXT NOT NULL,
    position_chosen TEXT NOT NULL, -- 'long', 'short'
    leverage INTEGER DEFAULT 1,
    entry_price NUMERIC,
    exit_price NUMERIC,
    survival_seconds INTEGER DEFAULT 0,
    kills INTEGER DEFAULT 0,
    reward_amount BIGINT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    session_secret TEXT, -- For anti-cheat HMAC
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACHIEVEMENTS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY, -- e.g., 'survival_10_min'
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'combat', 'survival', 'trading', 'misc'
    icon_key TEXT,
    condition_type TEXT NOT NULL, -- 'total_kills', 'survival_seconds', 'max_level', 'pnl_percent'
    condition_value NUMERIC NOT NULL,
    reward_gold BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, achievement_id)
);

-- 4. SHOP & INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'stat_upgrade', 'class_unlock', 'cosmetic'
    cost_gold BIGINT NOT NULL,
    cost_gems BIGINT DEFAULT 0,
    effect_type TEXT,
    effect_value NUMERIC,
    max_purchases INTEGER DEFAULT 1,
    icon_key TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.player_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES public.shop_items(id) ON DELETE CASCADE,
    purchase_count INTEGER DEFAULT 1,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, item_id)
);

-- 5. ATOMIC RPC FUNCTIONS (The "SOLID" Core)
-- ============================================

-- A. Atomic Credit with Ledger
CREATE OR REPLACE FUNCTION public.credit_coins(
    p_profile_id UUID,
    p_amount BIGINT,
    p_transaction_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_new_balance BIGINT;
BEGIN
    -- Update Balance
    UPDATE public.virtual_accounts
    SET gold_balance = gold_balance + p_amount,
        total_earned_gold = CASE WHEN p_amount > 0 THEN total_earned_gold + p_amount ELSE total_earned_gold END,
        updated_at = NOW()
    WHERE profile_id = p_profile_id
    RETURNING gold_balance INTO v_new_balance;

    -- Log to Ledger
    INSERT INTO public.ledger (
        profile_id, amount, transaction_type, reference_id, balance_after, metadata
    ) VALUES (
        p_profile_id, p_amount, p_transaction_type, p_reference_id, v_new_balance, p_metadata
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Atomic Item Purchase
CREATE OR REPLACE FUNCTION public.purchase_item(
    p_profile_id UUID,
    p_item_id TEXT
) RETURNS JSONB AS $$
DECLARE
    v_cost BIGINT;
    v_balance BIGINT;
    v_owned_count INTEGER;
    v_max_purchases INTEGER;
BEGIN
    -- 1. Get Item Details
    SELECT cost_gold, max_purchases INTO v_cost, v_max_purchases
    FROM public.shop_items WHERE id = p_item_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- 2. Check Balance
    SELECT gold_balance INTO v_balance
    FROM public.virtual_accounts WHERE profile_id = p_profile_id FOR UPDATE;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient gold');
    END IF;

    -- 3. Check Ownership Limit
    SELECT purchase_count INTO v_owned_count
    FROM public.player_inventory WHERE profile_id = p_profile_id AND item_id = p_item_id;

    IF v_owned_count >= v_max_purchases THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maximum limit reached');
    END IF;

    -- 4. Deduct Gold & Update Ledger
    UPDATE public.virtual_accounts
    SET gold_balance = gold_balance - v_cost,
        total_spent_gold = total_spent_gold + v_cost,
        updated_at = NOW()
    WHERE profile_id = p_profile_id
    RETURNING gold_balance INTO v_balance;

    INSERT INTO public.ledger (
        profile_id, amount, transaction_type, reference_id, balance_after, metadata
    ) VALUES (
        p_profile_id, -v_cost, 'shop_purchase', p_item_id, v_balance, jsonb_build_object('item_id', p_item_id)
    );

    -- 5. Grant Item
    INSERT INTO public.player_inventory (profile_id, item_id, purchase_count)
    VALUES (p_profile_id, p_item_id, 1)
    ON CONFLICT (profile_id, item_id)
    DO UPDATE SET purchase_count = player_inventory.purchase_count + 1, updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_balance
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES
-- ============================================
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market_state" ON public.market_state FOR SELECT USING (true);
CREATE POLICY "Anyone can read price_logs" ON public.price_logs FOR SELECT USING (true);
CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Users can view own achievements" ON public.player_achievements FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Anyone can read shop_items" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Users can view own inventory" ON public.player_inventory FOR SELECT USING (auth.uid() = profile_id);

-- TRIGGERS
CREATE TRIGGER trg_market_state_updated_at BEFORE UPDATE ON public.market_state FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_player_inventory_updated_at BEFORE UPDATE ON public.player_inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
