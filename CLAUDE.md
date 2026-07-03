# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Crypto Survivors is a real-time, market-driven Vampire Survivors game. Live BTC/USD price data (Binance/Coinbase, aggregated server-side) dynamically adjusts difficulty, enemy behavior, and rewards. Built with React 19 + TypeScript 5.8 + Vite 6, targeting a stable 60 FPS on mobile and desktop. Node ≥ 20. Dev server runs on port 3000 (host `0.0.0.0`).

## Repository Layout (multi-package)

This is **three independent packages**, each with its own `package.json`, `tsconfig.json`, ESLint config, and lockfile:

- **Root** — the React/Vite game frontend (all `services/`, `components/`, `hooks/`, etc.).
- **`railway-market-server/`** — stateless REST API: profile, sessions, wallet, leaderboard, telemetry, identities, meta, challenges, replays. **Owns the Postgres schema** (`src/db/schema.sql`); numbered migrations `000`–`012` are auto-applied on startup by `src/db/migrate.ts` (SQL files in `src/db/migrations/`).
- **`railway-market-aggregator/`** — stateful market pipeline: Binance/Coinbase WebSocket → indicator calc (RSI/ATR/Volume) → SSE stream to clients + `price_history`/`market_state` DB writes + cleanup cron. Deploys independently from the API server; both share the same Postgres.

Root `tsc --noEmit` and ESLint **exclude** both `railway-*` dirs and `scripts/` (different tsconfigs/runtime). But the root `npm test` **does** include `railway-market-server/test/**` (see `vitest.config.ts`) — a market-server test failure breaks the root suite. Each `railway-*` package has its own `npm run validate` (typecheck + lint + build), run in CI as `server-validate`.

## Commands

```bash
# Development
npm run dev              # sync-docs + generate-sitemap, then Vite dev server (--open, port 3000)
npm run build            # production build (terser minify + anti-cheat obfuscation, no sourcemaps)
npm run preview          # preview the production build
npm run start            # node server.js — production-style Express server (NOT a vite command)

# Testing (Vitest: jsdom, pool: forks, SKIP_INTEGRATION=true)
npm run test                                   # all unit/integration tests (incl. railway-market-server/test/**)
npx vitest run tests/services/SpawnSystem.test.ts   # run a single test file
npm run test:watch                             # TDD watch mode
npm run test:coverage                          # V8 coverage; targets services/**, components/**, factories/**
npm run test:e2e                               # Playwright (auto-starts `npx vite` webServer, reuse-first)
npm run test:e2e:ui | :debug | :headed         # Playwright UI / debug / headed
npm run test:e2e:beta:critical                 # smoke gate (chromium + mobile-chrome)

# Code quality / architecture gates
npm run lint | lint:fix | format | typecheck   # ESLint (expect 0/0) · Prettier · tsc --noEmit
npm run lint:ui                                # UI consistency audit (typography, colors)
npm run check:architecture                     # new singletons must be whitelisted or CI fails
npm run check:reset-coverage                   # every stateful singleton must be reset on game-reset
npm run check:baseline                         # THE full gate (see below) — run before any PR

# Backend / Deploy (Railway auto-deploys on push to main)
npm run deploy                   # git push origin main
npm run railway:deploy           # railway up (API server)
npm run railway:market:deploy    # deploy market server from railway-market-server/
```

`check:baseline` = `typecheck → check:architecture → check:reset-coverage → lint → test → build`. This is exactly what CI runs — do **not** substitute a manual `lint && test && build`; the architecture/reset-coverage guards are part of the gate.

## Architecture

### Singleton Service Pattern
All game logic lives in singleton services under `services/{category}/`, never in React state. Each singleton is `class FooClass { static getInstance() }` with `export const Foo = FooClass.getInstance()` at the bottom of the file. Services communicate through a strongly-typed `EventBus` (Observer Pattern) — 150+ event types in the `GameEvent` union (`types/events.ts`). `EventBus.on()` returns an unsubscribe function; always clean it up.

### Layering & Performance Rules (non-negotiable for 60 FPS)
```
Presentation (React components, HUD, screens)
    ↕ EventBus + useRef (never useState for 60fps data)
Game Engine (components/GameEngine.tsx — requestAnimationFrame loop)
    ↕
Service Layer (singletons: combat, difficulty, market, gameplay, renderers, …)
    ↕
Data Layer (Zustand for settings/progress only · Railway API for cloud/auth · localStorage offline)
```
1. **No `useState`/`setState` in the game loop** — use `useRef` or singleton services for anything updating at 60 FPS.
2. **No allocations in the RAF loop** — no `new Object()`, `[].map()`, `[].filter()` inside `GameEngine.tsx`; use pre-allocated arrays and object pools.
3. **Object pooling required** — high-frequency entities (bullets, enemies, particles) go through `PoolManager` (`services/combat/PoolManager.ts`) for O(1) alloc/dealloc with zero GC pressure.
4. **Spatial hashing for collision** — use `SpatialGrid` (`services/combat/SpatialGrid.ts`) for O(1) neighbor lookup. Never O(N²) collision loops.
5. **Pause-aware timing** — use `TimeService.setTimeout()` (`services/core/`), not native `setTimeout()`, so timers freeze during pause/level-up.
6. `requestAnimationFrame` only (never `setInterval`); batch canvas draw calls; `OffscreenCanvas` for background pre-render.

