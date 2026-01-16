# Server-Side Market Indicators - Implementation Roadmap

> **Amaç**: Market indikatörlerini (RSI, Volume, ATR) Railway server'da hesaplayıp Supabase üzerinden tüm client'lara tutarlı şekilde sunmak.

---

## 📋 Özet

| Alan | Değişiklik |
|------|------------|
| **Railway Server** | Indicator calculator ekleme, market_state yazma |
| **Supabase** | Yeni `market_state` tablosu + Realtime |
| **Client** | Local calculation yerine Supabase subscription |
| **Anti-Cheat** | Server = Source of Truth |

---

## 🔍 Faz 0: Keşfet (Explore)

### İncelenecek Dosyalar

#### Railway Server (Mevcut)
| Dosya | Durum | Not |
|-------|-------|-----|
| `railway-market-server/src/index.ts` | ✅ İncelendi | Express server, health check |
| `railway-market-server/src/services/binanceService.ts` | ✅ İncelendi | WebSocket, KlineData (volume var) |
| `railway-market-server/src/services/priceLogger.ts` | ✅ İncelendi | price_logs'a yazıyor |
| `railway-market-server/src/services/supabaseService.ts` | 🔄 Güncellenecek | market_state desteği eklenecek |

#### Client (Mevcut)
| Dosya | Durum | Not |
|-------|-------|-----|
| `services/indicators/RSICalculator.ts` | ✅ Mevcut | Server'a taşınacak |
| `services/indicators/VolumeAnalyzer.ts` | ✅ Mevcut | Server'a taşınacak |
| `services/indicators/MarketIndicatorService.ts` | 🔄 Güncellenecek | Server verisini kullanacak |
| `services/SpawnSystem.ts` | 🔄 Güncellenecek | Server spawn rate kullanacak |
| `components/GameEngine.tsx` | 🔄 Güncellenecek | Local calc kaldırılacak |

#### Supabase (Mevcut)
| Tablo | Durum | Not |
|-------|-------|-----|
| `price_logs` | ✅ Mevcut | volume zaten loglanıyor |
| `market_state` | 🆕 Yeni | Oluşturulacak |

### Mevcut Testler

| Test Dosyası | Testler | Etkilenme |
|--------------|---------|-----------|
| `tests/indicators/RSICalculator.test.ts` | 24 | Server versiyonuna adapt edilecek |
| `tests/indicators/VolumeAnalyzer.test.ts` | 29 | Server versiyonuna adapt edilecek |
| `tests/indicators/MarketIndicatorService.test.ts` | 20 | Yeniden yazılacak |
| `tests/SpawnSystem.test.ts` | 4 | Güncellenecek |

### Bağımlılık Haritası

```
Binance WS
    │
    ▼
BinanceService (Railway)
    │
    ├──► PriceLogger ──► price_logs (Supabase)
    │
    └──► IndicatorService (YENİ)
              │
              ├──► RSICalculator
              ├──► ATRCalculator
              └──► VolumeAnalyzer
                        │
                        ▼
                  market_state (Supabase)
                        │
                        ▼ (Realtime)
                  MarketStateService (Client)
                        │
                        ├──► SpawnSystem
                        └──► GameEngine
```

---

## ⚠️ Potansiyel Riskler

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| Supabase Realtime latency | Orta | Orta | Son değeri cache'le, 100ms tolerans |
| Railway server downtime | Düşük | Yüksek | Last known values fallback |
| Rate limit (Supabase) | Düşük | Orta | Throttle updates (max 1/sec) |
| Client desync | Düşük | Orta | Timestamp validation |
| History reset on deploy | Yüksek | Düşük | 2 dakika warm-up period |

---

---

## 📅 Fazlar

### Faz 1: Supabase Schema (1-2 saat)
### Faz 2: Railway Indicator Service (3-4 saat)
### Faz 3: Client Integration (2-3 saat)
### Faz 4: Testing & Tuning (2-3 saat)

**Toplam Tahmini Süre**: 8-12 saat

---

## 🔷 FAZ 1: Supabase Schema

### 1.1 `market_state` Tablosu Oluşturma

