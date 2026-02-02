# AI Director V2 - Dinamik Optimizasyon Sistemi

## 🎯 Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI DIRECTOR V2 - COMPLETE SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │  HISTORICAL     │◄──── Supabase / Binance WebSocket                   │
│  │  MARKET DATA    │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐    ┌────────────────────────────────────────────┐  │
│  │  BACKTEST       │    │           DIRECTOR OPTIMIZER                │  │
│  │  ENGINE         │◄───┤  • Genetic Algorithm (Population=20)       │  │
│  │                 │    │  • 50 Generations max                       │  │
│  │  • 10min sim    │───►│  • Fitness = 40% FlowTime + 25% Survival   │  │
│  │  • 100ms tick   │    │            + 20% Stability + 15% Engage    │  │
│  │  • Flow scoring │    └────────────────────────────────────────────┘  │
│  └─────────────────┘                     │                              │
│                                          │ Best Parameters              │
│                                          ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      AUTO TUNER                                   │   │
│  │  • Triggers after 5 deaths                                        │   │
│  │  • 5 min cooldown between optimizations                           │   │
│  │  • Caches best params to localStorage                             │   │
│  │  • Gradually blends new params (10% per application)              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                          │                              │
│                                          ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                 HIERARCHICAL DIRECTOR                             │   │
│  │                                                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │   │
│  │  │  STRATEGIC     │  │   TACTICAL     │  │   REACTIVE     │      │   │
│  │  │  LAYER         │  │   LAYER        │  │   LAYER        │      │   │
│  │  │                │  │                │  │                │      │   │
│  │  │  PID Control   │  │  Market Rules  │  │  Emergency     │      │   │
│  │  │  Kp=2.0        │  │  RSI→Bears     │  │  HP<20%=Mercy  │      │   │
│  │  │  Ki=0.1        │  │  ATR→Spawns    │  │  HP>80%=Swarm  │      │   │
│  │  │  Kd=0.5        │  │  Vol→Whales    │  │  Death=5s CD   │      │   │
│  │  │                │  │                │  │                │      │   │
│  │  │  5s update     │  │  1s update     │  │  Per-frame     │      │   │
│  │  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘      │   │
│  │          │                   │                   │               │   │
│  │          └───────────────────┼───────────────────┘               │   │
│  │                              │                                   │   │
│  │                      Orchestrator                                │   │
│  │                     (Coordinates)                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                          │                              │
│                                          ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    DIRECTOR ADAPTER                               │   │
│  │  • Blends new Director (70%) with old system (30%)               │   │
│  │  • Tracks player HP for PID input                                 │   │
│  │  • Can be disabled at runtime                                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                          │                              │
│                                          ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    DIFFICULTY MANAGER                             │   │
│  │  • Applies final difficulty to game                               │   │
│  │  • Controls spawn rates, enemy types, speeds                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📊 Optimize Edilen Parametreler

### PID Controller (Strategic Layer)
| Parameter | Bounds | Default | Description |
|-----------|--------|---------|-------------|
| Kp | 0.5 - 5.0 | 2.0 | Proportional gain (immediate response) |
| Ki | 0.01 - 0.5 | 0.1 | Integral gain (long-term correction) |
| Kd | 0.1 - 2.0 | 0.5 | Derivative gain (change dampening) |

### Market Thresholds (Tactical Layer)
| Parameter | Bounds | Default | Description |
|-----------|--------|---------|-------------|
| rsiOversold | 20 - 40 | 30 | RSI level → bull spawns |
| rsiOverbought | 60 - 80 | 70 | RSI level → bear spawns |
| atrLow | 0.1 - 0.5 | 0.3 | Low volatility threshold |
| atrHigh | 1.0 - 3.0 | 2.0 | High volatility threshold |
| volumeThreshold | 0.6 - 0.9 | 0.8 | Whale spawn trigger |

