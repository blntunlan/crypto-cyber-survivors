<div align="center">

# 🎮 Crypto Cyber Survivors

**A crypto-themed vampire survivors style game with real-time market data integration**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-227%20passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [🎮 How to Play](#-how-to-play) • [🛠️ Development](#️-development) • [📦 Architecture](#-architecture)

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

### 🃏 Card System
- **Tiered Rarity System** - Common, Rare, Epic, Legendary cards with visual distinction
- **Premium Asset Design** - Hand-crafted SVG icons and generative art for high-tier cards
- **40+ Unique Upgrades** - Crypto-themed cards like "Diamond Hands", "Rug Pull", "Flash Loan", "Satoshi Mode"
- **Slot Machine Leveling** - Psychologically optimized level-up screen with "reel stop" anticipation
- **Luck-Based Drops** - Higher luck stat = better card rarity chances

### ⚡ Performance & Core
- **Game Engine Refactor** - Decoupled, event-driven architecture for better stability
- **60 FPS Canvas Rendering** - Smooth gameplay with optimized draw calls
- **Object Pooling** - O(1) object retrieval, minimal garbage collection
- **Delta Time** - Framerate-independent game logic
- **Strict TypeScript** - 100% type safety across the entire codebase

### 📊 Analytics & Metrics
- **Comprehensive Tracking** - 40+ metrics across 7 categories (Combat, Market, Performance, etc.)
- **Bitcoin Impact Analysis** - Track how price movements correlate with player survival
- **Feature Flag System** - Scalable metrics collection with zero performance overhead
- **Debug Overlays** - Real-time metrics and combo debug panels for balancing

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
| Key | Action |
|-----|--------|
| `W` `A` `S` `D` / `Arrows` | Move |
| `Space` | Dash (I-Frames) |
| `Escape` / `P` | Pause |

### Objective
1. **Choose Position & Leverage** - Select LONG or SHORT and set your leverage (1x - 100x)
2. **Survive** - Kill enemies and collect gems to level up
3. **Build Combos** - Kill enemies quickly to stack XP multipliers
4. **Upgrade** - Choose powerful cards from the slot machine
5. **Endure** - Survive "Liquidation Waves" as difficulty scales with time and market volatility

### Game Mechanics
- 🟢 **Positive P&L** = Easier enemies (Winning trade = Bullish vibes)
- 🔴 **Negative P&L** = Harder enemies (Losing trade = Bears are attacking!)
- 📈 **Leverage** = Multiplies the effect of P&L on difficulty
- 🔥 **Combos** = 5 milestones (Combo, Super, Mega, Ultra, Jackpot) providing up to 3x XP
- 💎 **Gems** = Experience points. Bonus XP awarded at the end of a combo streak

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run test         # Run 120+ unit tests
npm run test:coverage # Check test coverage
npm run lint         # Run ESLint & Format check
```

### Dev Cheats (Development Only)
| Key | Cheat |
|-----|-------|
| `L` | Level Up |
| `H` | Full Heal |
| `G` | Toggle God Mode |
| `K` | Kill All Enemies |
| `X` | +500 EXP |
| `1-4` | Set Luck (0, 2, 5, 10) |
| `R` | Restart Game |
| `ape` | Full Ape Mode 🦍 |
| `moon` | To The Moon 🚀 |

---

## 📦 Architecture

```
crypto-cyber-survivors/
├── components/           # React Components
│   ├── GameEngine.tsx   # Rendering & Loop
│   ├── GameHUD.tsx      # Main Gameplay UI
│   ├── ComboDebugPanel.tsx # Combo testing
│   └── screens/          # MainMenu, LevelUp, GameOver
├── services/            # Core Logic (Singletons)
│   ├── CardSystem.ts    # Card generation & effects
│   ├── ComboSystem.ts   # Kill streak logic
│   ├── DifficultyManager.ts # Market-based difficulty
│   ├── MetricsService.ts # Analytics engine
│   ├── PoolManager.ts   # Memory optimization
│   └── marketService.ts # WebSocket data
├── factories/           # Factory Pattern
│   └── EnemyFactory.ts  # Enemy creation
├── contexts/            # State Management
│   └── GameContext.tsx  # Global game state
└── tests/               # 120+ Vitest test suites
```

### Key Design Patterns
- **Singleton Services** - Global state for CardSystem, DifficultyManager, EventBus
- **Factory Pattern** - Scalable enemy and particle creation
- **Observer Pattern** - Decoupled communication via Centralized EventBus
- **Object Pooling** - High-performance recycling for bullets and VFX
- **Strategy Pattern** - Pluggable enemy AI and movement behaviors

---

## 🎨 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 |
| **Language** | TypeScript 5.8 (Strict) |
| **Animation** | Framer Motion |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest + RTL |
| **Data** | Binance & Coinbase WS |

---

## 📊 Project Stats

| Stat | Value |
|------|-------|
| TypeScript Files | 40+ |
| Total Tests | 227 (All Passing) |
| Unique Cards | 40+ |
| Enemy Types | 6+ |
| Metrics Tracked | 50+ |
| Performance | 60 FPS (Canvas) |

---

## 📄 License

MIT © 2025

---

<div align="center">

**Made with 💎 Diamond Hands**

*"HODL through the chaos"*

</div>