```sql
-- Mevcut market durumunu tutar (her pair için 1 satır)
CREATE TABLE public.market_state (
  -- Primary Key
  pair VARCHAR(10) PRIMARY KEY,  -- 'BTC', 'ETH', 'SOL'
  
  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Raw Market Data
  price NUMERIC(20,8) NOT NULL,
  volume NUMERIC(24,8) NOT NULL,
  high NUMERIC(20,8),
  low NUMERIC(20,8),
  
  -- RSI Indicator (7-period)
  rsi NUMERIC(6,2) NOT NULL DEFAULT 50,
  rsi_state VARCHAR(20) NOT NULL DEFAULT 'NEUTRAL',
  -- Possible values: 'OVERSOLD' (<30), 'NEUTRAL' (30-70), 'OVERBOUGHT' (>70)
  
  -- ATR Indicator (14-period)
  atr NUMERIC(20,8) NOT NULL DEFAULT 0,
  atr_percent NUMERIC(8,4) NOT NULL DEFAULT 0,
  spawn_rate_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  -- Values: 0.5 (calm), 1.0 (normal), 1.5 (volatile), 2.0 (chaos)
  
  -- Volume Indicator (100-period rolling)
  normalized_volume NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
  volume_percentile NUMERIC(5,4) NOT NULL DEFAULT 0.5000,
  
  -- Whale Spawn
  whale_tier INTEGER NOT NULL DEFAULT 0,
  -- Values: 0=NONE, 1=BABY_WHALE, 2=WHALE, 3=MEGA_WHALE
  last_whale_spawn_at TIMESTAMPTZ,
  
  -- Normalization Context (for debugging/transparency)
  volume_history_min NUMERIC(24,8),
  volume_history_max NUMERIC(24,8),
  volume_history_count INTEGER DEFAULT 0,
  
  -- Enemy Modifier (pre-calculated for LONG position)
  enemy_aggro_multiplier_long NUMERIC(4,2) DEFAULT 1.0,
  enemy_aggro_multiplier_short NUMERIC(4,2) DEFAULT 1.0
);

-- Initial data for supported pairs
INSERT INTO public.market_state (pair, price, volume, rsi, rsi_state)
VALUES 
  ('BTC', 0, 0, 50, 'NEUTRAL'),
  ('ETH', 0, 0, 50, 'NEUTRAL'),
  ('SOL', 0, 0, 50, 'NEUTRAL');

-- RLS Policies
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market_state" 
  ON public.market_state FOR SELECT USING (true);

-- Only server can write (service_role key)
CREATE POLICY "Service role can update market_state" 
  ON public.market_state FOR UPDATE 
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert market_state" 
  ON public.market_state FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Index for realtime subscriptions
CREATE INDEX idx_market_state_pair ON public.market_state(pair);

COMMENT ON TABLE public.market_state IS 
  'Real-time market indicators calculated by Railway server. Updated every second.';
```

### 1.2 Supabase Realtime Aktifleştirme

```sql
-- Realtime publication için tablo ekle
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_state;
```

### 1.3 Doğrulama

- [ ] Tablo oluşturuldu
- [ ] 3 pair satırı mevcut (BTC, ETH, SOL)
- [ ] RLS policies aktif
- [ ] Realtime enabled

---

## 🔷 FAZ 2: Railway Indicator Service

### 2.1 Yeni Dosya Yapısı

```
railway-market-server/src/
├── services/
│   ├── binanceService.ts        (mevcut)
│   ├── supabaseService.ts       (güncelle)
│   ├── priceLogger.ts           (mevcut)
│   └── indicatorService.ts      (YENİ) ⭐
├── indicators/                   (YENİ klasör) ⭐
│   ├── RSICalculator.ts
│   ├── ATRCalculator.ts
│   ├── VolumeAnalyzer.ts
│   └── index.ts
└── types/
    └── indicators.ts            (YENİ) ⭐
```

### 2.2 `indicators/RSICalculator.ts`