### Emergency Thresholds (Reactive Layer)
| Parameter | Bounds | Default | Description |
|-----------|--------|---------|-------------|
| mercyThreshold | 0.1 - 0.3 | 0.2 | HP% to activate mercy mode |
| swarmThreshold | 0.7 - 0.9 | 0.8 | HP% to activate swarm mode |
| deathCooldownMs | 3000 - 10000 | 5000 | Cooldown after death |

## 🧬 Genetik Algoritma

```typescript
// Optimization Flow
1. Initialize Population (20 individuals)
   - First = current params (prevent regression)
   - Rest = random within bounds

2. For each generation (max 50):
   a. Evaluate each individual via BacktestEngine
   b. Calculate fitness score
   c. Keep elite (top 2)
   d. Tournament selection for parents
   e. Crossover (70% rate)
   f. Mutation (20% rate, 20% strength)

3. Return best parameters
```

### Fitness Function
```typescript
score = 
  0.40 × flowTimePercent +    // Time in HP 35%-65%
  0.25 × (1 - deaths/10) +    // Survival bonus
  0.20 × (1 - hpVariance) +   // HP stability
  0.15 × engagementScore      // Balanced damage
```

## 🔄 Auto-Tuning Workflow

```
Game Start
    │
    ▼
Load cached params (localStorage)
    │
    ▼
Apply to Director ──────────────────────────┐
    │                                        │
    ▼                                        │
[Playing...]                                 │
    │                                        │
Player Dies (death++)                        │
    │                                        │
    ▼                                        │
deaths >= 5 && time >= 5min?                 │
    │ YES                                    │
    ▼                                        │
Start Background Optimization                │
    │                                        │
    ▼                                        │
Better params found?                         │
    │ YES (improvement >= 5%)                │
    ▼                                        │
Blend new params (10% rate) ─────────────────┘
    │
    ▼
Save to localStorage
```

## 📁 File Structure

```
services/
├── difficulty/
│   ├── layers/
│   │   ├── StrategicLayer.ts    # PID Controller
│   │   ├── TacticalLayer.ts     # Market Rules
│   │   └── ReactiveLayer.ts     # Emergency
│   ├── DirectorOrchestrator.ts  # Coordinator
│   ├── DirectorAdapter.ts       # Bridge to game
│   ├── DirectorOptimizer.ts     # Genetic Algorithm
│   └── DirectorAutoTuner.ts     # Auto-learning
└── training/
    └── BacktestEngine.ts        # Simulation engine

tests/
└── difficulty/
    ├── layers/
    │   ├── StrategicLayer.test.ts
    │   ├── TacticalLayer.test.ts
    │   └── ReactiveLayer.test.ts
    ├── DirectorOrchestrator.test.ts
    ├── DirectorAdapter.test.ts
    ├── DirectorOptimizer.test.ts
    └── DirectorAutoTuner.test.ts
```

## 🎮 Usage

```typescript
// Manual optimization
const result = await DirectorOptimizer.optimize();
DirectorOptimizer.applyOptimizedParams(result.bestParams);

// Auto-tuning (enabled by default)
DirectorAutoTuner.setEnabled(true);

// Check status
console.log(DirectorAutoTuner.getStatus());
// {
//   isEnabled: true,
//   isOptimizing: false,
//   currentScore: 0.72,
//   deathCount: 3,
//   hasAppliedParams: true
// }

// Force optimization
await DirectorAutoTuner.forceOptimize();

// Clear learned params
DirectorAutoTuner.clearCache();
```

## ✅ Test Coverage

- **DirectorOptimizer**: 8 tests
- **DirectorAutoTuner**: 9 tests
- **StrategicLayer**: 17 tests
- **TacticalLayer**: 18 tests
- **ReactiveLayer**: 16 tests
- **DirectorOrchestrator**: 15 tests
- **DirectorAdapter**: 10 tests
- **BacktestEngine**: 19 tests

**Total: 112 new tests**
