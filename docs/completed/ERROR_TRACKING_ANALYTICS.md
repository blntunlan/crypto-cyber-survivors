# Error Tracking & Analytics System

> Status: ✅ COMPLETED

## 📊 Genel Bakış

Crypto Cyber Survivors artık **kapsamlı error tracking ve analytics** sistemi ile donatıldı. Bu sistem, client-side hataları, performans sorunlarını ve kullanıcı davranışlarını otomatik olarak Supabase'e kaydeder.

## 🎯 Özellikler

### 1. **Error Tracking** (`ErrorTracker.ts`)
- ✅ Global error handler (window.onerror)
- ✅ Unhandled promise rejection tracking
- ✅ Network error tracking
- ✅ Performance issue detection
- ✅ Rate limiting (aynı hata 1 dakikada 1 kez)
- ✅ Error deduplication
- ✅ Offline queue support
- ✅ Privacy-safe error sanitization

### 2. **Player Tracking** (`PlayerTracker.ts`)
- ✅ Otomatik player kaydı
- ✅ Session tracking
- ✅ Device fingerprinting
- ✅ Last seen updates (5 dakikada bir)
- ✅ Total sessions sayacı

### 3. **Analytics Dashboard**
- ✅ Real-time metrics
- ✅ Session trends (son 7 gün)
- ✅ Error reports (son 24 saat)
- ✅ Device performance stats
- ✅ Player statistics

## 🚀 Kullanım

### Analytics Dashboard Açma

**Keyboard Shortcut:** `Ctrl + Shift + A`

Dashboard'da görebileceğiniz metrikler:
- Total players
- Active players (24h / 7d)
- Sessions today
- Average session time
- Error count & error rate
- Top errors
- Performance by device

### Manuel Error Capture

```typescript
import errorTracker from './services/analytics/ErrorTracker';

// Basit error
errorTracker.captureError({
  errorType: 'ValidationError',
  errorMessage: 'Invalid input',
  severity: 'medium',
});

// Context ile error
errorTracker.captureError({
  errorType: 'GameLogicError',
  errorMessage: 'Player HP fell below zero',
  severity: 'high',
  context: {
    playerLevel: 5,
    currentHP: -10,
    maxHP: 100,
  },
});

// Network error
errorTracker.captureNetworkError(
  'https://api.example.com/data',
  404,
  'Not Found'
);

// Performance issue
errorTracker.capturePerformanceIssue(
  'FPS',
  25,  // current value
  30   // threshold
);
```

### Player Tracking

Player tracking **otomatik** çalışır. Nickname girişinde otomatik kayıt yapılır.

```typescript
import playerTracker from './services/analytics/PlayerTracker';

// Mevcut player bilgisini al
const player = playerTracker.getCurrentPlayer();

// Device profile kaydet
await playerTracker.trackDeviceProfile(fingerprint, {
  deviceType: 'desktop',
  browser: 'Chrome',
  screenWidth: 1920,
  screenHeight: 1080,
  hardwareConcurrency: 8,
  deviceMemory: 16,
  recommendedProfile: 'ULTRA',
  benchmarkScore: 85,
});
```

## 🔧 Konfigürasyon

### Environment Variables (`.env`)

```bash
# Supabase credentials (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Analytics (optional)
# Set to "false" to completely disable analytics
# VITE_ENABLE_ANALYTICS=false
```

### Analytics'i Development'ta Kapatma

Eğer localhost'ta Supabase sync'i istemiyorsanız:

1. `.env.local` oluşturun
2. Ekleyin: `VITE_ENABLE_ANALYTICS=false`
3. Server'ı yeniden başlatın

**Not:** Default olarak artık localhost'ta da analytics aktif. Bu şekilde dashboard'u test edebilirsiniz.

## 📦 Supabase Tables

Analytics sistemi şu Supabase tablolarını kullanır:

### `players`
```sql
id                UUID PRIMARY KEY
display_name      TEXT NOT NULL
created_at        TIMESTAMP
last_seen_at      TIMESTAMP
total_sessions    INTEGER
```

### `game_sessions`
```sql
id                    UUID PRIMARY KEY
player_id             UUID REFERENCES players(id)
session_timestamp     TIMESTAMP
survival_time_ms      INTEGER
end_reason            TEXT
max_level             INTEGER
total_kills           INTEGER
crypto_pair           TEXT
position              TEXT
pnl_percent           FLOAT
device_fingerprint    TEXT
avg_fps               FLOAT
min_fps               FLOAT
```

