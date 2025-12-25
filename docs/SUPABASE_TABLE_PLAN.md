# Supabase Veritabanı Tasarımı - Final Plan

> **Kararlar:** FPS → game_sessions'dan KALDIR | device_fingerprint → KALSIN | performance_metrics → ZORUNLU

---

## 🎯 Hedefler

1. **Leaderboard** - Günlük/Haftalık/Tüm zamanlar sıralaması
2. **Anti-Cheat** - Hile tespiti ve doğrulama
3. **Analytics** - Oyuncu davranışları, trading analizi
4. **Performans İzleme** - FPS/cihaz optimizasyonu
5. **Gelecek Özellikler** - Achievements, seasons, referral

---

## 📊 FİNAL TABLO YAPISI

### 1️⃣ `players` - Oyuncu Profili
**Görev:** Oyuncunun kalıcı kimliği ve istatistikleri

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `id` | uuid | gen_random_uuid() | NO | PK |
| `display_name` | text | - | NO | Nickname (değiştirilebilir) |
| `created_at` | timestamptz | now() | NO | Kayıt tarihi |
| `last_seen_at` | timestamptz | now() | NO | Son aktivite |
| **🔐 Auth (İlerde OAuth için)** |
| `auth_provider` | text | 'nickname' | NO | ✨ YENİ - nickname/twitter/google/wallet |
| `auth_id` | text | - | YES | ✨ YENİ - Supabase Auth user ID |
| `email` | text | - | YES | ✨ YENİ - OAuth'tan gelen email |
| **🐦 Twitter (İlerde)** |
| `twitter_handle` | text | - | YES | ✨ YENİ - @username |
| `twitter_id` | text | - | YES | ✨ YENİ - Twitter user ID |
| **💎 Wallet (İlerde)** |
| `wallet_address` | text | - | YES | ✨ YENİ - 0x.../Solana adresi |
| `wallet_chain` | text | - | YES | ✨ YENİ - evm/solana/ton |
| **👤 Profil** |
| `avatar_url` | text | - | YES | ✨ YENİ - Profil resmi URL |
| **📊 İstatistikler** |
| `total_sessions` | integer | 0 | NO | Toplam oturum sayısı |
| `total_playtime_ms` | bigint | 0 | NO | ✨ YENİ - Toplam oyun süresi |
| `total_kills` | integer | 0 | NO | ✨ YENİ - Toplam öldürme |
| `high_score` | integer | 0 | NO | En uzun survival (ms) |
| `best_pnl_percent` | numeric(10,4) | 0 | NO | ✨ YENİ - En iyi PnL % |
| **🚫 Moderasyon** |
| `is_banned` | boolean | false | NO | ✨ YENİ - Yasaklı mı? |
| `ban_reason` | text | - | YES | ✨ YENİ - Yasaklama nedeni |

**Indexler:**
- `idx_players_high_score` (high_score DESC) - Leaderboard
- `idx_players_display_name` (display_name) - Arama

---

### 2️⃣ `game_sessions` - Oyun Oturumları
**Görev:** Her oyun oturumunun detayları (Leaderboard + Anti-cheat)

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `id` | uuid | gen_random_uuid() | NO | PK |
| `player_id` | uuid | - | YES | FK → players (anonymous için null) |
| `device_fingerprint` | text | - | YES | Cihaz referansı |
| `session_timestamp` | timestamptz | now() | NO | Başlangıç zamanı |
| **Oyun Verileri** |
| `survival_time_ms` | integer | 0 | NO | Hayatta kalma süresi |
| `total_kills` | integer | 0 | NO | Öldürme sayısı |
| `max_level` | integer | 1 | NO | Ulaşılan level |
| `end_reason` | text | - | YES | death/quit/timeout |
| **Trading Verileri** |
| `crypto_pair` | text | 'BTC' | NO | BTC/ETH/SOL |
| `position` | text | - | YES | LONG/SHORT |
| `leverage` | integer | 1 | NO | Kaldıraç (1-100) |
| `entry_price` | numeric(20,8) | - | YES | Giriş fiyatı |
| `exit_price` | numeric(20,8) | - | YES | Çıkış fiyatı |
| `pnl_percent` | numeric(10,4) | - | YES | PnL yüzdesi |
| **Doğrulama (Model B)** |
| `verification_status` | text | 'pending' | NO | ✨ YENİ - pending/verified/rejected |
| `verification_method` | text | - | YES | price_log/timestamp/none |
| `server_entry_price` | numeric(20,8) | - | YES | ✨ YENİ - Server tarafı giriş |
| `server_exit_price` | numeric(20,8) | - | YES | ✨ YENİ - Server tarafı çıkış |
| `price_diff_percent` | numeric(10,4) | - | YES | ✨ YENİ - Client vs Server fark |
| `is_suspicious` | boolean | false | NO | ✨ YENİ - Şüpheli mi? |
| `suspicion_reason` | text | - | YES | ✨ YENİ - Şüphe nedeni |