```typescript
/**
 * RSI Calculator with Hysteresis (Server-Side)
 * 
 * Period: 7 candles
 * Thresholds: 30/70 with 5-point hysteresis
 */
export class RSICalculator {
  private prices: number[] = [];
  private period: number;
  private currentRSI: number = 50;
  private currentState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
  
  constructor(period: number = 7) {
    this.period = period;
  }
  
  update(price: number): { rsi: number; state: string } {
    // Add price to history
    this.prices.push(price);
    if (this.prices.length > this.period + 1) {
      this.prices.shift();
    }
    
    // Need period+1 prices to calculate
    if (this.prices.length < this.period + 1) {
      return { rsi: this.currentRSI, state: this.currentState };
    }
    
    // Calculate gains and losses
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < this.prices.length; i++) {
      const change = this.prices[i] - this.prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / this.period;
    const avgLoss = losses / this.period;
    
    // Calculate RSI
    if (avgLoss === 0) {
      this.currentRSI = avgGain === 0 ? 50 : 100;
    } else {
      const rs = avgGain / avgLoss;
      this.currentRSI = 100 - (100 / (1 + rs));
    }
    
    // Update state with hysteresis
    this.currentState = this.getStateWithHysteresis();
    
    return { rsi: this.currentRSI, state: this.currentState };
  }
  
  private getStateWithHysteresis(): 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' {
    // Entry thresholds
    if (this.currentRSI < 30) return 'OVERSOLD';
    if (this.currentRSI > 70) return 'OVERBOUGHT';
    
    // Exit thresholds (hysteresis)
    if (this.currentState === 'OVERSOLD' && this.currentRSI > 35) return 'NEUTRAL';
    if (this.currentState === 'OVERBOUGHT' && this.currentRSI < 65) return 'NEUTRAL';
    
    // Stay in current state
    return this.currentState;
  }
  
  reset(): void {
    this.prices = [];
    this.currentRSI = 50;
    this.currentState = 'NEUTRAL';
  }
}
```

### 2.3 `indicators/ATRCalculator.ts`

```typescript
/**
 * ATR Calculator (Average True Range)
 * 
 * Period: 14 candles
 */
export class ATRCalculator {
  private trValues: number[] = [];
  private prevClose: number | null = null;
  private period: number;
  
  constructor(period: number = 14) {
    this.period = period;
  }
  
  update(high: number, low: number, close: number): { atr: number; atrPercent: number } {
    // Calculate True Range
    let tr: number;
    if (this.prevClose === null) {
      tr = high - low;
    } else {
      tr = Math.max(
        high - low,
        Math.abs(high - this.prevClose),
        Math.abs(low - this.prevClose)
      );
    }
    
    this.prevClose = close;
    this.trValues.push(tr);
    
    if (this.trValues.length > this.period) {
      this.trValues.shift();
    }
    
    // Calculate ATR (simple moving average of TR)
    const atr = this.trValues.reduce((a, b) => a + b, 0) / this.trValues.length;
    const atrPercent = close > 0 ? (atr / close) * 100 : 0;
    
    return { atr, atrPercent };
  }
  
  getSpawnRateMultiplier(atrPercent: number): number {
    if (atrPercent < 1.0) return 0.5;  // Calm
    if (atrPercent < 2.0) return 1.0;  // Normal
    if (atrPercent < 4.0) return 1.5;  // Volatile
    return 2.0;  // Chaos (capped)
  }
  
  reset(): void {
    this.trValues = [];
    this.prevClose = null;
  }
}
```

### 2.4 `indicators/VolumeAnalyzer.ts`

