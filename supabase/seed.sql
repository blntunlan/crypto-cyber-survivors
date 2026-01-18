-- ============================================
-- SEED DATA: CRYPTO CYBER SURVIVORS
-- Purpose: Initialize database with sample data for development and testing.
-- =-- ============================================

-- 1. Create Sample Players
INSERT INTO public.players (id, display_name, high_score, total_kills, total_sessions, total_playtime_ms)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Satoshi_Nakamoto', 250000, 15400, 42, 3600000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Vitalik_Buterin', 185000, 12200, 35, 2800000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'cz_binance', 142000, 9800, 28, 2200000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Michael_Saylor', 98000, 6500, 15, 1200000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Elon_Doge', 75000, 4200, 12, 900000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Wojak_Survivor', 45000, 2100, 8, 450000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Bogdanoff_Twin', 25000, 1200, 5, 300000)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  high_score = GREATEST(players.high_score, EXCLUDED.high_score),
  total_kills = players.total_kills + EXCLUDED.total_kills,
  total_sessions = players.total_sessions + 1;

-- 2. Create Sample Game Sessions for the current player
-- (Using dummy IDs to ensure the views work correctly)
INSERT INTO public.game_sessions (player_id, max_level, total_kills, survival_time_ms, crypto_pair, position_chosen, claimed_pnl)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 50, 5000, 1800000, 'BTC', 'LONG', 1.5),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 40, 4000, 1500000, 'ETH', 'SHORT', -0.2),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 35, 3200, 1200000, 'SOL', 'LONG', 0.8);