**Indexler:**
- `idx_game_sessions_player` (player_id) - Oyuncu oturumları
- `idx_game_sessions_timestamp` (session_timestamp DESC) - Sıralama
- `idx_game_sessions_survival` (survival_time_ms DESC) - Leaderboard
- `idx_game_sessions_verification` (verification_status) - Doğrulama kontrolü

**Constraintler:**
- FK: player_id → players(id) ON DELETE SET NULL

---

### 3️⃣ `performance_metrics` - Performans Verileri
**Görev:** Her oturumun detaylı performans metrikleri

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `id` | uuid | gen_random_uuid() | NO | PK |
| `session_id` | uuid | - | NO | FK → game_sessions |
| `recorded_at` | timestamptz | now() | NO | Kayıt zamanı |
| **FPS Metrikleri** |
| `avg_fps` | numeric(6,2) | - | NO | Ortalama FPS |
| `min_fps` | numeric(6,2) | - | NO | Minimum FPS |
| `max_fps` | numeric(6,2) | - | NO | Maximum FPS |
| `fps_1_percentile` | numeric(6,2) | - | YES | En kötü %1 |
| `fps_samples` | integer | - | NO | Örnek sayısı |
| **Frame Metrikleri** |
| `avg_frame_time_ms` | numeric(8,2) | - | YES | Ortalama frame time |
| `max_frame_time_ms` | numeric(8,2) | - | YES | Max frame time |
| `frame_drops` | integer | 0 | NO | Frame drop sayısı |
| **Memory** |
| `memory_used_mb` | integer | - | YES | RAM kullanımı |
| `memory_peak_mb` | integer | - | YES | Peak RAM |
| **Game State** |
| `enemy_count_avg` | integer | - | YES | Ortalama düşman |
| `enemy_count_max` | integer | - | YES | Max düşman |
| `bullet_count_avg` | integer | - | YES | Ortalama mermi |
| `particle_count_avg` | integer | - | YES | Ortalama parçacık |
| **Optimization** |
| `optimization_profile` | text | - | YES | low/medium/high/ultra |
| `device_fingerprint` | text | - | YES | Cihaz referansı (JOIN için) |

**Indexler:**
- `idx_performance_session` (session_id) - Session lookup

**Constraintler:**
- FK: session_id → game_sessions(id) ON DELETE CASCADE
- 1 session = 1 performance_metrics kaydı

---

### 4️⃣ `device_profiles` - Cihaz Bilgileri
**Görev:** Benzersiz cihaz özellikleri (fingerprint = PK)

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `fingerprint` | text | - | NO | PK - Benzersiz cihaz ID |
| `device_type` | text | - | YES | desktop/mobile/tablet |
| `browser` | text | - | YES | Chrome/Firefox/Safari |
| `browser_version` | text | - | YES | ✨ YENİ - Versiyon |
| `os` | text | - | YES | ✨ YENİ - Windows/Mac/iOS/Android |
| `screen_width` | integer | - | YES | Ekran genişliği |
| `screen_height` | integer | - | YES | Ekran yüksekliği |
| `pixel_ratio` | numeric(4,2) | - | YES | ✨ YENİ - Device pixel ratio |
| `hardware_concurrency` | integer | - | YES | CPU çekirdek sayısı |
| `device_memory` | numeric(6,2) | - | YES | RAM (GB) |
| `gpu_renderer` | text | - | YES | ✨ YENİ - GPU bilgisi |
| `recommended_profile` | text | - | YES | Önerilen optimizasyon |
| `benchmark_score` | integer | - | YES | Benchmark skoru |
| `first_seen_at` | timestamptz | now() | NO | İlk görülme |
| `last_seen_at` | timestamptz | now() | NO | Son görülme |
| `session_count` | integer | 1 | NO | ✨ YENİ - Bu cihazdan oturum sayısı |

