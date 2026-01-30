# 🎮 Crypto Survivors - Claude Project Context File

> This file is automatically read for Claude to better understand the project.
> Last Update: 2026-01-31

## 📋 Project Summary

Crypto-themed vampire survivors game. Developed with React 19 + TypeScript + Vite + Zustand.
It receives real-time BTC/USD price data via Binance & Coinbase WebSocket (Price) and Supabase Realtime (Indicators). Since I am developing on Windows, avoid using `&&`, use `;`.
**Difficulty System V2 (Layered Architecture)**, **Tutorial System**, **Neural AIDirector** (Synaptic based) and **Cloudflare Anti-Cheat** are integrated.
**Casual/Competitive game modes**, PWA support and full tutorial flow are available.
Major languages (ES, PT, HI, VI, ZH, RU) are fully supported.

**DB Optimization:** Migration 026 added JSONB support for cheat logs, fixed transaction constraints for achievements, and implemented BRIN indexes for performance.

## 🛠️ Frequently Used Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run docs             # Generate TypeDoc documentation

# Database
npm run supabase:gen     # Update Supabase types

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # Fix ESLint errors
npm run format           # Format with Prettier
```

## 📁 Project Structure

```
crypto-cyber-survivors/
├── App.tsx                    # Main application component
├── components/                # React components (View Layer Only)
│   ├── GameEngine.tsx        # Canvas render loop (No React State Updates in Loop!)
│   ├── GameUI.tsx            # Responsive React HUD (Main)
│   └── ...
├── config/                    # Game configurations (Magic Numbers Forbidden)
├── services/                  # Singleton Services (Logic Layer)
│   ├── DifficultyManager.ts  # Consumer of V2 System
│   ├── difficulty/           # V2 Layered Architecture (Inputs -> Context -> Director)
│   ├── EventBus.ts           # System communication (Decoupled)
│   ├── PoolManager.ts        # O(1) Object pooling (Mandatory for Entities)
│   ├── renderers/            # Canvas/Sprite implementations
│   └── ...
├── stores/                    # Zustand state management (Shared State)
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript Definitions
├── tests/                     # Vitest unit & integration tests
├── e2e/                       # Playwright E2E tests
└── docs/                      # Documentation
```

## 🎯 Coding and Architectural Standards

### 1. Performance Laws (Performance is Law)
- **GC-Free Loop:** Memory allocation (new Object, Array map/filter) inside the Game Loop is **FORBIDDEN**.
- **Object Pooling:** NVER use `new Entity()` when spawning Bullet, Customer, Particle. MUST use `PoolManager.spawn()`.
- **Spatial Hashing:** O(N^2) loops for collision and distance checks are forbidden. Use `SpatialGrid`.
- **References:** Use `useRef` or `Singleton Service` for data changing every frame (Position, Velocity), NOT React State.

### 2. Architectural Patterns
- **Singleton Services:** Core systems like `CombatSystem`, `DifficultyManager` must be Singleton.
- **EventBus Communication:** Services should not call each other directly, communicate via `EventBus.emit()`.
- **Layered Difficulty (Difficulty V2):**
  1. **Inputs:** `DifficultyContext.updateInputs()`
  2. **Analysis:** `DifficultyContext` aggregates factors.
  3. **Directing:** `AIDirector` applies neural/synaptic modification.
  4. **Output:** `DifficultyManager` maps to game parameters.

### 3. State Management
- **Zustand:** For high-frequency global state (e.g., UI updates).
- **React Context:** Only for static/low-frequency state (Theme, Language, User).
- **Service State:** Game logic state is kept inside services (not `GameStore`).

### 4. TypeScript Rules
- **Strict Mode:** `any` is forbidden. Use Type Guards and Generics.
- **Naming:** Variable/Function -> `camelCase`, Class/Component -> `PascalCase`, Constant -> `UPPER_SNAKE_CASE`.

## ⚠️ Important Rules (Do's & Don'ts)

### You Should NOT
1. ❌ Perform `useState` updates inside `GameEngine` render loop (Breaks React Render Cycle).
2. ❌ Host UI code (React Component) inside Services.
3. ❌ Commit `.env*` or API Keys.
4. ❌ Delete `Logger` calls (Critical for Anti-Cheat analysis).
5. ❌ Add a "feature" without writing tests.

### You SHOULD
1. ✅ Register new Entities to `PoolManager` when adding them.
2. ✅ Mock with MSW when testing Network requests (API).
3. ✅ Use conventional commits in commit messages (`feat:`, `fix:`, `perf:`).

## 🔌 Integrations & Debug

### Supabase & Auth
- **Tables**: `players`, `game_sessions`, `achievements`. RLS active.
- **Functions**: `verify-game` (Anti-Cheat on-submit validation).

### Debug Tools
- **Admin Dashboard**: `Ctrl+Shift+A` (Metrics, Console, State).
- **Cheat Manager**: `F1` in Development mode.
- **Logger**: Use `Logger.info()`, `Logger.warn()`. Do not leave `console.log`.
- **documentation-system**: Capability to manage project documentation, generate API docs, and maintain documentation standards.

## 📝 Workflows
Detailed processes under `.agent/workflows/`:
- `/deploySon` (Deployment)

## 🚀 Deployment
```bash
git add . && git commit -m "feat: description"
npm run deploy # git push origin main
```

---
*This file is the SINGLE source of truth for project rules.*