```typescript
/**
 * Volume Analyzer with Percentile Normalization
 * 
 * History: 100 candles
 * Whale Cooldown: 5 seconds
 */
export class VolumeAnalyzer {
  private volumes: number[] = [];
  private historySize: number;
  private lastWhaleSpawn: number = 0;
  private whaleCooldownMs: number;
  
  constructor(historySize: number = 100, whaleCooldownMs: number = 5000) {
    this.historySize = historySize;
    this.whaleCooldownMs = whaleCooldownMs;
  }
  
  update(volume: number): {
    normalized: number;
    percentile: number;
    whaleTier: number;
    min: number;
    max: number;
  } {
    // Validate
    if (!Number.isFinite(volume) || volume <= 0) {
      return this.getCurrentState();
    }
    
    // Add to history
    this.volumes.push(volume);
    if (this.volumes.length > this.historySize) {
      this.volumes.shift();
    }
    
    return this.calculateMetrics(volume);
  }
  
  private calculateMetrics(currentVolume: number) {
    const min = Math.min(...this.volumes);
    const max = Math.max(...this.volumes);
    
    // Min-Max Normalization
    let normalized = 0.5;
    if (max > min) {
      normalized = (currentVolume - min) / (max - min);
    }
    
    // Percentile Calculation
    const sorted = [...this.volumes].sort((a, b) => a - b);
    const rank = sorted.filter(v => v < currentVolume).length;
    const percentile = rank / sorted.length;
    
    // Whale Tier (percentile-based)
    const whaleTier = this.getWhaleTier(percentile);
    
    return { normalized, percentile, whaleTier, min, max };
  }
  
  private getWhaleTier(percentile: number): number {
    if (percentile >= 0.95) return 3;  // MEGA_WHALE
    if (percentile >= 0.60) return 2;  // WHALE
    if (percentile >= 0.30) return 1;  // BABY_WHALE
    return 0;  // NONE
  }
  
  private getCurrentState() {
    if (this.volumes.length === 0) {
      return { normalized: 0.5, percentile: 0.5, whaleTier: 0, min: 0, max: 0 };
    }
    const last = this.volumes[this.volumes.length - 1];
    return this.calculateMetrics(last);
  }
  
  canSpawnWhale(now: number): boolean {
    return now - this.lastWhaleSpawn >= this.whaleCooldownMs;
  }
  
  recordWhaleSpawn(now: number): void {
    this.lastWhaleSpawn = now;
  }
  
  getHistoryCount(): number {
    return this.volumes.length;
  }
  
  reset(): void {
    this.volumes = [];
    this.lastWhaleSpawn = 0;
  }
}
```

### 2.5 `services/indicatorService.ts`

```typescript
import { RSICalculator } from '../indicators/RSICalculator';
import { ATRCalculator } from '../indicators/ATRCalculator';
import { VolumeAnalyzer } from '../indicators/VolumeAnalyzer';
import { SupabaseService } from './supabaseService';
import { Logger } from '../utils/logger';

interface PairIndicators {
  rsi: RSICalculator;
  atr: ATRCalculator;
  volume: VolumeAnalyzer;
}

export class IndicatorService {
  private static instance: IndicatorService | null = null;
  private indicators: Map<string, PairIndicators> = new Map();
  private supabase: SupabaseService;
  
  private constructor() {
    this.supabase = SupabaseService.getInstance();
    
    // Initialize indicators for each pair
    ['BTC', 'ETH', 'SOL'].forEach(pair => {
      this.indicators.set(pair, {
        rsi: new RSICalculator(7),
        atr: new ATRCalculator(14),
        volume: new VolumeAnalyzer(100, 5000),
      });
    });
  }
  
  static getInstance(): IndicatorService {
    return (IndicatorService.instance ??= new IndicatorService());
  }
  
  async update(data: {
    pair: string;
    price: number;
    high: number;
    low: number;
    volume: number;
  }): Promise<void> {
    const ind = this.indicators.get(data.pair);
    if (!ind) {
      Logger.warn(`Unknown pair: ${data.pair}`);
      return;
    }
    
    // Calculate all indicators
    const rsiResult = ind.rsi.update(data.price);
    const atrResult = ind.atr.update(data.high, data.low, data.price);
    const volumeResult = ind.volume.update(data.volume);
    
    // Calculate spawn rate multiplier
    const spawnRateMultiplier = ind.atr.getSpawnRateMultiplier(atrResult.atrPercent);
    
    // Calculate enemy aggro multipliers
    const { long: aggroLong, short: aggroShort } = 
      this.calculateAggroMultipliers(rsiResult.state);
    
    // Update Supabase
    await this.supabase.updateMarketState({
      pair: data.pair,
      price: data.price,
      volume: data.volume,
      high: data.high,
      low: data.low,
      rsi: rsiResult.rsi,
      rsi_state: rsiResult.state,
      atr: atrResult.atr,
      atr_percent: atrResult.atrPercent,
      spawn_rate_multiplier: spawnRateMultiplier,
      normalized_volume: volumeResult.normalized,
      volume_percentile: volumeResult.percentile,
      whale_tier: volumeResult.whaleTier,
      volume_history_min: volumeResult.min,
      volume_history_max: volumeResult.max,
      volume_history_count: ind.volume.getHistoryCount(),
      enemy_aggro_multiplier_long: aggroLong,
      enemy_aggro_multiplier_short: aggroShort,
    });
  }
  
  private calculateAggroMultipliers(rsiState: string): { long: number; short: number } {
    switch (rsiState) {
      case 'OVERSOLD':
        return { long: 0.7, short: 1.5 };  // Favors LONG
      case 'OVERBOUGHT':
        return { long: 1.5, short: 0.7 };  // Favors SHORT
      default:
        return { long: 1.0, short: 1.0 };  // Neutral
    }
  }
  
  recordWhaleSpawn(pair: string): void {
    const ind = this.indicators.get(pair);
    if (ind) {
      ind.volume.recordWhaleSpawn(Date.now());
    }
  }
}
```