**Indexler:**
- PK: fingerprint
- `idx_device_profiles_benchmark` (benchmark_score) - Performans analizi

---

### 5️⃣ `error_reports` - Hata Raporları
**Görev:** Client-side hata logları

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `id` | uuid | gen_random_uuid() | NO | PK |
| `player_id` | uuid | - | YES | FK → players |
| `session_id` | uuid | - | YES | ✨ YENİ - FK → game_sessions |
| `device_fingerprint` | text | - | YES | Cihaz referansı |
| `error_type` | text | - | NO | TypeError/ReferenceError/Custom |
| `error_message` | text | - | YES | Hata mesajı |
| `error_code` | text | - | YES | ✨ YENİ - Özel hata kodu |
| `stack_trace` | text | - | YES | Stack trace |
| `component` | text | - | YES | ✨ YENİ - Hangi component'ta |
| `browser_info` | text | - | YES | Tarayıcı bilgisi |
| `page_url` | text | - | YES | Sayfa URL'i |
| `status` | text | 'new' | NO | new/reviewed/fixed/ignored |
| `reported_at` | timestamptz | now() | NO | Rapor zamanı |

**Indexler:**
- `idx_error_reports_status` (status) - Review için
- `idx_error_reports_type` (error_type) - Gruplandırma

---

### 6️⃣ `price_logs` - Fiyat Geçmişi (Railway)
**Görev:** Model B doğrulama için fiyat logları

| Kolon | Tip | Default | Null | Açıklama |
|-------|-----|---------|------|----------|
| `id` | bigint | SERIAL | NO | PK |
| `timestamp` | timestamptz | now() | NO | Fiyat zamanı |
| `pair` | varchar(20) | - | NO | BTCUSDT/ETHUSDT |
| `price` | numeric(20,8) | - | NO | Son fiyat |
| `volume` | numeric(24,8) | - | YES | 24s hacim |
| `high_24h` | numeric(20,8) | - | YES | 24s high |
| `low_24h` | numeric(20,8) | - | YES | 24s low |
| `source` | varchar(20) | - | NO | binance/coinbase |

**Indexler:**
- `idx_price_logs_lookup` (pair, timestamp DESC) - Fiyat lookup
- `idx_price_logs_timestamp` (timestamp DESC) - Temizlik için

**Retention:** 7 gün (cron job ile eski kayıtları sil)

---

## 📈 İLERİDE EKLENEBİLECEK TABLOLAR

### 7️⃣ `achievements` (Gelecek)
```sql
- id, name, description, icon, points
- requirement_type (kills/survival/pnl/level)
- requirement_value
```

### 8️⃣ `player_achievements` (Gelecek)
```sql
- player_id, achievement_id, unlocked_at, session_id
```

### 9️⃣ `seasons` (Gelecek)
```sql
- id, name, start_date, end_date, is_active
```

### 🔟 `leaderboard_snapshots` (Gelecek)
```sql
- Günlük/haftalık snapshot'lar için
- season_id, snapshot_date, player_id, rank, score
```

---

## 🔗 İLİŞKİ DİYAGRAMI

```
                              ┌─────────────────┐
                              │   price_logs    │
                              │   (Railway)     │
                              └────────┬────────┘
                                       │ verify
                                       ▼
┌──────────────┐    1:N     ┌─────────────────────┐
│   players    │◄───────────│   game_sessions     │
│              │            │                     │
│ • high_score │            │ • survival_time_ms  │
│ • total_*    │            │ • pnl_percent       │
│ • is_banned  │            │ • verification_*    │
└──────┬───────┘            └──────────┬──────────┘
       │                               │
       │ 1:N                           │ 1:1
       ▼                               ▼
┌──────────────────┐         ┌────────────────────┐
│  error_reports   │         │ performance_metrics│
│                  │         │                    │
│ • error_type     │         │ • avg_fps          │
│ • stack_trace    │         │ • memory_*         │
└──────────────────┘         │ • enemy_count_*    │
                             └────────────────────┘
                                       │
                                       │ FK
                                       ▼
                             ┌────────────────────┐
                             │  device_profiles   │
                             │                    │
                             │ • fingerprint (PK) │
                             │ • gpu_renderer     │
                             │ • benchmark_score  │
                             └────────────────────┘
```

