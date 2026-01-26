# 📊 Market İndikatörleri → Oyun Mekaniği Teknik Tasarım

## 🎯 TEMEL PRENSİP
**Gerçek market indikatörleri (RSI, Volume, ATR) → Oyun içi düşman davranışı ve zorluğu**

---

## 1️⃣ VOLUME NORMALİZASYONU ve WHALE SPAWN SİSTEMİ

### 📊 Teknik Yaklaşım

#### A. Volume Normalizasyonu
```typescript
// Volume'ü 0-1 arası normalize et
class VolumeNormalizer {
  private volumeHistory: number[] = []; // Son 100 candle'ın volume'ü
  private readonly HISTORY_SIZE = 100;
  
  normalizeVolume(currentVolume: number): number {
    // Volumeyi history'ye ekle
    this.volumeHistory.push(currentVolume);
    if (this.volumeHistory.length > this.HISTORY_SIZE) {
      this.volumeHistory.shift();
    }
    
    // Min-Max normalizasyonu
    const minVolume = Math.min(...this.volumeHistory);
    const maxVolume = Math.max(...this.volumeHistory);
    
    if (maxVolume === minVolume) return 0.5; // Sabit volume durumu
    
    const normalized = (currentVolume - minVolume) / (maxVolume - minVolume);
    return normalized; // 0.0 - 1.0 arası
  }
  
  // Alternatif: Z-Score normalizasyonu (daha hassas)
  normalizeVolumeZScore(currentVolume: number): number {
    const mean = this.volumeHistory.reduce((a, b) => a + b, 0) / this.volumeHistory.length;
    const stdDev = Math.sqrt(
      this.volumeHistory.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / this.volumeHistory.length
    );
    
    const zScore = (currentVolume - mean) / stdDev;
    // Z-score'u 0-1 arası sıkıştır (sigmoid)
    return 1 / (1 + Math.exp(-zScore));
  }
}
```

#### B. Whale Spawn Tier Sistemi
```typescript
enum WhaleTier {
  NONE = 0,        // normalizedVolume < 0.30
  BABY_WHALE = 1,  // 0.30 - 0.60
  WHALE = 2,       // 0.60 - 0.90
  MEGA_WHALE = 3   // > 0.90
}

interface WhaleSpawnConfig {
  tier: WhaleTier;
  enemyType: string;
  spawnChance: number; // 0-1
  enemyCount: number;
  sizeMultiplier: number;
  healthMultiplier: number;
  valueMultiplier: number; // XP/coin drop
}

class WhaleSpawnSystem {
  private lastWhaleSpawnTime = 0;
  private readonly MIN_WHALE_INTERVAL = 5000; // 5 saniye minimum
  
  determineWhaleTier(normalizedVolume: number): WhaleTier {
    if (normalizedVolume < 0.30) return WhaleTier.NONE;
    if (normalizedVolume < 0.60) return WhaleTier.BABY_WHALE;
    if (normalizedVolume < 0.90) return WhaleTier.WHALE;
    return WhaleTier.MEGA_WHALE;
  }
  
  getWhaleConfig(tier: WhaleTier): WhaleSpawnConfig {
    const configs: Record<WhaleTier, WhaleSpawnConfig> = {
      [WhaleTier.NONE]: null, // No whale
      
      [WhaleTier.BABY_WHALE]: {
        tier: WhaleTier.BABY_WHALE,
        enemyType: 'BABY_WHALE',
        spawnChance: 0.3,
        enemyCount: 1,
        sizeMultiplier: 2.0,
        healthMultiplier: 3.0,
        valueMultiplier: 2.5,
      },
      
      [WhaleTier.WHALE]: {
        tier: WhaleTier.WHALE,
        enemyType: 'WHALE',
        spawnChance: 0.5,
        enemyCount: 1,
        sizeMultiplier: 3.5,
        healthMultiplier: 8.0,
        valueMultiplier: 5.0,
      },
      
      [WhaleTier.MEGA_WHALE]: {
        tier: WhaleTier.MEGA_WHALE,
        enemyType: 'MEGA_WHALE',
        spawnChance: 0.8,
        enemyCount: 1, // Tek ama çok güçlü
        sizeMultiplier: 5.0,
        healthMultiplier: 20.0,
        valueMultiplier: 15.0,
      },
    };
    
    return configs[tier];
  }
  
  shouldSpawnWhale(normalizedVolume: number, currentTime: number): boolean {
    const tier = this.determineWhaleTier(normalizedVolume);
    
    if (tier === WhaleTier.NONE) return false;
    
    // Spam önleme
    if (currentTime - this.lastWhaleSpawnTime < this.MIN_WHALE_INTERVAL) {
      return false;
    }
    
    const config = this.getWhaleConfig(tier);
    const shouldSpawn = Math.random() < config.spawnChance;
    
    if (shouldSpawn) {
      this.lastWhaleSpawnTime = currentTime;
    }
    
    return shouldSpawn;
  }
}
```

