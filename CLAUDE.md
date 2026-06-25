# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Crypto Survivors is a real-time market-driven Vampire Survivors game. Live BTC/USD price data from Binance/Coinbase WebSockets dynamically adjusts difficulty, enemy behavior, and rewards. Built with React 19 + TypeScript 5.8 + Vite 6, targeting stable 60 FPS on mobile and desktop.

## Commands

```bash
# Development
npm run dev              # Sync docs + generate sitemap, then Vite dev server (opens browser)
npm run build            # Production build (terser minification + anti-cheat obfuscation)
npm run preview          # Preview production build locally
npm run start            # Serve the built app via server.js (production-style)

# Testing
npm run test             # Vitest unit tests (2400+)
npm run test:watch       # Vitest watch mode (TDD)
npx vitest run tests/services/SpawnSystem.test.ts  # Run a single test file
npm run test:coverage    # V8 coverage report (70%+ target)
npm run test:e2e         # Playwright E2E tests (chromium, firefox, webkit, mobile-chrome)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug mode
npm run test:e2e:beta:critical   # Beta smoke gate (chromium + mobile-chrome)

# Code Quality
npm run lint             # ESLint (expect 0 errors, 0 warnings)
npm run lint:fix         # ESLint auto-fix
npm run typecheck        # tsc --noEmit (strict, no emit)
npm run format           # Prettier
npm run lint:ui          # UI consistency audit (typography, colors)
npm run check:architecture       # Guard: no un-whitelisted singletons (scripts/check-singleton-regressions.mjs)
npm run check:reset-coverage     # Guard: every singleton with state is reset on game-reset (scripts/check-reset-coverage.mjs)
npm run check:baseline   # Full gate: typecheck + check:architecture + check:reset-coverage + lint + test + build

# Backend / Deploy (Railway)
npm run railway:deploy           # railway up (API server)
npm run railway:market:deploy    # Deploy market server from railway-market-server/
npm run deploy                   # git push origin main (Railway auto-deploys)
```

## Architecture

### Singleton Service Pattern
All game logic lives in singleton services (`services/`), never in React state. Services communicate via a strongly-typed `EventBus` (Observer Pattern) with 150+ event types defined in `types/events.ts` (the `GameEvent` union).

```
Presentation (React components, HUD, screens)
    ↕ EventBus + useRef (never useState for 60fps data)
Game Engine (GameEngine.tsx - requestAnimationFrame loop)
    ↕
Service Layer (60+ singletons: Combat, Physics, Difficulty, Spawn, etc.)
    ↕
Data Layer (Zustand store for settings/progress, Railway API for cloud + auth, localStorage for offline)
```

### Critical Performance Rules
- **No `useState`/`setState` in the game loop** - use `useRef` or singleton services for anything updating at 60 FPS
- **No allocations in the render loop** - no `new Object()`, `[].map()`, `[].filter()` inside `GameEngine.tsx`. Use pre-allocated arrays and object pools
- **Object pooling required** - all high-frequency entities (bullets, enemies, particles) must use `PoolManager` (`services/combat/PoolManager.ts`) for O(1) alloc/dealloc with zero GC pressure
- **Spatial hashing for collision** - use `SpatialGrid` (`services/combat/SpatialGrid.ts`) for O(1) neighbor lookup. Never O(N^2) collision loops
- **Pause-aware timing** - use `TimeService.setTimeout()` instead of `setTimeout()` so timers freeze during pause/level-up

### Market-to-Gameplay Data Flow
```
Railway Server SSE → SSEMarketService → Server-computed Indicators (RSI, ATR, Volume)
    → UnifiedDirector (services/difficulty/UnifiedDirector.ts) + FlowStateManager
    → DifficultyContext → SpawnSystem, CombatSystem, BuffManager
```
The `UnifiedDirector` is the runtime difficulty pipeline introduced in the latest refactor. It replaces direct `DifficultyManager` calls in the hot path. `DifficultyContext` (`services/difficulty/DifficultyContext.ts`) holds the mutable difficulty state; always reset it on game-over and cash-out, not just on `gameStart`.