---

## 🧹 TEMİZ KURULUM (Önerilen)

> ⚠️ Tüm tabloları siler ve baştan oluşturur. Mevcut veri 0 olduğu için güvenli.

### Step 0: Mevcut Tabloları Sil
```sql
-- Önce foreign key'li tabloları sil
DROP TABLE IF EXISTS public.error_reports CASCADE;
DROP TABLE IF EXISTS public.performance_metrics CASCADE;
DROP TABLE IF EXISTS public.game_sessions CASCADE;
DROP TABLE IF EXISTS public.device_profiles CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;

-- price_logs tablosunu sıfırla (yapısı kalsın, veriler silinsin)
TRUNCATE TABLE public.price_logs;

-- Mevcut view'ları sil
DROP VIEW IF EXISTS public.leaderboard CASCADE;
DROP VIEW IF EXISTS public.daily_leaderboard CASCADE;

-- Eski cron job'ları temizle (varsa)
SELECT cron.unschedule('cleanup-price-logs');
```

### Step 0.5: price_logs Otomatik Temizleme (Cron Job)
```sql
-- pg_cron extension'ı aktif et (bir kere)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Her gün gece 03:00'da çalışacak temizleme job'ı
-- 7 günden eski kayıtları siler (son 7 gün kalır)
SELECT cron.schedule(
  'cleanup-price-logs',           -- job adı
  '0 3 * * *',                    -- her gün 03:00 UTC
  $$
    DELETE FROM public.price_logs 
    WHERE timestamp < NOW() - INTERVAL '7 days';
  $$
);

-- Manuel temizleme fonksiyonu (isteğe bağlı kullanım için)
CREATE OR REPLACE FUNCTION public.cleanup_old_price_logs(days_to_keep integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.price_logs 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_price_logs IS 'Eski fiyat loglarını temizler. Varsayılan: 7 günden eski';
```

### Step 1: `players` Tablosu
```sql
CREATE TABLE public.players (
  -- Temel
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  
  -- Auth (şimdilik nickname, ilerde OAuth/Wallet)
  auth_provider text NOT NULL DEFAULT 'nickname',
  auth_id text,
  email text,
  
  -- Twitter (ilerde)
  twitter_handle text,
  twitter_id text,
  
  -- Wallet (ilerde)
  wallet_address text,
  wallet_chain text,
  
  -- Profil
  avatar_url text,
  
  -- İstatistikler
  total_sessions integer NOT NULL DEFAULT 0,
  total_playtime_ms bigint NOT NULL DEFAULT 0,
  total_kills integer NOT NULL DEFAULT 0,
  high_score integer NOT NULL DEFAULT 0,
  best_pnl_percent numeric(10,4) NOT NULL DEFAULT 0,
  
  -- Moderasyon
  is_banned boolean NOT NULL DEFAULT false,
  ban_reason text
);

-- Indexler
CREATE INDEX idx_players_high_score ON public.players(high_score DESC);
CREATE INDEX idx_players_display_name ON public.players(display_name);
CREATE UNIQUE INDEX idx_players_wallet ON public.players(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE UNIQUE INDEX idx_players_twitter ON public.players(twitter_id) WHERE twitter_id IS NOT NULL;
CREATE UNIQUE INDEX idx_players_auth ON public.players(auth_id) WHERE auth_id IS NOT NULL;

-- RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);

COMMENT ON TABLE public.players IS 'Oyuncu profilleri ve istatistikleri';
```