---

## 2️⃣ RSI-BASED ENEMY SİSTEMİ

### 📊 RSI Hesaplama (Period 7)

```typescript
class RSICalculator {
  private priceHistory: number[] = [];
  private readonly PERIOD = 7;
  
  calculate(currentPrice: number): number {
    this.priceHistory.push(currentPrice);
    
    // En az 8 veri noktası gerekli (7 + 1)
    if (this.priceHistory.length < this.PERIOD + 1) {
      return 50; // Nötr başlat
    }
    
    // Son 7 candle'ın değişimlerini hesapla
    const changes: number[] = [];
    for (let i = this.priceHistory.length - this.PERIOD; i < this.priceHistory.length; i++) {
      changes.push(this.priceHistory[i] - this.priceHistory[i - 1]);
    }
    
    // Kazançları ve kayıpları ayır
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
    
    // Ortalama kazanç/kayıp
    const avgGain = gains.reduce((a, b) => a + b, 0) / this.PERIOD;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / this.PERIOD;
    
    if (avgLoss === 0) return 100; // Sadece kazanç var
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }
  
  getState(rsi: number): 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' {
    if (rsi < 30) return 'OVERSOLD';
    if (rsi > 80) return 'OVERBOUGHT';
    return 'NEUTRAL';
  }
}
```

### 🎮 RSI + Position Direction = Enemy Behavior

#### Konsept Matrisi:
```
╔══════════════╦═══════════════════╦════════════════════╦═══════════════════╗
║   Position   ║   RSI < 30        ║   RSI 30-80        ║   RSI > 80        ║
║              ║   (OVERSOLD)      ║   (NEUTRAL)        ║   (OVERBOUGHT)    ║
╠══════════════╬═══════════════════╬════════════════════╬═══════════════════╣
║   LONG       ║ 🟢 OPPORTUNITY!   ║ ⚪ Normal          ║ 🔴 DANGER!        ║
║              ║ Friendly enemies  ║ Standard enemies   ║ Aggressive enemies║
║              ║ Drop buffs        ║ Balanced           ║ Drop debuffs      ║
║              ║ Low aggro         ║ Normal aggro       ║ High aggro        ║
╠══════════════╬═══════════════════╬════════════════════╬═══════════════════╣
║   SHORT      ║ 🔴 DANGER!        ║ ⚪ Normal          ║ 🟢 OPPORTUNITY!   ║
║              ║ Aggressive enemies║ Standard enemies   ║ Friendly enemies  ║
║              ║ Drop debuffs      ║ Balanced           ║ Drop buffs        ║
║              ║ High aggro        ║ Normal aggro       ║ Low aggro         ║
╚══════════════╩═══════════════════╩════════════════════╩═══════════════════╝
```

### 🐋 Enemy Behavior Modifiers

