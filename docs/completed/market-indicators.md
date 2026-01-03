---
description: Market İndikatörleri → Oyun Mekaniği Implementasyonu (Volume, RSI, ATR)
---

# Market Indicators to Gameplay Feature Implementation

Bu workflow, gerçek market indikatörlerinin (Volume, RSI, ATR) oyun mekaniğine entegrasyonunu adım adım gerçekleştirir.

## 🎯 Hedef
Real-time market verileri → Düşman davranışı, spawn rate, zorluk seviyesi

## ⚠️ KRİTİK NOTLAR (Keşif Sonucu)

### Mevcut Sistem Analizi
- ✅ **PriceAnalyzerService**: ATR, volatility, trend zaten hesaplanıyor (Period 14)
- ✅ **DifficultyManager**: ATR-based volatility factor mevcut (line 130-134)
- ❌ **RSI hesabı yok**: Sıfırdan eklenmeli
- ❌ **Volume normalizasyonu yok**: Whale spawn için eklenmeli

### Mimari Karar
**YANLIŞ YAKLAŞIM**: Yeni servisler oluşturmak → Kod tekrarı
**DOĞRU YAKLAŞIM**: Mevcut servisleri **genişlet**:
- PriceAnalyzerService'e RSI ekle
- MarketService'den volume al, normalize et
- Market state orchestrator oluştur (mevcut servisleri birleştirir)

---

## Faz 0: Edge Case Analizi ⚠️

### Volume Edge Cases
| Case | Durum | Çözüm |
|------|-------|-------|
| Volume = 0 | WebSocket hatası | Son bilinen volume kullan |
| Volume < 100 datapoints | Oyun başlangıcı | Whale spawn devre dışı |
| Tüm volume'lar eşit | Flat market | normalized = 0.5 (neutral) |
| Extreme outlier | Whale manipulation | Z-score clamp ±3σ |

### RSI Edge Cases
| Case | Durum | Çözüm |
|------|-------|-------|
| < 8 fiyat noktası | Oyun başlangıcı | RSI = 50 (neutral) |
| avgLoss = 0 | Sadece gain | RSI = 100 |
| avgGain = 0 | Sadece loss | RSI = 0 |
| Hızlı RSI değişimi | State flapping | Hysteresis: 5 data point buffer |
| Fiyat değişimi yok | Stagnant market | RSI = 50 (neutral) |

### ATR Edge Cases
| Case | Durum | Çözüm |
|------|-------|-------|
| < 2 candle | Oyun başlangıcı | ATR = 0, spawn rate = 1.0x |
| ATR = 0 | Flat market | spawn rate = 0.5x (minimum) |
| Extreme ATR (>10%) | Flash crash | Clamp to max 4% for calculation |
| Price = 0 | WebSocket hatası | ATR calculation skip |

### Enemy Behavior Edge Cases
| Case | Durum | Çözüm |
|------|-------|-------|
| RSI state değişimi | Mevcut düşmanlar? | Yeni düşmanlar etkilenir, mevcutlar değişmez |
| Hysteresis zone | RSI 28-32 veya 78-82 | Son state'i koru (bounce prevention) |
| Position switch | Long→Short | Tüm enemy modifiers tersine döner |
| Offline mode | WebSocket down | Neutral enemies (no modifiers) |

### Spawn System Edge Cases
| Case | Durum | Çözüm |
|------|-------|-------|
| 2.5x spawn rate + MAX_ENEMIES | Enemy cap | Spawn rate cap'e ulaşınca durdur |
| Whale spam | 5 saniyede 3 whale | MIN_WHALE_INTERVAL: 5000ms |
| Çoklu whale tier değişimi | Hızlı volume spike | Cooldown sırasında tier güncellemesi yok |
| Performance | 150+ enemy | Spawn multiplier auto-scale down |

---

## Faz 1: Tip Tanımlamaları

1. **Indicator tiplerini oluştur**
   - `types/indicators.ts` dosyası oluştur
   ```typescript
   // RSI States with hysteresis zones
   export type RSIState = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
   
   // Whale Tiers
   export enum WhaleTier {
     NONE = 0,       // < 0.30
     BABY_WHALE = 1, // 0.30 - 0.60
     WHALE = 2,      // 0.60 - 0.90
     MEGA_WHALE = 3  // > 0.90
   }
   
   // Enemy behavior modifiers
   export interface RSIEnemyModifier {
     aggroMultiplier: number;
     speedMultiplier: number;
     damageMultiplier: number;
     healthMultiplier: number;
     dropBuffChance: number;
     dropDebuffChance: number;
     movementPattern: 'straight' | 'zigzag' | 'normal';
     visualStyle: 'friendly' | 'neutral' | 'aggressive';
   }
   
   // Market state snapshot
   export interface MarketIndicatorState {
     // Volume
     normalizedVolume: number; // 0-1
     whaleTier: WhaleTier;
     canSpawnWhale: boolean;
     
     // RSI
     rsi: number; // 0-100
     rsiState: RSIState;
     previousRsiState: RSIState; // For hysteresis
     
     // ATR
     atr: number; // Absolute value
     atrPercent: number; // Percentage of price
     spawnRateMultiplier: number;
     
     // Enemy modifier (based on RSI + position)
     enemyModifier: RSIEnemyModifier;
     
     // Meta
     isInitialized: boolean;
     lastUpdateTime: number;
   }
   ```