### `error_reports`
```sql
id                    UUID PRIMARY KEY
player_id             UUID
error_type            TEXT
error_message         TEXT
stack_trace           TEXT
user_agent            TEXT
url                   TEXT
severity              TEXT
context               JSONB
reported_at           TIMESTAMP
status                TEXT DEFAULT 'new'
```

### `device_profiles`
```sql
fingerprint           TEXT PRIMARY KEY
device_type           TEXT
browser               TEXT
screen_width          INTEGER
screen_height         INTEGER
hardware_concurrency  INTEGER
device_memory         FLOAT
recommended_profile   TEXT
benchmark_score       FLOAT
first_seen_at         TIMESTAMP
last_seen_at          TIMESTAMP
```

## 📊 Analytics Views

Dashboard, önceden tanımlanmış SQL view'larını kullanır:

- `analytics_dau` - Daily active users
- `analytics_sessions` - Session statistics
- `analytics_top_errors` - Most frequent errors
- `analytics_performance_by_device` - Performance metrics by device
- `get_dashboard_summary()` - Quick summary function

Bu view'lar `supabase/migrations/001_analytics_views.sql` dosyasında tanımlıdır.

## 🛠️ Migration

Analytics sistemini kullanabilmeniz için Supabase migration'ını çalıştırmanız gerekiyor:

### Supabase CLI ile:

```bash
# Supabase CLI yükle (eğer yoksa)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Migration çalıştır
supabase db push
```

### Manuel (Supabase Dashboard):

1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/001_analytics_views.sql` dosyasını aç
3. Tüm SQL'i kopyala ve çalıştır

## 📈 Monitoring

### Error Stats

```typescript
import errorTracker from './services/analytics/ErrorTracker';

const stats = errorTracker.getStats();
console.log('Queue size:', stats.queueSize);
console.log('Recent errors:', stats.recentErrorsCount);
```

### Player Stats

```typescript
import playerTracker from './services/analytics/PlayerTracker';

const player = playerTracker.getCurrentPlayer();
if (player) {
  console.log('Display name:', player.displayName);
  console.log('Total sessions:', player.totalSessions);
  console.log('Last seen:', player.lastSeenAt);
}
```

## 🔒 Privacy & Security

### Error Sanitization

ErrorTracker otomatik olarak hassas bilgileri temizler:
- API keys → `api_key=***`
- Tokens → `token=***`
- Passwords → `password=***`
- Stack trace max 2000 karakter
- Error message max 500 karakter
- Context values max 200 karakter

### Data Retention

- Error reports: 24 saat sonra otomatik özetlenir
- Sessions: 30 gün historical data
- Player data: Silinene kadar saklanır

## 🐛 Troubleshooting

### Analytics Dashboard'da Veri Yok

**Çözüm:**
1. Supabase credentials kontrol edin (`.env`)
2. Migration çalıştırıldığını doğrulayın
3. Network tab'dan Supabase isteklerini kontrol edin
4. Console'da `[MetricsStorage]` loglarını kontrol edin

### Localhost'ta Sync Olmuyor

**Çözüm:**
- `.env.local` dosyasını kontrol edin
- `VITE_ENABLE_ANALYTICS=false` varsa kaldırın
- Server'ı yeniden başlatın

### Error Tracking Çalışmıyor

**Çözüm:**
1. Browser console'da error'ları kontrol edin
2. ErrorTracker import edildiğinden emin olun (otomatik olmalı)
3. Supabase `error_reports` tablosunu kontrol edin

## 📝 Best Practices

1. **Production'da mutlaka etkinleştirin:** Analytics sadece development için değil
2. **Dashboard'u düzenli kontrol edin:** Yeni hata trendlerini yakalayın
3. **Error context ekleyin:** Manuel error capture'da bolca context verin
4. **Rate limiting'e güvenin:** Aynı hatayı spam yapmayın
5. **Privacy-first:** Hassas user data'yı error context'e eklemeyin

## 🎉 Özellikler

- ⚡ Zero performance impact (async + queueing)
- 🔄 Offline support (errors queue edilir)
- 🎯 Smart deduplication
- 📊 Real-time dashboard
- 🔒 Privacy-safe by default
- 🌐 Multi-device tracking
- 📈 Historical analytics

---

**Son Güncelleme:** 2025-12-23  
**Version:** 1.0.0
