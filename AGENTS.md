# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Summary

**Crypto Survivors** is a real-time market-driven Vampire Survivors-style game. Live BTC/USD price data from Binance/Coinbase WebSockets dynamically adjusts difficulty, enemy behavior, and rewards. Built with React 19 + TypeScript 5.8 + Vite 6, targeting stable 60 FPS on mobile and desktop.

## Commands

```bash
# Development
npm run dev              # Vite dev server on port 3000
npm run build            # Production build (terser + anti-cheat obfuscation, no source maps)
npm run preview          # Serve production build locally

# Testing
npm run test             # Vitest unit tests (2100+)
npm run test:watch       # Vitest watch mode (TDD)
npx vitest run tests/services/SpawnSystem.test.ts  # Run a single test file
npm run test:coverage    # V8 coverage report (70%+ target)
npm run test:e2e         # Playwright E2E (chromium, firefox, webkit, mobile-chrome)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Playwright debug mode

# Code Quality
npm run lint             # ESLint (expect 0 errors, 0 warnings)
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier
npm run lint:ui          # UI consistency audit (typography, colors)
npm run security:check   # Dependency vulnerability scan

# Backend / Database
npm run supabase:gen     # Regenerate types/supabase.ts from live schema
npm run supabase:push    # Apply database migrations
npm run supabase:functions:deploy  # Deploy edge functions
npm run supabase:functions:serve   # Serve edge functions locally (no JWT)

# Market Server (separate project)
cd railway-market-server && npm run validate  # Typecheck + lint + build

# Deployment
npm run deploy           # git push origin main (Railway auto-deploys on push)
npm run railway:market:deploy  # Deploy market server

# Other
npm run train:ai         # Evolutionary NEAT trainer for enemy AI
```

## Architecture

### Layer Overview

```
Presentation (React components, HUD, screens)
    ↕ EventBus + useRef (never useState for 60fps data)
Game Engine (components/GameEngine.tsx — requestAnimationFrame loop)
    ↕
Service Layer (42+ singletons in services/)
    ↕
Data Layer (Zustand: settings/progress | Supabase: cloud | localStorage: offline)
```

### Service Layer Organization

Services live under `services/{category}/`. Key categories:
- `core/` — `EventBus`, `TimeService`, `MetricsService`
- `combat/` — `PhysicsSystem`, `SpawnSystem`, `PoolManager`, `SpatialGrid`
- `difficulty/` — `UnifiedDirector`, `DifficultyContext`, `DifficultyManager`, `FlowStateManager`
- `market/` — `MarketService` (WebSocket feeds), `MarketIndicatorService` (RSI, ATR, volume)
- `gameplay/` — `PortalSystem`, validators (planned)
- `auth/` — `GameSessionService`
- `system/` — `AntiCheatService`
- `patterns/decorators/` — `BuffManager`, `BaseDecorator`, buff/debuff subclasses
- `renderers/` — layer-specific canvas drawing logic

All services are singletons accessed via `ServiceClass.getInstance()`, with `export const MyService = MyServiceClass.getInstance()` at the bottom of each file.

### Market → Gameplay Data Flow

```
Binance/Coinbase WebSocket → MarketService → MarketIndicatorService (RSI, ATR, Volume)
    → UnifiedDirector (services/difficulty/UnifiedDirector.ts) + FlowStateManager
    → DifficultyContext → SpawnSystem, CombatSystem, BuffManager
```

`UnifiedDirector` is the runtime difficulty pipeline (replaces direct `DifficultyManager` calls in the hot path). `DifficultyContext` (`services/difficulty/DifficultyContext.ts`) holds mutable difficulty state and **must** be reset on game-over and cash-out, not just on `gameStart`.

### State Machine

`GameStateMachine` enforces validated transitions: `MENU → PLAYING → PAUSED / LEVEL_UP / GAMEOVER`. `App.tsx` handles screen routing driven by this machine.

### EventBus Pattern

Type-safe Observer across all systems. 40+ event types in `types/events.ts`.

```typescript
const unsub = EventBus.on('enemyKilled', (data) => { /* fully typed */ });
EventBus.emit('enemyKilled', { x, y, type: 'bear' });
// unsub() to clean up
```

### Zustand Store

Slice pattern in `stores/`. **Only** for settings, progress, and session tracking — never for game-loop data. Access via selectors: `useGameStore(selectGraphics)`.

## Critical Performance Rules

These are non-negotiable for maintaining 60 FPS:

1. **No `useState`/`setState` in the game loop** — use `useRef` or singleton services for anything updating at 60 FPS inside `GameEngine.tsx`.
2. **No allocations in the render loop** — no `new Object()`, `[].map()`, `[].filter()` inside the RAF loop. Use pre-allocated arrays.
3. **Object pooling required** — all high-frequency entities (bullets, enemies, particles) must use `PoolManager` (`services/combat/PoolManager.ts`) for O(1) alloc/dealloc with zero GC pressure. `PoolManager.getBullet()` / `PoolManager.releaseBullet(bullet)`.
4. **Spatial hashing for collision** — use `SpatialGrid` (`services/combat/SpatialGrid.ts`) for O(N/k) neighbor lookup. Never O(N²) collision loops.
5. **Pause-aware timing** — use `TimeService.setTimeout()` instead of native `setTimeout()` so timers freeze during pause/level-up.
6. **Canvas rendering** — use `requestAnimationFrame`, never `setInterval`. Batch draw calls to minimize context switches. Use `OffscreenCanvas` for background pre-rendering.

## Code Conventions

### TypeScript
- Strict mode with `noUncheckedIndexedAccess: true` — no `any` in app code (`any` is allowed in test files)
- Use `type` over `interface` for consistency
- Use type-only imports: `import { type Foo } from './bar'` (ESLint-enforced)
- Prefix unused parameters with `_`
- Discriminated unions for type narrowing: `type: 'bear' | 'bull'`

### Naming
- Services: `MyServiceClass` (class), `MyService` (exported singleton)
- Components: `PascalCase.tsx`
- Hooks: `useMyHook.ts`
- Constants: `SCREAMING_SNAKE_CASE` in `config/` or `constants/`
- Config values: centralize all "magic numbers" in `config/` — never hardcode in services

### Path Alias
`@/*` maps to the project root (configured in `tsconfig.json` and `vite.config.ts`).

## Testing

- **Unit/integration**: `tests/**/*.test.ts(x)` — Vitest with jsdom, pool: forks
- **E2E**: `e2e/**/*.spec.ts` — Playwright (auto-starts dev server); includes a11y (`@axe-core/playwright`), performance, and stability sub-suites
- **Singletons must call `reset()` in `beforeEach`** to isolate state between tests
- Coverage targets `services/**`, `components/**`, `factories/**`; global target is 70%+
- Pre-commit hooks (husky + lint-staged) auto-run: ESLint fix, Prettier, related Vitest tests
- CI baseline before PR: `npm run lint && npm run test && npm run build`

## Adding New Game Elements

### New Enemy Type
1. Define config in `config/EnemyRegistry.ts`
2. Add factory logic in `factories/EnemyFactory.ts`
3. Update `services/combat/SpawnSystem.ts` spawn logic
4. Register pool in `PoolManager.ts` if a new pool is needed

### New Buff/Debuff
1. Create decorator in `services/patterns/decorators/buffs/` or `debuffs/`
2. Extend `BaseDecorator`, implement `decorate(stats: IPlayerStats)`
3. Wire into `BuffManager.addBuff()` / `addDebuff()`
4. Emit `buffApplied` / `buffExpired` events for UI

## Debugging Tools

- **Admin Dashboard**: `Ctrl + Shift + A` — metrics, price analysis panels
- **Cheat Manager**: `F1` (dev mode only) — god mode, XP boost
- **EventBus tracing**: `EventBus.enableTracing()` to log all events in the console
- **Debug panels**: `DebugService.registerPanel('MyDebug', () => ({...}))`

## Known Architectural Issues

Three active issues to be aware of (see `docs/refactor-roadmap.md`):

1. **Reward divergence** — `CoinService.creditCoins` grants coins optimistically; the `verify-game` edge function cannot reconcile because the client payload omits `exitType`/`portalType`/`maxStreak`. Do not add more optimistic credit calls.
2. **DifficultyContext leakage** — `cycleFactor` is never cleared between cycles on death/continue, causing compounding difficulty. Call `difficultyContext.reset()` on `handleGameOver` and `handleCashOut`.
3. **Missing validators** — `GameplayValidator`, `ShopService`, and `GameplaySessionOrchestrator` were deleted. A replacement `services/gameplay/validators/` module is planned. Anti-cheat/marketplace guardrails are currently absent.

## Backend

- **Supabase**: PostgreSQL with RLS enabled on all tables, edge functions in `supabase/functions/`. Schema types are generated into `types/supabase.ts` via `npm run supabase:gen`. Use `services/auth/GameSessionService.ts` for authenticated sessions.
- **Railway Market Server**: Standalone WebSocket aggregator in `railway-market-server/` — a separate TypeScript project with its own `package.json`, `tsconfig.json`, and `eslint.config.mjs`. Validates with `npm run validate` inside that directory. Handles Binance/Coinbase feed aggregation and HMAC price verification.
- **Deployment**: Railway auto-deploys the frontend on push to `main`. Supabase migrations applied via `npm run supabase:push`.

## Commits

Conventional Commits enforced by commitlint: `feat:`, `fix:`, `perf:`, `test:`, `docs:`, `chore:`. Optional scopes are common: `feat(auth): ...`.
