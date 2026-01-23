# 🎮 Crypto Cyber Survivors - Difficulty System V2

> **Modüler Zorluk Sistemi Tasarım Dokümanı**
> Status: ✅ COMPLETED
> Version: 2.0
> Tarih: 2026-01-21

---

## 📋 Özet

Bu doküman, oyunun yeni katmanlı difficulty sistemini tanımlar. Sistem modüler faktör hesaplayıcıları ve merkezi bir orkestratör (DifficultyManager) üzerine kuruludur.

### Temel Prensipler

1. **Kaldıraç = Kaos** - Yüksek leverage = Yüksek PnL volatiliti = Daha fazla zorluk değişimi
2. **Yoyo Ritmi** - 5 dakikalık cycle'lar ile tahmin edilebilir ama heyecanlı akış
3. **Katmanlı Mimari** - Her faktör bağımsız hesaplanır, sonra birleştirilir
4. **Risk = Ödül** - Yüksek kaldıraç = Zor oyun = Daha çok XP

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: RAW INPUTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  MarketData              PlayerState             GameTime                    │
│  ├─ price                ├─ hp / maxHp           ├─ elapsedSeconds          │
│  ├─ entryPrice           ├─ level                ├─ currentCycle            │
│  ├─ atr%                 ├─ position (L/S)       ├─ currentPhase            │
│  ├─ rsi                  └─ leverage             └─ phaseProgress           │
│  └─ volume                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: FACTOR CALCULATORS                             │
│                      (Pure Functions, Bağımsız)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ CycleFactor  │  │  PnLFactor   │  │ LevelFactor  │  │  WaveFactor  │     │
│  │  (1.0-∞)     │  │  (0.7-3.0)   │  │  (1.0-2.0)   │  │  (0.4-1.5)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │StreakFactor  │  │LiquidFactor  │  │ ShockFactor  │                       │
│  │  (1.0-1.3)   │  │  (1.0-2.0)   │  │  (1.0-2.0)   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  RSIFactor   │  │VolumeFactor  │  │  ATRFactor   │                       │
│  │  (0.8-1.5)   │  │  (1.0-2.25)  │  │  (1.0-1.5)   │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: AGGREGATOR                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CoreScore = CycleFactor × PnLFactor × LevelFactor × WaveFactor             │
│                                                                              │
│  ModifierScore = StreakFactor × LiquidFactor × ShockFactor                  │
│                                                                              │
│  MarketScore = RSIFactor × VolumeFactor × ATRFactor                         │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────     │
│                                                                              │
│  TotalDifficulty = clamp(CoreScore × ModifierScore × MarketScore, 1.0, 10.0) │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 4: OUTPUT MAPPER                               │
│                         (Hybrid Approach)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LeverageScale = LEVERAGE_TIERS[selectedLeverage]                           │
│  CoreDifficulty = CycleFactor × PnLFactor × LevelFactor × WaveFactor        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ spawnRate   = CoreDifficulty × LeverageScale.spawn × ShockBoost     │    │
│  │ enemySpeed  = CoreDifficulty × LeverageScale.speed × LiquidFactor   │    │
│  │ enemyHP     = LevelFactor × LeverageScale.hp   ← Market-isolated    │    │
│  │ enemyDamage = TotalDifficulty × LeverageScale.damage                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Note: HP is intentionally isolated from market factors for predictability  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIFFICULTY MANAGER (ORCHESTRATOR)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DifficultyManager.calculate(inputs) → DifficultyOutput                     │
│                                                                              │
│  ├─ Collect all raw inputs                                                  │
│  ├─ Call each Factor Calculator                                             │
│  ├─ Aggregate scores                                                        │
│  ├─ Apply leverage scaling                                                  │
│  ├─ Emit events (waveChange, shockDetected, liquidationWarning)            │
│  └─ Return final DifficultyOutput                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ LAYERED HYBRID ARCHITECTURE

### Problem

İki aşırı uç var:
1. **Centralized (God Object)**: Tüm faktörler tek DifficultyManager'da → Debug zor, tek hata tüm sistemi çökertir
2. **Decentralized**: Her servis kendi hesaplar → Tutarsızlık, duplicate kod, "Total Difficulty" yok