### Market → Gameplay Data Flow
```
Aggregator: Binance/Coinbase WS → server-computed indicators (RSI, ATR, Volume) → SSE stream (~1s)
    → SSEMarketService (services/market/) → UnifiedDirector (services/difficulty/) + FlowStateManager
    → DifficultyContext (services/difficulty/) → SpawnSystem, CombatSystem, BuffManager
```
`UnifiedDirector` is the runtime difficulty pipeline; it replaced direct `DifficultyManager` calls in the hot path. `DifficultyContext` holds the **mutable** difficulty state — it must be `reset()` on every run-end path (game-over, cash-out, continue), not just on `gameStart`. The legacy `cycleFactor` compounding leak is guarded by `tests/services/difficulty/DifficultyContextReset.test.ts`.

### Client ↔ Server (Railway-native — no Supabase)
```
Client --[fetch]--> API Server /api/v1/auth/*   (login/signup/OAuth/anonymous → issues Railway JWT)
Client --[SSE]----> Aggregator /api/v1/market/stream  (price + indicators, ~1s)
Client --[fetch]--> API Server /api/v1/*  (profile, sessions, wallet, leaderboard, telemetry, …)
Aggregator --[WS]--> Binance/Coinbase   ·   both Railway services --[pg]--> Railway Postgres
```
Auth is **fully Railway-native**: `services/auth/RailwayAuthService.ts` handles login/signup/OAuth; the API server signs JWTs (issuer `crypto-survivors-api`, audience `crypto-survivors-client`) verified in `railway-market-server/src/middleware/auth.ts` / `src/utils/railwayJwt.ts`. `services/api/RailwayClient.ts` auto-attaches the JWT (from `RailwayAuthTokenStore`) as `Authorization: Bearer`. `services/market/SSEMarketService.ts` is the EventSource client (`VITE_MARKET_AGGREGATOR_URL`, falls back to `VITE_RAILWAY_API_URL`).

