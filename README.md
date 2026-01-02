<div align="center">

# 🎮 Crypto Cyber Survivors

**A crypto-themed vampire survivors style game with real-time market data integration**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-979%20passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![E2E](https://img.shields.io/badge/E2E-72%20passing-blue?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [🎮 How to Play](#-how-to-play) • [🛠️ Development](#-development) • [📦 Architecture](#-architecture)

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
- **Visual Indicators** - Real-time buff status with countdown timers

### ⚡ Performance & Core Engine
- **Modular Renderer System** - Decoupled rendering with specialized classes for Background, Entities, Projectiles, Effects
- **3-Tier Projectile Visuals** - Neon Laser beams: Normal (Cyan), Crit (Gold), Super Crit (Red)
- **Spatial Grid Collision** - O(1) neighbor lookup for efficient bullet-enemy collision detection
- **Object Pooling** - O(1) object retrieval for high-performance recycling
- **Strongly Typed EventBus** - Type-safe event system with tracing mode for debugging
- **Physics Context DI** - Dependency injection for testable physics systems
- **60 FPS Canvas Engine** - Optimized draw calls with intelligent shadow-culling
- **Delta Time Physics** - Framerate-independent game logic
- **Debug State Methods** - Runtime inspection for DifficultyManager, ComboSystem, SpawnSystem

### 🔐 Beta User System
- **Nickname Login** - Frictionless onboarding without passwords or wallets
- **Device Fingerprinting** - Secure identifier for account recovery and anti-cheat
- **Supabase Integration** - Cloud sync for Leaderboards, User Profiles, Game Sessions
- **Admin Dashboard** - Real-time monitoring (Ctrl+Shift+A)

### 🏆 Leaderboard & Analytics
- **Global Leaderboard** - Real-time player rankings
- **Session Tracking** - Detailed game session analytics
- **Error Reporting** - Automatic crash reporting with device context
- **Performance Metrics** - FPS monitoring and optimization insights

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

---

## 📚 API Documentation

TypeDoc-generated API documentation is available for all services, hooks, stores, and types:

```bash
# Generate API documentation
npm run docs

# Generate with watch mode
npm run docs:watch

# Clean generated docs
npm run docs:clean
```

The generated documentation can be found in `docs/api/` and includes:
- **Services**: All singleton services (CardSystem, DifficultyManager, EventBus, etc.)
- **Hooks**: Custom React hooks with usage examples
- **Stores**: Zustand state management documentation
- **Types**: Complete TypeScript type definitions
- **Components**: React component prop interfaces

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
The UI uses a precision-scaled technical typography system:

| UI Element | Desktop Size | Mobile Size | Style |
| :--- | :--- | :--- | :--- |
| **BTC Price** | 36px (`text-4xl`) | 24px (`text-2xl`) | Font-Black, Mono |
| **PnL Percent** | 24px (`text-2xl`) | 18px (`text-lg`) | Font-Black, Mono |
| **Large Headings** | 96px (`text-8xl`) | 60px (`text-6xl`) | Italic, Black |
| **Kernel Status** | 12px (`text-xs`) | 10px (`text-[10px]`) | Uppercase, Spaced |

---

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev          # Start dev server with HMR (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run 979 unit tests
npm run test:watch   # Watch mode
npm run test:coverage # Check test coverage (80%+)
npm run test:e2e     # Run 72 E2E tests (Playwright)
npm run test:e2e:ui  # Playwright UI mode

# Code Quality
npm run lint         # Run ESLint (0 errors, 0 warnings)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier formatting
npm run docs         # Generate TypeDoc API documentation
```

### Debug Tools
- **Admin Dashboard**: `Ctrl+Shift+A` - Analytics, Price Analysis, Error Reports
- **Cheat Manager**: Development mode only
- **FPS Monitor**: Always visible on canvas
- **Logger**: Structured logging with levels

---

## 📦 Architecture

```
crypto-cyber-survivors/
├── components/               # React Components (53 files)
│   ├── GameEngine.tsx       # Canvas render loop & game tick
│   ├── GameHUD.tsx          # Direct Canvas overlays
│   ├── GameUI.tsx           # Responsive React HUD
│   ├── admin/               # Admin Dashboard panels
│   │   ├── AdminDashboard.tsx
│   │   └── PriceAnalysisPanel.tsx
│   ├── hud/                 # HUD components (16 files)
│   │   ├── LiveFeed.tsx
│   │   ├── LeaderboardPanel.tsx
│   │   └── BuffStatusPanel.tsx
│   ├── mobile/              # Touch controllers (5 files)
│   │   ├── VirtualJoystick.tsx
│   │   └── DragToMove.tsx
│   ├── screens/             # Menu screens (11 files)
│   │   ├── MainMenu.tsx
│   │   ├── LevelUpScreen.tsx
│   │   └── GameOverScreen.tsx
│   └── settings/            # Settings components (8 files)
│
├── services/                 # Logic Singletons (95 files)
│   ├── MarketService.ts     # Binance/Coinbase WebSocket client
│   ├── PhysicsSystem.ts     # Spatial grid collision engine
│   ├── DifficultyManager.ts # Market-based difficulty scaling
│   ├── ComboSystem.ts       # Kill streak logic
│   ├── EventBus.ts          # Type-safe event system with tracing
│   ├── ScreenService.ts     # Device & notch handling
│   ├── PoolManager.ts       # Object pooling (O(1) retrieval)
│   ├── SpatialGrid.ts       # O(1) neighbor lookup
│   ├── StatService.ts       # Centralized stat formatting
│   ├── renderers/           # IRenderer implementations (7 files)
│   │   ├── ProjectileRenderer.ts
│   │   ├── EntityRenderer.ts
│   │   ├── BackgroundRenderer.ts
│   │   └── EffectsRenderer.ts
│   ├── metrics/             # Modular analytics subsystem (5 files)
│   │   ├── MetricsStorage.ts    # localStorage with quota handling
│   │   ├── MetricsCompiler.ts   # Session data compilation
│   │   ├── MetricsAnalyzer.ts   # Insights & recommendations
│   │   └── MetricsExporter.ts   # JSON/CSV export
│   ├── analytics/           # Analytics & tracking (8 files)
│   │   ├── PlayerTracker.ts
│   │   ├── ErrorTracker.ts      # Modular error tracking
│   │   ├── ErrorQueue.ts        # Offline queue management
│   │   ├── ErrorSanitizer.ts    # Privacy-safe sanitization
│   │   ├── ErrorTypes.ts        # Error type definitions
│   │   └── DeviceProfiler.ts
│   ├── physics/             # Physics subsystem (3 files)
│   │   ├── PhysicsContext.ts    # DI container
│   │   ├── PhysicsTypes.ts      # Interface definitions
│   │   └── CollisionSystem.ts
│   ├── patterns/decorators/ # Buff/Debuff system (15 files)
│   │   ├── BuffManager.ts
│   │   ├── buffs/           # Rage, DiamondHands, Berserk...
│   │   └── debuffs/         # Slow, Vulnerable, Liquidated...
│   ├── audio/               # Sound system (9 files)
│   │   └── SynthEngine.ts
│   ├── cards/               # Card system (6 files)
│   │   ├── CardSystem.ts
│   │   ├── CardApplicator.ts    # Card effect application
│   │   └── cardDefinitions.ts
│   └── auth/                # Authentication (3 files)
│
├── hooks/                    # Custom React Hooks (21 files)
│   ├── useMarketData.ts     # Market data subscription
│   ├── useLerpValue.ts      # Smooth UI transitions
│   ├── useDevice.ts         # Device detection
│   ├── useHUDEvents.ts      # HUD event handling
│   └── useMenuNav.ts        # Keyboard navigation
│
├── stores/                   # Zustand State Management
│   ├── gameStore.ts         # Main game state
│   └── admin/               # Admin panel state
│
├── types/                    # TypeScript Definitions (7 files)
│   ├── events.ts            # Typed event payloads
│   ├── BuffGem.ts           # Buff gem configurations
│   ├── DeviceProfile.ts     # Device capability types
│   ├── metrics.ts           # Analytics types
│   └── admin.ts             # Admin panel types
│
├── tests/                    # Vitest Unit Tests (59 files)
│   ├── services/            # Service tests (15 files)
│   ├── hooks/               # Hook tests (3 files)
│   └── edge/                # Edge function tests (5 files)
│
├── e2e/                      # Playwright E2E Tests (5 files)
│   ├── game-flow.spec.ts
│   ├── mobile-touch-controls.spec.ts
│   ├── mobile-keyboard.spec.ts
│   ├── network-error.spec.ts
│   └── visual.spec.ts
│
├── supabase/                 # Supabase Configuration
│   ├── migrations/          # Database migrations (4 files)
│   └── functions/           # Edge functions
│       └── verify-game/     # Score verification
│
├── railway-market-server/    # Price Logger Backend
│   └── src/                 # Express.js server
│
├── docs/                     # Documentation (44 files)
│   ├── MASTER_ROADMAP.md
│   ├── ARCHITECTURE_REVIEW.md
│   ├── ANTI_CHEAT_ROADMAP.md
│   └── completed/           # Completed features (15 files)
│
└── config/                   # Configuration (11 files)
    ├── Colors.ts            # Decoupled color constants
    ├── EnemyRegistry.ts     # Enemy type definitions
    ├── AudioRegistry.ts     # Audio sound definitions
    └── StatRegistry.ts      # Stat definitions
```

### Key Design Patterns

| Pattern | Usage |
|---------|-------|
| **Singleton** | Global services (CardSystem, DifficultyManager, EventBus) |
| **Factory** | Scalable enemy and particle creation |
| **Observer** | Decoupled communication via EventBus |
| **Object Pool** | High-performance recycling (bullets, enemies, particles) |
| **Strategy** | Pluggable enemy AI and movement behaviors |
| **Decorator** | Stackable buff/debuff stat modifiers |
| **State Machine** | Game state transitions (Menu → Playing → Paused → GameOver) |
| **Dependency Injection** | PhysicsContext for testable collision systems |

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
| **React Components** | 46 |
| **Services** | 95 |
| **Custom Hooks** | 21 |
| **Config Files** | 11 |
| **Unit Tests** | **979 passing** (71 test suites) |
| **E2E Tests** | **72 passing** |
| **Test Coverage** | 80%+ |
| **ESLint** | **0 errors, 0 warnings** |
| **Circular Dependencies** | **0** |
| **Performance** | Stable 60 FPS (Mobile & Desktop) |

### 🔍 Code Quality

Latest review: **January 3, 2026**

**Highlights:**
- ✅ Excellent architecture with clean separation of concerns
- ✅ Strong type safety with TypeScript strict mode
- ✅ High test coverage (979 unit + 72 E2E tests)
- ✅ Performance optimizations (object pooling, spatial grid)
- ✅ Security hardened (RLS policies, replay protection)
- ✅ Modular metrics subsystem
- ✅ Zero circular dependencies
- ✅ Debug state methods for runtime inspection
- ✅ EventBus tracing mode for debugging

---

## 🌐 Integrations

### Supabase
- **Database**: PostgreSQL with RLS policies
- **Tables**: `players`, `game_sessions`, `player_wallets`, `price_logs`
- **Views**: `leaderboard`
- **Edge Functions**: `verify-game` (score verification)
- **Real-time**: Leaderboard subscriptions

### Railway
- **Frontend**: Static site deployment
- **Backend**: `railway-market-server` (price logger)

### WebSocket Feeds
- **Primary**: Binance (`wss://stream.binance.com:9443/ws/btcusdt@trade`)
- **Fallback**: Coinbase (`wss://ws-feed.exchange.coinbase.com`)

---

## 📄 License

MIT © 2026

---

<div align="center">

**Made with 💎 Diamond Hands**

*"HODL through the chaos"*

</div>
