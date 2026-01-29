<div align="center">

# 🎮 Crypto Survivors

**Real-Time Market-Driven Vampire Survivors Game**

*Kill bears, dodge bulls, survive the volatility*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-1431%20passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![E2E](https://img.shields.io/badge/E2E-72%20passing-blue?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [🏗️ Architecture](#️-architecture) • [🤝 Contributing](CONTRIBUTING.md) • [📦 Project Structure](#-project-structure) • [🎮 How to Play](#-how-to-play)

</div>

---

## 🎯 Features

### 🎲 Core Gameplay
- **Vampire Survivors Style** - Auto-shooting survival gameplay with endless waves of enemies
- **Real-Time Market Data** - Live BTC/USD prices from Binance & Coinbase WebSocket feeds with automatic failover
- **PnL Leverage System** - Choose leverage (1x to 100x) — higher leverage amplifies PnL impact on game difficulty
- **Long/Short Positions** - Choose your market position and survive the chaos
- **Kill Streak Combo System** - Chain kills to build multipliers and earn massive XP bonuses

### 📈 Market-Driven Difficulty
- **Volume-Based Enemy Spawning** - Market volume directly affects spawn rates
- **RSI Intensity Scaling** - Overbought/oversold indicators influence enemy aggression
- **ATR Volatility Effects** - High volatility triggers special "pump" and "dump" events
- **Dynamic PnL Multiplier** - Your position's profit/loss affects game difficulty in real-time

### 📱 Mobile Optimization
- **Fully Responsive HUD** - Dynamic scaling based on screen size (0.5x to 1.5x)
- **Safe Area Support** - Native support for notches (iOS/Android) with `env(safe-area-inset-*)`
- **Dual Control Schemes** - Switch between **Virtual Joystick** and **Drag-to-Move**
- **Performance Profiles** - Automatic shadow/filter optimization for stable 60 FPS on mobile
- **Landscape Lock** - Intelligent orientation detection with instruction overlay

### 🃏 Card/Upgrade System
- **Tiered Rarity System** - Common, Rare, Epic, Legendary cards with distinct visual styles
- **Premium Asset Design** - Hand-crafted SVG icons and generative art
- **40+ Unique Upgrades** - Crypto-themed cards: "Diamond Hands", "Rug Pull", "Flash Loan", "Satoshi Mode"
- **Slot Machine Leveling** - Psychologically optimized level-up screen with "reel stop" anticipation

### ✨ Buff/Debuff System
- **Decorator Pattern** - Dynamic stat modifiers with stackable effects
- **Volume-Based Spawning** - Buff gems spawn when market volatility changes
- **Temporary & Permanent Effects** - 🔥 Rage Mode, 💎 Diamond Hands, ⚡ Berserk, 🍀 Lucky Star
- **Debuff Mechanics** - 🐌 Slow, 💀 Vulnerable, 📉 Liquidated, 😵 Weakened
- **Pause-Aware Timers** - Buff timers freeze during LevelUp and Pause screens

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/blntunlan/crypto-cyber-survivors.git
cd crypto-cyber-survivors

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with HMR (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run 979 unit tests
npm run test:watch   # Watch mode
npm run test:coverage # Check test coverage (65-80%)
npm run test:e2e     # Run 72 E2E tests (Playwright)
npm run test:e2e:ui  # Playwright UI mode

# Code Quality
npm run lint         # Run ESLint (0 errors, 0 warnings)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier formatting
npm run docs         # Generate TypeDoc API documentation
```

---

## 🏗️ Architecture

### High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                CRYPTO SURVIVORS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         PRESENTATION LAYER                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌──────────────┐   │   │
│  │  │   App.tsx  │  │ GameUI.tsx │  │ Screens/*   │  │   HUD/*      │   │   │
│  │  │  (Router)  │  │  (Overlay) │  │   (Menus)   │  │  (Realtime)  │   │   │
│  │  └──────┬─────┘  └──────┬─────┘  └──────┬──────┘  └──────┬───────┘   │   │
│  └─────────┼───────────────┼───────────────┼────────────────┼───────────┘   │
│            │               │               │                │               │
│  ┌─────────▼───────────────▼───────────────▼────────────────▼───────────┐   │
│  │                          GAME ENGINE LAYER                            │   │
│  │  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐     │   │
│  │  │ GameEngine.tsx │  │  GameRenderer   │  │ PhysicsSystem      │     │   │
│  │  │  (Game Loop)   │  │ (Canvas Drawing)│  │ (Collision Grid)   │     │   │
│  │  └────────┬───────┘  └────────┬────────┘  └─────────┬──────────┘     │   │
│  │           │                   │                     │                │   │
│  │  ┌────────▼───────────────────▼─────────────────────▼────────────┐   │   │
│  │  │                    RENDERER SUBSYSTEM                          │   │   │
│  │  │  ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐ │   │   │
│  │  │  │ Background │ │   Entity     │ │ Projectile  │ │  Effect  │ │   │   │
│  │  │  │  Renderer  │ │  Renderer    │ │  Renderer   │ │ Renderer │ │   │   │
│  │  │  └────────────┘ └──────────────┘ └─────────────┘ └──────────┘ │   │   │
│  │  └───────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          SERVICE LAYER                                │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │   │
│  │  │  EventBus   │  │ GameStateMachine│  │     MarketService        │  │   │
│  │  │ (Observer)  │  │  (FSM Control)  │  │  (WebSocket Client)      │  │   │
│  │  └──────┬──────┘  └────────┬────────┘  └─────────────┬────────────┘  │   │
│  │         │                  │                         │               │   │
│  │  ┌──────▼──────────────────▼─────────────────────────▼────────────┐  │   │
│  │  │                    GAME SYSTEMS                                 │  │   │
│  │  │  ┌──────────────┐ ┌─────────────┐ ┌────────────┐ ┌───────────┐ │  │   │
│  │  │  │ Difficulty   │ │  SpawnSystem│ │ CombatSystem│ │ComboSystem│ │  │   │
│  │  │  │   Manager    │ │             │ │             │ │           │ │  │   │
│  │  │  └──────────────┘ └─────────────┘ └────────────┘ └───────────┘ │  │   │
│  │  │  ┌──────────────┐ ┌─────────────┐ ┌────────────┐ ┌───────────┐ │  │   │
│  │  │  │  CardSystem  │ │ BuffManager │ │PoolManager │ │TimeService│ │  │   │
│  │  │  │              │ │ (Decorator) │ │  (O(1))    │ │           │ │  │   │
│  │  │  └──────────────┘ └─────────────┘ └────────────┘ └───────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          DATA LAYER                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │   │
│  │  │   Zustand      │  │   Supabase     │  │     localStorage        │ │   │
│  │  │  (gameStore)   │  │ (Cloud Sync)   │  │   (Offline Metrics)     │ │   │
│  │  └────────────────┘  └────────────────┘  └─────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Game State Machine

The game uses a **Finite State Machine (FSM)** to manage all game states with validated transitions:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GAME STATE MACHINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                              ┌──────────┐                               │
│                              │   MENU   │◄──────────────────────────┐   │
│                              └────┬─────┘                           │   │
│                                   │                                 │   │
│                                   ▼                                 │   │
│                      ┌───────────────────────┐                      │   │
│                      │       PLAYING         │◄─────────────────┐   │   │
│                      └───────────┬───────────┘                  │   │   │
│                                  │                              │   │   │
│         ┌────────────────────────┼─────────────────────────┐    │   │   │
│         │                        │                          │   │   │   │
│         ▼                        ▼                          ▼   │   │   │
│   ┌──────────┐           ┌─────────────┐           ┌──────────┐ │   │   │
│   │  PAUSED  │           │  LEVEL_UP   │           │CYCLE_COMP│ │   │   │
│   └────┬─────┘           └──────┬──────┘           └────┬─────┘ │   │   │
│        │                        │                        │      │   │   │
│        │                        │                        │      │   │   │
│        └────────────────────────┼────────────────────────┘      │   │   │
│                                 │                                │   │   │
│                                 ▼                                │   │   │
│                          ┌───────────┐                          │   │   │
│                          │ GAMEOVER  │──────────────────────────┘   │   │
│                          └───────────┘                              │   │
│                                                                     │   │
│   ┌─────────────────────┐                                           │   │
│   │ DATA_DISCONNECTED   │───────────────────────────────────────────┘   │
│   └─────────────────────┘                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Valid Transitions:
  MENU          → PLAYING, CYCLE_COMPLETE
  PLAYING       → PAUSED, LEVEL_UP, GAMEOVER, CYCLE_COMPLETE, DATA_DISCONNECTED
  PAUSED        → PLAYING, MENU
  LEVEL_UP      → PLAYING, GAMEOVER
  GAMEOVER      → MENU
  CYCLE_COMPLETE→ PLAYING, GAMEOVER
  DATA_DISCONNECTED → MENU
```

### Event-Driven Architecture

All systems communicate through a **strongly-typed EventBus** (Observer Pattern):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EVENT BUS FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Producers                    EventBus                    Consumers     │
│   (emit)                      (message)                   (subscribe)   │
│                                                                          │
│  ┌─────────────┐                                    ┌─────────────────┐ │
│  │CombatSystem │──┐                              ┌──│ ComboSystem     │ │
│  └─────────────┘  │                              │  └─────────────────┘ │
│                   │     ┌─────────────────┐      │                      │
│  ┌─────────────┐  │     │                 │      │  ┌─────────────────┐ │
│  │SpawnSystem  │──┼────►│   EVENT BUS     │◄─────┼──│ DifficultyMgr   │ │
│  └─────────────┘  │     │                 │      │  └─────────────────┘ │
│                   │     │  enemyKilled    │      │                      │
│  ┌─────────────┐  │     │  enemySpawned   │      │  ┌─────────────────┐ │
│  │MarketService│──┼────►│  priceUpdate    │◄─────┼──│ GameUI (HUD)    │ │
│  └─────────────┘  │     │  levelUp        │      │  └─────────────────┘ │
│                   │     │  gameReset      │      │                      │
│  ┌─────────────┐  │     │  buffApplied    │      │  ┌─────────────────┐ │
│  │BuffManager  │──┘     │  ...40+ events  │◄─────┼──│ MetricsService  │ │
│  └─────────────┘        │                 │      │  └─────────────────┘ │
│                         └─────────────────┘      │                      │
│                                                  │  ┌─────────────────┐ │
│                                                  └──│ SoundEngine     │ │
│                                                     └─────────────────┘ │
│                                                                          │
│  Key Events:                                                             │
│  ─────────────────────────────────────────────────────────────────────  │
│  • enemyKilled     → ComboSystem, MetricsService, SoundEngine            │
│  • priceUpdate     → LiveFeed, DifficultyManager, AccountHealth          │
│  • levelUp         → LevelUpScreen, CardSystem, TimeService              │
│  • gameReset       → All services (state reset)                          │
│  • buffApplied     → BuffIndicator, PlayerStats, SoundEngine             │
│  • comboMilestone  → ComboPanel, AchievementService, SoundEngine         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Market → Difficulty → Gameplay

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MARKET-TO-GAMEPLAY DATA FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐     ┌────────────────┐     ┌─────────────────────────┐ │
│  │  Binance    │────►│ MarketService  │────►│ Technical Indicators    │ │
│  │  WebSocket  │     │ (WS Client)    │     │ ┌───────┬───────┬─────┐ │ │
│  └─────────────┘     └────────────────┘     │ │  RSI  │  ATR  │Vol  │ │ │
│        │                    │               │ └───┬───┴───┬───┴──┬──┘ │ │
│        │                    │               │     │       │      │    │ │
│  (fallback)                 ▼               └─────┼───────┼──────┼────┘ │
│        │             ┌────────────┐               │       │      │      │
│  ┌─────▼───────┐     │EventBus    │               ▼       ▼      ▼      │
│  │  Coinbase   │     │priceUpdate │         ┌──────────────────────┐   │
│  │  WebSocket  │     └────────────┘         │  DifficultyManager   │   │
│  └─────────────┘                            │  ──────────────────  │   │
│                                             │  • spawnRate         │   │
│                                             │  • enemySpeed        │   │
│                                             │  • enemyHealth       │   │
│                                             │  • pnlMultiplier     │   │
│                                             └──────────┬───────────┘   │
│                                                        │               │
│      ┌─────────────────────────────────────────────────┼───────────┐   │
│      │                                                 │           │   │
│      ▼                                                 ▼           ▼   │
│ ┌─────────────┐                              ┌─────────────┐ ┌───────┐ │
│ │SpawnSystem  │                              │CombatSystem │ │BuffMgr│ │
│ │             │                              │             │ │       │ │
│ │ spawn()     │                              │ damage()    │ │spawn()│ │
│ │ schedule()  │                              │ collision() │ │apply()│ │
│ └─────────────┘                              └─────────────┘ └───────┘ │
│                                                                        │
│  Example: High Volatility (ATR > threshold)                            │
│  ──────────────────────────────────────────                            │
│  1. MarketService detects spike                                        │
│  2. DifficultyManager.adjustForVolatility()                            │
│  3. SpawnSystem increases rate +40%                                    │
│  4. BuffManager spawns "Pump" or "Dump" event                          │
│  5. CombatSystem applies volatility damage modifier                    │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RENDERING PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      GameEngine.tsx (Main Loop)                    │ │
│  │  ┌──────────────────────────────────────────────────────────────┐  │ │
│  │  │  requestAnimationFrame(gameLoop)                             │  │ │
│  │  │                                                              │  │ │
│  │  │  1. Calculate deltaTime                                      │  │ │
│  │  │  2. Update game state (physics, input, spawning)             │  │ │
│  │  │  3. Call GameRenderer.render()                               │  │ │
│  │  │  4. Schedule next frame                                      │  │ │
│  │  └──────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────┬────────────────────────────────────┘ │
│                                  │                                      │
│                                  ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      GameRenderer.ts (Orchestrator)                │ │
│  │                                                                    │ │
│  │  render(ctx, state) {                                              │ │
│  │    ctx.clearRect(...)                                             │ │
│  │                                                                    │ │
│  │    ┌─────────────────────────────────────────────────────────┐    │ │
│  │    │ Layer 0: BackgroundRenderer                              │    │ │
│  │    │          - Grid lines, market indicators                │    │ │
│  │    └─────────────────────────────────────────────────────────┘    │ │
│  │                          │                                        │ │
│  │    ┌─────────────────────▼───────────────────────────────────┐    │ │
│  │    │ Layer 1: EntityRenderer                                  │    │ │
│  │    │          - Enemies (bears, bulls, whales)               │    │ │
│  │    │          - Player character                              │    │ │
│  │    │          - Buff gems                                     │    │ │
│  │    └─────────────────────────────────────────────────────────┘    │ │
│  │                          │                                        │ │
│  │    ┌─────────────────────▼───────────────────────────────────┐    │ │
│  │    │ Layer 2: ProjectileRenderer                              │    │ │
│  │    │          - Neon laser beams (Normal/Crit/Super)         │    │ │
│  │    │          - Enemy projectiles                             │    │ │
│  │    └─────────────────────────────────────────────────────────┘    │ │
│  │                          │                                        │ │
│  │    ┌─────────────────────▼───────────────────────────────────┐    │ │
│  │    │ Layer 3: EffectRenderer                                  │    │ │
│  │    │          - Damage numbers (floating)                    │    │ │
│  │    │          - XP particles                                  │    │ │
│  │    │          - Death explosions                              │    │ │
│  │    │          - Screen shake                                  │    │ │
│  │    └─────────────────────────────────────────────────────────┘    │ │
│  │  }                                                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Performance Optimizations:                                              │
│  ─────────────────────────                                              │
│  • Object Pooling (PoolManager) - O(1) object retrieval                 │
│  • Spatial Grid (SpatialGrid) - O(1) neighbor lookup for collision      │
│  • View Frustum Culling - Skip rendering off-screen entities            │
│  • Shadow/Filter culling on mobile - Disable expensive effects          │
│  • Delta-time physics - Framerate-independent movement                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Buff/Debuff Decorator System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DECORATOR PATTERN: BUFF SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      IPlayerStats (Interface)                       │ │
│  │  ──────────────────────────────────────────────────────────────── │ │
│  │  + getSpeed(): number                                               │ │
│  │  + getDamage(): number                                              │ │
│  │  + getMaxHealth(): number                                           │ │
│  │  + getCritChance(): number                                          │ │
│  │  + getLuck(): number                                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              ▲                                           │
│                              │ implements                                │
│          ┌───────────────────┴───────────────────┐                      │
│          │                                       │                      │
│  ┌───────────────────┐               ┌───────────────────────┐          │
│  │PlayerStatsAdapter │               │   BaseDecorator       │          │
│  │ (Concrete Stats)  │               │ (Abstract Decorator)  │          │
│  │                   │               │ ┌───────────────────┐ │          │
│  │ - speed: 5        │               │ │ wrapped: IStats   │ │          │
│  │ - damage: 10      │               │ └───────────────────┘ │          │
│  │ - health: 100     │               └───────────┬───────────┘          │
│  └───────────────────┘                           │                      │
│                                  ┌───────────────┼───────────────┐      │
│                                  │               │               │      │
│                                  ▼               ▼               ▼      │
│                          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│                          │  RageBuff   │ │DiamondHands │ │  SlowDebuff ││
│                          │  ─────────  │ │  ─────────  │ │  ─────────  ││
│                          │ +50% damage │ │ +25% health │ │ -30% speed  ││
│                          │ -10% defense│ │ +50% luck   │ │             ││
│                          └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                          │
│  Stack Example:                                                          │
│  ──────────────                                                          │
│  Player → RageBuff → DiamondHands → SlowDebuff → BaseStats              │
│                                                                          │
│  getDamage():                                                            │
│    SlowDebuff.getDamage()                                               │
│      → DiamondHands.getDamage()                                         │
│        → RageBuff.getDamage()                                           │
│          → BaseStats.getDamage() = 10                                   │
│          return 10 * 1.5 = 15                                           │
│        return 15                                                        │
│      return 15                                                          │
│    return 15 (final damage with Rage buff)                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

| Pattern | Usage | Implementation |
|---------|-------|----------------|
| **Singleton** | Global services | `EventBus`, `DifficultyManager`, `CardSystem`, `TimeService` |
| **Factory** | Entity creation | Enemy spawning with type-specific configurations |
| **Observer** | Decoupled communication | `EventBus.on()` / `EventBus.emit()` with 40+ typed events |
| **Object Pool** | High-performance recycling | `PoolManager` for bullets, enemies, particles (O(1) retrieval) |
| **Strategy** | Pluggable behaviors | Enemy AI movement patterns, control schemes |
| **Decorator** | Stackable modifiers | `BuffManager` with composable stat modifiers |
| **State Machine** | Game flow control | `GameStateMachine` with validated transitions |
| **Dependency Injection** | Testable systems | `PhysicsContext` for collision system testing |
| **Spatial Hashing** | Efficient collision | `SpatialGrid` with O(1) neighbor lookup |

---

## 📦 Project Structure

```
crypto-cyber-survivors/
│
├── 📄 App.tsx                      # Main application router & state orchestrator
├── 📄 index.tsx                    # React entry point
├── 📄 index.css                    # Global styles & CSS variables
├── 📄 types.ts                     # Core game types (Player, Enemy, GameStatus)
├── 📄 constants.ts                 # Global constants (Z_LAYERS, PHYSICS, etc.)
│
├── 📁 components/                   # React Components (68 files)
│   ├── 📄 GameEngine.tsx           # Canvas render loop & game tick (25KB)
│   ├── 📄 GameHUD.tsx              # Direct canvas overlays
│   ├── 📄 GameUI.tsx               # Responsive React HUD layer
│   ├── 📄 ErrorBoundary.tsx        # React error boundary with reporting
│   │
│   ├── 📁 screens/                 # Full-screen game states (13 files)
│   │   ├── 📄 MainMenu.tsx         # Title screen with animations (22KB)
│   │   ├── 📄 LevelUpScreen/       # Card selection with slot machine UX
│   │   ├── 📄 PauseMenu.tsx        # Pause overlay with settings
│   │   ├── 📄 GameOverScreen.tsx   # Score summary & leaderboard submit
│   │   ├── 📄 CycleCompleteScreen.tsx # Loop completion celebration
│   │   └── 📄 NicknameEntryScreen.tsx # Beta user onboarding
│   │
│   ├── 📁 hud/                     # In-game HUD components (17 files)
│   │   ├── 📄 LiveFeed.tsx         # Real-time BTC price display (11KB)
│   │   ├── 📄 AccountHealthPremium.tsx # PnL & health bars
│   │   ├── 📄 ComboPanel.tsx       # Kill streak display
│   │   ├── 📄 BuffIndicator.tsx    # Active buff icons with timers
│   │   ├── 📄 LeaderboardPanel.tsx # Real-time rankings (16KB)
│   │   └── 📄 KernelStatus.tsx     # System status indicator
│   │
│   ├── 📁 mobile/                  # Touch control components (5 files)
│   │   ├── 📄 VirtualJoystick.tsx  # Left-stick + buttons
│   │   └── 📄 DragToMoveController.tsx # Drag anywhere + tap dash
│   │
│   ├── 📁 settings/                # Settings panels (10 files)
│   │   ├── 📄 AudioSettings.tsx    # Volume sliders per category
│   │   ├── 📄 GraphicsSettings.tsx # Particle, shake, FPS toggles
│   │   └── 📄 MobileSettings.tsx   # Control scheme selection
│   │
│   ├── 📁 admin/                   # Admin dashboard (2 files)
│   │   ├── 📄 AdminDashboard.tsx   # Debug panel (Ctrl+Shift+A)
│   │   └── 📄 PriceAnalysisPanel.tsx # Market data visualization
│   │
│   └── 📁 themed/                  # Theme-aware wrappers (4 files)
│
├── 📁 services/                     # Business Logic Singletons (119 files)
│   │
│   ├── 📄 EventBus.ts              # Type-safe pub/sub (7KB) with tracing
│   ├── 📄 GameStateMachine.ts      # FSM with validated transitions
│   ├── 📄 GameRenderer.ts          # Render orchestrator
│   ├── 📄 MarketService.ts         # WebSocket client (14KB)
│   ├── 📄 DifficultyManager.ts     # Market → difficulty mapping (17KB)
│   ├── 📄 PhysicsSystem.ts         # Collision entry point
│   ├── 📄 PoolManager.ts           # Object pooling (14KB)
│   ├── 📄 SpatialGrid.ts           # Spatial hashing for collision
│   ├── 📄 TimeService.ts           # Pause-aware game timer
│   ├── 📄 CombatSystem.ts          # Damage & collision resolution (11KB)
│   ├── 📄 ComboSystem.ts           # Kill streak logic (9KB)
│   ├── 📄 SpawnSystem.ts           # Enemy spawning scheduler (8KB)
│   ├── 📄 ScreenService.ts         # Device & safe area detection (9KB)
│   ├── 📄 MetricsService.ts        # Analytics aggregator (21KB)
│   ├── 📄 CheatManager.ts          # Development cheats (10KB)
│   ├── 📄 Logger.ts                # Structured logging utility
│   │
│   ├── 📁 renderers/               # Canvas renderers (7 files)
│   │   ├── 📄 BackgroundRenderer.ts  # Grid & market visualization
│   │   ├── 📄 EntityRenderer.ts      # Players, enemies, gems (17KB)
│   │   ├── 📄 ProjectileRenderer.ts  # Neon laser beams
│   │   ├── 📄 EffectRenderer.ts      # Particles, damage numbers (11KB)
│   │   └── 📄 CullingUtils.ts        # View frustum culling
│   │
│   ├── 📁 patterns/decorators/     # Buff/Debuff system (15 files)
│   │   ├── 📄 BuffManager.ts       # Decorator orchestrator (12KB)
│   │   ├── 📄 BaseDecorator.ts     # Abstract decorator base
│   │   ├── 📁 buffs/               # RageBuff, DiamondHandsBuff, etc.
│   │   └── 📁 debuffs/             # SlowDebuff, VulnerableDebuff, etc.
│   │
│   ├── 📁 cards/                   # Card/Upgrade system (6 files)
│   │   ├── 📄 CardSystem.ts        # Card pool management
│   │   ├── 📄 CardApplicator.ts    # Effect application
│   │   └── 📄 cardDefinitions.ts   # 40+ card definitions
│   │
│   ├── 📁 physics/                 # Physics subsystem (6 files)
│   │   ├── 📄 PhysicsContext.ts    # DI container for testing
│   │   ├── 📄 CollisionSystem.ts   # Collision detection
│   │   └── 📄 PhysicsTypes.ts      # Interface definitions
│   │
│   ├── 📁 audio/                   # Sound system (9 files)
│   │   ├── 📄 SynthEngine.ts       # Procedural audio generation
│   │   └── 📄 constants.ts         # Category volume defaults
│   │
│   ├── 📁 analytics/               # Error & player tracking (8 files)
│   │   ├── 📄 ErrorTracker.ts      # Modular error collection
│   │   ├── 📄 ErrorQueue.ts        # Offline queue management
│   │   ├── 📄 ErrorSanitizer.ts    # Privacy-safe sanitization
│   │   └── 📄 PlayerTracker.ts     # Session analytics
│   │
│   ├── 📁 metrics/                 # Modular metrics (5 files)
│   │   ├── 📄 MetricsStorage.ts    # localStorage with quota
│   │   ├── 📄 MetricsCompiler.ts   # Session data compilation
│   │   ├── 📄 MetricsAnalyzer.ts   # Insights & recommendations
│   │   └── 📄 MetricsExporter.ts   # JSON/CSV export
│   │
│   ├── 📁 auth/                    # Authentication (3 files)
│   │   └── 📄 IdentityService.ts   # Nickname-based auth
│   │
│   └── 📁 indicators/              # Technical indicators (4 files)
│       ├── 📄 RSICalculator.ts     # Relative Strength Index
│       └── 📄 ATRCalculator.ts     # Average True Range
│
├── 📁 hooks/                        # Custom React Hooks (25 files)
│   ├── 📄 useMarketData.ts         # Market subscription (10KB)
│   ├── 📄 useHUDEvents.ts          # HUD event handling (6KB)
│   ├── 📄 useHUDUpdateLoop.ts      # 60fps HUD updates (7KB)
│   ├── 📄 useLerpValue.ts          # Smooth value transitions (6KB)
│   ├── 📄 useGameStatus.ts         # State machine subscription
│   ├── 📄 useDevice.ts             # Device capability detection
│   ├── 📄 useMenuNav.ts            # Keyboard navigation
│   ├── 📄 useResponsiveUI.ts       # Responsive breakpoints
│   └── 📄 usePauseBudget.ts        # Pause time limiting
│
├── 📁 stores/                       # Zustand State Management
│   ├── 📄 gameStore.ts             # Main persistent store (13KB)
│   └── 📁 admin/                   # Admin panel state
│
├── 📁 contexts/                     # React Contexts (6 files)
│   ├── 📄 GameContext.tsx          # Game instance context
│   ├── 📄 ThemeContext.tsx         # Theme provider
│   └── 📄 UserContext.tsx          # User/auth context
│
├── 📁 types/                        # TypeScript Definitions (14 files)
│   ├── 📄 events.ts                # 40+ typed event payloads (11KB)
│   ├── 📄 indicators.ts            # Market indicator types (12KB)
│   ├── 📄 metrics.ts               # Analytics types (9KB)
│   ├── 📄 BuffGem.ts               # Buff gem configurations
│   ├── 📄 DeviceProfile.ts         # Device capability types
│   └── 📄 MobileSettings.ts        # Mobile control types
│
├── 📁 config/                       # Configuration (16 files)
│   ├── 📄 GameConfig.ts            # Core game settings
│   ├── 📄 EnemyConfig.ts           # Enemy type definitions
│   ├── 📄 EnemyRegistry.ts         # Enemy registry
│   ├── 📄 PlayerConfig.ts          # Player defaults
│   ├── 📄 CombatConfig.ts          # Damage formulas
│   ├── 📄 UILayout.ts              # Layout constants
│   ├── 📄 Colors.ts                # Decoupled color constants
│   ├── 📄 PerformancePresets.ts    # Mobile/desktop presets
│   └── 📁 themes/                  # Theme variants
│
├── 📁 tests/                        # Vitest Unit Tests (114 files)
│   ├── 📁 services/                # Service tests (15+ files)
│   ├── 📁 hooks/                   # Hook tests (3 files)
│   ├── 📁 components/              # Component tests
│   └── 📁 edge/                    # Edge function tests (5 files)
│
├── 📁 e2e/                          # Playwright E2E Tests (16 files)
│   ├── 📄 game-flow.spec.ts        # Full game flow
│   ├── 📄 mobile-touch-controls.spec.ts
│   ├── 📄 mobile-hud-layout.spec.ts
│   ├── 📄 network-error.spec.ts
│   └── 📄 visual.spec.ts           # Visual regression
│
├── 📁 supabase/                     # Supabase Configuration
│   ├── 📁 migrations/              # Database migrations (18 files)
│   │   └── 📄 20260114_security_hardening.sql
│   └── 📁 functions/               # Edge Functions
│       ├── 📁 verify-game/         # Score verification
│       └── 📁 start-session/       # Session initialization
│
├── 📁 railway-market-server/        # Price Logger Backend (22 files)
│   └── 📁 src/                     # Express.js server
│
├── 📁 docs/                         # Documentation (62 files)
│   ├── 📄 MASTER_ROADMAP.md       # Feature roadmap
│   ├── 📄 ARCHITECTURE_REVIEW.md  # Architecture decisions
│   └── 📁 completed/              # Completed features (15 files)
│
└── 📁 .agent/                       # AI Agent Workflows
    └── 📁 workflows/               # Automation scripts
        ├── 📄 code-review.md
        └── 📄 debug-push.md
```

---

## 🎮 How to Play

### Controls

| Input Mode | Move | Special / Action |
|------------|------|------------------|
| **Desktop** | `W` `A` `S` `D` / `Arrows` | `Space` (Dash), `Esc/P` (Pause) |
| **Touch (Joystick)** | Left/Right Thumb | Dedicated Dash Button |
| **Touch (Drag)** | Drag anywhere | Second Finger Tap (Dash) |

### Game Flow

1. **Select Asset** - Choose BTC or other crypto pairs
2. **Choose Leverage** - 1x (Safe) to 100x (Extreme Risk)
3. **Pick Position** - Long (🐂) or Short (🐻)
4. **Survive** - Defeat enemies, collect XP, level up
5. **Upgrade** - Choose powerful cards each level

### UI Typography & Scaling

| UI Element | Desktop Size | Mobile Size | Style |
| :--- | :--- | :--- | :--- |
| **BTC Price** | 36px (`text-4xl`) | 24px (`text-2xl`) | Font-Black, Mono |
| **PnL Percent** | 24px (`text-2xl`) | 18px (`text-lg`) | Font-Black, Mono |
| **Large Headings** | 96px (`text-8xl`) | 60px (`text-6xl`) | Italic, Black |
| **Kernel Status** | 12px (`text-xs`) | 10px (`text-[10px]`) | Uppercase, Spaced |

---

## 🎨 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 |
| **Language** | TypeScript 5.8 (strict mode) |
| **Build Tool** | Vite 6 |
| **State** | Zustand 5 |
| **Styling** | Tailwind CSS 3 + Vanilla CSS |
| **Animation** | Framer Motion 12 |
| **Testing** | Vitest 4 + Playwright 1.57 |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Deployment** | Railway |
| **Data Feeds** | Binance & Coinbase WebSocket |
| **Validation** | Zod 4 |

---

## 📊 Project Stats

| Stat | Value |
|------|-------|
| **TypeScript Files** | 300+ |
| **React Components** | 68 |
| **Services** | 119 |
| **Custom Hooks** | 25 |
| **Config Files** | 16 |
| **Unit Tests** | **1431 passing** (118 test suites) |
| **E2E Tests** | **72 passing** |
| **Test Coverage** | ~65% (Overall), 80%+ (Core Logic) |
| **ESLint** | **0 errors, 0 warnings** |
| **Circular Dependencies** | **0** |
| **Performance** | Stable 60 FPS (Mobile & Desktop) |

---

## 🛠️ Debug Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| **Admin Dashboard** | `Ctrl+Shift+A` | Analytics, Price Analysis, Error Reports |
| **Cheat Manager** | Dev mode only | God mode, instant level up, spawn controls |
| **FPS Monitor** | Always visible | Canvas-rendered FPS counter |
| **EventBus Tracing** | `EventBus.enableTracing()` | Log all event emissions |
| **Debug State** | `DifficultyManager.getDebugState()` | Runtime inspection |

---

## 🌐 Integrations

### Supabase
- **Database**: PostgreSQL with RLS policies
- **Tables**: `players`, `game_sessions`, `player_wallets`, `price_logs`, `coin_transactions`
- **Views**: `leaderboard` (SECURITY INVOKER)
- **Edge Functions**: `verify-game`, `start-session`
- **Real-time**: Leaderboard subscriptions

### Railway
- **Frontend**: Static site deployment
- **Backend**: `railway-market-server` (price logger)

### WebSocket Feeds
- **Primary**: Binance (`wss://stream.binance.com:9443/ws/btcusdt@trade`)
- **Fallback**: Coinbase (`wss://ws-feed.exchange.coinbase.com`)

---

## 📚 API Documentation

TypeDoc-generated API documentation is available:

```bash
npm run docs          # Generate docs
npm run docs:watch    # Watch mode
npm run docs:clean    # Clean generated docs
```

Documentation location: `docs/api/`

---

## 📄 License

MIT © 2026

---

<div align="center">

**Made with 💎 Diamond Hands**

*"HODL through the chaos"*

</div>