### 2.6 `supabaseService.ts` Güncelleme

```typescript
// Mevcut fonksiyonlara ekle:

async updateMarketState(state: {
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  rsi: number;
  rsi_state: string;
  atr: number;
  atr_percent: number;
  spawn_rate_multiplier: number;
  normalized_volume: number;
  volume_percentile: number;
  whale_tier: number;
  volume_history_min: number;
  volume_history_max: number;
  volume_history_count: number;
  enemy_aggro_multiplier_long: number;
  enemy_aggro_multiplier_short: number;
}): Promise<void> {
  const { error } = await this.client
    .from('market_state')
    .upsert({
      ...state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'pair' });
  
  if (error) {
    throw new Error(`Failed to update market_state: ${error.message}`);
  }
}
```

### 2.7 `priceLogger.ts` Güncelleme

```typescript
// handleKlineData fonksiyonuna ekle:

private async handleKlineData(data: KlineData): Promise<void> {
  try {
    // Mevcut price logging...
    await withRetry(() => this.supabase.insertPriceLog({...}));
    
    // YENİ: Update indicators
    await IndicatorService.getInstance().update({
      pair: data.pair,
      price: data.close,
      high: data.high,
      low: data.low,
      volume: data.volume,
    });
    
    // Stats update...
  } catch (error) {
    // Error handling...
  }
}
```

### 2.8 Doğrulama

- [ ] RSICalculator unit tests geçiyor
- [ ] ATRCalculator unit tests geçiyor
- [ ] VolumeAnalyzer unit tests geçiyor
- [ ] IndicatorService Supabase'e yazıyor
- [ ] Her saniye market_state güncelleniyor

---

## 🔷 FAZ 3: Client Integration

### 3.1 Yeni Service: `MarketStateService.ts`

