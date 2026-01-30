# 🎮 Crypto Cyber Survivors - Backend Sistem Dokümantasyonu

> Status: ✅ COMPLETED
> **Son Güncelleme:** 2025-12-24
> **Versiyon:** 1.0.0

---

## 📋 İçindekiler

1. [Genel Bakış](#-genel-bakış)
2. [Supabase Veritabanı](#-supabase-veritabanı)
3. [Railway Market Server](#-railway-market-server)
4. [Client Entegrasyonu](#-client-entegrasyonu)
5. [Anti-Cheat Sistemi](#-anti-cheat-sistemi)
6. [Gelecek Planları](#-gelecek-planları)

---

## 🎯 Genel Bakış

### Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React/PixiJS)                     │
│                                                                  │
│   NicknameScreen → Game → GameOver → Leaderboard                │
│         ↓              ↓         ↓                               │
│   PlayerTracker   MetricsStorage  LeaderboardPanel              │
└────────┬──────────────┬────────────────┬────────────────────────┘
         │              │                │
         ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│                                                                  │
│   ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐       │
│   │ players  │  │ game_sessions│  │ performance_metrics │       │
│   └──────────┘  └──────────────┘  └─────────────────────┘       │
│                         ↑                                        │
│   ┌──────────┐          │         ┌─────────────────────┐       │
│   │ device_  │    verify-game     │    error_reports    │       │
│   │ profiles │   Edge Function    └─────────────────────┘       │
│   └──────────┘          ↑                                        │
│                         │                                        │
│   ┌─────────────────────┴───────────────────────────────┐       │
│   │                  price_logs                          │       │
│   └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────┴───────────────────────────────────┐
│                    RAILWAY MARKET SERVER                         │
│                                                                  │
│   Binance WebSocket → PriceLogger → Supabase                    │
│   (BTC, ETH, SOL)      (1s kline)    (price_logs)               │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Bileşen | Teknoloji |
|---------|-----------|
| **Frontend** | React, PixiJS, TypeScript, Vite |
| **Database** | Supabase (PostgreSQL) |
| **Edge Functions** | Supabase Edge Functions (Deno) |
| **Price Server** | Railway (Node.js) |
| **Market Data** | Binance WebSocket API |

---

## 🗄️ Supabase Veritabanı

### Proje Bilgileri

| | |
|---|---|
| **Project ID** | `xvvxipcrltzkoijxnwqg` |
| **Region** | `eu-central-1` |
| **URL** | `https://xvvxipcrltzkoijxnwqg.supabase.co` |

### Tablo Yapısı

#### 1. `players` - Oyuncu Profilleri

```sql
CREATE TABLE public.players (
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
```

#### 2. `game_sessions` - Oyun Oturumları

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
  position text,  -- LONG/SHORT
  leverage integer NOT NULL DEFAULT 1,
  entry_price numeric(20,8),
  exit_price numeric(20,8),
  pnl_percent numeric(10,4),
  
  -- Doğrulama (Model B Anti-Cheat)
  verification_status text NOT NULL DEFAULT 'pending',
  verification_method text,
  server_entry_price numeric(20,8),
  server_exit_price numeric(20,8),
  price_diff_percent numeric(10,4),
  is_suspicious boolean NOT NULL DEFAULT false,
  suspicion_reason text
);
```

#### 3. `performance_metrics` - Performans Verileri

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
```

#### 4. `device_profiles` - Cihaz Bilgileri

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
```

#### 5. `error_reports` - Hata Raporları

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
```

#### 6. `price_logs` - Fiyat Geçmişi (Railway)

```sql
CREATE TABLE public.price_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  pair varchar(20) NOT NULL,
  price numeric(20,8) NOT NULL,
  volume numeric(24,8),
  high numeric(20,8),
  low numeric(20,8),
  source varchar(20) NOT NULL DEFAULT 'binance'
);
```

#### 7. `leaderboard` VIEW

```sql
CREATE VIEW public.leaderboard AS
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
```

### RLS Politikaları

Tüm tablolarda Row Level Security aktif:
- **SELECT:** Herkes okuyabilir
- **INSERT:** Herkes ekleyebilir
- **UPDATE:** Sadece players tablosunda herkes güncelleyebilir

### Otomatik Temizleme

```sql
-- 7 günden eski price_logs'u temizle
CREATE OR REPLACE FUNCTION public.cleanup_old_price_logs(days_to_keep integer DEFAULT 7)
RETURNS integer AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.price_logs 
  WHERE timestamp < NOW() - (days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🚂 Railway Market Server

### Proje Yapısı

```
railway-market-server/
├── src/
│   ├── index.ts              # Express server + endpoints
│   ├── services/
│   │   ├── binanceService.ts # Binance WebSocket client
│   │   ├── supabaseService.ts # Supabase client
│   │   └── priceLogger.ts    # Price logging logic
│   └── utils/
│       ├── logger.ts         # Console logging
│       └── retry.ts          # Retry with backoff
├── dist/                     # Compiled JS
├── package.json
├── tsconfig.json
└── .env
```

### Environment Variables (Railway)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (RLS bypass) |
| `PORT` | Auto-assigned by Railway |
| `NODE_ENV` | `production` |

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server info |
| `GET /health` | Health check + Binance status |
| `GET /stats` | Logging statistics |

### Monitoring

**Railway URL:** `https://market-server-production-cc3b.up.railway.app`

```bash
# Health check
curl https://market-server-production-cc3b.up.railway.app/health

# Stats
curl https://market-server-production-cc3b.up.railway.app/stats
```

### Supabase Verileri

Her saniye BTC, ETH, SOL fiyatları loglanıyor:

```sql
SELECT pair, COUNT(*) as count, MAX(timestamp) as last
FROM price_logs
WHERE timestamp > NOW() - INTERVAL '5 minutes'
GROUP BY pair;
```

---

## 🔌 Client Entegrasyonu

### Key Services

#### `services/analytics/PlayerTracker.ts`
- Oyuncu kayıt/giriş
- Session tracking
- High score güncelleme
- 5 dakikada bir heartbeat

#### `services/metrics/MetricsStorage.ts`
- Oyun sonu metrikleri kaydetme
- `game_sessions` tablosuna insert
- `performance_metrics` tablosuna FPS verileri
- `players` stats güncelleme (high_score, total_kills, etc.)

### Veri Akışı

```
Oyun Başlangıcı:
  PlayerTracker.initializePlayer()
    → players tablosu (create/update)
    → total_sessions++

Oyun Sonu:
  MetricsStorage.syncToSupabase()
    → game_sessions insert
    → performance_metrics insert
    → players stats update (high_score, total_kills, total_playtime)
```

---

## 🛡️ Anti-Cheat Sistemi

### Model B: Server-Side Fiyat Doğrulama

```
1. Oyun başlar → Client entry_price'ı kaydeder
2. Oyun biter → Client exit_price ve pnl_percent gönderir
3. verify-game Edge Function:
   - price_logs'dan server_entry_price ve server_exit_price çeker
   - Client vs Server farkını hesaplar
   - %2'den fazla fark → is_suspicious = true
4. Leaderboard sadece verified oturumları gösterir
```

### Doğrulama Kolonları (game_sessions)

| Kolon | Açıklama |
|-------|----------|
| `verification_status` | pending / verified / rejected |
| `verification_method` | price_log / timestamp / none |
| `server_entry_price` | Server tarafı giriş fiyatı |
| `server_exit_price` | Server tarafı çıkış fiyatı |
| `price_diff_percent` | Client vs Server fark % |
| `is_suspicious` | Şüpheli mi? |
| `suspicion_reason` | Şüphe nedeni |

---

## 🔮 Gelecek Planları

### Auth Sistemi (v2)
- [ ] Supabase Auth aktive et
- [ ] Twitter OAuth
- [ ] Wallet Connect (EVM + Solana)
- [ ] RLS'i auth.uid() ile güçlendir

### Gelecek Tablolar
- [ ] `achievements` - Başarım tanımları
- [ ] `player_achievements` - Kazanılan başarımlar
- [ ] `seasons` - Sezon bilgileri
- [ ] `leaderboard_snapshots` - Günlük/haftalık snapshot

### Özellikler
- [ ] Daily/Weekly leaderboard
- [ ] Achievement sistemi
- [ ] Referral sistemi
- [ ] Season ödülleri

---

## 📊 Güncel Durum

| Bileşen | Status | Son Kontrol |
|---------|--------|-------------|
| Supabase Tables | ✅ Aktif | 2025-12-24 |
| Railway Server | ✅ Aktif | 2025-12-24 |
| Price Logging | ✅ ~300/5dk | 2025-12-24 |
| Client Integration | ✅ Test geçti | 2025-12-24 |

---

## 🔧 Troubleshooting

### Railway Logları
```bash
railway logs -s market-server
```

### Supabase Veri Kontrolü
```sql
-- Son 5 dk price_logs
SELECT pair, COUNT(*), MAX(timestamp) 
FROM price_logs 
WHERE timestamp > NOW() - INTERVAL '5 minutes' 
GROUP BY pair;

-- Oyuncu sayısı
SELECT COUNT(*) FROM players;

-- Son 10 session
SELECT * FROM game_sessions ORDER BY session_timestamp DESC LIMIT 10;
```

### Common Issues

| Problem | Çözüm |
|---------|-------|
| Price logs boş | Railway logs kontrol et, Binance bağlantısı |
| Player kaydedilmiyor | Supabase configured mi, localhost check |
| High score güncellenmiyor | MetricsStorage.updatePlayerStats kontrolü |