### Client ↔ Server Architecture
```
Client --[fetch]--------> API Server /api/v1/auth/* (login/signup/OAuth → issues Railway JWT)
Client --[SSE]----------> Market Aggregator /api/v1/market/stream (price + indicators, ~1s)
Client --[fetch]--------> API Server /api/v1/* (profile, sessions, wallet, leaderboard, telemetry)
Market Aggregator --[WebSocket]---> Binance/Coinbase (single source of truth for prices)
Market Aggregator --[pg]----------> Railway PostgreSQL (market_state, price_history)
API Server --------[pg]----------> Railway PostgreSQL (all data tables)
```

- **Auth is Railway-native** (no Supabase): `services/auth/RailwayAuthService.ts` handles login/signup/OAuth; the API server signs JWTs (issuer `crypto-survivors-api`, audience `crypto-survivors-client`) verified in `railway-market-server/src/middleware/auth.ts` / `src/utils/railwayJwt.ts`
- **`services/api/RailwayClient.ts`**: HTTP client, auto-attaches the Railway JWT as `Authorization: Bearer`
- **`services/market/SSEMarketService.ts`**: EventSource client, connects to aggregator (`VITE_MARKET_AGGREGATOR_URL`, falls back to `VITE_RAILWAY_API_URL`)
- **`railway-market-server/`**: Stateless REST API server (profile, sessions, wallet, leaderboard, telemetry, identities, meta, challenges, replays)
- **`railway-market-aggregator/`**: Stateful market data pipeline (Binance/Coinbase WS → Indicators → SSE stream + DB writes + Cleanup cron)
- **`railway-market-server/src/db/`**: PostgreSQL pool + schema (27 tables, 4 views, 10 functions). Migrations 000–010 via `migrate.ts`.

### Key Design Patterns
- **EventBus** (Observer): `EventBus.on('eventName', handler)` / `EventBus.emit('eventName', data)` - decoupled cross-system communication
- **Object Pool**: `PoolManager` for zero-GC entity recycling
- **Decorator**: `BuffManager` with stackable `BaseDecorator` subclasses for buff/debuff stat modifiers
- **State Machine**: `GameStateMachine` with validated transitions (MENU → PLAYING → PAUSED/LEVEL_UP/GAMEOVER)
- **Spatial Hashing**: `SpatialGrid` for efficient collision detection
- **DI via Context**: `PhysicsContext` for testable collision system

### Path Aliases
`@/*` maps to the project root (configured in `tsconfig.json` and `vite.config.ts`).

## Code Conventions

### TypeScript
- Strict mode with `noUncheckedIndexedAccess: true` - no `any` in app code (`any` allowed in test files)
- Use `type` over `interface` for consistency
- Use `type` imports: `import { type Foo } from './bar'` (enforced by ESLint)
- Prefix unused params with `_`

### Naming
- Services: `MyServiceClass` (class), `MyService` (exported singleton via `.getInstance()`)
- Components: `PascalCase.tsx`
- Hooks: `useMyHook.ts`
- Constants: `SCREAMING_SNAKE_CASE` in `config/` or `constants/`
- Config values: centralize "magic numbers" in `config/`, never hardcode in services

### File Organization
- `services/{category}/{ServiceName}.ts` - singleton logic
- `components/{feature}/{ComponentName}.tsx` - React views
- `hooks/use{Name}.ts` - React hooks bridging UI to engine
- `types/{domain}.ts` - type definitions
- `config/` - centralized game configuration
- `tests/` mirrors source structure for unit tests
- `e2e/` - Playwright E2E tests

## Testing

- Unit tests: `tests/**/*.test.ts(x)` - Vitest with jsdom, pool: forks
- E2E tests: `e2e/**/*.spec.ts` - Playwright (auto-starts dev server)
- Singletons must call `reset()` in `beforeEach` to isolate tests
- Coverage targets `services/**`, `components/**`, `factories/**`
- Pre-commit hooks (husky + lint-staged) auto-run: ESLint fix, Prettier, related Vitest tests
- Before PR: `npm run check:baseline` (runs typecheck + check:architecture + check:reset-coverage + lint + test + build)

## Commits

Conventional Commits enforced by commitlint: `feat:`, `fix:`, `perf:`, `test:`, `docs:`, `chore:`, etc. Optional scopes: `feat(auth): ...`