```typescript
/**
 * MarketStateService - Subscribes to Supabase market_state
 * 
 * Server'dan gelen indikatör verilerini client'a sağlar.
 * Local calculation yerine server'ı source of truth olarak kullanır.
 */
import { supabase } from './Supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EventBus } from './EventBus';
import { Logger } from './Logger';

export interface MarketState {
  pair: string;
  price: number;
  volume: number;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atr: number;
  atrPercent: number;
  spawnRateMultiplier: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: 0 | 1 | 2 | 3;
  enemyAggroMultiplier: number;  // Position'a göre hesaplanmış
  updatedAt: Date;
}

class MarketStateServiceImpl {
  private static instance: MarketStateServiceImpl | null = null;
  private channel: RealtimeChannel | null = null;
  private currentPair: string = 'BTC';
  private currentPosition: 'LONG' | 'SHORT' = 'LONG';
  private state: MarketState | null = null;
  
  static getInstance(): MarketStateServiceImpl {
    return (this.instance ??= new MarketStateServiceImpl());
  }
  
  async initialize(pair: string, position: 'LONG' | 'SHORT'): Promise<MarketState> {
    this.currentPair = pair;
    this.currentPosition = position;
    
    // Fetch initial state
    const { data, error } = await supabase
      .from('market_state')
      .select('*')
      .eq('pair', pair)
      .single();
    
    if (error) {
      Logger.error('[MarketStateService] Failed to fetch initial state:', error);
      throw error;
    }
    
    this.state = this.transformState(data);
    
    // Subscribe to realtime updates
    this.subscribeToUpdates();
    
    return this.state;
  }
  
  private subscribeToUpdates(): void {
    this.channel = supabase
      .channel('market_state_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_state',
          filter: `pair=eq.${this.currentPair}`,
        },
        (payload) => {
          this.handleUpdate(payload.new);
        }
      )
      .subscribe();
    
    Logger.info(`[MarketStateService] Subscribed to ${this.currentPair} updates`);
  }
  
  private handleUpdate(data: any): void {
    const prevState = this.state;
    this.state = this.transformState(data);
    
    // Emit events for significant changes
    if (prevState?.whaleTier !== this.state.whaleTier && this.state.whaleTier > 0) {
      EventBus.emit('whaleTierChanged', {
        tier: this.state.whaleTier,
        percentile: this.state.volumePercentile,
      });
    }
    
    if (prevState?.rsiState !== this.state.rsiState) {
      EventBus.emit('rsiStateChanged', {
        state: this.state.rsiState,
        rsi: this.state.rsi,
      });
    }
    
    // Always emit general update
    EventBus.emit('marketStateUpdated', this.state);
  }
  
  private transformState(data: any): MarketState {
    const aggroMultiplier = this.currentPosition === 'LONG'
      ? data.enemy_aggro_multiplier_long
      : data.enemy_aggro_multiplier_short;
    
    return {
      pair: data.pair,
      price: parseFloat(data.price),
      volume: parseFloat(data.volume),
      rsi: parseFloat(data.rsi),
      rsiState: data.rsi_state,
      atr: parseFloat(data.atr),
      atrPercent: parseFloat(data.atr_percent),
      spawnRateMultiplier: parseFloat(data.spawn_rate_multiplier),
      normalizedVolume: parseFloat(data.normalized_volume),
      volumePercentile: parseFloat(data.volume_percentile),
      whaleTier: data.whale_tier,
      enemyAggroMultiplier: aggroMultiplier,
      updatedAt: new Date(data.updated_at),
    };
  }
  
  getState(): MarketState | null {
    return this.state;
  }
  
  setPosition(position: 'LONG' | 'SHORT'): void {
    this.currentPosition = position;
    if (this.state) {
      // Recalculate aggro multiplier
      this.state.enemyAggroMultiplier = position === 'LONG'
        ? this.state.enemyAggroMultiplier  // Will be updated on next Supabase push
        : this.state.enemyAggroMultiplier;
    }
  }
  
  async destroy(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.state = null;
  }
}

export const marketStateService = MarketStateServiceImpl.getInstance();
```

### 3.2 SpawnSystem Güncelleme

```typescript
// services/SpawnSystem.ts

import { marketStateService } from './MarketStateService';

// update() fonksiyonunda:
const marketState = marketStateService.getState();
if (marketState) {
  // Server'dan gelen spawn rate multiplier'ı kullan
  scaledDifficulty *= marketState.spawnRateMultiplier;
  
  // Whale spawn kontrolü
  if (marketState.whaleTier > 0) {
    const config = WHALE_TIER_CONFIGS[marketState.whaleTier];
    if (config && Math.random() < config.spawnChance) {
      pool.getWhaleEnemy(x, y, difficulty, position, marketState.whaleTier);
    }
  }
}
```

### 3.3 GameEngine Güncelleme

```typescript
// components/GameEngine.tsx

import { marketStateService } from '../services/MarketStateService';

// useEffect - oyun başlangıcında:
useEffect(() => {
  if (status === GameStatus.PLAYING) {
    marketStateService.initialize(pair, position)
      .then(state => {
        Logger.info('[GameEngine] Market state initialized:', state);
      })
      .catch(err => {
        Logger.error('[GameEngine] Failed to initialize market state:', err);
      });
  }
  
  return () => {
    if (status !== GameStatus.PLAYING) {
      marketStateService.destroy();
    }
  };
}, [status, pair, position]);

// Update loop'ta artık local indicator calculation YOK
// marketIndicatorService.update() çağrısını KALDIR
```

### 3.4 Event Types Güncelleme

