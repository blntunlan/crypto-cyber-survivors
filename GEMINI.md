# 🎮 GEMINI.md - Crypto Survivors Project Context

This file serves as the primary instructional context for Gemini CLI when working on the **Crypto Survivors** project.

## 📋 Project Overview
**Crypto Survivors** is a high-performance, real-time market-driven survival game (Vampire Survivors style) built with React 19, TypeScript, and Vite. The game integrates live Bitcoin (BTC/USD) price data from Binance and Coinbase WebSockets to dynamically adjust gameplay difficulty, enemy behavior, and reward structures.

### Core Tech Stack
- **Frontend:** React 19 (Strict Mode), TypeScript 5.8, Vite 6.
- **State Management:** Zustand 5 (Modular Slice Pattern).
- **Game Engine:** Custom Canvas-based engine with a GC-free render loop.
- **Services:** Singleton-based architecture for core logic (Combat, Physics, Difficulty).
- **Styling & Animation:** Tailwind CSS, Framer Motion 12.
- **Backend/DB:** Supabase (PostgreSQL, Realtime, Edge Functions).
- **Testing:** Vitest (Unit/Integration - 2100+ tests), Playwright (E2E).

---

## 🏗️ Architectural Standards (Performance is Law)

### 1. The GC-Free Loop
Memory allocation (e.g., `new Object()`, `[].map()`, `[].filter()`) inside the `GameEngine` render loop is **FORBIDDEN**. 
- **Reason:** To avoid garbage collection spikes and maintain a stable 60 FPS.
- **Enforcement:** Use pre-allocated arrays and object pools.

### 2. Object Pooling
NEVER instantiate high-frequency entities (bullets, enemies, particles) using `new`. 
- **Required:** Use `PoolManager.getInstance().spawn()` and `pool.release()`.
- **Implementation:** `services/combat/PoolManager.ts`.

### 3. Spatial Hashing (O(1) Physics)
Do not use O(N^2) loops for collision or distance checks.
- **Required:** Use the `SpatialGrid` service to query nearby entities.
- **Implementation:** `services/combat/SpatialGrid.ts`.

### 4. Decoupled Communication (EventBus)
Services must not have tight circular dependencies. 
- **Pattern:** Use `EventBus.emit()` and `EventBus.on()` for cross-system communication.
- **Location:** `services/core/EventBus.ts`.

---

## 🚀 Key Commands

### Development
- `npm run dev`: Starts the development server on port 3000.
- `npm run build`: Production build with Anti-Cheat obfuscation and minification.
- `npm run format`: Formats code with Prettier.
- `npm run lint`: Runs ESLint checks.

### Testing & Quality
- `npm run test`: Runs 2100+ Vitest unit tests.
- `npm run test:coverage`: Generates test coverage reports (>70% global target).
- `npm run test:e2e`: Runs Playwright E2E tests.
- `npm run lint:ui`: Audits UI consistency (Typography, Colors).

### Backend & Database
- `npm run supabase:gen`: Synchronizes TypeScript types from the Supabase schema.
- `npm run railway:deploy`: Deploys the application and market server to Railway.

---

## 📁 Project Structure

- `components/`: React View Layer. `GameEngine.tsx` is the bridge between React and the Canvas loop.
- `services/`: Singleton Logic Layer. Contains the "Brains" of the game.
  - `core/`: EventBus, Time, Registry.
  - `gameplay/`: DifficultyManager, PortalSystem.
  - `combat/`: Physics, Spawning, Pooling.
  - `renderers/`: Layer-specific canvas drawing logic.
- `stores/`: Zustand slices for persistent state (Settings, Progress).
- `config/`: Centralized "Magic Numbers". Never hardcode values in services; add them here.
- `types/`: Strongly typed definitions for events, entities, and market data.
- `hooks/`: React hooks for UI-to-Engine bridging (e.g., `useMarketData`).

---

## 🎯 Development Conventions

- **TypeScript:** `strict` mode is enabled. No `any`. Use Type Guards for complex objects.
- **Naming:** 
  - Variables/Functions: `camelCase`.
  - Classes/Components: `PascalCase`.
  - Constants: `UPPER_SNAKE_CASE`.
- **Singletons:** Access core services via `.getInstance()`.
- **React State:** Never use `useState` or `useEffect` for data that changes 60 times per second. Use `useRef` or Singleton Service state.
- **Comments:** Prefer self-documenting code. Use JSDoc for complex service methods.

---

## 🛠️ Debugging & Tools
- **Admin Dashboard:** `Ctrl + Shift + A` (Metrics, Price Analysis).
- **Cheat Manager:** `F1` (Dev mode only - God mode, XP boost).
- **Tracing:** Use `EventBus.enableTracing()` to debug event flows in the console.

---
*Last updated by Gemini CLI: February 8, 2026*