```typescript
enum RSIState {
  OVERSOLD = 'OVERSOLD',   // RSI < 30
  NEUTRAL = 'NEUTRAL',     // RSI 30-80
  OVERBOUGHT = 'OVERBOUGHT' // RSI > 80
}

interface RSIEnemyModifier {
  aggroMultiplier: number;      // Düşman saldırganlığı
  speedMultiplier: number;      // Hareket hızı
  damageMultiplier: number;     // Oyuncuya verdiği hasar
  healthMultiplier: number;     // Düşman canı
  dropBuffChance: number;       // Buff drop şansı (0-1)
  dropDebuffChance: number;     // Debuff drop şansı (0-1)
  visualStyle: 'friendly' | 'neutral' | 'aggressive';
}

class RSIEnemySystem {
  private rsiCalculator = new RSICalculator();
  
  getEnemyModifier(
    rsi: number,
    position: 'LONG' | 'SHORT'
  ): RSIEnemyModifier {
    const rsiState = this.rsiCalculator.getState(rsi);
    
    // LONG position modifiers
    if (position === 'LONG') {
      if (rsiState === 'OVERSOLD') {
        // Fiyat düşük, long için fırsat! Düşmanlar dost
        return {
          aggroMultiplier: 0.5,      // Yarı agresif
          speedMultiplier: 0.8,      // Yavaş
          damageMultiplier: 0.7,     // Düşük hasar
          healthMultiplier: 0.8,     // Düşük can
          dropBuffChance: 0.6,       // %60 buff drop
          dropDebuffChance: 0.1,     // %10 debuff drop
          visualStyle: 'friendly',   // Yeşil/mavi aura
        };
      } else if (rsiState === 'OVERBOUGHT') {
        // Fiyat yüksek, long için risk! Düşmanlar agresif
        return {
          aggroMultiplier: 1.8,      // Çok agresif
          speedMultiplier: 1.4,      // Hızlı
          damageMultiplier: 1.5,     // Yüksek hasar
          healthMultiplier: 1.3,     // Fazla can
          dropBuffChance: 0.1,       // %10 buff drop
          dropDebuffChance: 0.5,     // %50 debuff drop
          visualStyle: 'aggressive', // Kırmızı aura
        };
      }
    }
    
    // SHORT position modifiers
    if (position === 'SHORT') {
      if (rsiState === 'OVERSOLD') {
        // Fiyat düşük, short zaten kazandı ama dikkat! Risk var
        return {
          aggroMultiplier: 1.5,
          speedMultiplier: 1.3,
          damageMultiplier: 1.4,
          healthMultiplier: 1.2,
          dropBuffChance: 0.2,
          dropDebuffChance: 0.4,
          visualStyle: 'aggressive',
        };
      } else if (rsiState === 'OVERBOUGHT') {
        // Fiyat yüksek, short için fırsat! Düşmanlar dost
        return {
          aggroMultiplier: 0.6,
          speedMultiplier: 0.8,
          damageMultiplier: 0.7,
          healthMultiplier: 0.9,
          dropBuffChance: 0.5,
          dropDebuffChance: 0.15,
          visualStyle: 'friendly',
        };
      }
    }
    
    // NEUTRAL (default)
    return {
      aggroMultiplier: 1.0,
      speedMultiplier: 1.0,
      damageMultiplier: 1.0,
      healthMultiplier: 1.0,
      dropBuffChance: 0.25,
      dropDebuffChance: 0.25,
      visualStyle: 'neutral',
    };
  }
  
  // Enemy type'a göre modifier uygula
  applyModifierToEnemy(
    enemy: Enemy,
    modifier: RSIEnemyModifier
  ): void {
    enemy.speed *= modifier.speedMultiplier;
    enemy.damage *= modifier.damageMultiplier;
    enemy.health *= modifier.healthMultiplier;
    enemy.maxHealth *= modifier.healthMultiplier;
    
    // Agro radius değiştir
    enemy.detectionRadius *= modifier.aggroMultiplier;
    
    // Visual style'ı ayarla
    enemy.visualStyle = modifier.visualStyle;
    
    // Drop table'ı değiştir
    enemy.dropBuffChance = modifier.dropBuffChance;
    enemy.dropDebuffChance = modifier.dropDebuffChance;
  }
}
```

---

## 3️⃣ ÖZEL DÜŞMAN TİPLERİ: OVERSOLD vs OVERBOUGHT ENEMIES

