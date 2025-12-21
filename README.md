<div align="center">

# 🎮 Crypto Cyber Survivors

**A crypto-themed vampire survivors style game with real-time market data integration**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-427%20passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [🎮 How to Play](#-how-to-play) • [🛠️ Development](#-development) • [📦 Architecture](#-architecture)

</div>

---

## 🎯 Features

### 🎲 Gameplay
- **Vampire Survivors Style** - Auto-shooting survival gameplay with waves of enemies
- **Real-Time Market Data** - Live BTC/USD prices from Binance & Coinbase WebSocket feeds
- **PnL Leverage System** - Choose your leverage (1x to 100x). Higher leverage amplifies PnL impact on game difficulty
- **Kill Streak Combo System** - Chain kills to build multipliers and earn massive XP bonuses
- **Dynamic Difficulty** - Market volatility and P&L directly affect game difficulty
- **Long/Short Positions** - Choose your position and survive the market chaos

### 📱 Mobile Optimization (New!)
- **Fully Responsive HUD** - Dynamic scaling based on screen size (0.5x to 1.5x)
- **Safe Area Support** - Explicit support for notches (iOS/Android) and home indicators using `env(safe-area-inset-*)`
- **Dual Control Schemes** - Switch between **Virtual Joystick** and **Drag-to-Move**
- **Performance Profiles** - Expensive canvas shadows and filters automatically disabled on mobile for stable 60 FPS
- **Landscape Lock** - Intelligent orientation detection and instruction overlay

### 🃏 Card System
- **Tiered Rarity System** - Common, Rare, Epic, Legendary cards with visual distinction
- **Premium Asset Design** - Hand-crafted SVG icons and generative art for high-tier cards
- **40+ Unique Upgrades** - Crypto-themed cards like "Diamond Hands", "Rug Pull", "Flash Loan", "Satoshi Mode"
- **Slot Machine Leveling** - Psychologically optimized level-up screen with "reel stop" anticipation

### ✨ Buff/Debuff System (New!)
- **Decorator Pattern** - Dynamic stat modifiers with stackable effects
- **Volume-Based Spawning** - Buff gems spawn when market volatility changes
- **Temporary & Permanent Effects** - 🔥 Rage Mode, 💎 Diamond Hands, ⚡ Berserk, 🍀 Lucky Star
- **Debuff Mechanics** - 🐌 Slow, 💀 Vulnerable, 📉 Liquidated, 😵 Weakened
- **Pause-Aware Timers** - Buff timers freeze during LevelUp and Pause screens
- **Visual Indicators** - Real-time buff status with countdown timers below LiveFeed

### ⚡ Performance & Core
- **Modular Renderer System** - Decoupled rendering logic using specialized classes for Background, Entities, Projectiles, and Effects
- **3-Tier Projectile Visuals** - High-quality Neon Laser beams with distinct visual styles for Normal (Cyan), Crit (Gold), and Super Crit (Red)
- **Spatial Grid Collision** - O(1) neighbor lookup for efficient bullet-enemy collision detection
- **Object Pooling** - O(1) object retrieval for high-performance recycling of bullets, enemies, and particles
- **Strongly Typed EventBus** - Type-safe event system with individual interfaces for each game event
- **60 FPS Canvas Engine** - Optimized draw calls with intelligent shadow-culling for mobile stability
- **Delta Time** - Framerate-independent game logic and smooth physics updates

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

---

## 🎮 How to Play

### Controls
| Input Mode | Move | Special / Action |
|------------|------|------------------|
| **Desktop** | `W` `A` `S` `D` / `Arrows` | `Space` (Dash), `Esc/P` (Pause) |
| **Touch (Joystick)** | Left/Right Thumb | Dedicated Dash Button |
| **Touch (Drag)** | Drag anywhere | Second Finger Tap (Dash) |

### UI Typography & Scaling
The UI uses a precision-scaled technical typography system for maximum readability:

| UI Element | Desktop Size | Mobile Size | Stil Özellikleri |
| :--- | :--- | :--- | :--- |
| **BTC Price** | 36px (`text-4xl`) | 24px (`text-2xl`) | Font-Black, Mono |
| **PnL Percent** | 24px (`text-2xl`) | 18px (`text-lg`) | Font-Black, Mono |
| **Large Headings** | 96px (`text-8xl`) | 60px (`text-6xl`) | Italic, Black |
| **Kernel Status** | 12px (`text-xs`) | 10px (`text-[10px]`) | Uppercase, Spaced |
| **Technical Labels** | 10px | 8px | Uppercase, Opacity-60 |

---

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run test         # Run 427+ unit tests
npm run test:coverage # Check test coverage
npm run lint         # Run ESLint & Format check
```

---

## 📦 Architecture

```
crypto-cyber-survivors/
├── components/           # React Components
│   ├── GameEngine.tsx    # Rendering & Loop
│   ├── GameHUD.tsx       # Direct Canvas Overlays
│   ├── GameUI.tsx        # Responsive React HUD
│   ├── mobile/           # Touch Controllers
│   └── screens/          # Menus (Settings, LevelUp, etc.)
├── services/             # Logic Singletons
│   ├── renderers/        # specialized IRenderer implementations
│   │   ├── ProjectileRenderer.ts
│   │   ├── EntityRenderer.ts
│   │   └── ...
│   ├── metrics/          # Modular analytics subsystem
│   │   ├── MetricsStorage.ts    # localStorage with quota handling
│   │   ├── MetricsCompiler.ts   # Session data compilation
│   │   ├── MetricsAnalyzer.ts   # Insights & recommendations
│   │   └── MetricsExporter.ts   # JSON/CSV export
│   ├── PhysicsSystem.ts  # Spatial Grid Collision Engine
│   ├── SpatialGrid.ts    # O(1) neighbor lookup
│   ├── DifficultyManager.ts # Market Scaling
│   ├── ComboSystem.ts    # Streak Logic
│   ├── EventBus.ts       # Strongly Typed Event System
│   └── ScreenService.ts  # Device & Notch Handling
├── types/                # TypeScript Definitions
│   ├── events.ts         # Typed event payloads
│   └── BuffGem.ts        # Buff gem configurations
├── stores/               # State Management
│   └── gameStore.ts      # Zustand Persistent Settings
├── hooks/                # Custom React Hooks
│   ├── useLerpValue.ts   # Smooth UI Transitions
│   └── useDevice.ts      # Screen detection
└── tests/                # 427+ Vitest test suites
```

### Key Design Patterns
- **Singleton Services** - Global state for CardSystem, DifficultyManager, EventBus
- **Factory Pattern** - Scalable enemy and particle creation
- **Observer Pattern** - Decoupled communication via Centralized EventBus
- **Object Pooling** - High-performance recycling for bullets and VFX
- **Strategy Pattern** - Pluggable enemy AI and movement behaviors
- **Decorator Pattern** - Stackable buff/debuff stat modifiers

---

## 🎨 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 |
| **State** | Zustand |
| **Styling** | Vanilla CSS + Tailwind |
| **Animation** | Framer Motion |
| **Testing** | Vitest + RTL |
| **Data** | Binance & Coinbase WS |

---

## 📊 Project Stats

| Stat | Value |
|------|-------|
| TypeScript Files | 60+ |
| Total Tests | 427 (All Passing) |
| ESLint | 0 errors, 48 warnings |
| Performance | Stable 60 FPS (Mobile & Web) |
| Optimization | Spatial Grid, Object Pooling, Shadow-Culling |

---

## 📄 License

MIT © 2025

---

<div align="center">

**Made with 💎 Diamond Hands**

*"HODL through the chaos"*

</div>