2. **Event tiplerini güncelle**
   - `types/events.ts` dosyasına ekle:
   ```typescript
   // Yeni event
   | 'marketStateChanged'
   | 'whaleSpawned'
   
   // Event payload
   export interface MarketStateChangedEvent {
     state: MarketIndicatorState;
     position: 'LONG' | 'SHORT';
   }
   
   export interface WhaleSpawnedEvent {
     tier: WhaleTier;
     x: number;
     y: number;
   }
   ```

---

## Faz 2: RSI Calculator (Yeni)

3. **RSICalculator servisini oluştur**
   - `services/indicators/RSICalculator.ts`
   - **Önemli**: Hysteresis ile state flapping önle
   
   ```typescript
   // Hysteresis zones
   const OVERSOLD_ENTER = 30;   // RSI < 30 → OVERSOLD
   const OVERSOLD_EXIT = 35;    // RSI > 35 → exit OVERSOLD
   const OVERBOUGHT_ENTER = 70; // RSI > 70 → OVERBOUGHT  
   const OVERBOUGHT_EXIT = 65;  // RSI < 65 → exit OVERBOUGHT
   
   // Period
   const RSI_PERIOD = 7; // Faster than standard 14
   ```
   
   - Edge case handlers:
     - `priceHistory.length < PERIOD + 1` → return 50
     - `avgLoss === 0` → return 100
     - `avgGain === 0` → return 0
     - `!Number.isFinite(rsi)` → return 50

// turbo
4. **RSICalculator testlerini yaz**
   - `tests/indicators/RSICalculator.test.ts`
   - Test cases:
     - [ ] Normal RSI calculation
     - [ ] Oversold detection (< 30)
     - [ ] Overbought detection (> 70)
     - [ ] Hysteresis: 31 after OVERSOLD stays OVERSOLD
     - [ ] Hysteresis: 36 after OVERSOLD becomes NEUTRAL
     - [ ] Empty history → 50
     - [ ] All same price → 50
     - [ ] Only gains → 100
     - [ ] Only losses → 0
   - `npm run test -- tests/indicators/RSICalculator.test.ts`

---

## Faz 3: Volume Analyzer (Yeni)

5. **VolumeAnalyzer servisini oluştur**
   - `services/indicators/VolumeAnalyzer.ts`
   - Volume history (son 100 candle)
   - Min-Max normalizasyon (0-1 arası)
   - Whale tier belirleme
   - Whale spawn cooldown

   ```typescript
   // Configuration
   const HISTORY_SIZE = 100;
   const MIN_HISTORY_FOR_WHALE = 10; // Need at least 10 datapoints
   const MIN_WHALE_INTERVAL = 5000; // 5 seconds
   
   // Tier thresholds
   const TIER_THRESHOLDS = {
     BABY_WHALE: 0.30,
     WHALE: 0.60,
     MEGA_WHALE: 0.90
   };
   ```
   
   - Edge case handlers:
     - `volumeHistory.length < MIN_HISTORY_FOR_WHALE` → tier = NONE
     - `maxVolume === minVolume` → normalized = 0.5
     - `volume <= 0` → skip update
     - Z-score outlier detection (clamp ±3σ)

// turbo
6. **VolumeAnalyzer testlerini yaz**
   - `tests/indicators/VolumeAnalyzer.test.ts`
   - Test cases:
     - [ ] Normal volume normalization
     - [ ] Whale tier detection for each threshold
     - [ ] Empty history → NONE tier
     - [ ] Insufficient history → NONE tier
     - [ ] All same volume → 0.5 normalized
     - [ ] Cooldown prevents rapid whale spawns
     - [ ] Zero/negative volume ignored
   - `npm run test -- tests/indicators/VolumeAnalyzer.test.ts`

---

## Faz 4: PriceAnalyzerService Genişletme (Mevcut)

7. **PriceAnalyzerService'e RSI ekle**
   - `services/admin/PriceAnalyzerService.ts` güncelle
   - RSICalculator'ı import et ve kullan
   - PriceAnalysis interface'ine `rsi: number` ekle
   - recalculateAnalysis() içinde RSI hesapla

8. **PriceAnalysis tipini güncelle**
   - `types/admin.ts` dosyasına `rsi: number` ekle