### 🟢 Oversold Enemy (RSI < 30)
```typescript
interface OversoldEnemyConfig {
  type: 'OVERSOLD_BEAR' | 'OVERSOLD_BULL';
  visualAppearance: {
    color: string;
    glowEffect: boolean;
    icon: string;
  };
  movementPattern: {
    type: 'STRAIGHT' | 'ZIGZAG' | 'CIRCULAR';
    speedMultiplier: number;
    evasionRate: number; // 0-1, ne kadar mermi dodge eder
  };
  combatStats: {
    health: number;
    damage: number;
    worthMultiplier: number;   // XP değeri
    dropRate: number;          // Drop oranı
    dropType: 'BUFF' | 'DEBUFF' | 'NONE';
  };
}

const OVERSOLD_ENEMIES = {
  // Long position için fırsat düşmanı (FRIENDLY)
  LONG_OVERSOLD_FRIEND: {
    type: 'OVERSOLD_BULL',
    visualAppearance: {
      color: '#4ade80',        // Yeşil
      glowEffect: true,
      icon: '🐂',              // Bull emoji
    },
    movementPattern: {
      type: 'STRAIGHT',        // ✅ DÜZ HAREKET! Vurması kolay
      speedMultiplier: 0.8,    // Yavaş
      evasionRate: 0.1,        // %10 dodge (düşük)
    },
    combatStats: {
      health: 50,              // Düşük can, kolay öldürülür
      damage: 5,               // Düşük hasar
      worthMultiplier: 1.5,    // İyi XP
      dropRate: 0.8,           // %80 BUFF drop!
      dropType: 'BUFF',
    },
  },
  
  // Short position için tehlike düşmanı (AGGRESSIVE)
  SHORT_OVERSOLD_DANGER: {
    type: 'OVERSOLD_BEAR',
    visualAppearance: {
      color: '#ef4444',        // Kırmızı
      glowEffect: true,
      icon: '🐻',
    },
    movementPattern: {
      type: 'ZIGZAG',          // ❌ ZIG-ZAG! Vurması zor
      speedMultiplier: 1.3,    // Hızlı
      evasionRate: 0.6,        // %60 dodge (yüksek)
    },
    combatStats: {
      health: 150,             // Yüksek can
      damage: 25,              // Yüksek hasar
      worthMultiplier: 0.7,    // Az XP
      dropRate: 0.2,           // %20 drop (düşük)
      dropType: 'DEBUFF',
    },
  },
};
```

### 🔴 Overbought Enemy (RSI > 80)
```typescript
const OVERBOUGHT_ENEMIES = {
  // Long position için tehlike düşmanı (AGGRESSIVE)
  LONG_OVERBOUGHT_DANGER: {
    type: 'OVERBOUGHT_BEAR',
    visualAppearance: {
      color: '#dc2626',        // Koyu kırmızı
      glowEffect: true,
      icon: '💀',
    },
    movementPattern: {
      type: 'ZIGZAG',          // ❌ ZIG-ZAG! Vurması zor
      speedMultiplier: 1.4,    // Çok hızlı
      evasionRate: 0.7,        // %70 dodge (çok yüksek)
    },
    combatStats: {
      health: 200,             // Çok yüksek can
      damage: 30,              // Çok yüksek hasar
      worthMultiplier: 0.8,    // Orta-düşük XP
      dropRate: 0.3,           // %30 drop
      dropType: 'DEBUFF',
    },
  },
  
  // Short position için fırsat düşmanı (FRIENDLY)
  SHORT_OVERBOUGHT_FRIEND: {
    type: 'OVERBOUGHT_BULL',
    visualAppearance: {
      color: '#10b981',        // Yeşil
      glowEffect: true,
      icon: '💎',
    },
    movementPattern: {
      type: 'STRAIGHT',        // ✅ DÜZ HAREKET! Vurması kolay
      speedMultiplier: 0.7,    // Yavaş
      evasionRate: 0.15,       // %15 dodge (düşük)
    },
    combatStats: {
      health: 60,              // Düşük can
      damage: 8,               // Düşük hasar
      worthMultiplier: 1.4,    // İyi XP
      dropRate: 0.7,           // %70 BUFF drop!
      dropType: 'BUFF',
    },
  },
};
```

---

## 🎯 MOVEMENT PATTERN SİSTEMİ

### Hareket Modelleri ve Oyun Etkisi