```typescript
// types/events.ts

export interface WhaleTierChangedEvent {
  tier: 0 | 1 | 2 | 3;
  percentile: number;
}

export interface RSIStateChangedEvent {
  state: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  rsi: number;
}

export interface MarketStateUpdatedEvent {
  // ... MarketState interface fields
}

// EventDataMap'e ekle:
whaleTierChanged: WhaleTierChangedEvent;
rsiStateChanged: RSIStateChangedEvent;
marketStateUpdated: MarketStateUpdatedEvent;
```

### 3.5 Doğrulama

- [ ] MarketStateService Supabase'den veri çekiyor
- [ ] Realtime subscription çalışıyor
- [ ] SpawnSystem server verilerini kullanıyor
- [ ] Local indicator calculation kaldırıldı

---

## 🔷 FAZ 4: Testing & Tuning

### 4.1 Unit Tests

```typescript
// tests/indicators/ServerRSICalculator.test.ts
// tests/indicators/ServerATRCalculator.test.ts
// tests/indicators/ServerVolumeAnalyzer.test.ts
```

### 4.2 Integration Tests

```typescript
// tests/integration/MarketStateService.test.ts
// - Supabase bağlantısı
// - Realtime subscription
// - State transformation
```

### 4.3 E2E Tests

```typescript
// e2e/market-indicators.spec.ts
// - Oyun başlangıcında state yükleniyor
// - RSI değişince enemy behavior değişiyor
// - Volume spike'ta whale spawn oluyor
```

### 4.4 Tuning Parametreleri

```typescript
// config/indicators.ts

export const INDICATOR_CONFIG = {
  rsi: {
    period: 7,
    oversoldThreshold: 30,
    overboughtThreshold: 70,
    hysteresis: 5,
  },
  atr: {
    period: 14,
    spawnRateThresholds: {
      calm: 1.0,
      normal: 2.0,
      volatile: 4.0,
    },
    spawnRateMultipliers: {
      calm: 0.5,
      normal: 1.0,
      volatile: 1.5,
      chaos: 2.0,
    },
  },
  volume: {
    historySize: 100,
    whaleCooldownMs: 5000,
    whaleTierThresholds: {
      baby: 0.30,
      whale: 0.60,
      mega: 0.95,
    },
  },
  whale: {
    babyWhale: { sizeMultiplier: 1.3, healthMultiplier: 1.5, spawnChance: 0.15 },
    whale: { sizeMultiplier: 1.6, healthMultiplier: 2.5, spawnChance: 0.25 },
    megaWhale: { sizeMultiplier: 2.0, healthMultiplier: 4.0, spawnChance: 0.20 },
  },
  enemy: {
    friendly: { aggroMultiplier: 0.7, speedMultiplier: 0.8 },
    neutral: { aggroMultiplier: 1.0, speedMultiplier: 1.0 },
    aggressive: { aggroMultiplier: 1.5, speedMultiplier: 1.3 },
  },
};
```

### 4.5 Monitoring

```typescript
// Railway /stats endpoint'ine ekle:
app.get('/stats', (_req, res) => {
  res.json({
    price: priceStats,
    cleanup: cleanupStats,
    indicators: IndicatorService.getInstance().getStats(),  // YENİ
  });
});
```

---

## 📊 Başarı Kriterleri

| Kriter | Hedef | Ölçüm |
|--------|-------|-------|
| **Latency** | < 100ms | Supabase round-trip |
| **Consistency** | 100% | Tüm client'lar aynı değeri görür |
| **Uptime** | 99.9% | Railway health check |
| **History Ready** | < 2 dakika | 100 veri noktası birikimi |
| **Whale Accuracy** | Volume spike = whale | Manual verification |

---

## 🚀 Deployment Checklist

### Pre-Deploy

- [ ] Supabase migration tamamlandı
- [ ] Railway env vars güncel
- [ ] Unit tests geçiyor
- [ ] Local test başarılı

### Deploy

- [ ] Railway server yeni kodu deploy et
- [ ] Supabase Realtime aktif
- [ ] Client build ve deploy

### Post-Deploy

- [ ] /stats endpoint kontrol
- [ ] market_state tablosu dolmuş mu?
- [ ] Client Realtime subscription çalışıyor mu?
- [ ] Oyunda whale spawn oluyor mu?

---