// turbo
9. **PriceAnalyzerService testlerini çalıştır**
   - `npm run test -- tests/admin/PriceAnalyzerService.test.ts`

---

## Faz 5: Enemy System Güncellemesi

10. **EnemyBehaviors'a StraightStrategy ekle**
    - `strategies/EnemyBehaviors.ts` güncelle
    ```typescript
    /**
     * StraightStrategy - Direct approach, easy to hit
     * Used for "friendly" enemies when RSI favors player
     * Hit rate: ~95%
     */
    export class StraightStrategy implements MovementStrategy {
      readonly name = 'straight';
      
      move(enemy: Enemy, playerX: number, playerY: number, dtFactor: number): void {
        // Simple direct movement - no evasion
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
          // Slower approach for friendly enemies
          const speed = enemy.speed * 0.8;
          enemy.x += (dx / dist) * speed * dtFactor;
          enemy.y += (dy / dist) * speed * dtFactor;
        }
      }
    }
    ```
    - createMovementStrategy() fonksiyonuna 'straight' case ekle

11. **EnemyFactory'ye RSI modifier desteği ekle**
    - `factories/EnemyFactory.ts` güncelle
    - Yeni metod: `createEnemyWithModifier(type, x, y, difficulty, position, modifier: RSIEnemyModifier)`
    - Modifier'a göre renk, hareket stratejisi, istatistik ayarla
    - **ÖNEMLİ**: Mevcut düşmanları değiştirme, sadece yeni spawn'lar etkilenir

// turbo
12. **Enemy system testlerini çalıştır**
    - `npm run test -- tests/factories tests/strategies`

---

## Faz 6: MarketIndicatorService (Orchestrator)

13. **MarketIndicatorService oluştur**
    - `services/indicators/MarketIndicatorService.ts`
    - Tüm indicator'ları birleştirir
    - PriceAnalyzerService, VolumeAnalyzer, RSICalculator entegrasyonu
    - EventBus ile `marketStateChanged` emit
    - Singleton pattern
    - **gameReset eventi dinle** → tüm state'i sıfırla
    
    ```typescript
    class MarketIndicatorService {
      private state: MarketIndicatorState;
      private volumeAnalyzer: VolumeAnalyzer;
      private rsiCalculator: RSICalculator;
      
      constructor() {
        // Subscribe to gameReset
        EventBus.on('gameReset', () => this.reset());
      }
      
      // Called on every price/volume update
      update(price: number, volume: number, position: MarketPosition): void {
        // Update calculators
        const rsi = this.rsiCalculator.update(price);
        const normalizedVolume = this.volumeAnalyzer.update(volume);
        
        // Get ATR from PriceAnalyzerService (already calculated)
        const atrPercent = priceAnalyzer.getAnalysis('BTC')?.atr ?? 0;
        
        // Determine enemy modifier based on RSI + position
        const modifier = this.calculateEnemyModifier(rsi, position);
        
        // Update state
        this.state = { ... };
        
        // Emit event
        EventBus.emit('marketStateChanged', { state: this.state, position });
      }
      
      // Get spawn rate multiplier for SpawnSystem
      getSpawnRateMultiplier(): number {
        return this.state.spawnRateMultiplier;
      }
      
      // Get enemy modifier for EnemyFactory
      getEnemyModifier(): RSIEnemyModifier {
        return this.state.enemyModifier;
      }
      
      // Check if whale can spawn
      shouldSpawnWhale(): { spawn: boolean; tier: WhaleTier } {
        return this.volumeAnalyzer.shouldSpawnWhale();
      }
      
      // Reset on game restart
      reset(): void {
        this.rsiCalculator.reset();
        this.volumeAnalyzer.reset();
        this.state = this.getDefaultState();
      }
    }
    ```

14. **MarketIndicatorService testlerini yaz**
    - `tests/indicators/MarketIndicatorService.test.ts`
    - Integration testleri:
      - [ ] State updates on price change
      - [ ] Enemy modifier matches RSI + position matrix
      - [ ] Spawn rate multiplier matches ATR
      - [ ] Whale spawn respects cooldown
      - [ ] Reset clears all state
      - [ ] Offline mode returns neutral state

// turbo
15. **Tüm indicator testlerini çalıştır**
    - `npm run test -- tests/indicators`

---

## Faz 7: Spawn System Entegrasyonu

16. **SpawnSystem'i güncelle**
    - `services/SpawnSystem.ts` güncelle
    - MarketIndicatorService'den spawn rate multiplier al
    - **MAX_ENEMIES limitini koru!**
    ```typescript
    // Ensure we don't exceed max enemies even with multiplier
    const effectiveMaxEnemies = Math.min(
      maxEnemies,
      Math.floor(150 / spawnRateMultiplier) // Scale down max if spawn rate high
    );
    ```

