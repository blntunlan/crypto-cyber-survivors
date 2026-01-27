-- ============================================
-- MIGRATION 001: REPLAY ATTACK PROTECTION
-- Tarih: 2025-12-25
-- Amaç: Aynı oyuncunun aynı session'ı birden fazla kez göndermesini engelle
-- ============================================

-- 1. UNIQUE CONSTRAINT: player_id + session_timestamp kombinasyonu benzersiz olmalı
-- Bu, aynı oyuncunun aynı zaman damgasıyla birden fazla oyun kaydetmesini engeller
ALTER TABLE game_sessions 
ADD CONSTRAINT unique_player_session 
UNIQUE (player_id, session_timestamp);

-- 2. SESSION ID KOLONU: Her oyun için benzersiz client-generated ID
-- Client tarafında nanoid() ile oluşturulur
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Session ID için UNIQUE constraint (null olabilir, geriye uyumluluk için)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_session_id 
ON game_sessions(session_id) 
WHERE session_id IS NOT NULL;

-- 3. VERIFICATION KOLONLARI: Server tarafında doğrulama için
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_method TEXT,
ADD COLUMN IF NOT EXISTS reward_given BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0;

-- 4. GÜNCELLEME TARİHİ
COMMENT ON CONSTRAINT unique_player_session ON game_sessions IS 
'Replay attack protection: Her oyuncu için aynı timestamp sadece 1 kez kaydedilebilir';

-- 5. INDEX FOR VERIFICATION QUERIES
CREATE INDEX IF NOT EXISTS idx_sessions_verification 
ON game_sessions(player_id, is_verified, session_timestamp DESC);

-- ============================================
-- NASIL ÇALIŞIR?
-- ============================================
-- 
-- 1. Client oyun bittiğinde:
--    { player_id: "abc", session_timestamp: 1703520000000, session_id: "xyz123" }
--
-- 2. İlk insert: ✅ Başarılı
--
-- 3. Hacker aynı isteği tekrar gönderirse:
--    ❌ ERROR: duplicate key value violates unique constraint "unique_player_session"
--
-- 4. Edge function bu hatayı yakalayıp "Session already processed" döner
--
-- ============================================