### Step 2: `device_profiles` Tablosu
```sql
CREATE TABLE public.device_profiles (
  fingerprint text PRIMARY KEY,
  device_type text,
  browser text,
  browser_version text,
  os text,
  screen_width integer,
  screen_height integer,
  pixel_ratio numeric(4,2),
  hardware_concurrency integer,
  device_memory numeric(6,2),
  gpu_renderer text,
  recommended_profile text,
  benchmark_score integer,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  session_count integer NOT NULL DEFAULT 1
);

-- Index
CREATE INDEX idx_device_profiles_benchmark ON public.device_profiles(benchmark_score);

-- RLS
ALTER TABLE public.device_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read device_profiles" ON public.device_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert device_profiles" ON public.device_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update device_profiles" ON public.device_profiles FOR UPDATE USING (true);

COMMENT ON TABLE public.device_profiles IS 'Benzersiz cihaz bilgileri ve benchmark sonuçları';
```

### Step 3: `game_sessions` Tablosu
```sql
CREATE TABLE public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  device_fingerprint text,
  session_timestamp timestamptz NOT NULL DEFAULT now(),
  
  -- Oyun verileri
  survival_time_ms integer NOT NULL DEFAULT 0,
  total_kills integer NOT NULL DEFAULT 0,
  max_level integer NOT NULL DEFAULT 1,
  end_reason text,
  
  -- Trading verileri
  crypto_pair text NOT NULL DEFAULT 'BTC',
  position text,
  leverage integer NOT NULL DEFAULT 1,
  entry_price numeric(20,8),
  exit_price numeric(20,8),
  pnl_percent numeric(10,4),
  
  -- Doğrulama (Model B)
  verification_status text NOT NULL DEFAULT 'pending',
  verification_method text,
  server_entry_price numeric(20,8),
  server_exit_price numeric(20,8),
  price_diff_percent numeric(10,4),
  is_suspicious boolean NOT NULL DEFAULT false,
  suspicion_reason text
);

-- Indexler
CREATE INDEX idx_game_sessions_player ON public.game_sessions(player_id);
CREATE INDEX idx_game_sessions_timestamp ON public.game_sessions(session_timestamp DESC);
CREATE INDEX idx_game_sessions_survival ON public.game_sessions(survival_time_ms DESC);
CREATE INDEX idx_game_sessions_verification ON public.game_sessions(verification_status);

-- RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read game_sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game_sessions" ON public.game_sessions FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.game_sessions IS 'Her oyun oturumunun detayları';
```

### Step 4: `performance_metrics` Tablosu
```sql
CREATE TABLE public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  
  -- FPS
  avg_fps numeric(6,2) NOT NULL,
  min_fps numeric(6,2) NOT NULL,
  max_fps numeric(6,2) NOT NULL,
  fps_1_percentile numeric(6,2),
  fps_samples integer NOT NULL,
  
  -- Frame
  avg_frame_time_ms numeric(8,2),
  max_frame_time_ms numeric(8,2),
  frame_drops integer NOT NULL DEFAULT 0,
  
  -- Memory
  memory_used_mb integer,
  memory_peak_mb integer,
  
  -- Game state
  enemy_count_avg integer,
  enemy_count_max integer,
  bullet_count_avg integer,
  particle_count_avg integer,
  
  -- Optimization
  optimization_profile text,
  device_fingerprint text
);

-- Index
CREATE INDEX idx_performance_session ON public.performance_metrics(session_id);

-- RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read performance_metrics" ON public.performance_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can insert performance_metrics" ON public.performance_metrics FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.performance_metrics IS 'Oyun performans metrikleri';
```

### Step 5: `error_reports` Tablosu
```sql
CREATE TABLE public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL,
  device_fingerprint text,
  error_type text NOT NULL,
  error_message text,
  error_code text,
  stack_trace text,
  component text,
  browser_info text,
  page_url text,
  status text NOT NULL DEFAULT 'new',
  reported_at timestamptz NOT NULL DEFAULT now()
);

-- Indexler
CREATE INDEX idx_error_reports_status ON public.error_reports(status);
CREATE INDEX idx_error_reports_type ON public.error_reports(error_type);
CREATE INDEX idx_error_reports_session ON public.error_reports(session_id);

-- RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read error_reports" ON public.error_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert error_reports" ON public.error_reports FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.error_reports IS 'Client-side hata raporları';
```