```typescript
enum MovementPattern {
  STRAIGHT = 'STRAIGHT',     // Düz hareket (kolay hedef)
  ZIGZAG = 'ZIGZAG',         // Zig-zag (zor hedef)
  CIRCULAR = 'CIRCULAR',     // Daire çizer (orta zorluk)
  RANDOM_WALK = 'RANDOM_WALK' // Random yürüyüş
}

interface MovementBehavior {
  pattern: MovementPattern;
  baseSpeed: number;
  evasionRate: number;        // Auto-aim algoritmasından kaçma şansı
  predictability: number;     // 0-1, ne kadar öngörülebilir
}

// Auto-aim algoritmasına göre hit rate
const HIT_RATE_BY_PATTERN = {
  STRAIGHT: 0.95,    // %95 hit chance
  CIRCULAR: 0.75,    // %75 hit chance
  ZIGZAG: 0.40,      // %40 hit chance (current zig-zag enemies)
  RANDOM_WALK: 0.60, // %60 hit chance
}
```

### 🎮 Oyuncu Deneyimi: Movement Pattern Etkisi

```
FRIENDLY ENEMY (Straight Movement):
🟢 Özellikleri:
  - Düz hareket → Auto-aim %95 hit rate
  - Düşük can (50-60 HP)
  - Düşük hasar (5-8 damage)
  - BUFF drop (%70-80)
  - İyi XP multiplier (1.4-1.5x)

💭 Oyuncu Hissi:
  "Bu düşmanlar bana yardım ediyor!"
  "Kolay vuruyorum, buff alıyorum, kazanıyorum!"
  "RSI fırsat veriyor, market beni destekliyor!"
  
🎯 Psikolojik Transfer:
  = Trading'de 'trend dostu olmak'
  = Doğru pozisyonda olmanın verdiği rahatlık
  = Market seni destekliyor hissi

---

AGGRESSIVE ENEMY (Zig-Zag Movement):
🔴 Özellikleri:
  - Zig-zag hareket → Auto-aim %40 hit rate
  - Yüksek can (150-200 HP)
  - Yüksek hasar (25-30 damage)
  - DEBUFF drop (%20-30)
  - Düşük XP multiplier (0.7-0.8x)

💭 Oyuncu Hissi:
  "Bu düşmanlar çok zor!"
  "Kaçıyorlar, vuramıyorum, hasar alıyorum!"
  "RSI bana karşı, zor durumdayım!"
  
🎯 Psikolojik Transfer:
  = Trading'de 'trend'e karşı olmak'
  = Yanlış pozisyonda olmanın verdiği zorlu
  = Market sana karşı çalışıyor hissi
```

### 📊 Visual Comparison

```
╔══════════════════╦═══════════════════╦═══════════════════╗
║   Özellik        ║   FRIENDLY 🟢     ║   AGGRESSIVE 🔴   ║
╠══════════════════╬═══════════════════╬═══════════════════╣
║ Movement         ║ Straight (→)      ║ Zig-zag (〜〜)    ║
║ Hit Rate         ║ 95%               ║ 40%               ║
║ Health           ║ 50-60 HP          ║ 150-200 HP        ║
║ Damage           ║ 5-8               ║ 25-30             ║
║ Speed            ║ 0.7-0.8x          ║ 1.3-1.4x          ║
║ Buff Drop        ║ 70-80%            ║ 10-20%            ║
║ Debuff Drop      ║ 10-20%            ║ 30-50%            ║
║ XP Worth         ║ 1.4-1.5x          ║ 0.7-0.8x          ║
║ Visual Aura      ║ Green/Blue        ║ Red/Dark Red      ║
║ Icon             ║ 🐂💎             ║ 🐻💀             ║
╚══════════════════╩═══════════════════╩═══════════════════╝
```

---

## 4️⃣ ATR (Average True Range) - VOLATİLİTE BAZLI SPAWN RATE

### 📊 ATR Hesaplama
```typescript
class ATRCalculator {
  private candles: Candle[] = [];
  private readonly PERIOD = 7; // Oyun hızı için optimize edilmiş (standard 14 yerine)
  
  calculate(newCandle: Candle): number {
    this.candles.push(newCandle);
    
    if (this.candles.length < 2) return 0;
    
    // Son PERIOD kadar candle'ı al
    const recentCandles = this.candles.slice(-this.PERIOD);
    
    const trueRanges = recentCandles.map((candle, idx) => {
      if (idx === 0) return candle.high - candle.low;
      
      const prevClose = recentCandles[idx - 1].close;
      
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - prevClose),
        Math.abs(candle.low - prevClose)
      );
    });
    
    const atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
    return atr;
  }
  
  // ATR'yi fiyata normalize et (ATR Percent)
  normalizeATR(atr: number, currentPrice: number): number {
    return (atr / currentPrice) * 100; // Percentage
  }
}
```