### Çözüm: 4 Katmanlı Hibrit Mimari

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: INPUT PROVIDERS                          │
│                          (Bağımsız, Observable)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MarketStateService ─────┐                                                  │
│  (price, pnl, liq)       │                                                  │
│                          │   EventBus.emit('marketUpdate', {...})           │
│  GameTimeService ────────┼───►                                              │
│  (elapsed, cycle, phase) │   EventBus.emit('phaseChange', {...})            │
│                          │                                                  │
│  PlayerStateService ─────┘   EventBus.emit('playerLevelUp', {...})          │
│  (level, hp, streak)                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          EventBus (pub/sub)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 2: FACTOR CALCULATORS                            │
│                      (Pure Functions, Stateless)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ CycleFactor.ts │  │ PnLFactor.ts   │  │ WaveFactor.ts  │                │
│  │ • calculate()  │  │ • calculate()  │  │ • calculate()  │                │
│  │ • Unit tested  │  │ • Unit tested  │  │ • Unit tested  │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ LevelFactor.ts │  │ LiquidFactor.ts│  │ ShockFactor.ts │                │
│  │ • calculate()  │  │ • calculate()  │  │ • calculate()  │                │
│  │ • Unit tested  │  │ • Unit tested  │  │ • Unit tested  │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                             │
│  Her biri pure function, hiçbir state tutmaz, %100 test edilebilir         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: DIFFICULTY CONTEXT                            │
│                      (Read-Only State Container)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DifficultyContext = {                                                      │
│    factors: {           // Cached individual factors                        │
│      cycle: 1.5,                                                            │
│      pnl: 1.2,                                                              │
│      level: 1.3,                                                            │
│      wave: 0.85,                                                            │
│      liquidation: { factor: 1.0, warning: 'NONE' },                         │
│      streak: 1.1,                                                           │
│      shock: { factor: 1.0, triggered: false },                              │
│    },                                                                       │
│                                                                             │
│    aggregates: {        // Pre-computed for convenience                     │
│      core: 2.1,         // cycle × pnl × level × wave                       │
│      modifier: 1.1,     // liquidation × streak × shock                     │
│      total: 2.31,       // clamp(core × modifier, 1.0, 8.0)                 │
│    },                                                                       │
│                                                                             │
│    inputs: {            // Raw inputs for custom calculations               │
│      leverage: 10,                                                          │
│      leverageScale: { spawn: 1.2, speed: 1.1, hp: 1.1, damage: 1.15 },     │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
│  ⚠️ Bu layer HESAPLAMA YAPMAZ, faktörleri cache'ler, lazy recalculation   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          getContext()
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LAYER 4: CONSUMER SERVICES                            │
│                       (Her biri kendi output'unu hesaplar)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ EnemySpawner                                                          │  │
│  │ const ctx = getContext();                                             │  │
│  │ spawnRate = ctx.aggregates.core * ctx.inputs.leverageScale.spawn      │  │
│  │           * (ctx.factors.shock.triggered ? 1.3 : 1.0);                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ CombatSystem                                                          │  │
│  │ const ctx = getContext();                                             │  │
│  │ enemyDamage = baseDamage * ctx.aggregates.total                       │  │
│  │             * ctx.inputs.leverageScale.damage;                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ HUD Display                                                           │  │
│  │ const ctx = getContext();                                             │  │
│  │ drawText(`Difficulty: ${ctx.aggregates.total.toFixed(1)}x`);          │  │
│  │ if (ctx.factors.liquidation.warning !== 'NONE') showWarning();        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sorumluluk Dağılımı

| Layer | Sorumluluk | State | Test |
|-------|------------|-------|------|
| **1. Input Providers** | Raw data sağla, değiştiğinde event emit | Kendi state'i | Integration |
| **2. Factor Calculators** | Tek faktör hesapla (pure function) | ❌ Stateless | Unit (%100) |
| **3. DifficultyContext** | Faktörleri cache'le, lazy recalculate | ✅ Read-only | Unit |
| **4. Consumers** | Kendi output'unu hesapla, context'i kullan | Kendi logic'i | Integration |

### Klasör Yapısı

```
services/
├── difficulty/
│   ├── DifficultyContext.ts       # Layer 3: State container
│   ├── types.ts                   # Shared interfaces
│   ├── constants.ts               # LEVERAGE_TIERS, WAVE_PHASES, etc.
│   ├── factors/                   # Layer 2: Pure function calculators
│   │   ├── index.ts               # Re-export all
│   │   ├── CycleFactor.ts
│   │   ├── PnLFactor.ts
│   │   ├── LevelFactor.ts
│   │   ├── WaveFactor.ts
│   │   ├── LiquidationFactor.ts
│   │   ├── StreakFactor.ts
│   │   └── ShockFactor.ts
│   └── __tests__/                 # Unit tests per factor
│       ├── CycleFactor.test.ts
│       ├── PnLFactor.test.ts
│       └── ...
├── EnemySpawner.ts                # Layer 4: Consumer
├── CombatSystem.ts                # Layer 4: Consumer
└── ...
```

### DifficultyContext Implementation

```typescript
// services/difficulty/DifficultyContext.ts
import { EventBus } from '../EventBus';
import { calculateCycleFactor } from './factors/CycleFactor';
import { calculatePnLFactor } from './factors/PnLFactor';
import { LEVERAGE_TIERS } from './constants';
// ... diğer imports

class DifficultyContextManager {
  private state: DifficultyContextState;
  private dirty = true;
  private inputs: DifficultyInputs;

  constructor() {
    // Input değişikliklerini dinle - lazy recalculation
    EventBus.on('marketUpdate', (data) => {
      this.inputs.pnlPercent = data.pnlPercent;
      this.inputs.currentPrice = data.price;
      this.markDirty();
    });
    
    EventBus.on('phaseChange', (data) => {
      this.inputs.elapsedSeconds = data.elapsedSeconds;
      this.markDirty();
    });
    
    EventBus.on('playerLevelUp', (data) => {
      this.inputs.level = data.level;
      this.markDirty();
    });
    
    EventBus.on('gameReset', () => this.reset());
  }

  private markDirty() {
    this.dirty = true;
  }

  // Lazy recalculation - sadece okunduğunda hesapla
  getContext(): DifficultyContextState {
    if (this.dirty) {
      this.recalculate();
      this.dirty = false;
    }
    return this.state;
  }

  private recalculate() {
    const { inputs } = this;
    
    // Layer 2: Call pure factor calculators
    const cycle = calculateCycleFactor(inputs);
    const pnl = calculatePnLFactor(inputs);
    const level = calculateLevelFactor(inputs);
    const wave = calculateWaveFactor(inputs.elapsedSeconds);
    const liquidation = calculateLiquidationFactor(inputs);
    const streak = calculateStreakFactor(inputs);
    const shock = calculateShockFactor(inputs);

    // Pre-compute aggregates
    const core = cycle * pnl * level * wave.factor;
    const modifier = liquidation.factor * streak * shock.factor;
    const total = clamp(core * modifier, 1.0, 8.0);

    const leverageScale = LEVERAGE_TIERS[inputs.leverage] ?? LEVERAGE_TIERS[5];

    this.state = {
      factors: {
        cycle,
        pnl,
        level,
        wave: wave.factor,
        wavePhase: wave.phase,
        liquidation,
        streak,
        shock,
      },
      aggregates: { core, modifier, total },
      inputs: {
        leverage: inputs.leverage,
        leverageScale,
      },
    };

    // Debug panel için event
    EventBus.emit('difficultyUpdated', this.state);
  }

  private reset() {
    this.dirty = true;
    this.inputs = getDefaultInputs();
  }
}

export const difficultyContext = new DifficultyContextManager();
```

### Consumer Kullanım Örneği

```typescript
// services/EnemySpawner.ts
import { difficultyContext } from './difficulty/DifficultyContext';

class EnemySpawner {
  update(deltaTime: number) {
    const ctx = difficultyContext.getContext();
    
    // Consumer kendi formülünü uygular
    const baseRate = this.config.baseSpawnRate;
    const shockBoost = ctx.factors.shock.triggered ? 1.3 : 1.0;
    
    const adjustedRate = baseRate 
      * ctx.aggregates.core 
      * ctx.inputs.leverageScale.spawn
      * shockBoost;
    
    this.spawnTimer += deltaTime * adjustedRate;
    
    while (this.spawnTimer >= 1.0) {
      this.spawnEnemy();
      this.spawnTimer -= 1.0;
    }
  }
}
```

### Avantajlar

| Avantaj | Açıklama |
|---------|----------|
| **İzole Test** | Her Factor calculator pure function → %100 unit test coverage |
| **Loose Coupling** | Consumer'lar sadece ihtiyaçları faktörleri kullanır |
| **Tek Kaynak** | DifficultyContext tek truth source → Tutarsızlık yok |
| **Esneklik** | Yeni consumer eklerken mevcut sistemi bozmaz |
| **Debug Kolaylığı** | Tüm faktörler `difficultyUpdated` event'i ile görünür |
| **Performans** | Lazy recalculation → Sadece input değiştiğinde hesapla |
| **Extendable** | Yeni faktör eklemek: 1 dosya + 1 test + Context'e import |

---

## 📝 TYPES & UTILITIES

Bu bölüm implementasyon için gerekli tüm type tanımlarını ve utility fonksiyonlarını içerir.

### Core Types

```typescript
// services/difficulty/types.ts

/** Tüm faktör hesaplayıcılarının ihtiyaç duyduğu input'lar */
export interface DifficultyInputs {
  // Time-based
  elapsedSeconds: number;
  cycleDuration: number;  // Default: 300
  
  // Market-based
  pnlPercent: number;     // -1.0 to +1.0 (raw, unleveraged)
  currentPrice: number;
  entryPrice: number;
  liquidationPrice: number;
  
  // Player state
  level: number;
  leverage: number;       // 1, 2, 5, 10, 25, 50, 100
  position: 'LONG' | 'SHORT';
  
  // Combat state
  killStreak: number;
  timeSinceLastKill: number;  // ms, -1 if no kills yet
  
  // History (for shock detection)
  pnlHistory: number[];   // Son 30 leveraged PnL değeri
}

/** Wave phase isimleri */
export type WavePhase = 
  | 'warmup' 
  | 'buildup' 
  | 'firstPeak' 
  | 'breather' 
  | 'escalation' 
  | 'climax' 
  | 'resolution';

/** Liquidation warning seviyeleri */
export type LiquidationWarning = 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';

/** Leverage tier konfigürasyonu */
export interface LeverageScale {
  spawn: number;
  speed: number;
  hp: number;
  damage: number;
  xpReq: number;
}

/** DifficultyContext'in döndürdüğü state */
export interface DifficultyContextState {
  factors: {
    cycle: number;
    pnl: number;
    level: number;
    wave: number;
    wavePhase: WavePhase;
    liquidation: {
      factor: number;
      warningLevel: LiquidationWarning;
      fovReduction: number;
    };
    streak: number;
    shock: {
      factor: number;
      triggered: boolean;
    };
  };
  aggregates: {
    core: number;      // cycle × pnl × level × wave
    modifier: number;  // liquidation × streak × shock
    total: number;     // clamp(core × modifier, 1.0, 8.0)
  };
  inputs: {
    leverage: number;
    leverageScale: LeverageScale;
  };
}
```

### Utility Functions

```typescript
// services/difficulty/utils.ts

/**
 * Değeri min-max aralığına sıkıştırır
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Default input değerlerini döndürür (oyun başlangıcı için)
 */
export function getDefaultInputs(): DifficultyInputs {
  return {
    // Time
    elapsedSeconds: 0,
    cycleDuration: DIFFICULTY_CONFIG.cycleDuration,
    
    // Market (simulated entry)
    pnlPercent: 0,
    currentPrice: 0,
    entryPrice: 0,
    liquidationPrice: 0,
    
    // Player
    level: 1,
    leverage: 5,  // Default: 5x
    position: 'LONG',
    
    // Combat
    killStreak: 0,
    timeSinceLastKill: -1,
    
    // History
    pnlHistory: [],
  };
}
```

### Configuration

```typescript
// services/difficulty/constants.ts

export const DIFFICULTY_CONFIG = {
  /** Cycle süresi (saniye). Debug için override edilebilir. */
  cycleDuration: 300,
  
  /** PnL history buffer boyutu */
  pnlHistorySize: 30,
  
  /** Kill streak timeout (ms) */
  streakTimeoutMs: 3000,
  
  /** Shock detection threshold (underlying price %) */
  shockThreshold: 0.005,
  
  /** Clamp limitleri */
  limits: {
    total: { min: 1.0, max: 8.0 },
    spawnRate: { min: 0.5, max: 10.0 },
    enemySpeed: { min: 0.5, max: 5.0 },
    enemyHP: { min: 0.5, max: 3.0 },
    enemyDamage: { min: 0.5, max: 8.0 },
  },
};

export const LEVERAGE_TIERS: Record<number, LeverageScale> = {
  1:   { spawn: 0.7,  speed: 0.8,  hp: 0.8,  damage: 0.8,  xpReq: 1.0  },
  2:   { spawn: 0.8,  speed: 0.85, hp: 0.9,  damage: 0.9,  xpReq: 1.1  },
  5:   { spawn: 1.0,  speed: 1.0,  hp: 1.0,  damage: 1.0,  xpReq: 1.25 },
  10:  { spawn: 1.2,  speed: 1.1,  hp: 1.1,  damage: 1.15, xpReq: 1.5  },
  25:  { spawn: 1.5,  speed: 1.25, hp: 1.2,  damage: 1.4,  xpReq: 2.0  },
  50:  { spawn: 2.0,  speed: 1.4,  hp: 1.4,  damage: 1.8,  xpReq: 3.0  },
  100: { spawn: 3.0,  speed: 2.0,  hp: 1.6,  damage: 2.5,  xpReq: 5.0  },
};

/** 
 * Wave phase tanımları (sıralı array, Object.entries güvenliği için)
 */
export const WAVE_PHASES: Array<{ name: WavePhase; duration: number; multiplier: number }> = [
  { name: 'warmup',     duration: 25,  multiplier: 0.75 },
  { name: 'buildup',    duration: 60,  multiplier: 0.85 },
  { name: 'firstPeak',  duration: 30,  multiplier: 1.30 },
  { name: 'breather',   duration: 45,  multiplier: 0.60 },
  { name: 'escalation', duration: 60,  multiplier: 1.15 },
  { name: 'climax',     duration: 45,  multiplier: 1.50 },
  { name: 'resolution', duration: 35,  multiplier: 0.50 },
];

/**
 * En yakın leverage tier'ını bul (1, 2, 5, 10, 25, 50, 100)
 */
export function getNearestLeverageTier(leverage: number): number {
  const tiers = [1, 2, 5, 10, 25, 50, 100];
  return tiers.reduce((prev, curr) => 
    Math.abs(curr - leverage) < Math.abs(prev - leverage) ? curr : prev
  );
}

/**
 * Leverage tier'ını güvenli şekilde al
 */
export function getLeverageScale(leverage: number): LeverageScale {
  const tier = getNearestLeverageTier(leverage);
  return LEVERAGE_TIERS[tier];
}
```

### pnlHistory Yönetimi

```typescript
// DifficultyContext içinde pnlHistory yönetimi

class DifficultyContextManager {
  private inputs: DifficultyInputs;
  
  constructor() {
    // Market update'lerinde pnlHistory'yi güncelle
    EventBus.on('marketUpdate', (data) => {
      this.inputs.pnlPercent = data.pnlPercent;
      this.inputs.currentPrice = data.price;
      
      // PnL history'ye ekle (leveraged)
      const leveragedPnL = data.pnlPercent * this.inputs.leverage;
      this.inputs.pnlHistory.push(leveragedPnL);
      
      // Buffer boyutunu koru
      if (this.inputs.pnlHistory.length > DIFFICULTY_CONFIG.pnlHistorySize) {
        this.inputs.pnlHistory.shift();
      }
      
      this.markDirty();
    });
  }
}
```

### Position (LONG/SHORT) Yönetimi

Position değeri oyun başlangıcında belirlenir ve oyun boyunca sabit kalır:

```typescript
// Hub/LeverageSelector.tsx veya GameStartFlow içinde
EventBus.emit('gameStart', {
  leverage: selectedLeverage,
  position: selectedPosition,  // 'LONG' veya 'SHORT'
});

// DifficultyContext dinler
EventBus.on('gameStart', (data) => {
  this.inputs.leverage = data.leverage;
  this.inputs.position = data.position;
  this.inputs.entryPrice = currentMarketPrice;
  this.inputs.liquidationPrice = calculateLiquidationPrice(
    this.inputs.entryPrice,
    data.leverage,
    data.position
  );
});
```

---

## 📐 FACTOR HESAPLAMALARI

### 1. CycleFactor (Cycle-Based Progression)

Her 5 dakikalık cycle sonunda zorluk **katlanarak** artar.

```typescript
interface CycleFactorInput {
  elapsedSeconds: number;
  cycleDuration: number; // 300s
}

function calculateCycleFactor(input: CycleFactorInput): number {
  const currentCycle = Math.floor(input.elapsedSeconds / input.cycleDuration) + 1;
  
  // Exponential growth with smooth soft cap transition
  // Cycle 1: 1.0, Cycle 2: 1.5, Cycle 3: 2.25
  // After cycle 3: Linear growth to prevent explosion
  
  if (currentCycle <= 3) {
    return Math.pow(1.5, currentCycle - 1);
  }
  
  // Smooth transition: Continue from 2.25 with linear growth
  // Cycle 4: 2.25 + 0.475 = 2.725
  // Cycle 5: 2.25 + 0.95 = 3.2
  // Cycle 6: 2.25 + 1.425 = 3.675
  const LINEAR_GROWTH_RATE = 0.475;
  return 2.25 + (currentCycle - 3) * LINEAR_GROWTH_RATE;
}
```

| Cycle | Exponential | Soft-Capped | Açıklama |
|-------|-------------|-------------|----------|
| 1     | 1.0         | 1.0         | Başlangıç |
| 2     | 1.5         | 1.5         | Orta zorluk |
| 3     | 2.25        | 2.25        | Zor (soft cap başlar) |
| 4     | 3.375       | 2.725       | Çok zor (smooth geçiş) |
| 5     | 5.06        | 3.2         | Kabus |
| 6     | 7.59        | 3.675       | Cehennem |
| 7+    | ...         | 4.15+       | Linear artış devam |

---

### 2. PnLFactor (Profit & Loss Effect)

Kayıpta zorluk artar, kârda azalır. Minimum zorluk korunur.

```typescript
interface PnLFactorInput {
  pnlPercent: number;     // -1.0 to +1.0 (e.g., -0.05 = -5%)
  leverage: number;       // 1-100
}

function calculatePnLFactor(input: PnLFactorInput): number {
  const { pnlPercent, leverage } = input;
  
  // Leverage PnL volatiliteyi artırır
  const leveragedPnL = pnlPercent * leverage;
  
  if (leveragedPnL < 0) {
    // KAYIP: Zorluk artar (logaritmik, cap'li)
    const lossMagnitude = Math.abs(leveragedPnL);
    return Math.min(3.0, 1.0 + Math.log1p(lossMagnitude * 10) * 0.4);
  } else {
    // KÂR: Zorluk azalır ama minimum 0.7 (oyun sıkıcı olmasın)
    const profitMagnitude = leveragedPnL;
    return Math.max(0.7, 1.0 - Math.log1p(profitMagnitude * 5) * 0.15);
  }
}
```

| PnL % | 1x Lever | 10x Lever | 100x Lever |
|-------|----------|-----------|------------|
| +10%  | 0.85     | 0.73      | 0.70 (min) |
| +5%   | 0.90     | 0.78      | 0.70 (min) |
| 0%    | 1.00     | 1.00      | 1.00       |
| -5%   | 1.08     | 1.32      | 1.72       |
| -10%  | 1.14     | 1.52      | 2.10       |
| -20%  | 1.22     | 1.82      | 2.68       |

---

### 3. LevelFactor (Player Level Scaling)

Level arttıkça enemy HP ve damage artar. **Kaldıraç level zorluk curve'ünü de etkiler.**

```typescript
interface LevelFactorInput {
  level: number;
  leverage: number;
}

function calculateLevelFactor(input: LevelFactorInput): number {
  const { level, leverage } = input;
  
  // Base: +10% per level
  const baseIncrease = 0.10;
  
  // Leverage modifier: Yüksek kaldıraçta level scaling de artar
  // 1x = 1.0, 10x = 1.1, 100x = 1.3
  const leverageModifier = 1.0 + Math.log10(leverage) * 0.15;
  
  const factor = 1.0 + (level - 1) * baseIncrease * leverageModifier;
  
  // Cap at 2.0x (Level 11 @ 1x, Level 8 @ 100x)
  return Math.min(2.0, factor);
}
```

| Level | 1x Lever | 10x Lever | 100x Lever |
|-------|----------|-----------|------------|
| 1     | 1.00     | 1.00      | 1.00       |
| 5     | 1.40     | 1.55      | 1.78       |
| 10    | 1.90     | 2.00      | 2.00 (cap) |
| 15    | 2.00     | 2.00      | 2.00       |

---

### 4. WaveFactor (Phase-Based Yo-Yo)

5 dakikalık cycle içinde 7 phase ile zorluk dalgalanır.

```typescript
// WAVE_PHASES artık constants.ts'den import ediliyor (yukarıdaki TYPES & UTILITIES bölümüne bak)
import { WAVE_PHASES, WavePhase } from './constants';

function calculateWaveFactor(elapsedSeconds: number): { phase: WavePhase; factor: number } {
  const cycleTime = elapsedSeconds % 300;
  let accumulated = 0;
  
  for (const phaseConfig of WAVE_PHASES) {
    if (cycleTime < accumulated + phaseConfig.duration) {
      return { phase: phaseConfig.name, factor: phaseConfig.multiplier };
    }
    accumulated += phaseConfig.duration;
  }
  
  // Fallback (should never reach here if WAVE_PHASES totals 300s)
  return { phase: 'resolution', factor: 0.50 };
}
```

**Cycle Timeline:**
```
0:00 ─────────────────────────────────────────────────────── 5:00
│ warmup │   buildup    │peak│  breather  │ escalation │climax│res│
│  0.75  │     0.85     │1.30│    0.60    │    1.15    │ 1.50 │0.5│
│  25s   │     60s      │30s │    45s     │    60s     │ 45s  │35s│
                                                          ↑
                                                     BOSS WAVE
                                                          ↓
                                                   Decision Screen
```

---

### 5. LiquidationFactor (Yaklaşan Tehlike)

Likidasyona yaklaştıkça zorluk artar ve görsel efektler tetiklenir.

```typescript
interface LiquidationFactorInput {
  currentPrice: number;
  entryPrice: number;       // ← Added: Required for distance calculation
  liquidationPrice: number;
  position: 'LONG' | 'SHORT';
}

interface LiquidationFactorOutput {
  factor: number;
  warningLevel: 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  fovReduction: number; // 0.0 - 0.4 (40% max FOV reduction)
}

function calculateLiquidationFactor(input: LiquidationFactorInput): LiquidationFactorOutput {
  const { currentPrice, entryPrice, liquidationPrice, position } = input;
  
  // Guard: Prevent division by zero if entry equals liquidation
  const denominator = position === 'LONG'
    ? entryPrice - liquidationPrice
    : liquidationPrice - entryPrice;
  
  if (Math.abs(denominator) < 0.01) {
    // Edge case: Entry price too close to liquidation (instant danger)
    return { factor: 2.0, warningLevel: 'CRITICAL', fovReduction: 0.4 };
  }
  
  // Likidasyona mesafe hesapla (0.0 = liq, 1.0 = entry)
  const distance = position === 'LONG'
    ? (currentPrice - liquidationPrice) / denominator
    : (liquidationPrice - currentPrice) / denominator;
  
  const safeDistance = Math.max(0, Math.min(1, distance));
  
  // Warning zones
  let warningLevel: 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  let fovReduction = 0;
  let factor = 1.0;
  
  if (safeDistance > 0.30) {
    warningLevel = 'NONE';
    factor = 1.0;
    fovReduction = 0;
  } else if (safeDistance > 0.20) {
    warningLevel = 'CAUTION';
    factor = 1.3;
    fovReduction = 0.1; // 10% FOV reduction
  } else if (safeDistance > 0.10) {
    warningLevel = 'DANGER';
    factor = 1.6;
    fovReduction = 0.25; // 25% FOV reduction
  } else {
    warningLevel = 'CRITICAL';
    factor = 2.0;
    fovReduction = 0.4; // 40% FOV reduction (tunnel vision)
  }
  
  return { factor, warningLevel, fovReduction };
}
```

| Likidasyona Mesafe | Warning Level | Difficulty × | FOV Reduction |
|--------------------|---------------|--------------|---------------|
| > 30%              | NONE          | 1.0x         | 0%            |
| 20-30%             | CAUTION       | 1.3x         | 10%           |
| 10-20%             | DANGER        | 1.6x         | 25%           |
| < 10%              | CRITICAL      | 2.0x         | 40%           |

---

### 6. StreakFactor (Kill Streak Bonus)

Hızlı kill'ler zorluğu artırır.

```typescript
interface StreakFactorInput {
  killStreak: number;
  timeSinceLastKill: number; // ms (0 = just killed, -1 = no kills yet)
}

function calculateStreakFactor(input: StreakFactorInput): number {
  const { killStreak, timeSinceLastKill } = input;
  
  const STREAK_TIMEOUT_MS = 3000;
  
  // Edge case: No kills yet in this session
  if (killStreak <= 0 || timeSinceLastKill < 0) {
    return 1.0;
  }
  
  // Streak expired? (timeSinceLastKill = 0 means "just now", which is valid)
  if (timeSinceLastKill > STREAK_TIMEOUT_MS) {
    return 1.0;
  }
  
  // +5% per 5 kills, max 30%
  const bonus = Math.min(0.30, Math.floor(killStreak / 5) * 0.05);
  
  return 1.0 + bonus;
}
```

---

### 7. ShockFactor (Sudden Market Movement)

Ani fiyat hareketlerinde burst zorluk.

```typescript
interface ShockFactorInput {
  pnlHistory: number[]; // son 30 değer (leveraged PnL percentages)
  leverage: number;
}

function calculateShockFactor(input: ShockFactorInput): { factor: number; triggered: boolean } {
  const { pnlHistory, leverage } = input;
  
  // Need at least 6 entries to compare 3 recent vs 3 older
  // Fixed: Previous check (< 5) would cause slice(-6, -3) to return empty array
  if (pnlHistory.length < 6) {
    return { factor: 1.0, triggered: false };
  }
  
  const recent = pnlHistory.slice(-3);      // Last 3 values
  const older = pnlHistory.slice(-6, -3);   // 3 values before that
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  // Normalize by leverage to detect underlying price movement
  // pnlHistory contains leveraged values, so divide to get raw price change
  const priceMove = Math.abs(recentAvg - olderAvg) / Math.max(1, leverage);
  
  const SHOCK_THRESHOLD = 0.005; // 0.5% underlying movement
  
  if (priceMove > SHOCK_THRESHOLD) {
    const intensity = Math.min(2.0, 1.0 + (priceMove / SHOCK_THRESHOLD));
    return { factor: intensity, triggered: true };
  }
  
  return { factor: 1.0, triggered: false };
}
```

---

## 📊 LEVERAGE TIER SYSTEM

Kaldıraç seviyeleri sabit ve tier-based. Her tier tüm output'ları etkiler.

```typescript
const LEVERAGE_TIERS = {
  1:   { spawn: 0.7,  speed: 0.8,  hp: 0.8,  damage: 0.8,  xpReq: 1.0  },
  2:   { spawn: 0.8,  speed: 0.85, hp: 0.9,  damage: 0.9,  xpReq: 1.1  },
  5:   { spawn: 1.0,  speed: 1.0,  hp: 1.0,  damage: 1.0,  xpReq: 1.25 },
  10:  { spawn: 1.2,  speed: 1.1,  hp: 1.1,  damage: 1.15, xpReq: 1.5  },
  25:  { spawn: 1.5,  speed: 1.25, hp: 1.2,  damage: 1.4,  xpReq: 2.0  },
  50:  { spawn: 2.0,  speed: 1.4,  hp: 1.4,  damage: 1.8,  xpReq: 3.0  },
  100: { spawn: 3.0,  speed: 2.0,  hp: 1.6,  damage: 2.5,  xpReq: 5.0  },
};
```

### XP Requirement Scaling

Level başına gereken XP kaldıraça göre artar:

```typescript
function getXPRequired(currentLevel: number, leverage: number): number {
  const baseXP = 100;
  const levelMultiplier = Math.pow(1.15, currentLevel - 1); // +15% per level
  const leverageMultiplier = LEVERAGE_TIERS[leverage].xpReq;
  
  return Math.floor(baseXP * levelMultiplier * leverageMultiplier);
}
```

| Level | 1x Lever | 10x Lever | 100x Lever |
|-------|----------|-----------|------------|
| 1     | 100      | 150       | 500        |
| 5     | 175      | 262       | 875        |
| 10    | 350      | 525       | 1750       |

---

## 🎯 FINAL OUTPUT CALCULATION

```typescript
interface DifficultyOutput {
  // Final multipliers for game systems
  spawnRate: number;      // 0.5 - 10.0
  enemySpeed: number;     // 0.5 - 5.0
  enemyHP: number;        // 0.5 - 3.0
  enemyDamage: number;    // 0.5 - 8.0
  
  // Composite difficulty
  total: number;          // 1.0 - 8.0
  
  // Debug/Analytics
  factors: {
    cycle: number;
    pnl: number;
    level: number;
    wave: number;
    liquidation: number;
    streak: number;
    shock: number;
  };
  
  // Special states
  wavePhase: WavePhase;
  liquidationWarning: 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  fovReduction: number;
  shockActive: boolean;
}

function calculateDifficulty(inputs: DifficultyInputs): DifficultyOutput {
  // Layer 2: Calculate individual factors
  const cycleFactor = calculateCycleFactor(inputs);
  const pnlFactor = calculatePnLFactor(inputs);
  const levelFactor = calculateLevelFactor(inputs);
  const { phase, factor: waveFactor } = calculateWaveFactor(inputs.elapsedSeconds);
  const liquidation = calculateLiquidationFactor(inputs);
  const streakFactor = calculateStreakFactor(inputs);
  const shock = calculateShockFactor(inputs);
  
  // Layer 3: Aggregate
  const coreScore = cycleFactor * pnlFactor * levelFactor * waveFactor;
  const modifierScore = liquidation.factor * streakFactor * shock.factor;
  
  const rawTotal = coreScore * modifierScore;
  const total = clamp(rawTotal, 1.0, 8.0);
  
  // Layer 4: Apply leverage scaling with hybrid approach
  const leverageScale = LEVERAGE_TIERS[inputs.leverage];
  
  // Core difficulty (market + time based)
  const coreDifficulty = cycleFactor * pnlFactor * levelFactor * waveFactor;
  
  // Shock boost for spawn rate (burst spawns on sudden price moves)
  const shockBoost = shock.triggered ? 1.3 : 1.0;
  
  return {
    // Spawn: Core difficulty + shock burst
    spawnRate: clamp(coreDifficulty * leverageScale.spawn * shockBoost, 0.5, 10.0),
    
    // Speed: Core difficulty + liquidation pressure (approaching liq = faster enemies)
    enemySpeed: clamp(coreDifficulty * leverageScale.speed * liquidation.factor, 0.5, 5.0),
    
    // HP: Only level-based (isolated from market for predictability)
    // Players can calculate if they can kill an enemy without market volatility affecting it
    enemyHP: clamp(levelFactor * leverageScale.hp, 0.5, 3.0),
    
    // Damage: Full total difficulty (most punishing stat)
    enemyDamage: clamp(total * leverageScale.damage, 0.5, 8.0),
    
    total,
    coreDifficulty, // Added for debugging
    
    factors: {
      cycle: cycleFactor,
      pnl: pnlFactor,
      level: levelFactor,
      wave: waveFactor,
      liquidation: liquidation.factor,
      streak: streakFactor,
      shock: shock.factor,
    },
    
    wavePhase: phase as WavePhase,
    liquidationWarning: liquidation.warningLevel,
    fovReduction: liquidation.fovReduction,
    shockActive: shock.triggered,
  };
}
```

---

## 🎮 BOSS WAVE & DECISION SCREEN

### Climax Phase (Boss Wave)
- Cycle'ın **3:40-4:25** arasında tetiklenir (45 saniye)
- Yoğun spawn + güçlü enemy'ler
- Phase sonunda "Cycle Boss" spawn olabilir (opsiyonel)

> **⚠️ Timeline Referansı:** warmup(0:00-0:25) → buildup(0:25-1:25) → firstPeak(1:25-1:55) → breather(1:55-2:40) → escalation(2:40-3:40) → **climax(3:40-4:25)** → resolution(4:25-5:00)

### Decision Screen (Resolution Phase)
- Cycle'ın **4:25-5:00** arasında açılır (35 saniye)
- Oyuncu seçenekleri:
  - **Continue (Competitive):** Sonraki cycle'a devam, zorluk katlanır
  - **Cash Out (Casual):** Cycle sonuç ekranı, XP/loot kazan

```typescript
// EventBus emissions
EventBus.emit('bossWaveStart', { cycleNumber: 2 });
EventBus.emit('bossWaveEnd', { cycleNumber: 2 });
EventBus.emit('cycleDecisionScreen', { 
  cycleNumber: 2,
  options: ['CONTINUE', 'CASH_OUT'],
  nextCycleDifficulty: 2.25,
});
```

---

## 📡 EVENT SYSTEM

```typescript
// Difficulty Events
interface DifficultyEvents {
  // Phase transitions
  wavePhaseChange: { phase: WavePhase; oldPhase: WavePhase };
  cycleComplete: { cycleNumber: number };
  
  // Danger alerts
  liquidationWarning: { level: 'CAUTION' | 'DANGER' | 'CRITICAL'; distance: number };
  shockDetected: { intensity: number; direction: 'up' | 'down' };
  
  // Game flow
  bossWaveStart: { cycleNumber: number };
  bossWaveEnd: { cycleNumber: number };
  cycleDecisionScreen: { cycleNumber: number; options: string[] };
}
```

---

## 🛠️ DEBUG PANEL

Admin Dashboard'da her faktörün real-time gösterimi:

```
┌─────────────────────────────────────────────────────┐
│ DIFFICULTY DEBUG PANEL                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ CYCLE: 2             PHASE: escalation              │
│ ELAPSED: 3:42        PHASE TIME: 1:02 / 1:00       │
│                                                     │
│ ─────────── FACTORS ───────────                     │
│ Cycle Factor:        1.50  ████████░░               │
│ PnL Factor:          1.24  ██████░░░░  (PnL: -3.2%) │
│ Level Factor:        1.30  ██████░░░░  (Lvl: 4)     │
│ Wave Factor:         1.15  █████░░░░░               │
│ Liquidation:         1.00  ████░░░░░░  (NONE)       │
│ Streak Factor:       1.10  █████░░░░░  (12 kills)   │
│ Shock Factor:        1.00  ████░░░░░░               │
│                                                     │
│ ─────────── OUTPUT ────────────                     │
│ TOTAL DIFFICULTY:    3.12  ██████████████░░░░░░    │
│                                                     │
│ Spawn Rate:   3.74        Enemy Speed:  1.84        │
│ Enemy HP:     1.43        Enemy Damage: 4.52        │
│                                                     │
│ WARNING: NONE    FOV: 100%    SHOCK: ○             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Core Refactor ✅
- [x] `DifficultyContext.ts` - Layered architecture orchestrator
- [x] `DifficultyManager.ts` refactored as Layer 4 consumer
- [x] All factor pure functions created:
  - [x] `CycleFactor.ts` - Time-based progression
  - [x] `PnLFactor.ts` - Profit/Loss impact
  - [x] `LevelFactor.ts` - Player level scaling
  - [x] `WaveFactor.ts` - Phase-based yo-yo rhythm
  - [x] `LiquidationFactor.ts` - Proximity danger
  - [x] `StreakFactor.ts` - Kill streak bonus
  - [x] `ShockFactor.ts` - Sudden market moves
  - [x] `RSIFactor.ts` - RSI-based sentiment
  - [x] `VolumeFactor.ts` - Market activity
  - [x] `ATRFactor.ts` - Volatility intensity
  - [x] `NearDeathFactor.ts` - Low HP mercy
- [x] `LEVERAGE_TIERS` configured with new values
- [x] Types, constants, and utilities (`types.ts`, `constants.ts`, `utils.ts`)
- [x] Index re-exports for clean imports
- [x] Unit tests (84 tests) for all factors

### Phase 2: Liquidation System ✅
- [x] `LiquidationFactor` calculator with warning levels
- [x] Warning zone visual effects (`LiquidationWarningOverlay.tsx`)
- [x] FOV reduction radial gradient overlay
- [x] EventBus emissions (`liquidationWarning`, `wavePhaseChange`)

### Phase 3: Boss Wave & Decision ✅
- [x] `bossWaveStart` / `bossWaveEnd` events emitted from DifficultyContext
- [x] Climax phase detection (via `useDifficultyV2` hook)
- [x] Decision screen UI component (`CycleDecisionScreen.tsx`)
- [x] Continue/Cash Out flow with EventBus integration
- [x] Translation keys for EN/TR locales

### Phase 4: Debug Panel ✅
- [x] `DifficultyV2Monitor.tsx` - Real-time factor visualization
- [x] Admin Dashboard integration
- [x] Factor breakdown with progress bars
- [x] Aggregates display (Core, Modifier, Market, Total)

### 8. RSIFactor (Relative Strength Index)

Oyuncunun pozisyonuna göre piyasanın "aşırı" durumlarını cezalandırır veya ödüllendirir.

```typescript
interface RSIFactorInput {
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  position: 'LONG' | 'SHORT';
}

function calculateRSIFactor(input: RSIFactorInput): number {
  const { rsiState, position } = input;
  
  // Nötr durumda etki yok
  if (rsiState === 'NEUTRAL') return 1.0;
  
  // Favorable (Oyuncu lehine piyasa): Zorluk azalır
  // LONG + OVERSOLD (dipte) veya SHORT + OVERBOUGHT (tepede)
  const isFavorable = 
    (position === 'LONG' && rsiState === 'OVERSOLD') ||
    (position === 'SHORT' && rsiState === 'OVERBOUGHT');
    
  if (isFavorable) {
    return 0.8; // %20 kolaylaşır (Trend dönüşü ödülü)
  }
  
  // Unfavorable (Oyuncu aleyhine): Zorluk artar
  // LONG + OVERBOUGHT (tepede long) veya SHORT + OVERSOLD (dipte short)
  return 1.35; // %35 zorlaşır (FOMO cezası)
}
```

---

### 9. VolumeFactor (Market Activity)

İşlem hacmi arttıkça düşmanlar daha "agresif" ve "kalabalık" olur.

```typescript
interface VolumeFactorInput {
  normalizedVolume: number; // 0.0 to 1.0 (z-score normalized)
  whaleTier: 0 | 1 | 2 | 3;
}

function calculateVolumeFactor(input: VolumeFactorInput): number {
  const { normalizedVolume, whaleTier } = input;
  
  // Base: Hacimle doğru orantılı artış
  const baseVolumeMod = 1.0 + normalizedVolume * 0.5; // max 1.5
  
  // Whale Bonus: Balina aktivitesi varsa ekstra çarpan
  // Tier 1: 1.1x, Tier 2: 1.25x, Tier 3: 1.5x
  const whaleMods = [1.0, 1.1, 1.25, 1.5];
  const whaleMod = whaleMods[whaleTier] || 1.0;
  
  return baseVolumeMod * whaleMod; // max 2.25x
}
```

---

### 10. ATRFactor (Volatility Intensity)

Piyasa volatilitesi doğrudan düşman hızını ve agresifliğini etkiler.

```typescript
interface ATRFactorInput {
  atrPercent: number; // e.g., 0.5% = 0.5
}

function calculateATRFactor(input: ATRFactorInput): number {
  const { atrPercent } = input;
  
  // 0.2% altı sakin, 1.0% yukarısı ekstrem
  // Logaritmik artış
  const intensity = Math.max(0, atrPercent / 0.5); // 0.5% = 1.0 score
  return 1.0 + Math.log1p(intensity) * 0.45; // max ~1.5x
}
```

---

## 🎨 VISUAL EFFECTS DESIGN

### 1. Liquidation Tunnel Vision (FOV Reduction)

Likidasyona yaklaştıkça ekran kararır ve sadece oyuncunun etrafı görünür kalır.

- **Implementation**: Radial Gradient Overlay Shader.
- **Visuals**:
  - `CAUTION`: Hafif vinyet (vignette) efekti, kenarlar %10 kararır.
  - `DANGER`: Kenarlar %40 kararır, kırmızı bir pus (haze) eklenir.
  - `CRITICAL`: Ekranın %60'ı karanlık, sadece merkez parlak. Kalp atışı sesi ve kırmızı yanıp sönen kenarlar.

### 2. Market Shock Glitch

Ani fiyat hareketlerinde ekran "glitch" efekti ile sarsılır.

- **Upward Shock**: Mavi/Yeşil renk kayması (chromatic aberration), yukarı doğru sarsılma.
- **Downward Shock**: Kırmızı/Magenta renk kayması, aşağı doğru sarsılma.

---

## 🏁 PHASED IMPLEMENTATION PLAN

### Phase 2: Liquidation & Market Factors ✅
- [x] `factors/RSIFactor.ts`, `factors/VolumeFactor.ts`, `factors/ATRFactor.ts` implemented
- [x] `LiquidationFactor.ts` with distance-based warning system
- [x] `LiquidationWarningOverlay.tsx` with visual feedback

### Phase 3: Visual Feedback System 🔄
- [x] FOV Overlay (Radial Gradient) - `LiquidationWarningOverlay.tsx`
- [ ] `services/renderers/VFXManager.ts` (Optional Enhancement)
  - Chromatic Aberration (Glitch) for shock events
  - Speed Lines (High ATR)

### Phase 4: Boss Wave & Cycle Decision 🔄
- [x] `bossWaveStart` / `bossWaveEnd` events from DifficultyContext
- [x] Climax phase detection via `useDifficultyV2` hook
- [ ] `CycleDecisionScreen.tsx`: Show decision overlay at 4:25 without pausing
- [ ] `BossSpawner`: Whale boss spawn during climax phase (3:40-4:25)

### Phase 5: Anti-Cheat & Metrics
- [ ] `AntiCheatService`: Validate calculated difficulty against server `market_state`
- [ ] `MetricsService`: Report cycle-end difficulty and PnL data to Supabase

---

## 📚 Referanslar

- Mevcut sistem: `docs/DIFFICULTY_ANALYSIS.md`
- Mimari: `docs/ARCHITECTURE.md`
- Test coverage: `tests/services/difficulty/*.test.ts`
- Market Indicators: `services/indicators/MarketIndicatorService.ts`
- V2 Context: `services/difficulty/DifficultyContext.ts`
- V2 Monitor: `components/admin/DifficultyV2Monitor.tsx`

---

## 📊 Implementation Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Core Refactor | ✅ Complete | 100% |
| Phase 2: Liquidation & Market | ✅ Complete | 100% |
| Phase 3: Boss Wave & Decision | ✅ Complete | 100% |
| Phase 4: Debug Panel | ✅ Complete | 100% |
| Phase 5: Anti-Cheat & Metrics | ⏳ Pending | 0% |

**Overall Progress: ~90%**

---

*Doküman V2.3 - Updated: 2026-01-21 - CycleDecisionScreen implemented*