17. **PoolManager'a whale spawn desteği ekle**
    - `services/PoolManager.ts` güncelle
    - `getWhaleEnemy(x, y, difficulty, position, tier: WhaleTier)` metodu
    - Tier-based health/size multipliers:
      ```typescript
      const WHALE_MULTIPLIERS = {
        [WhaleTier.BABY_WHALE]: { size: 2.0, health: 3.0, value: 2.5 },
        [WhaleTier.WHALE]:      { size: 3.5, health: 8.0, value: 5.0 },
        [WhaleTier.MEGA_WHALE]: { size: 5.0, health: 20.0, value: 15.0 },
      };
      ```

// turbo
18. **Spawn system testlerini çalıştır**
    - `npm run test -- tests/SpawnSystem.test.ts tests/PoolManager.test.ts`

---

## Faz 8: Integration

19. **DifficultyManager'ı güncelle**
    - `services/DifficultyManager.ts` güncelle
    - MarketIndicatorService'den state al
    - getVolatilityFactor() metodunu MarketIndicatorService ile entegre et
    - **Smooth geçiş** için lerp kullan

20. **GameEngine'i güncelle**
    - `components/GameEngine.tsx` veya ilgili hook güncelle
    - MarketIndicatorService.update() çağrısı (her candle veya price update)
    - `marketStateChanged` event subscription
    - Whale spawn trigger

21. **Offline mode fallback**
    - MarketService.isOfflineMode() kontrolü ekle
    - Offline modda: neutral enemies, 1.0x spawn rate

---

## Faz 9: Doğrulama ve Temizlik

// turbo
22. **Tüm testleri çalıştır**
    - `npm run test`

// turbo
23. **Lint ve format**
    - `npm run lint:fix`

// turbo
24. **Format**
    - `npm run format`

25. **Değişiklikleri özetle**
    - Oluşturulan dosyalar:
      - `types/indicators.ts`
      - `services/indicators/RSICalculator.ts`
      - `services/indicators/VolumeAnalyzer.ts`
      - `services/indicators/MarketIndicatorService.ts`
      - `tests/indicators/*.test.ts`
    - Güncellenen dosyalar:
      - `types/events.ts` (yeni eventler)
      - `types/admin.ts` (RSI field)
      - `services/admin/PriceAnalyzerService.ts` (RSI hesabı)
      - `strategies/EnemyBehaviors.ts` (StraightStrategy)
      - `factories/EnemyFactory.ts` (modifier support)
      - `services/SpawnSystem.ts` (ATR multiplier)
      - `services/PoolManager.ts` (whale spawn)
      - `services/DifficultyManager.ts` (integration)
      - `components/GameEngine.tsx` (event wiring)

26. **Commit ve Push**
    - `feat(indicators): add market indicators to gameplay system`
    - Breaking changes: Yok
    - Yeni eventler: `marketStateChanged`, `whaleSpawned`

---

## 📊 Indicator → Gameplay Mapping Özeti

```
VOLUME (0-1 normalized):
├─ 0.00-0.30: Normal enemies only
├─ 0.30-0.60: Baby Whale (2x size, 3x HP)
├─ 0.60-0.90: Whale (3.5x size, 8x HP)
└─ 0.90-1.00: Mega Whale (5x size, 20x HP)

RSI + POSITION (with hysteresis):
├─ LONG + RSI<30:  Friendly (straight, buff drop, green aura)
├─ LONG + RSI>70:  Aggressive (zigzag, debuff drop, red aura)
├─ SHORT + RSI<30: Aggressive (zigzag, debuff drop, red aura)
└─ SHORT + RSI>70: Friendly (straight, buff drop, green aura)

ATR → SPAWN RATE:
├─ <1.0%:  0.5x spawn rate (sakin market)
├─ 1-2%:   1.0x spawn rate (normal)
├─ 2-4%:   1.5x spawn rate (hareketli)
└─ >4.0%:  2.5x spawn rate (CHAOS!) - capped at 4% for safety
```

---

## ✅ Pre-Implementation Checklist

- [ ] **Kod tekrarı yok**: Mevcut PriceAnalyzerService kullanılıyor
- [ ] **Edge case'ler handle edildi**: Tüm division by zero, empty array, NaN durumları
- [ ] **Hysteresis eklendi**: RSI state flapping önlendi
- [ ] **Cooldown eklendi**: Whale spam önlendi
- [ ] **MAX_ENEMIES korundu**: Spawn multiplier enemy cap'ı aşmıyor
- [ ] **Game reset handle edildi**: Tüm state sıfırlanıyor
- [ ] **Offline mode handle edildi**: Fallback neutral state
- [ ] **Performance düşünüldü**: Hesaplamalar sadece price update'te
- [ ] **Smooth transitions**: Lerp ile yumuşak geçişler
- [ ] **Test coverage**: Her edge case için test