### 🎯 ATR → Enemy Spawn Rate
```typescript
class ATRSpawnSystem {
  private atrCalculator = new ATRCalculator();
  
  getSpawnRateMultiplier(atrPercent: number): number {
    // ATR düşükse (düşük volatilite) → Az düşman
    // ATR yüksekse (yüksek volatilite) → Çok düşman
    
    if (atrPercent < 1.0) {
      return 0.5; // Yarı spawn rate
    } else if (atrPercent < 2.0) {
      return 1.0; // Normal
    } else if (atrPercent < 4.0) {
      return 1.5; // %50 daha fazla
    } else {
      return 2.5; // 2.5x spawn rate (CHAOS!)
    }
  }
  
  getEnemyVarietyMultiplier(atrPercent: number): number {
    // Yüksek volatilite = daha fazla düşman çeşidi
    return Math.min(atrPercent / 2, 3.0); // Max 3x variety
  }
}
```

---

## 5️⃣ ENTEGRASYON: TÜM İNDİKATÖRLER BİR ARADA

### 🎮 Master Difficulty Orchestrator
```typescript
class MarketDifficultyOrchestrator {
  private volumeNormalizer = new VolumeNormalizer();
  private whaleSpawner = new WhaleSpawnSystem();
  private rsiCalculator = new RSICalculator();
  private rsiEnemySystem = new RSIEnemySystem();
  private atrCalculator = new ATRCalculator();
  private atrSpawnSystem = new ATRSpawnSystem();
  
  update(marketData: MarketData, position: 'LONG' | 'SHORT'): GameDifficultyState {
    // 1. Volume analizi
    const normalizedVolume = this.volumeNormalizer.normalizeVolume(marketData.volume);
    const whaleTier = this.whaleSpawner.determineWhaleTier(normalizedVolume);
    
    // 2. RSI analizi
    const rsi = this.rsiCalculator.calculate(marketData.price);
    const rsiState = this.rsiCalculator.getState(rsi);
    const enemyModifier = this.rsiEnemySystem.getEnemyModifier(rsi, position);
    
    // 3. ATR analizi
    const atr = this.atrCalculator.calculate(marketData.candle);
    const atrPercent = this.atrCalculator.normalizeATR(atr, marketData.price);
    const spawnRateMultiplier = this.atrSpawnSystem.getSpawnRateMultiplier(atrPercent);
    
    // 4. Orchestration
    return {
      // Volume effects
      shouldSpawnWhale: this.whaleSpawner.shouldSpawnWhale(normalizedVolume, Date.now()),
      whaleTier,
      
      // RSI effects
      rsi,
      rsiState,
      enemyModifier,
      
      // ATR effects
      atr,
      atrPercent,
      spawnRateMultiplier,
      enemyVariety: this.atrSpawnSystem.getEnemyVarietyMultiplier(atrPercent),
      
      // Composite difficulty
      overallDifficulty: this.calculateOverallDifficulty({
        normalizedVolume,
        rsiState,
        atrPercent,
        position,
      }),
    };
  }
  
  private calculateOverallDifficulty(params: {
    normalizedVolume: number;
    rsiState: RSIState;
    atrPercent: number;
    position: 'LONG' | 'SHORT';
  }): number {
    let difficulty = 1.0; // Base
    
    // Volume contribution
    difficulty += params.normalizedVolume * 0.5;
    
    // RSI contribution
    if (
      (params.position === 'LONG' && params.rsiState === 'OVERBOUGHT') ||
      (params.position === 'SHORT' && params.rsiState === 'OVERSOLD')
    ) {
      difficulty += 0.5; // Unfavorable RSI
    } else if (
      (params.position === 'LONG' && params.rsiState === 'OVERSOLD') ||
      (params.position === 'SHORT' && params.rsiState === 'OVERBOUGHT')
    ) {
      difficulty -= 0.3; // Favorable RSI (easier)
    }
    
    // ATR contribution
    difficulty += (params.atrPercent / 10) * 0.3;
    
    return Math.max(0.5, Math.min(difficulty, 3.0)); // Clamp 0.5-3.0
  }
}
```

