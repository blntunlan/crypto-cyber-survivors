<div align="center">

# 🎮 Crypto Cyber Survivors

**A crypto-themed vampire survivors style game with real-time market data integration**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-37%20passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[🎯 Features](#-features) • [🚀 Quick Start](#-quick-start) • [🎮 How to Play](#-how-to-play) • [🛠️ Development](#️-development) • [📦 Architecture](#-architecture)

</div>

---

## 🎯 Features

### 🎲 Gameplay
- **Vampire Survivors Style** - Auto-shooting survival gameplay with waves of enemies
- **Real-Time Market Data** - Live BTC/USD prices from Binance & Coinbase WebSocket feeds
- **Dynamic Difficulty** - Market volatility and P&L directly affect game difficulty
- **Long/Short Positions** - Choose your position and survive the market chaos

### 🃏 Card System
- **4-Tier Rarity** - Common, Rare, Epic, Legendary cards
- **30+ Unique Upgrades** - Crypto-themed cards like "Diamond Hands", "Rug Pull", "Flash Loan"
- **Luck-Based Drops** - Higher luck stat = better card chances
- **Level-Gated Tiers** - Legendary cards only appear after level 12

### ⚡ Performance
- **60 FPS Canvas Rendering** - Smooth gameplay with optimized draw calls
- **Object Pooling** - O(1) object retrieval, minimal garbage collection
- **Delta Time** - Framerate-independent game logic
- **Sub-pixel Optimization** - Integer coordinates for crisp rendering

### 🛡️ Production Ready
- **TypeScript Strict Mode** - Full type safety with strict null checks
- **ESLint + Prettier** - Consistent code style
- **Husky Pre-commit** - Automated linting before commits
- **37 Unit Tests** - Comprehensive test coverage with Vitest
- **Error Boundary** - Graceful crash recovery with themed UI

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
| `W` `A` `S` `D` or `Arrow Keys` | Move |
| `Space` | Dash (I-Frames) |
| `Escape` / `P` | Pause |

### Objective
1. **Choose Position** - Select LONG (green) or SHORT (red) at game start
2. **Survive** - Kill enemies and collect gems to level up
3. **Upgrade** - Choose powerful cards when you level up
4. **Endure** - Difficulty scales with time, level, and market volatility

### Game Mechanics
- 🟢 **Positive P&L** = Easier enemies (you're winning!)
- 🔴 **Negative P&L** = Harder enemies (the market is against you)
- 📈 **High Volatility** = Faster, stronger enemies
- 💎 **Gems** = Experience points for leveling up
- ⚡ **Critical Hits** = Extra damage with visual feedback

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
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
| Type `ape` | Full Ape Mode 🦍 |
| Type `moon` | To The Moon 🚀 |

---

## 📦 Architecture

```
crypto-cyber-survivors/
├── components/           # React components
│   ├── GameEngine.tsx   # Main game loop & rendering
│   ├── GameUI.tsx       # HUD & stats display
│   └── ErrorBoundary.tsx # Crash recovery
├── services/            # Core services
│   ├── CardSystem.ts    # Card generation & effects
│   ├── DifficultyManager.ts # Dynamic difficulty
│   ├── PoolManager.ts   # Object pooling
│   ├── EventBus.ts      # Decoupled event system
│   ├── marketService.ts # WebSocket market data
│   ├── audioService.ts  # Sound effects
│   ├── CheatManager.ts  # Dev cheats
│   └── Logger.ts        # Centralized logging
├── factories/           # Factory patterns
│   └── EnemyFactory.ts  # Enemy creation
├── strategies/          # Strategy patterns
│   └── EnemyBehaviors.ts # Movement AI
├── contexts/            # React contexts
│   └── GameContext.tsx  # State management
├── config/              # Game configuration
├── tests/               # Vitest test suites
└── types.ts             # TypeScript interfaces
```

### Key Design Patterns
- **Singleton** - Services (CardSystem, DifficultyManager, EventBus)
- **Factory** - Enemy creation with weighted spawn rates
- **Strategy** - Pluggable enemy movement behaviors
- **Object Pool** - Efficient bullet/particle management
- **Observer** - EventBus for decoupled communication

---

## 🎨 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 |
| **Language** | TypeScript 5.8 (Strict) |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest + Testing Library |
| **Linting** | ESLint 9 + Prettier |
| **Git Hooks** | Husky + lint-staged |
| **Data** | Binance & Coinbase WebSocket |

---

## 📊 Game Stats

| Stat | Value |
|------|-------|
| Lines of Code | ~10,000 |
| TypeScript Files | 25+ |
| Unit Tests | 37 |
| Card Types | 30+ |
| Enemy Types | 6 |
| Test Coverage | Core services |

---

## 📄 License

MIT © 2024

---

<div align="center">

**Made with 💎 Diamond Hands**

*"HODL through the chaos"*

</div>