### Step 6: Leaderboard View
```sql
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id as player_id,
  p.display_name,
  p.high_score,
  p.total_kills,
  p.total_sessions,
  p.avatar_url,
  RANK() OVER (ORDER BY p.high_score DESC) as rank
FROM public.players p
WHERE p.is_banned = false
  AND p.high_score > 0
ORDER BY p.high_score DESC
LIMIT 100;

COMMENT ON VIEW public.leaderboard IS 'Top 100 oyuncu sıralaması';
```

---

## 🔄 ALTERNATİF: MEVCUT TABLOLARI GÜNCELLE

> Eğer tabloları silmek istemezsen, aşağıdaki migration'ları kullan:

### Migration 1: players tablosu güncelleme
```sql
ALTER TABLE public.players
-- Auth (şimdilik nickname, ilerde OAuth/Wallet)
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'nickname',
ADD COLUMN IF NOT EXISTS auth_id text,
ADD COLUMN IF NOT EXISTS email text,
-- Twitter (ilerde)
ADD COLUMN IF NOT EXISTS twitter_handle text,
ADD COLUMN IF NOT EXISTS twitter_id text,
-- Wallet (ilerde)
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS wallet_chain text,
-- Profil
ADD COLUMN IF NOT EXISTS avatar_url text,
-- İstatistikler
ADD COLUMN IF NOT EXISTS total_playtime_ms bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_kills integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_pnl_percent numeric(10,4) DEFAULT 0,
-- Moderasyon
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason text;

-- Unique indexler (ilerde aktif olacak)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_wallet 
ON public.players(wallet_address) WHERE wallet_address IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_twitter 
ON public.players(twitter_id) WHERE twitter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_auth 
ON public.players(auth_id) WHERE auth_id IS NOT NULL;
```

### Migration 2: game_sessions güncelleme
```sql
-- FPS kolonlarını kaldır
ALTER TABLE public.game_sessions
DROP COLUMN IF EXISTS avg_fps,
DROP COLUMN IF EXISTS min_fps;

-- Doğrulama kolonlarını ekle
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS server_entry_price numeric(20,8),
ADD COLUMN IF NOT EXISTS server_exit_price numeric(20,8),
ADD COLUMN IF NOT EXISTS price_diff_percent numeric(10,4),
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicion_reason text;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_game_sessions_verification 
ON public.game_sessions(verification_status);
```

### Migration 3: device_profiles güncelleme
```sql
ALTER TABLE public.device_profiles
ADD COLUMN IF NOT EXISTS browser_version text,
ADD COLUMN IF NOT EXISTS os text,
ADD COLUMN IF NOT EXISTS pixel_ratio numeric(4,2),
ADD COLUMN IF NOT EXISTS gpu_renderer text,
ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 1;
```

### Migration 4: error_reports güncelleme
```sql
ALTER TABLE public.error_reports
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.game_sessions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS error_code text,
ADD COLUMN IF NOT EXISTS component text;

CREATE INDEX IF NOT EXISTS idx_error_reports_session 
ON public.error_reports(session_id);
```

---

## 📋 ÖZET KONTROL LİSTESİ

| Tablo | Görev | Kolonlar | Status |
|-------|-------|----------|--------|
| `players` | Oyuncu profili | 11 | 🔄 Güncellenmeli |
| `game_sessions` | Oyun oturumları | 18 | 🔄 Güncellenmeli |
| `performance_metrics` | FPS/Performans | 18 | ✅ Mevcut |
| `device_profiles` | Cihaz bilgileri | 15 | 🔄 Güncellenmeli |
| `error_reports` | Hata logları | 13 | 🔄 Güncellenmeli |
| `price_logs` | Fiyat geçmişi | 8 | ✅ Mevcut |

---

## 🚀 Onay Sonrası Adımlar

1. [ ] Migration 1-4'ü çalıştır
2. [ ] `MetricsStorage.ts` güncelle (FPS kaldır, performance_metrics'e yaz)
3. [ ] `PlayerTracker.ts` güncelle (total_playtime, total_kills, best_pnl)
4. [ ] `verify-game` edge function güncelle
5. [ ] Test yaz
6. [ ] Railway implementasyonu

**Onaylıyor musun?**