---

## 6️⃣ GÖRSEL VE PsiKOLOJİK FEEDBACK

### 🎨 Visual Indicators
```typescript
interface MarketIndicatorUI {
  // Volume bar (sol üst)
  volumeBar: {
    value: number;        // 0-1
    color: string;        // Gradient based on tier
    whaleIcon: boolean;   // Show whale emoji if tier > 0
    pulsing: boolean;     // Pulse effect on whale spawn
  };
  
  // RSI gauge (sağ üst)
  rsiGauge: {
    value: number;        // 0-100
    state: 'oversold' | 'neutral' | 'overbought';
    color: string;
    warningText?: string; // "OVERBOUGHT DANGER!" gibi
  };
  
  // ATR indicator (alt)
  atrIndicator: {
    value: number;
    label: 'Low' | 'Medium' | 'High' | 'EXTREME';
    spawnRateMultiplier: number;
  };
  
  // Enemy style hints
  enemyVisuals: {
    glowColor: string;         // RSI state'e göre
    aggroIndicator: boolean;   // Yüksek aggro uyarısı
    friendlyIndicator: boolean; // Friendly enemy işareti
  };
}
```

### 💭 Psychological Messaging
```typescript
const MARKET_STATE_MESSAGES = {
  // Favorable conditions
  LONG_OVERSOLD: [
    "📈 Oversold! Prime entry point!",
    "🟢 Bulls ready to charge!",
    "💎 Diamond hands opportunity!",
  ],
  SHORT_OVERBOUGHT: [
    "📉 Overbought! Reversal incoming!",
    "🔴 Bears awakening!",
    "⚡ Short squeeze potential!",
  ],
  
  // Unfavorable conditions
  LONG_OVERBOUGHT: [
    "⚠️ Overbought territory - Risk high!",
    "🔥 Take profit zone!",
    "🚨 Correction possible!",
  ],
  SHORT_OVERSOLD: [
    "⚠️ Oversold bounce risk!",
    "📈 Bulls may counterattack!",
    "🚨 Cover your shorts!",
  ],
  
  // High volatility
  HIGH_ATR: [
    "💥 EXTREME VOLATILITY!",
    "🌪️ Market chaos detected!",
    "⚡ High risk, high reward!",
  ],
  
  // Whale alerts
  WHALE_DETECTED: [
    "🐋 WHALE ALERT! Big volume!",
    "💰 Large player entered market!",
    "🚨 Institutional movement!",
  ],
};
```

---

## 7️⃣ IMPLEMENTATION CHECKLİST

### Phase 1: Foundations ✅
- [ ] `VolumeNormalizer` class
- [ ] `RSICalculator` (period 7)
- [ ] `ATRCalculator` (period 7)
- [ ] Basic indicator → difficulty mapping

### Phase 2: Enemy System 🎯
- [ ] `WhaleSpawnSystem` with tier logic
- [ ] `RSIEnemySystem` with modifier matrix
- [ ] Oversold/Overbought enemy prefabs
- [ ] Enemy visual style system

### Phase 3: Orchestration 🎭
- [ ] `MarketDifficultyOrchestrator`
- [ ] Real-time indicator updates (her candle)
- [ ] Composite difficulty calculation
- [ ] EventBus integration

### Phase 4: UI/UX ✨
- [ ] Volume bar UI
- [ ] RSI gauge UI
- [ ] ATR indicator UI
- [ ] Psychological messaging system
- [ ] Enemy glow/aura effects

### Phase 5: Balance & Polish 🎮
- [ ] Tune multipliers (playtesting)
- [ ] Anti-spam safeguards
- [ ] Performance optimization
- [ ] Analytics tracking

---

## 🎯 BAŞARI KRİTERLERİ

