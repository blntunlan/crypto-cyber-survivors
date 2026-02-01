# AI Director V2 - Market-Driven Flow State System

> **Project Darwin Phase 2**: Adaptive difficulty system that keeps players in flow state while reflecting real market conditions.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Core Concepts](#core-concepts)
3. [System Architecture](#system-architecture)
4. [Flow State Management](#flow-state-management)
5. [Portal Mechanics](#portal-mechanics)
6. [Market Event Mapping](#market-event-mapping)
7. [Leverage System](#leverage-system)
8. [Coin Economy](#coin-economy)
9. [Implementation Workflow](#implementation-workflow)
10. [TODO & Backtest Items](#todo--backtest-items)

---

## Design Philosophy

### Old System Problems
- ❌ Static 5-minute wave cycles disconnected from market
- ❌ Two separate neural networks (AIDirector + GameMasterBrain) with conflicting outputs
- ❌ Server-side indicator calculation causing latency
- ❌ Fixed difficulty patterns regardless of player skill

### New System Goals
- ✅ **Market-Driven Rhythm**: Game tempo follows real BTC market
- ✅ **Flow State Targeting**: Keep player HP in sweet spot (35%-65%)
- ✅ **Dynamic Exit Points**: Portal system replaces fixed wave cycles
- ✅ **Unified AI Brain**: Single neural network for all decisions
- ✅ **Client-Side Indicators**: Faster response to market changes

---

## Core Concepts

### 1. Flow State Definition

```
                    BORED (HP > 80%, low engagement)
                           ↑
                           |
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    │     ┌────────────────┴────────────────┐     │
    │     │                                 │     │
    │     │        FLOW STATE               │     │
    │     │     HP: 35% - 65%               │     │
    │     │     Kill Rate: 8-25/min         │     │
    │     │     Upgrade: 20-45s interval    │     │
    │     │                                 │     │
    │     └────────────────┬────────────────┘     │
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           |
                           ↓
                 STRESSED (HP < 35%, panic dashing)
```

### 2. Market → Game Mapping

| Market State | Game Feel | Player Experience |
|--------------|-----------|-------------------|
| **Consolidation** | Calm farming | Collect gems, build power |
| **Trending** | Steady combat | Consistent enemy flow |
| **Volatile** | Intense action | Fast enemies, frequent events |
| **Extreme** | Chaotic survival | Boss spawns, screen effects |

### 3. No More Wave Phases

**REMOVED:**
```
Warmup → Buildup → Peak → Breather → Climax → Resolution (DELETED)
```

**REPLACED WITH:**
```
Market Mood + Player Performance + Time → Dynamic Difficulty
```

---

## System Architecture

### Unified AI Director (Single Brain)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     UNIFIED AI DIRECTOR V2                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    INPUT SENSORS (18)                         │  │
│  │                                                               │  │
│  │  MARKET DATA (6)          PLAYER STATE (6)                   │  │
│  │  ├─ RSI (0-1)             ├─ HP Percent (0-1)                │  │
│  │  ├─ RSI Momentum (-1,1)   ├─ PnL Ratio (-1,1)                │  │
│  │  ├─ ATR Percent (0-1)     ├─ Kills/Min (0-1)                 │  │
│  │  ├─ Volume Norm (0-1)     ├─ Dash Frequency (0-1)            │  │
│  │  ├─ Price Change (−1,1)   ├─ Player DPS (0-1)                │  │
│  │  └─ Trend Strength (0-1)  └─ Damage Taken Rate (0-1)         │  │
│  │                                                               │  │
│  │  GAME CONTEXT (4)         FLOW METRICS (2)                   │  │
│  │  ├─ Elapsed Minutes       ├─ Engagement Score (0-1)          │  │
│  │  ├─ Player Level          └─ Frustration Score (0-1)         │  │
│  │  ├─ Leverage (0-1)                                           │  │
│  │  └─ Gem Pileup (0-1)                                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              NEURAL NETWORK (18 → 32 → 32 → 14)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   OUTPUT DECISIONS (14)                       │  │
│  │                                                               │  │
│  │  ENEMY PARAMS (5)         LOOT & ECONOMY (3)                 │  │
│  │  ├─ Spawn Rate            ├─ Gem Drop Rate                   │  │
│  │  ├─ Enemy Speed           ├─ XP Multiplier                   │  │
│  │  ├─ Enemy HP              └─ Buff Spawn Rate                 │  │
│  │  ├─ Enemy Damage                                             │  │
│  │  └─ Enemy Variety         SPECIAL EVENTS (3)                 │  │
│  │                           ├─ Whale Probability               │  │
│  │  FEEL & FLOW (3)          ├─ Market Event Chance             │  │
│  │  ├─ Chaos Level           └─ Elite Spawn Chance              │  │
│  │  ├─ Mercy Factor                                             │  │
│  │  └─ Pressure Intensity                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Binance    │────▶│   Client     │────▶│  Indicators  │
│   WebSocket  │     │   Price Feed │     │  Calculator  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Game      │◀────│   Unified    │◀────│   Market     │
│    Engine    │     │  AI Director │     │   State      │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   AntiCheat  │
                     │   (Server)   │
                     └──────────────┘
```

---

## Flow State Management

### Grace Period (First 30 Seconds)

| Time | Market Effect | Difficulty |
|------|---------------|------------|
| 0-10s | 0% market influence | 0.3x (tutorial feel) |
| 10-20s | 25% market influence | 0.5x (warming up) |
| 20-30s | 50% market influence | 0.7x (getting ready) |
| 30s+ | 100% market influence | Dynamic (AI controlled) |

### Flow State Parameters

```typescript
const FLOW_STATE_CONFIG = {
  // HP Sweet Spot
  HP_BAND: {
    min: 35,    // Below this = struggling
    ideal: 50,  // Target HP
    max: 65,    // Above this = too easy
  },

  // Kill Rate (per minute)
  KILL_RATE: {
    min: 8,     // Below = not enough action
    ideal: 15,  // Good engagement
    max: 25,    // Above = maybe too easy
  },

  // Upgrade Frequency (seconds between level-ups)
  UPGRADE_INTERVAL: {
    min: 20,    // Too fast = overwhelming
    ideal: 30,  // Good pacing
    max: 45,    // Too slow = boring
  },
};
```

### Adaptive Response

| Player State | Detection | AI Response |
|--------------|-----------|-------------|
| **Too Comfortable** | HP > 80% for 15s+ | ↑ Spawn rate, ↑ Enemy speed, spawn debuff gems |
| **In Flow** | HP 35-65%, good kill rate | Maintain current parameters |
| **Struggling** | HP < 35%, panic dashing | ↓ Spawn rate, ↓ Enemy damage, mercy window |
| **Near Death** | HP < 20% | Emergency mercy: -30% difficulty |
| **AFK Detected** | No input for 5s | No mercy, normal death |

### Panic Detection (Frustration Score)

```typescript
function calculateFrustrationScore(metrics: PlayerMetrics): number {
  const dashPanic = metrics.dashesLast10s / 10;           // Max ~1.0 if spamming
  const damageRate = metrics.damageTakenLast10s / 50;     // Normalized
  const lowHPDuration = metrics.timeBelowHP30 / 10;       // Seconds below 30% HP
  
  return clamp(
    (dashPanic * 0.3) + (damageRate * 0.5) + (lowHPDuration * 0.2),
    0, 1
  );
}
```

---

## Portal Mechanics

### Portal Trigger Conditions

```typescript
const PORTAL_CONFIG = {
  // Timing Constraints
  FIRST_PORTAL_MIN_TIME: 300,     // 5 minutes minimum (TODO: backtest)
  MAX_GAME_TIME: 600,             // 10 minutes max without portal
  PORTAL_COOLDOWN: 180,           // 3 minutes between portals
  PORTAL_DURATION: 25,            // Seconds portal stays open
  
  // Trigger Conditions (ANY can trigger portal)
  TRIGGERS: {
    // PnL Based
    TAKE_PROFIT_THRESHOLD: 0.10,  // +10% PnL
    STOP_LOSS_THRESHOLD: -0.15,   // -15% PnL
    
    // Flow State Based
    OUT_OF_FLOW_DURATION: 60,     // 60s outside flow state
    
    // Market Based (TODO: define after backtest)
    POST_FLASH_CRASH: true,       // After major crash event
    POST_WHALE_KILL: true,        // After defeating tier 3 whale
  },
  
  // Max Portals (game ends after 3rd portal regardless)
  MAX_PORTALS: 3,
  MAX_REJECTIONS: 3,              // TODO: backtest optimal value
};
```

### Portal Types

| Portal | Color | Trigger | Coin Effect |
|--------|-------|---------|-------------|
| **Take Profit** 🟢 | Green | PnL > +10% | Full coins + PnL bonus |
| **Stop Loss** 🔴 | Red | PnL < -15% | Raw coins only |
| **Flow Exit** 🟡 | Yellow | Out of flow 60s | Standard coins |
| **Challenge** 🟣 | Purple | TODO: Future | Risk/reward bonus |

### Portal Rejection Penalty

| Rejection # | Difficulty Increase | Next Portal Delay |
|-------------|---------------------|-------------------|
| 1st | +20% spawn rate | +60s to cooldown |
| 2nd | +30% spawn rate, +10% enemy speed | +90s to cooldown |
| 3rd | +40% spawn rate, +20% enemy speed | Must take next portal |

### Portal Decision Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PORTAL TRIGGER CHECK                      │
│                    (Every 1 second)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Is game time > 5 minutes?                                   │
│  AND cooldown expired?                                       │
│  AND portals opened < 3?                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                    Yes ──────┴────── No → Wait
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Check Trigger Conditions:                                   │
│  • PnL > +10% → Take Profit Portal                          │
│  • PnL < -15% → Stop Loss Portal                            │
│  • Out of flow > 60s → Flow Exit Portal                     │
│  • Game time > 10min → Forced Portal                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Player Choice:                                              │
│  • ENTER PORTAL → Calculate coins, end game                 │
│  • REJECT PORTAL → Apply penalty, continue                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Market Event Mapping

### Event Detection & Response

#### Flash Crash Event

```typescript
// Trigger: Price drops > 1% in 60 seconds
const FLASH_CRASH_CONFIG = {
  TRIGGER_THRESHOLD: -0.01,       // -1% price change
  TRIGGER_WINDOW: 60,             // seconds
  
  GAME_EFFECTS: {
    enemySpeedMultiplier: 1.5,    // All enemies 50% faster
    backgroundSpeedMultiplier: 2, // Background scrolls faster
    screenTint: '#FF000033',      // Red tint overlay
    spawnLiquidatorChance: 0.7,   // 70% liquidator spawns
    duration: 15,                 // seconds
  },
};
```

#### Volume Spike Event

```typescript
// Trigger: Volume > X percentile
const VOLUME_SPIKE_CONFIG = {
  // Whale Tiers based on normalized volume (0-1)
  WHALE_TIERS: {
    BABY:   { threshold: 0.60, hpMult: 1.5, sizeMult: 1.3, coinMult: 2 },
    NORMAL: { threshold: 0.75, hpMult: 2.5, sizeMult: 1.6, coinMult: 3 },
    MEGA:   { threshold: 0.90, hpMult: 4.0, sizeMult: 2.0, coinMult: 5 },
  },
  
  GAME_EFFECTS: {
    triggerWhaleSpawn: true,
    spawnRateMultiplier: 1.3,
    announcement: "WHALE ALERT! 🐋",
  },
};
```

#### RSI Extreme Event

```typescript
// Trigger: RSI < 30 (oversold) or RSI > 70 (overbought)
const RSI_EXTREME_CONFIG = {
  OVERSOLD: {
    threshold: 30,
    // For LONG positions: Favorable (discount buying)
    longEffect: {
      enemyType: 'RSI_OVERSOLD_FRIENDLY',  // TODO: Design enemy variant
      buffDropChance: 0.3,
      enemySpeedMod: 0.9,
    },
    // For SHORT positions: Unfavorable
    shortEffect: {
      enemyType: 'RSI_OVERSOLD_HOSTILE',   // TODO: Design enemy variant
      debuffDropChance: 0.2,
      enemySpeedMod: 1.2,
    },
  },
  
  OVERBOUGHT: {
    threshold: 70,
    // For LONG positions: Unfavorable (potential reversal)
    longEffect: {
      enemyType: 'RSI_OVERBOUGHT_HOSTILE', // TODO: Design enemy variant
      debuffDropChance: 0.2,
      enemySpeedMod: 1.2,
    },
    // For SHORT positions: Favorable
    shortEffect: {
      enemyType: 'RSI_OVERBOUGHT_FRIENDLY', // TODO: Design enemy variant
      buffDropChance: 0.3,
      enemySpeedMod: 0.9,
    },
  },
};
```

#### Consolidation Event

```typescript
// Trigger: ATR < 0.5% AND RSI between 40-60
const CONSOLIDATION_CONFIG = {
  TRIGGER: {
    atrThreshold: 0.005,          // < 0.5% volatility
    rsiRange: [40, 60],           // Neutral RSI
    minDuration: 30,              // Must persist 30s
  },
  
  GAME_EFFECTS: {
    // NOT boring - still engaging but less chaotic
    spawnRateMultiplier: 0.8,     // Slightly fewer enemies
    enemySpeedMultiplier: 0.9,    // Slightly slower
    gemDropMultiplier: 1.2,       // More gems (farming time)
    chaosLevel: 0.3,              // Low randomness
    
    // Prevent boredom during long consolidation
    ANTI_BOREDOM: {
      maxConsolidationTime: 60,   // After 60s...
      spawnMiniEvent: true,       // Spawn mini-challenge
      eliteChance: 0.3,           // Occasional elite
    },
  },
};
```

### Market Effect Transition

All market effects use **smooth lerp** (3-5 seconds):

```typescript
function applyMarketEffect(currentValue: number, targetValue: number, deltaTime: number): number {
  const LERP_SPEED = 0.2; // 20% per second = ~3-5s full transition
  return currentValue + (targetValue - currentValue) * LERP_SPEED * deltaTime;
}
```

---

## Leverage System

### Leverage Selection
- Selected at game start (existing behavior)
- Cannot be changed mid-game

### Leverage Effects

| Parameter | 1x | 5x | 25x | 100x |
|-----------|-----|-----|-----|------|
| **PnL Sensitivity** | 1x | 5x | 25x | 100x |
| **Enemy Spawn Rate** | 0.8x | 1.2x | 2.0x | 3.5x |
| **Enemy Speed** | 0.9x | 1.0x | 1.2x | 1.5x |
| **Enemy Damage** | 0.9x | 1.0x | 1.3x | 1.8x |
| **XP Gain Rate** | 1.0x | 1.3x | 2.0x | 3.0x |
| **Level-Up Speed** | Normal | Faster | Much Faster | Rapid |
| **Coin Multiplier** | 1.0x | 1.5x | 3.0x | 5.0x |
| **Portal Frequency** | Normal | Normal | +Frequent | +More Frequent |

### Leverage Risk/Reward

```typescript
const LEVERAGE_CONFIG = {
  1:   { pnlMult: 1,   spawnRate: 0.8, speed: 0.9, damage: 0.9, xp: 1.0, coin: 1.0 },
  5:   { pnlMult: 5,   spawnRate: 1.2, speed: 1.0, damage: 1.0, xp: 1.3, coin: 1.5 },
  10:  { pnlMult: 10,  spawnRate: 1.5, speed: 1.1, damage: 1.1, xp: 1.6, coin: 2.0 },
  25:  { pnlMult: 25,  spawnRate: 2.0, speed: 1.2, damage: 1.3, xp: 2.0, coin: 3.0 },
  50:  { pnlMult: 50,  spawnRate: 2.5, speed: 1.3, damage: 1.5, xp: 2.5, coin: 4.0 },
  100: { pnlMult: 100, spawnRate: 3.5, speed: 1.5, damage: 1.8, xp: 3.0, coin: 5.0 },
};
```

---

## Coin Economy

### Coin Calculation Formula

```typescript
function calculateCoins(gameState: GameEndState): CoinReward {
  const {
    survivalTimeSeconds,
    leveragedPnL,           // PnL × leverage
    rawCoins,               // From gameplay (kills, gems)
    enemyCoinDrops,         // NEW: Coins dropped by enemies
    portalType,
    comboBonus,
  } = gameState;
  
  // Base formula
  let totalCoins = rawCoins + enemyCoinDrops;
  
  // Survival bonus
  const survivalBonus = Math.floor(survivalTimeSeconds / 10) * leveragedPnL;
  
  // Portal type modifier
  if (portalType === 'TAKE_PROFIT' && leveragedPnL > 0) {
    // Positive PnL + Take Profit = Full rewards + bonus
    totalCoins += survivalBonus;
    totalCoins *= 1.2; // 20% Take Profit bonus
  } else if (portalType === 'STOP_LOSS' || leveragedPnL < 0) {
    // Negative PnL or Stop Loss = Raw coins only
    totalCoins = rawCoins + enemyCoinDrops; // No survival bonus
  } else {
    // Neutral exit
    totalCoins += survivalBonus * 0.5;
  }
  
  // Combo multiplier (if any active)
  totalCoins *= (1 + comboBonus);
  
  return {
    total: Math.floor(totalCoins),
    breakdown: {
      raw: rawCoins,
      enemyDrops: enemyCoinDrops,
      survivalBonus: Math.floor(survivalBonus),
      portalBonus: portalType === 'TAKE_PROFIT' ? Math.floor(totalCoins * 0.2) : 0,
    },
  };
}
```

### Enemy Coin Drops

| Enemy Type | Coin Drop Chance | Coin Amount |
|------------|------------------|-------------|
| **Bear** | 10% | 1-2 |
| **Bull** | 10% | 1-3 |
| **FUD** | 5% | 1 |
| **Whale (Baby)** | 50% | 5-10 |
| **Whale (Normal)** | 75% | 15-25 |
| **Whale (Mega)** | 100% | 50-100 |
| **Liquidator** | 25% | 3-5 |
| **RSI Enemy** | 15% | 2-4 |
| **Elite** | 80% | 10-20 |

### Death Penalty

| Exit Type | Coin Reward |
|-----------|-------------|
| **Portal Exit (Profit)** | Full calculation + bonuses |
| **Portal Exit (Loss)** | Raw coins + enemy drops only |
| **Death** | 50% of raw coins (TODO: backtest) |
| **AFK Death** | 0% (no coins) |

---

## Implementation Workflow

### Phase 1: Remove Wave System (Week 1)
- [ ] Delete `WaveFactor.ts`
- [ ] Remove wave phase from `DifficultyContext`
- [ ] Update `constants.ts` to remove WAVE_PHASES
- [ ] Remove wave UI from HUD
- [ ] Update E2E tests

### Phase 2: Unified AI Director (Week 1-2)
- [ ] Create `UnifiedDirector.ts` with new architecture
- [ ] Define 18 input sensors
- [ ] Define 14 output decisions
- [ ] Implement neural network (18→32→32→14)
- [ ] Deprecate old `AIDirector.ts` and `GameMasterBrain.ts`

### Phase 3: Client-Side Indicators (Week 2)
- [ ] Move RSI calculation to client
- [ ] Move ATR calculation to client
- [ ] Move MACD calculation to client
- [ ] Implement volume normalization on client
- [ ] Keep server as anti-cheat verification only

### Phase 4: Flow State System (Week 2-3)
- [ ] Implement flow state detection
- [ ] Add frustration score calculation
- [ ] Create engagement score tracking
- [ ] Implement adaptive difficulty response

### Phase 5: Portal System V2 (Week 3)
- [ ] Refactor `PortalManager.ts` with new triggers
- [ ] Implement portal rejection penalty
- [ ] Add portal cooldown system
- [ ] Create max 3 portal game flow
- [ ] Update coin calculation

### Phase 6: Market Event Mapping (Week 3-4)
- [ ] Implement flash crash detection & effects
- [ ] Implement volume spike whale spawning
- [ ] Implement RSI extreme enemy variants (TODO: design)
- [ ] Implement consolidation anti-boredom

### Phase 7: Testing & Backtest (Week 4+)
- [ ] Create backtest simulation with historical data
- [ ] Find optimal portal timing values
- [ ] Find optimal portal rejection limits
- [ ] Find optimal flow state thresholds
- [ ] Balance leverage difficulty scaling

---

## TODO & Backtest Items

### High Priority (Must Have)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| TODO-001 | Backtest optimal first portal time | ⏳ | Currently set to 5min |
| TODO-002 | Backtest optimal portal cooldown | ⏳ | Currently set to 3min |
| TODO-003 | Backtest max portal rejections | ⏳ | Currently set to 3 |
| TODO-004 | Design RSI enemy variants | ⏳ | LONG/SHORT specific |
| TODO-005 | Whale reward system redesign | ⏳ | Coin drops by tier |
| TODO-006 | Challenge Portal design | ⏳ | Future feature |

### Medium Priority (Should Have)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| TODO-007 | Consolidation anti-boredom mini-events | ⏳ | Prevent stagnation |
| TODO-008 | Flow state threshold tuning | ⏳ | HP band optimization |
| TODO-009 | Leverage balance testing | ⏳ | Risk/reward fairness |
| TODO-010 | Enemy coin drop rates | ⏳ | Economic balance |

### Low Priority (Nice to Have)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| TODO-011 | Competitive Mode leaderboard | ⏳ | Timed seasons |
| TODO-012 | Leaderboard rewards system | ⏳ | Coin/cosmetic prizes |
| TODO-013 | Neural network pre-training | ⏳ | Genetic algorithm |
| TODO-014 | Online learning adaptation | ⏳ | Per-player tuning |

### Backtest Data Requirements

```typescript
// Historical data needed for backtesting
interface BacktestDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  rsi?: number;
  atr?: number;
}

// Minimum: 30 days of 1-minute candles
// Preferred: 90 days for seasonal variation
// Source: Binance historical API
```

### Backtest Metrics to Track

| Metric | Target Range | Description |
|--------|--------------|-------------|
| **Avg Session Length** | 5-8 minutes | Not too short, not grinding |
| **Portal Trigger Rate** | 1-2 per game | Not too frequent |
| **Flow State %** | >60% | Time spent in flow |
| **Player HP Variance** | 35-65% band | Sweet spot adherence |
| **Coin Economy Balance** | TBD | Fair rewards for time spent |

---

## Migration Path

### Files to Delete
- `services/difficulty/factors/WaveFactor.ts`
- `services/difficulty/GameMasterBrain.ts` (after UnifiedDirector ready)
- `services/difficulty/AIDirector.ts` (after UnifiedDirector ready)

### Files to Create
- `services/director/UnifiedDirector.ts`
- `services/director/FlowStateManager.ts`
- `services/director/PortalTriggerService.ts`
- `services/indicators/ClientIndicatorService.ts`

### Files to Modify
- `services/difficulty/DifficultyContext.ts` - Remove wave factor
- `services/difficulty/constants.ts` - Remove WAVE_PHASES
- `services/portal/PortalManager.ts` - New trigger system
- `services/market/MarketIndicatorService.ts` - Client-side calculation
- `components/GameHUD.tsx` - Remove wave phase display
- `docs/GAMEPLAY_ELEMENTS.md` - Update documentation

---

## Success Criteria

1. ✅ No player reports "feels the same every time"
2. ✅ Market volatility clearly affects gameplay
3. ✅ Players consistently exit via portals, not death
4. ✅ Average session length: 5-8 minutes
5. ✅ Flow state time: >60% of session
6. ✅ Coin economy feels fair and rewarding
7. ✅ High leverage = high risk/high reward (not just harder)

---

*Document Version: 2.0.0*
*Last Updated: February 2026*
*Author: Project Darwin Team*
