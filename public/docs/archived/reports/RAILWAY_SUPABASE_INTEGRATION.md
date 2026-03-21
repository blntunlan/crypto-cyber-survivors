# 🔗 Railway ↔ Supabase Entegrasyon Tablosu

**Tarih**: 2026-01-18  
**Durum**: ✅ TÜM ENTEGRASYONLAR AKTİF

---

## 📊 Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAILWAY                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐         │
│  │   crypto-cyber-survivors    │    │      market-server          │         │
│  │      (Frontend/Game)        │    │   (Price Logger Backend)    │         │
│  │                             │    │                             │         │
│  │  - Static site hosting      │    │  - WebSocket → Binance      │         │
│  │  - React SPA                │    │  - Price logging            │         │
│  │  - Supabase JS Client       │    │  - Whale detection          │         │
│  └────────────┬────────────────┘    └──────────────┬──────────────┘         │
│               │                                     │                        │
└───────────────┼─────────────────────────────────────┼────────────────────────┘
                │                                     │
                ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         PostgreSQL Database                          │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │    │
│  │  │   players    │ │game_sessions │ │  price_logs  │ │market_state │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Edge Functions                               │    │
│  │  ┌──────────────┐ ┌──────────────┐                                  │    │
│  │  │start-session │ │ verify-game  │                                  │    │
│  │  └──────────────┘ └──────────────┘                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Railway Servisleri → Supabase Tabloları

### 1. crypto-cyber-survivors (Frontend)

| Railway Servis | Supabase Tablo | İşlem | Açıklama |
|----------------|----------------|-------|----------|
| Frontend | `players` | INSERT/SELECT | Oyuncu kayıt & profil |
| Frontend | `game_sessions` | INSERT/UPDATE | Oyun oturumu başlat & bitir |
| Frontend | `performance_metrics` | INSERT | FPS & memory verileri |
| Frontend | `device_profiles` | UPSERT | Cihaz bilgileri |
| Frontend | `error_reports` | INSERT | Client hataları |
| Frontend | `achievements` | SELECT | Başarım listesi |
| Frontend | `player_achievements` | SELECT/INSERT | Açılan başarımlar |
| Frontend | `shop_items` | SELECT | Mağaza ürünleri |
| Frontend | `player_inventory` | SELECT/INSERT | Envanter |
| Frontend | `coin_transactions` | SELECT | Altın işlem geçmişi |
| Frontend | `cheat_attempts` | INSERT | Cheat tespiti |
| Frontend | `game_replays` | INSERT | Replay metadatası |
| Frontend | `leaderboard` (view) | SELECT | Liderlik tablosu |

### 2. market-server (Price Logger)

| Railway Servis | Supabase Tablo | İşlem | Açıklama |
|----------------|----------------|-------|----------|
| market-server | `price_logs` | INSERT/DELETE | Fiyat kayıtları (250K+) |
| market-server | `market_state` | UPSERT | Anlık market durumu |
| market-server | `error_reports` | INSERT | Sunucu hataları |

---

## 🔌 Supabase Edge Functions

| Edge Function | Tetikleyen | Yazdığı Tablolar | Açıklama |
|---------------|------------|------------------|----------|
| `start-session` | Frontend (oyun başı) | `game_sessions` | Oturum kaydı oluştur, UUID döndür |
| `verify-game` | VerificationQueue | `game_sessions`, `price_logs` | PnL doğrulama, ödül hesaplama |

---

## 📥 Veri Akışı Detayı

### Oyun Başladığında

```
Frontend                    Supabase
   │                           │
   ├── POST /start-session ───►│
   │                           ├── INSERT game_sessions
   │◄── { sessionId: UUID } ───┤
   │                           │
   ├── MetricsService ────────►│
   │   (serverSessionId sakla) │
```

### Oyun Devam Ederken

```
market-server               Supabase
   │                           │
   ├── WebSocket Binance ─────►│
   │   (her 100ms)             │
   ├── INSERT price_logs ─────►│
   ├── UPSERT market_state ───►│
   │                           │
```

### Oyun Bittiğinde

```
Frontend                    Supabase
   │                           │
   ├── MetricsStorage ────────►│
   │   syncToSupabase()        │
   │                           ├── UPDATE game_sessions (UPSERT)
   │                           ├── INSERT performance_metrics
   │                           ├── UPSERT device_profiles
   │                           │
   ├── VerificationQueue ─────►│
   │   enqueue()               │
   │                           ├── Call verify-game Edge Function
   │                           ├── SELECT price_logs (doğrulama)
   │                           ├── UPDATE game_sessions (verified)
   │                           │
```

---

## 📊 Tablo Bazlı Erişim Matrisi

| Tablo | Frontend | market-server | start-session | verify-game |
|-------|----------|---------------|---------------|-------------|
| `players` | R/W | - | R | R |
| `game_sessions` | R/W | - | W | R/W |
| `price_logs` | - | R/W | - | R |
| `market_state` | R | W | - | - |
| `performance_metrics` | W | - | - | - |
| `device_profiles` | R/W | - | - | - |
| `error_reports` | W | W | - | - |
| `achievements` | R | - | - | - |
| `player_achievements` | R/W | - | - | - |
| `shop_items` | R | - | - | - |
| `player_inventory` | R/W | - | - | - |
| `coin_transactions` | R | - | - | W |
| `cheat_attempts` | W | - | - | W |
| `game_replays` | W | - | - | R |
| `verification_failures` | - | - | - | W |

**R** = Read (SELECT), **W** = Write (INSERT/UPDATE/DELETE), **-** = Erişim yok

---

## 🔐 Bağlantı Bilgileri

### Frontend → Supabase (anon key)

```env
VITE_SUPABASE_URL=https://xvvxipcrltzkoijxnwqg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### market-server → Supabase (service role)

```env
SUPABASE_URL=https://xvvxipcrltzkoijxnwqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Functions → Supabase (service role - otomatik)

```
Deno.env.get('SUPABASE_URL')
Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
```

---

## 📈 İstatistikler

| Metrik | Değer |
|--------|-------|
| **Toplam Tablo** | 17 |
| **Frontend'in Eriştiği** | 14 |
| **market-server'ın Eriştiği** | 3 |
| **Edge Function Sayısı** | 2 |
| **Toplam price_logs** | 251,500+ |
| **Aktif Oyuncular** | 20 |
| **Game Sessions** | 24 |

---

## ✅ Entegrasyon Durumu

| Bileşen | Durum | Son Kontrol |
|---------|-------|-------------|
| Frontend → Supabase | ✅ Aktif | 2026-01-18 |
| market-server → Supabase | ✅ Aktif | 2026-01-18 |
| start-session Edge Function | ✅ Aktif (v2) | 2026-01-17 |
| verify-game Edge Function | ✅ Aktif (v9) | 2026-01-17 |
| RLS Policies | ✅ Düzeltildi | 2026-01-18 |
| Veri Akışı (UPSERT) | ✅ Düzeltildi | 2026-01-18 |

---

## 🔧 Son Düzeltmeler

1. **start-session**: UUID döndürüyor (`id` field)
2. **MetricsStorage**: UPSERT pattern uygulandı
3. **Retry Logic**: Exponential backoff eklendi
4. **RLS Policies**: Tüm güvenlik açıkları kapatıldı
