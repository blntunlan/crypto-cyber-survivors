# 🗺️ Model B: Client Calc + Server Verify - Geçiş Yol Haritası

> **Durum:** Planlama  
> **Oluşturma:** 2025-12-23  
> **Güncelleme:** 2025-12-23 16:45  
> **Hedef:** Live feed verisini server'da loglayıp, client hesaplamalarını oyun sonunda doğrulama

---

## 📑 İçindekiler

1. [Model B Özeti](#-model-b-özeti)
2. [Mimari Genel Bakış](#-mimari-genel-bakış)
3. [Faz Sıralaması İlkesi](#-faz-sıralaması-ilkesi)
4. **[BÖLÜM A: MVP (Temel Sistem)](#-bölüm-a-mvp-temel-sistem)**
5. **[BÖLÜM B: Sinyal Sistemi](#-bölüm-b-sinyal-sistemi)**
6. **[BÖLÜM C: Analytics](#-bölüm-c-analytics)**
7. [Karar Logları](#-karar-logları)
8. [Zaman Çizelgesi](#-zaman-çizelgesi)

---

## 📊 Model B Özeti

### Temel Prensipler

| Bileşen | Rol |
|---------|-----|
| **Client** | Binance'den direkt veri alır, RSI/ATR/PnL hesaplar, OYNAR |
| **Server** | Binance'den veri alır, LOGLAR + İndikatör hesaplar |
| **Verification** | Oyun bitiminde client verileri server loglarıyla karşılaştırılır |
| **Ödül** | Doğrulama başarılıysa verilir |

### Neden Model B?

| ✅ Avantaj | Açıklama |
|-----------|----------|
| Düşük latency | Client → Binance direkt (~30ms) |
| Mevcut kod çalışır | useMarketData.ts değişmez |
| Server maliyeti düşük | Sadece log + sinyal hesaplama |
| Güvenli | Post-game verification ile hile engeli |
| Scalable | Her client kendi CPU'sunu kullanır |

---

## 🏗️ Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                        HEDEF MİMARİ                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │   Binance    │                                              │
│   │   WebSocket  │                                              │
│   └──────┬───────┘                                              │
│          │                                                       │
│    ┌─────┴─────────────────────────────────┐                    │
│    ▼                                       ▼                    │
│  Railway Server                         Client                  │
│  ─────────────                          ──────                  │
│  • Price logs (1s)                      • Oyun oynama           │
│  • Market signals (5dk)                 • PnL hesaplama         │
│  • Historical data API                  • RSI/ATR (local)       │
│  • Verification                                                  │
│    │                                            │               │
│    │  Oyun Bitimi                               │               │
│    ▼                                            ▼               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                      SUPABASE                               │ │
│  │  ┌─────────────┐ ┌───────────────┐ ┌────────────────────┐ │ │
│  │  │ price_logs  │ │ game_sessions │ │  market_signals    │ │ │
│  │  │ (24h data)  │ │ (verified)    │ │  (5dk intervals)   │ │ │
│  │  └─────────────┘ └───────────────┘ └────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Faz Sıralaması İlkesi

### "Build → Test → Extend"

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   📦 BÖLÜM A: MVP (Temel Sistem)                                │
│   ───────────────────────────────                               │
│   price_logs → price logger → verification → client             │
│                                                                  │
│   🎯 CHECKPOINT A: PnL doğrulaması çalışıyor mu?                │
│                                                                  │
│   📦 BÖLÜM B: Sinyal Sistemi                                    │
│   ──────────────────────────                                    │
│   signal_tables → signal_service → tracking → main_menu        │
│                                                                  │
│   🎯 CHECKPOINT B: Sinyaller görülüyor, tracking çalışıyor mu? │
│                                                                  │
│   📦 BÖLÜM C: Analytics                                         │
│   ─────────────────────                                         │
│   analytics_queries → dashboard                                 │
│                                                                  │
│   🎯 CHECKPOINT C: Raporlar doğru mu?                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📦 BÖLÜM A: MVP (Temel Sistem)

> **Hedef:** Oyun oynandığında PnL doğrulaması yapılıp ödül verilebilmesi
> **Tahmini Süre:** ~6 saat

---

## 📦 Faz 1A: Supabase Temel Tablolar

### Süre: ~20 dakika

### Adımlar

- [ ] **1A.1** `price_logs` tablosu oluştur
- [ ] **1A.2** `game_sessions` tablosu oluştur
- [ ] **1A.3** Index'ler ekle
- [ ] **1A.4** RLS ayarla

### SQL

```sql
-- Fiyat logları (24 saat retention)
CREATE TABLE price_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pair VARCHAR(10) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8),
  high DECIMAL(20, 8),
  low DECIMAL(20, 8),
  source VARCHAR(20) DEFAULT 'binance'
);

CREATE INDEX idx_price_logs_lookup 
ON price_logs(pair, timestamp DESC);

-- Oyun oturumları
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  
  -- Zaman
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  survival_seconds INT NOT NULL,
  
  -- Pozisyon
  pair VARCHAR(10) NOT NULL,
  position VARCHAR(5) NOT NULL,
  leverage INT NOT NULL,
  
  -- Client iddiası
  claimed_entry_price DECIMAL(20, 8),
  claimed_exit_price DECIMAL(20, 8),
  claimed_pnl DECIMAL(10, 6),
  
  -- Server doğrulaması
  verified_entry_price DECIMAL(20, 8),
  verified_exit_price DECIMAL(20, 8),
  verified_pnl DECIMAL(10, 6),
  
  -- Sonuç
  is_verified BOOLEAN DEFAULT FALSE,
  verification_error TEXT,
  
  -- İstatistik
  kills INT DEFAULT 0,
  level INT DEFAULT 1,
  gold_collected INT DEFAULT 0,
  
  -- Ödül
  reward_amount DECIMAL(20, 8) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_game_sessions_user 
ON game_sessions(user_id, created_at DESC);
```

### Çıktılar
- [ ] `price_logs` tablosu oluşturuldu
- [ ] `game_sessions` tablosu oluşturuldu
- [ ] Index'ler eklendi

---

## 📦 Faz 2A: Railway Price Logger

### Süre: ~2 saat

### Adımlar

- [ ] **2A.1** Railway'de Node.js projesi oluştur
- [ ] **2A.2** Binance WebSocket client
- [ ] **2A.3** Supabase client entegrasyonu
- [ ] **2A.4** Price logging (1 saniyede 1)
- [ ] **2A.5** Historical data endpoint
- [ ] **2A.6** Health check endpoint
- [ ] **2A.7** Deploy

### Dosya Yapısı

```
railway-market-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── binanceClient.ts
│   ├── supabaseClient.ts
│   ├── priceLogger.ts
│   ├── routes/
│   │   └── history.ts
│   └── config.ts
└── .env.example
```

### Temel Kod

```typescript
// src/index.ts
import express from 'express';
import { connectBinance } from './binanceClient';
import { logPrice } from './priceLogger';
import historyRouter from './routes/history';

const app = express();
const PAIRS = ['BTC', 'ETH', 'SOL'];

// API routes
app.use('/api', historyRouter);
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Start price logging
for (const pair of PAIRS) {
  connectBinance(pair, (data) => {
    logPrice({ pair, ...data });
  });
}

app.listen(3001, () => console.log('🚀 Server ready'));
```

```typescript
// src/routes/history.ts
router.get('/market/history', async (req, res) => {
  const { pair = 'BTC', count = 14 } = req.query;
  
  const { data } = await supabase
    .from('price_logs')
    .select('price, timestamp')
    .eq('pair', pair)
    .order('timestamp', { ascending: false })
    .limit(Number(count));
  
  res.json({ pair, prices: data.reverse() });
});
```

### Çıktılar
- [ ] Railway projesi canlı
- [ ] Binance bağlantısı aktif
- [ ] Price logging çalışıyor
- [ ] `/api/market/history` endpoint çalışıyor

---

## 📦 Faz 3A: Verification (Temel)

### Süre: ~1.5 saat

### Adımlar

- [ ] **3A.1** Supabase Edge Function: `verify-game`
- [ ] **3A.2** Fiyat lookup
- [ ] **3A.3** PnL hesaplama ve karşılaştırma
- [ ] **3A.4** Tolerans kontrolleri
- [ ] **3A.5** Ödül hesaplama

### Toleranslar

```typescript
const TOLERANCE = {
  PRICE: 0.001,   // %0.1
  PNL: 0.005,     // %0.5
  TIME: 5000,     // 5 saniye
};
```

### Edge Function (Temel)

```typescript
// supabase/functions/verify-game/index.ts
serve(async (req) => {
  const { userId, startTime, endTime, pair, position, leverage,
          claimedEntryPrice, claimedExitPrice, claimedPnL,
          kills, level, goldCollected } = await req.json();

  // 1. Fiyatları al
  const entryLog = await getPriceAt(pair, startTime);
  const exitLog = await getPriceAt(pair, endTime);
  
  if (!entryLog || !exitLog) {
    return error('Price data not found');
  }

  // 2. Fiyat tolerans kontrolü
  if (!withinTolerance(entryLog.price, claimedEntryPrice, TOLERANCE.PRICE) ||
      !withinTolerance(exitLog.price, claimedExitPrice, TOLERANCE.PRICE)) {
    return error('Price mismatch');
  }

  // 3. PnL hesapla ve doğrula
  let verifiedPnL = (exitLog.price - entryLog.price) / entryLog.price;
  if (position === 'SHORT') verifiedPnL = -verifiedPnL;
  verifiedPnL *= leverage;

  if (Math.abs(verifiedPnL - claimedPnL) > TOLERANCE.PNL) {
    return error('PnL mismatch');
  }

  // 4. Ödül hesapla
  const reward = calculateReward(verifiedPnL, endTime - startTime, kills, level);

  // 5. Kaydet
  await supabase.from('game_sessions').insert({
    user_id: userId,
    // ... tüm alanlar
    is_verified: true,
    reward_amount: reward,
  });

  return success({ verified: true, reward, verifiedPnL });
});
```

### Çıktılar
- [ ] Edge function deploy edildi
- [ ] PnL doğrulaması çalışıyor
- [ ] Ödül hesaplanıyor

---

## 📦 Faz 4A: Client Entegrasyonu (Temel)

### Süre: ~1 saat

### Adımlar

- [ ] **4A.1** `gameSessionService.ts` oluştur
- [ ] **4A.2** Game over'da verify çağır
- [ ] **4A.3** Sonuç UI göster

### Servis

```typescript
// services/gameSessionService.ts
export async function verifyGameSession(data: GameSessionData): Promise<VerificationResult> {
  const response = await supabase.functions.invoke('verify-game', { body: data });
  
  if (response.error) {
    return { verified: false, error: response.error.message };
  }
  
  return response.data;
}
```

### Game.tsx Entegrasyonu

```typescript
const handleGameOver = async () => {
  const result = await verifyGameSession({
    userId: currentUser.id,
    startTime: gameStartTime,
    endTime: Date.now(),
    pair: selectedPair,
    position: selectedPosition,
    leverage: selectedLeverage,
    entryPrice: entryPriceRef.current,
    exitPrice: marketData.price,
    pnl: marketData.effectivePnl,
    kills: stats.kills,
    level: player.level,
    goldCollected: stats.gold,
  });
  
  setGameOverData({ ...result });
  setGameStatus(GameStatus.GAME_OVER);
};
```

### Çıktılar
- [ ] Game over'da verify çağrılıyor
- [ ] Sonuç ekranda gösteriliyor

---

## 📦 Faz 5A: MVP Testi

### Süre: ~1 saat

### Test Senaryoları

| Test | Beklenen |
|------|----------|
| Normal oyun, doğru veriler | ✅ Verified, ödül |
| Manipüle edilmiş PnL | ❌ PnL mismatch |
| Yanlış entry price | ❌ Price mismatch |
| Server veri boşluğu | ❌ Data not found |

### Çıktılar
- [ ] Temel akış çalışıyor
- [ ] Hata durumları handle ediliyor

---

## 🎯 CHECKPOINT A

```
┌─────────────────────────────────────────────────────────────────┐
│                     MVP KONTROL LİSTESİ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ ] Oyun oynandığında price_logs'a yazılıyor                   │
│  [ ] Oyun bitiminde verification çağrılıyor                     │
│  [ ] PnL doğru hesaplanıyor                                     │
│  [ ] Ödül doğru hesaplanıyor                                    │
│  [ ] Manipulation tespit ediliyor                               │
│                                                                  │
│  ✅ Tümü tamam → BÖLÜM B'ye geç                                  │
│  ❌ Eksik var → debug et, düzelt                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📦 BÖLÜM B: Sinyal Sistemi

> **Hedef:** Main menu'de market sinyalleri göstermek ve oyuncu davranışını track etmek
> **Tahmini Süre:** ~5 saat
> **Bağımlılık:** BÖLÜM A tamamlanmalı

---

## 📦 Faz 1B: Sinyal Tabloları

### Süre: ~20 dakika

### Adımlar

- [ ] **1B.1** `market_signals` tablosu oluştur
- [ ] **1B.2** `signal_performance` tablosu oluştur
- [ ] **1B.3** `game_sessions`'a sinyal kolonları ekle

### SQL

```sql
-- Market sinyalleri (5 dakikada 1 kayıt)
CREATE TABLE market_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  pair VARCHAR(10) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  
  -- Sinyaller (GREEN, GRAY, RED)
  trend_signal VARCHAR(10) NOT NULL,
  rsi_signal VARCHAR(10) NOT NULL,
  macd_signal VARCHAR(10) NOT NULL,
  
  -- Raw değerler
  rsi_value DECIMAL(5, 2),
  macd_histogram DECIMAL(10, 4),
  ema20 DECIMAL(20, 8),
  ema50 DECIMAL(20, 8),
  
  -- Kombine
  overall_signal VARCHAR(10) NOT NULL,
  signal_strength INT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_signals_lookup 
ON market_signals(pair, timestamp DESC);

-- Sinyal performansı
CREATE TABLE signal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair VARCHAR(10) NOT NULL,
  signal_type VARCHAR(10) NOT NULL,
  total_games INT DEFAULT 0,
  followed_count INT DEFAULT 0,
  contrary_count INT DEFAULT 0,
  followed_avg_pnl DECIMAL(10, 4),
  contrary_avg_pnl DECIMAL(10, 4),
  followed_success_rate DECIMAL(5, 2),
  contrary_success_rate DECIMAL(5, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- game_sessions'a sinyal kolonları ekle
ALTER TABLE game_sessions ADD COLUMN signal_id UUID REFERENCES market_signals(id);
ALTER TABLE game_sessions ADD COLUMN followed_signal BOOLEAN;
ALTER TABLE game_sessions ADD COLUMN signal_overall VARCHAR(10);
ALTER TABLE game_sessions ADD COLUMN signal_trend VARCHAR(10);
ALTER TABLE game_sessions ADD COLUMN signal_rsi VARCHAR(10);
ALTER TABLE game_sessions ADD COLUMN signal_macd VARCHAR(10);
```

### Çıktılar
- [ ] `market_signals` tablosu oluşturuldu
- [ ] `signal_performance` tablosu oluşturuldu
- [ ] `game_sessions` güncellendi

---

## 📦 Faz 2B: Market Signal Service

### Süre: ~1.5 saat

### Adımlar

- [ ] **2B.1** Signal hesaplama fonksiyonları (RSI, MACD, EMA)
- [ ] **2B.2** 5 dakikalık cron job / interval
- [ ] **2B.3** `/api/market/analysis` endpoint
- [ ] **2B.4** Binance kline API entegrasyonu

### Sinyal Mantığı

```typescript
// 3 Renk Sistemi
const calculateSignals = (closes: number[]) => {
  const rsi = calculateRSI(closes, 14);
  const { histogram } = calculateMACD(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  // Sinyaller
  const trend_signal = ema20 > ema50 * 1.002 ? 'GREEN' : 
                       ema20 < ema50 * 0.998 ? 'RED' : 'GRAY';
  const rsi_signal = rsi < 40 ? 'GREEN' : rsi > 60 ? 'RED' : 'GRAY';
  const macd_signal = histogram > 0 ? 'GREEN' : histogram < 0 ? 'RED' : 'GRAY';
  
  // Kombine
  const signals = [trend_signal, rsi_signal, macd_signal];
  const greenCount = signals.filter(s => s === 'GREEN').length;
  const redCount = signals.filter(s => s === 'RED').length;
  
  const overall_signal = greenCount >= 2 ? 'LONG' : 
                        redCount >= 2 ? 'SHORT' : 'NEUTRAL';
  
  return { trend_signal, rsi_signal, macd_signal, overall_signal, 
           rsi_value: rsi, signal_strength: greenCount - redCount };
};
```

### Çıktılar
- [ ] Signal hesaplama çalışıyor
- [ ] 5 dakikada 1 güncelleniyor
- [ ] `/api/market/analysis` endpoint çalışıyor

---

## 📦 Faz 3B: Signal Tracking

### Süre: ~45 dakika

### Adımlar

- [ ] **3B.1** Verification'da aktif sinyali al
- [ ] **3B.2** `followed_signal` hesapla
- [ ] **3B.3** `signal_performance` güncelleme

### Verification Güncellemesi

```typescript
// verify-game Edge Function - güncelleme
const activeSignal = await getActiveSignal(pair);

const followed_signal = 
  (activeSignal.overall_signal === 'LONG' && position === 'LONG') ||
  (activeSignal.overall_signal === 'SHORT' && position === 'SHORT');

// Session'a ekle
await supabase.from('game_sessions').insert({
  ...sessionData,
  signal_id: activeSignal.id,
  followed_signal,
  signal_overall: activeSignal.overall_signal,
  signal_trend: activeSignal.trend_signal,
  signal_rsi: activeSignal.rsi_signal,
  signal_macd: activeSignal.macd_signal,
});

// Performance güncelle
await updateSignalPerformance(pair, activeSignal.overall_signal, followed_signal, verifiedPnL);
```

### Çıktılar
- [ ] Sinyal tracking çalışıyor
- [ ] `followed_signal` doğru hesaplanıyor
- [ ] Performance istatistikleri güncelleniyor

---

## 📦 Faz 4B: Main Menu Analytics

### Süre: ~1.5 saat

### Adımlar

- [ ] **4B.1** `useMarketAnalysis` hook
- [ ] **4B.2** `MarketAnalysisPanel` component
- [ ] **4B.3** Main menu entegrasyonu

### UI Konsepti

```
┌───────────────────────────────────────────────────────────────┐
│  📊 MARKET ANALYSIS (15m)                    BTC/USDT        │
├───────────────────────────────────────────────────────────────┤
│  💰 $97,523.45                                                │
│                                                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│  │  📈 TREND  │ │  🔋 RSI    │ │  📊 MACD   │                │
│  │    🟢      │ │    ⚪      │ │    🟢      │                │
│  │  BULLISH   │ │   65.2     │ │  BULLISH   │                │
│  └────────────┘ └────────────┘ └────────────┘                │
│                                                                │
│  🎯 OVERALL: 🟢 LONG (Bu sinyale uyanların başarısı: %67)    │
└───────────────────────────────────────────────────────────────┘
```

### Çıktılar
- [ ] Hook çalışıyor
- [ ] Panel görüntüleniyor
- [ ] 5 dakikada 1 güncelleniyor

---

## 📦 Faz 5B: Sinyal Tutarlılık Testi

### Süre: ~1 saat

### Test Senaryoları

| Test | Beklenen |
|------|----------|
| LONG sinyalken LONG seçti | followed_signal = true |
| LONG sinyalken SHORT seçti | followed_signal = false |
| Sinyal performansı güncelleniyor | İstatistikler doğru |

### Çıktılar
- [ ] Sinyal tracking doğru
- [ ] Performance güncelleme doğru

---

## 🎯 CHECKPOINT B

```
┌─────────────────────────────────────────────────────────────────┐
│                   SİNYAL KONTROL LİSTESİ                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ ] Main menu'de sinyaller görünüyor                           │
│  [ ] 5 dakikada 1 güncelleniyor                                 │
│  [ ] Tüm oyuncular aynı sinyali görüyor                         │
│  [ ] followed_signal doğru hesaplanıyor                         │
│  [ ] Performance istatistikleri güncelleniyor                   │
│                                                                  │
│  ✅ Tümü tamam → BÖLÜM C'ye geç (opsiyonel)                     │
│  ❌ Eksik var → debug et, düzelt                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 📦 BÖLÜM C: Analytics

> **Hedef:** Sinyal etkinliği ve oyuncu davranış analizleri
> **Tahmini Süre:** ~2 saat
> **Bağımlılık:** BÖLÜM B tamamlanmalı (opsiyonel)

---

## 📦 Faz 7: Analytics Dashboard

### Süre: ~2 saat

### Adımlar

- [ ] **7.1** Sinyal etkinlik API'si
- [ ] **7.2** Oyuncu davranış analizi
- [ ] **7.3** Admin dashboard UI

### Analitik Sorgular

```sql
-- Sinyal etkinliği (son 7 gün)
SELECT 
  pair,
  signal_overall,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE followed_signal = true) as followed,
  AVG(verified_pnl) FILTER (WHERE followed_signal = true) as followed_avg_pnl,
  COUNT(*) FILTER (WHERE followed_signal = false) as contrary,
  AVG(verified_pnl) FILTER (WHERE followed_signal = false) as contrary_avg_pnl
FROM game_sessions
WHERE created_at > NOW() - INTERVAL '7 days' AND is_verified = true
GROUP BY pair, signal_overall;

-- En başarılı strateji
SELECT 
  signal_trend || '+' || signal_rsi || '+' || signal_macd as combo,
  position,
  COUNT(*) as games,
  AVG(verified_pnl) as avg_pnl,
  SUM(CASE WHEN verified_pnl > 0 THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as win_rate
FROM game_sessions
WHERE is_verified = true
GROUP BY combo, position
HAVING COUNT(*) >= 10
ORDER BY avg_pnl DESC;
```

### Çıktılar
- [ ] Analytics API'si çalışıyor
- [ ] Dashboard görüntüleniyor

---

# 📋 Karar Logları

### Alınan Kararlar

| Tarih | Karar | Gerekçe |
|-------|-------|---------|
| 2025-12-23 | Model B seçildi | Düşük latency, mevcut kod korunuyor |
| 2025-12-23 | Offline oyun yok | Live feed zorunlu |
| 2025-12-23 | Supabase kullanılacak | Mevcut altyapı, free tier |
| 2025-12-23 | 24h veri retention | Storage optimizasyonu |
| 2025-12-23 | Tek sunucu (Frankfurt) | Bölge seçimi önemsiz |
| 2025-12-23 | RSI: Historical data + soft verification | Tutarlılık için |
| 2025-12-23 | Whale spawn: Client-local | Single-player, senkron gerekmez |
| 2025-12-23 | 3 renk sistemi | Yeşil/Gri/Kırmızı sinyaller |
| 2025-12-23 | Sinyal gösterimi: Main Menu | 5dk'da 1 sunucudan |
| 2025-12-23 | Faz sıralaması: MVP → Sinyal → Analytics | İnkremental, test edilebilir |

### Bekleyen Kararlar

- [ ] Ödül formülü detayları
- [ ] Rate limiting değerleri
- [ ] $SURV token entegrasyonu (sonraki iterasyon)

---

# 📅 Zaman Çizelgesi

| Bölüm | Faz | İçerik | Süre | Durum |
|-------|-----|--------|------|-------|
| **A** | 1A | Supabase Temel | 20 dk | ⬜ |
| **A** | 2A | Railway Price Logger | 2 saat | ⬜ |
| **A** | 3A | Verification Temel | 1.5 saat | ⬜ |
| **A** | 4A | Client Entegrasyonu | 1 saat | ⬜ |
| **A** | 5A | MVP Testi | 1 saat | ⬜ |
| | | **BÖLÜM A TOPLAM** | **~6 saat** | |
| 🎯 | | **CHECKPOINT A** | | |
| **B** | 1B | Sinyal Tabloları | 20 dk | ⬜ |
| **B** | 2B | Signal Service | 1.5 saat | ⬜ |
| **B** | 3B | Signal Tracking | 45 dk | ⬜ |
| **B** | 4B | Main Menu Analytics | 1.5 saat | ⬜ |
| **B** | 5B | Sinyal Testi | 1 saat | ⬜ |
| | | **BÖLÜM B TOPLAM** | **~5 saat** | |
| 🎯 | | **CHECKPOINT B** | | |
| **C** | 7 | Analytics Dashboard | 2 saat | ⬜ |
| | | **BÖLÜM C TOPLAM** | **~2 saat** | |
| | | **GENEL TOPLAM** | **~13 saat** | |

---

> **Son Güncelleme:** 2025-12-23 16:45
