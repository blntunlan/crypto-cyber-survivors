-- ============================================
-- MIGRATION 002: FIX LEADERBOARD NULL NAMES
-- Tarih: 2025-12-25
-- Amaç: Leaderboard'da null isim gösteren kayıtları filtrele
-- ============================================

-- 1. Mevcut view'ı sil
DROP VIEW IF EXISTS leaderboard CASCADE;

-- 2. Yeni view oluştur - sadece ismi olan oyuncular
CREATE VIEW leaderboard AS
SELECT 
    gs.id,
    COALESCE(p.display_name, 'Anonymous') AS player_name,
    (gs.max_level * 100 + gs.total_kills + FLOOR(gs.survival_time_ms / 1000)) AS score,
    gs.survival_time_ms,
    gs.max_level,
    gs.total_kills,
    gs.crypto_pair,
    gs.session_timestamp AS created_at
FROM game_sessions gs
LEFT JOIN players p ON gs.player_id = p.id
WHERE 
    gs.survival_time_ms IS NOT NULL
    AND gs.survival_time_ms > 0
    AND p.display_name IS NOT NULL  -- Sadece ismi olan oyuncuları göster
    AND p.display_name != ''
ORDER BY score DESC
LIMIT 100;

-- 3. View için anon erişim ver
GRANT SELECT ON leaderboard TO anon;

-- ============================================
-- ALTERNATİF: Anonymous oyuncular da görünsün
-- ============================================
-- Eğer anonymous oyuncuları da göstermek istiyorsan:
-- 
-- CREATE VIEW leaderboard AS
-- SELECT 
--     gs.id,
--     COALESCE(p.display_name, 'Anonymous #' || LEFT(gs.id::text, 4)) AS player_name,
--     ...
-- FROM game_sessions gs
-- LEFT JOIN players p ON gs.player_id = p.id
-- WHERE gs.survival_time_ms IS NOT NULL AND gs.survival_time_ms > 0
-- ORDER BY score DESC
-- LIMIT 100;