## 📝 Notlar

1. **Fallback**: Supabase erişilemezse, client son bilinen değerleri kullanır
2. **Rate Limit**: Supabase Realtime free tier 500 bağlantı/ay - yeterli başlangıç için
3. **Scaling**: İleride Railway → Supabase yerine Railway → Redis → Clients olabilir

---

## 🧪 TDD Yaklaşımı (Test-Driven Development)

Her faz için test-first yaklaşım:

### Faz 2 TDD Sırası

1. **Önce test yaz** - `railway-market-server/test/indicators/RSICalculator.test.ts`
2. **Testin fail ettiğini doğrula** - `npm run test`
3. **Implementasyonu yaz** - `railway-market-server/src/indicators/RSICalculator.ts`
4. **Testin pass ettiğini doğrula** - `npm run test`
5. **Refactor** - Clean code

### Faz 3 TDD Sırası

1. **Önce test yaz** - `tests/services/MarketStateService.test.ts`
2. **Mock Supabase** - Test isolation için
3. **Implementasyonu yaz** - `services/MarketStateService.ts`
4. **Integration test** - Gerçek Supabase ile

---

## 🔧 Lint & Format Komutları

Her değişiklik sonrası çalıştır:

```bash
# Railway Server
cd railway-market-server
// turbo
npm run lint:fix
// turbo
npm run format

# Client
cd ..
// turbo
npm run lint:fix
// turbo
npm run format
```

---

## ✅ Tüm Testleri Çalıştır (Doğrulama)

```bash
# Railway Server Tests
cd railway-market-server
// turbo
npm run test

# Client Tests
cd ..
// turbo
npm run test

# E2E Tests (opsiyonel)
// turbo
npm run test:e2e
```

---

## 📋 Değişiklik Özeti (Her Faz Sonunda Güncelle)

### Faz 1 Değişiklikleri
| Dosya | Değişiklik | Breaking? |
|-------|------------|-----------|
| Supabase | `market_state` tablosu eklendi | Hayır |

### Faz 2 Değişiklikleri
| Dosya | Değişiklik | Breaking? |
|-------|------------|-----------|
| `railway-market-server/src/indicators/RSICalculator.ts` | Yeni dosya | Hayır |
| `railway-market-server/src/indicators/ATRCalculator.ts` | Yeni dosya | Hayır |
| `railway-market-server/src/indicators/VolumeAnalyzer.ts` | Yeni dosya | Hayır |
| `railway-market-server/src/services/indicatorService.ts` | Yeni dosya | Hayır |
| `railway-market-server/src/services/supabaseService.ts` | `updateMarketState` eklendi | Hayır |
| `railway-market-server/src/services/priceLogger.ts` | Indicator update çağrısı | Hayır |

### Faz 3 Değişiklikleri
| Dosya | Değişiklik | Breaking? |
|-------|------------|-----------|
| `services/MarketStateService.ts` | Yeni dosya | Hayır |
| `services/SpawnSystem.ts` | Server state kullanımı | Hayır |
| `components/GameEngine.tsx` | Local calc kaldırıldı | Hayır |
| `types/events.ts` | Yeni event types | Hayır |
| `services/indicators/MarketIndicatorService.ts` | DEPRECATED | Evet (ileride kaldırılacak) |

---

## 💾 Commit Mesajları (Conventional Commits)

```bash
# Faz 1
git commit -m "feat(supabase): add market_state table for server-side indicators"

# Faz 2
git commit -m "feat(railway): add RSI, ATR, Volume calculators to market server"

# Faz 3
git commit -m "feat(client): integrate MarketStateService with Supabase realtime"

# Faz 4
git commit -m "test(indicators): add comprehensive tests for server-side indicators"
```

---

## 🔄 Rollback Planı

Bir şey ters giderse:

1. **Client**: `marketStateService` kullanımını kaldır, eski `marketIndicatorService` aktifleştir
2. **Railway**: `IndicatorService.update()` çağrısını kaldır
3. **Supabase**: `market_state` tablosunu drop et (veri kaybı yok)

---

**Son Güncelleme**: 2026-01-01
**Onay Durumu**: Bekliyor
**Workflow Uyumu**: ✅ feature.md ile uyumlu