### Oyuncu Şunu Hissetmeli:
✅ "RSI oversold, bu fırsat! Long pozisyonum için perfect!"
✅ "Volume patladı, whale geldi, dikkatli olmalıyım!"
✅ "ATR yüksek, kaos var, high risk high reward!"
✅ "Overbought'tayız, long için riskli, short'a geçmeliyim!"
✅ "Düşmanlar düz geliyor, kolay vuruyorum - trend beni destekliyor!"
✅ "Düşmanlar zig-zag yapıyor, vuramıyorum - yanlış pozisyondayım!"

### Teknik Metriks:
✅ Whale spam yok (max 1 her 5 saniye)
✅ RSI güncellemesi real-time (her candle)
✅ Smooth difficulty transitions (jarring spikes yok)
✅ Visual feedback <100ms delay

---

---

## 📋 QUICK REFERENCE: Indicator → Gameplay Mapping

### 🎯 Tek Bakışta Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│ INDICATOR BAZLI DÜŞMAN TİPİ BELİRLEME KURALLARI                │
└─────────────────────────────────────────────────────────────────┘

1. VOLUME → WHALE SPAWN
   ├─ 0.00-0.30: Normal enemies only
   ├─ 0.30-0.60: Baby Whale (2x size, 3x HP)
   ├─ 0.60-0.90: Whale (3.5x size, 8x HP)
   └─ 0.90-1.00: Mega Whale (5x size, 20x HP)
   
2. RSI + POSITION → ENEMY BEHAVIOR
   ├─ LONG + RSI<30:  Friendly (straight, buff drop)
   ├─ LONG + RSI>80:  Aggressive (zigzag, debuff drop)
   ├─ SHORT + RSI<30: Aggressive (zigzag, debuff drop)
   └─ SHORT + RSI>80: Friendly (straight, buff drop)
   
3. ATR → SPAWN RATE
   ├─ <1.0%:  0.5x spawn rate (sakin)
   ├─ 1-2%:   1.0x spawn rate (normal)
   ├─ 2-4%:   1.5x spawn rate (hareketli)
   └─ >4.0%:  2.5x spawn rate (CHAOS!)

4. MOVEMENT PATTERNS
   ├─ STRAIGHT:  %95 hit rate (friendly)
   ├─ CIRCULAR:  %75 hit rate (neutral)
   ├─ ZIGZAG:    %40 hit rate (aggressive)
   └─ RANDOM:    %60 hit rate (chaotic)
```

### ⚡ Update Frequency

```typescript
// Her candle close (örnek: 1 dakikada bir)
onCandleClose() {
  const volume = normalizeVolume(candle.volume);
  const rsi = calculateRSI(candle.close, period=7);
  const atr = calculateATR(candle, period=7);
  
  updateDifficulty({ volume, rsi, atr, position });
  
  if (shouldSpawnWhale(volume)) {
    spawnWhaleEnemy(getWhaleTier(volume));
  }
  
  if (rsiStateChanged) {
    transitionEnemyBehaviors(rsi, position);
  }
}

// Her frame (60 FPS)
onGameUpdate(deltaTime) {
  applySpawnRateMultiplier(atrSpawnMultiplier);
  updateEnemyMovementPatterns();
}
```

### 🎨 Visual Feedback Priority

```
Priority 1 (MUST HAVE):
✅ RSI gauge (0-100) with color zones
✅ Volume bar with whale tier indicator
✅ Enemy aura color (green=friendly, red=aggressive)

Priority 2 (SHOULD HAVE):
✅ ATR volatility indicator
✅ Movement trail effects (straight vs zigzag)
✅ Psychological messages ("Market supports you!")

Priority 3 (NICE TO HAVE):
✅ RSI history mini-chart
✅ Volume spike animations
✅ Whale entry cinematics
```

---

## 🚀 SONRAKI ADIMLAR

1. **Market Data Pipeline**: Binance/Coinbase'den candle data'yı doğru formatta al
2. **Indicator Service**: Tek bir servis tüm indikatörleri yönetsin
3. **Enemy Factory**: Indicator-based enemy generation
4. **UI Integration**: Canvas overlay ile real-time gösterim
5. **Balancing**: Playtesting ile multiplier tuning

---

**Bu teknik tasarım hazır. Kod implementasyonuna geçebiliriz!** 🎮
