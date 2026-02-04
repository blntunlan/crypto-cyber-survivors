-- 1. Seed Market State
INSERT INTO public.market_state (
    pair, price, volume, rsi, rsi_state, atr, atr_percent, 
    spawn_rate_multiplier, normalized_volume, volume_percentile, 
    whale_tier, enemy_aggro_multiplier_long, enemy_aggro_multiplier_short, updated_at
)
VALUES 
('BTC/USD', 65245.5, 1200.5, 52.5, 'NEUTRAL', 450.0, 0.007, 1.0, 0.8, 50, 0, 1.0, 1.0, now()),
('ETH/USD', 2450.2, 8500.2, 48.0, 'NEUTRAL', 35.0, 0.014, 1.1, 0.6, 40, 0, 1.0, 1.0, now()),
('SOL/USD', 145.8, 45000.5, 65.0, 'BULLISH', 1.2, 0.008, 1.2, 0.9, 80, 1, 1.1, 0.9, now())
ON CONFLICT (pair) DO NOTHING;

-- 2. Seed Achievements
INSERT INTO public.achievements (id, name, description, category, icon_key, condition_type, condition_value, reward_gold, is_active)
VALUES 
(gen_random_uuid(), 'Survivor I', 'Survive for 5 minutes', 'survival', 'shield', 'survival_time', 300, 100, true),
(gen_random_uuid(), 'Killer I', 'Kill 100 enemies', 'combat', 'skull', 'kill_count', 100, 150, true),
(gen_random_uuid(), 'Whale I', 'Accumulate 1000 gold', 'wealth', 'coins', 'gold_earned', 1000, 500, true)
ON CONFLICT DO NOTHING;

-- 3. Seed Shop Items
INSERT INTO public.shop_items (id, name, description, category, cost_gold, cost_gems, effect_type, effect_value, max_purchases, icon_key, is_active)
VALUES 
(gen_random_uuid(), 'Fast Lane', 'Permanent +5% speed', 'upgrade', 500, 0, 'speed', 0.05, 5, 'bolt', true),
(gen_random_uuid(), 'Cold Wallet', 'Permanent +10% max HP', 'upgrade', 1000, 0, 'hp', 0.10, 5, 'lock', true),
(gen_random_uuid(), 'Diamond Hands', 'Permanent +2 luck', 'upgrade', 1500, 0, 'luck', 2.0, 3, 'gem', true)
ON CONFLICT DO NOTHING;
;