> There is **no Supabase** anywhere: no `@supabase/supabase-js` dependency, no `supabase/` directory, no imports. Older docs (`README.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `docs/archived/refactor-roadmap.md`) still describe a Supabase backend — treat them as history.

### Cross-Run State Reset
Cross-run singleton state must reset through the canonical path — the `gameReset` EventBus event and `services/core/ResetOrchestrator.ts` — **not** via `GameEngine` mount/unmount hooks (those are dead at the MENU state). `check:reset-coverage` enforces that every stateful singleton participates. Prefer `GameRuntime` (`services/gameplay/GameRuntime.ts`) or explicit DI for per-session state instead of adding new singletons.

### Key Design Patterns
- **EventBus** (Observer): decoupled cross-system messaging via typed events.
- **Object Pool**: `PoolManager` for zero-GC entity recycling.
- **Decorator**: `BuffManager` with stackable `BaseDecorator` subclasses for buff/debuff stat modifiers.
- **State Machine**: `GameStateMachine` (`services/core/`) with validated transitions (MENU → PLAYING → PAUSED/LEVEL_UP/GAMEOVER, plus CYCLE_COMPLETE / DATA_DISCONNECTED).
- **Spatial Hashing**: `SpatialGrid` for collision.
- **DI via Context**: `PhysicsContext` for a testable collision system.

### Path Alias
`@/*` maps to the project root (configured identically in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`).

## Code Conventions

### TypeScript
- Strict mode with `noUncheckedIndexedAccess: true`. No `any` in app code (`any` is allowed in test files).
- Prefer `type` over `interface`. Use type-only imports: `import { type Foo } from './bar'` (ESLint-enforced).
- Use discriminated unions for narrowing (e.g. `type: 'bear' | 'bull'`). Prefix unused params with `_`.

### Naming & Organization
- Services: `FooClass` (class) / `Foo` (exported singleton). Components: `PascalCase.tsx`. Hooks: `useFoo.ts`. Constants: `SCREAMING_SNAKE_CASE`.
- **Centralize magic numbers in `config/`** — never hardcode tunable values in services.
- `services/{category}/` · `components/{feature}/` · `hooks/use{Name}.ts` · `types/{domain}.ts` · `tests/` mirrors source · `e2e/` for Playwright.

### ESLint relaxations
Game code may use bitwise ops, labels, and `++` in for-loops; `no-console` warns (only `warn`/`error` allowed). Test files relax `no-explicit-any`, `no-non-null-assertion`, and `no-console`.

## Testing

- Unit/integration: `tests/**/*.test.ts(x)` — Vitest, jsdom, `pool: 'forks'`. `tests/setup.ts` mocks Canvas, Howler, localStorage, `matchMedia`, `AudioContext`, `import.meta.env`, `requestAnimationFrame`, `WebSocket`, `fetch`, ResizeObserver. MSW handlers in `tests/mocks/handlers.ts`.
- Singletons with a `reset()` must call it in `beforeEach` to isolate tests; `check:reset-coverage` enforces coverage. Coverage targets `services/**`, `components/**`, `factories/**` (global 70%+).
- E2E: `e2e/**/*.spec.ts` — Playwright. `webServer.command` is `npx vite` (not `npm run dev`, so no doc-sync/sitemap side effects), `reuseExistingServer: true`. Committed `e2e/storage-state.json` + `e2e/global-setup.ts`. The `?no-sw=true` base URL disables the service worker. CI runs the smoke subset on chromium; the full matrix (chromium, mobile-chrome, firefox, webkit) runs locally.

## Guardrails

- **Conventional Commits** (commitlint): `feat:`, `fix:`, `perf:`, `test:`, `docs:`, `chore:`, … with optional scopes (`feat(auth): …`).
- **Pre-commit** (husky + lint-staged): `eslint --fix`, `prettier`, and `vitest related --run --pool=forks --maxWorkers=1 --bail=1` on changed `*.{ts,tsx}`; `ui-consistency-audit` on `components/**/*.tsx`; market-server changes run `scripts/run-market-typecheck.js`.
- **New singletons** must be added to `config/architecture/singleton-whitelist.json` or `check:architecture` fails CI. Reset-exempt singletons go in `config/architecture/reset-exempt.json`.
- **Anti-cheat — rewards are server-verified.** Two validator layers exist; extend them rather than reintroducing optimistic trust:
  - `services/gameplay/validators/` (`GameplayValidator`) — in-run gameplay sanity checks.
  - `services/validators/` (`SessionValidator`, `rewardValidator`, `fieldRangeValidators`) — run by `GameSessionService` (`services/auth/`) before the `POST /api/v1/sessions/verify` submit; `rewardValidator` cross-checks the client reward against `RewardCalculator` (`services/gameplay/`) within tolerance.
  - The verify payload carries `exitType`/`portalType`/`maxStreak` so the server can reconcile. `CoinService.creditCoins` still credits optimistically; when `VITE_VERIFY_COINS_ONLY=true` rewards are queued for the verified path instead. **Do not add new optimistic credit paths** — route new rewards through the verified submit.
- **Env vars**:
  - Frontend (`VITE_`): `VITE_RAILWAY_API_URL` (API), `VITE_MARKET_AGGREGATOR_URL` (SSE, optional — falls back to API URL), `VITE_MARKET_RUNTIME_MODE` (`legacy`|`dual`|`runtime`). Beta/prod must keep `VITE_VERIFY_COINS_ONLY=true` and `VITE_ANTI_CHEAT_SPEED_HACK_ENABLED=true`. Contract enforced by `config/architecture/BetaEnvContract.ts`.
  - Backend (no `VITE_` prefix, in `railway-market-server/.env`): `DATABASE_URL`, `API_JWT_SECRET` (auth middleware also accepts `RAILWAY_JWT_SECRET`/`JWT_SECRET`).

## Adding Game Elements

**New enemy type**: config in `config/EnemyRegistry.ts` → factory logic in `factories/EnemyFactory.ts` → spawn logic in `services/combat/SpawnSystem.ts` → register a pool in `PoolManager.ts` if needed.

**New buff/debuff**: create a decorator in `services/patterns/decorators/buffs/` or `debuffs/` extending `BaseDecorator` → implement stat modifications → wire into `BuffManager.addBuff()`/`addDebuff()` → emit `buffApplied`/`buffExpired` for UI.

## Debug Tools

- `Ctrl+Shift+A` — Analytics Dashboard (beta metrics, errors, devices)
- `Ctrl+Shift+D` — Admin Dashboard (config, price analysis, difficulty, spawn)
- `Ctrl+Shift+V` — Preview / VFX Lab (effects, assets, sounds)
- `F1` — Cheat Manager (dev mode only)
- `EventBus.enableTracing()` — log all event emissions
- `DebugService.registerPanel('Name', () => ({ … }))` — add a custom debug pane

Shortcut wiring lives in `hooks/useDevShortcuts.ts`.

## Repo Conventions Note

`conductor/` holds agent workflow specs, styleguides, and the product/tech-stack overview used by automation. This file and `AGENTS.md` are the source of truth for backend/auth; if `README.md` or `.github/copilot-instructions.md` ever drift on those topics, prefer this file.