## Adding New Game Elements

### New Enemy Type
1. Define config in `config/EnemyRegistry.ts`
2. Add factory logic in `factories/EnemyFactory.ts`
3. Update `services/combat/SpawnSystem.ts` spawn logic
4. Register pool in `PoolManager.ts` if needed

### New Buff/Debuff
1. Create decorator in `services/patterns/decorators/buffs/` or `debuffs/`
2. Extend `BaseDecorator`, implement stat modifications
3. Wire into `BuffManager.addBuff()`/`addDebuff()`
4. Emit `buffApplied`/`buffExpired` events for UI

## Known Architectural Issues (history in `docs/archived/refactor-roadmap.md`)

The two issues previously tracked here are now **resolved in code** (verified 2026-06-24). Kept as guidance for related work:

1. **Reward divergence** — resolved. The client `sessions/verify` payload now includes `exitType`/`portalType`/`maxStreak` (`services/auth/GameSessionService.ts:256-258`), and `handleCashOut` builds a full `RewardPayload` (`hooks/useGameFlowController.ts:367-387`), so the Railway endpoint can reconcile. **Standing guidance:** `CoinService.creditCoins` still credits optimistically — don't add *more* optimistic credit paths; route new rewards through the verified submit path.
2. **DifficultyContext leakage** — resolved. `cycleFactor` is cleared via `difficultyContext.reset()` on `handleGameOver` (`useGameFlowController.ts:185`), `handleCashOut` (`:389`), `resetFlowState` (`:419`), `GameRuntime.ts:48/52`, and the `gameOver` EventBus listener (`DifficultyContext.ts:78`). The continue path calls `DifficultyManager.resetForCycleContinue()` *before* applying the new multiplier (`useGameFlowController.ts:396`), which resets `cycleFactor` to `1.0` (`LeverageStateProvider.ts:59-61`) and prevents compounding. **Standing guidance:** keep resetting `DifficultyContext` on every run-end path.

Also resolved: anti-cheat guardrails are back — two validator layers exist; prefer extending them over reintroducing optimistic trust:
- `services/gameplay/validators/` (`GameplayValidator`) — in-run gameplay sanity checks.
- `services/validators/` (`SessionValidator`, `rewardValidator`, `fieldRangeValidators`) — session/reward validation run by `GameSessionService` before the `sessions/verify` submit; `rewardValidator` cross-checks client reward vs `RewardCalculator` within tolerance.

> Note: `docs/archived/refactor-roadmap.md` is historical and still describes these as open against the old Supabase-edge-function backend. The backend has since moved to Railway (`/api/v1/sessions/verify`); treat that doc as history, not current state.

## Backend

- **Auth**: Railway-native (no Supabase). `services/auth/RailwayAuthService.ts` handles login/signup/OAuth; the API server issues and verifies JWTs (`railway-market-server/src/utils/railwayJwt.ts`, issuer `crypto-survivors-api`). The leftover `supabase/` directory is legacy and unused — not wired into the app or `package.json`.
- **Railway PostgreSQL**: All data tables (27 tables, 4 views, 10 functions). Schema in `railway-market-server/src/db/schema.sql`; migrations in `src/db/migrate.ts` (000–010, auto-applied on startup).
- **Railway API Server** (`railway-market-server/`): Stateless REST API — profile, sessions, wallet, leaderboard, telemetry, identities, meta, challenges, replays
- **Railway Market Aggregator** (`railway-market-aggregator/`): Stateful market pipeline — Binance/Coinbase WS → Indicator calc → SSE stream to clients + price_history/market_state DB writes + Cleanup cron. Deploy independently from API.
- **Deployment**: Railway auto-deploys on push to main. API Server and Market Aggregator are separate Railway services sharing the same Postgres.
- **Env vars**: `DATABASE_URL` (Railway PG), `API_JWT_SECRET` (auth middleware; also accepts `RAILWAY_JWT_SECRET`/`JWT_SECRET`), `VITE_RAILWAY_API_URL` (client-side API), `VITE_MARKET_AGGREGATOR_URL` (client-side SSE, optional — falls back to `VITE_RAILWAY_API_URL`)
