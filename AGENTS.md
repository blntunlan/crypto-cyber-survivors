# AGENTS.md

Guidance for AI agents working in the **Crypto Survivors** repository. Verified against config and source on 2026-08-16.

## Project

Real-time market-driven Vampire Survivors–style game. Live BTC/USD price feeds dynamically adjust difficulty, enemy behavior, and rewards. React 19 + TypeScript 5.8 + Vite 6, targeting stable 60 FPS on mobile and desktop. Node ≥ 20.

## Commands

```bash
# Dev / build (root)
npm run dev          # sync-docs + generate-sitemap + vite --open  (port 3000, host 0.0.0.0)
npm run build        # production: terser obfuscation, no source maps, assets dir renamed /a/
npm run preview      # vite preview (built output)
npm run start        # node server.js — production-style Express server (NOT a vite command)

# Tests (Vitest, jsdom, pool: forks)
npm run test                              # runs ALL tests incl. railway-market-server/test/**
npx vitest run tests/services/Foo.test.ts # single file
npm run test:watch                        # TDD mode
npm run test:coverage                     # V8 coverage; targets services/**, components/**, factories/**
npm run test:audit                        # test-suite structure audit

# E2E (Playwright)
npm run test:e2e                          # auto-starts `npx vite` webServer (reuse-first), ?no-sw=true baseURL
npm run test:e2e:ui | test:e2e:debug | test:e2e:headed
npm run test:e2e:beta:critical            # smoke gate (chromium + mobile-chrome)
npm run test:e2e:triage                   # run-e2e-triage.mjs
npm run test:e2e:ui-contract              # Chromium visual gate: 1440×900 + 390×844, both skins
npm run test:e2e:ui-contract:update       # explicit baseline refresh; never use in ordinary CI

# Code quality / gates
npm run lint | lint:fix | format | typecheck | lint:ui | check:ui-contract
npm run check:architecture                # new singletons must be in config/architecture/singleton-whitelist.json or CI fails
npm run check:reset-coverage              # every singleton with reset() must have coverage
npm run security:check

npm run check:baseline                    # THE full gate: typecheck → architecture → reset coverage → event contract → UI contract → director manifest → lint → test → build
                                          # (this is what CI runs — do not substitute lint+test+build)

# Deploy
npm run deploy                # git push origin main (Railway auto-deploys frontend)
npm run railway:deploy        # railway up (API server)
npm run railway:market:deploy # deploy from railway-market-server/
```

## Multi-Package Layout

Three independent packages — each has its own `package.json`, `tsconfig.json`, ESLint config, and lockfile:

- **Root** — the React/Vite game frontend.
- **`railway-market-server/`** — stateless REST API (profile, sessions, wallet, leaderboard, telemetry). Owns the Postgres schema in `src/db/schema.sql`. Numbered migrations run automatically on startup via `src/db/migrate.ts` (000–017, inlined SQL in `migrate.ts`). `npm run validate` (typecheck + lint + build) inside the dir.
- **`railway-market-aggregator/`** — stateful market pipeline: Binance/Coinbase WS → Indicators → SSE stream to clients + `price_history`/`market_state` DB writes + cleanup cron. `npm run validate` inside the dir.

Root `tsc --noEmit` and ESLint **exclude** both `railway-*` dirs and `scripts/` — they use different tsconfigs/runtime (Deno-style functions historically). The root `npm test` **does** include `railway-market-server/test/**` (see `vitest.config.ts`), so a market-server test failure breaks the root suite. CI runs `server-validate` for both `railway-*` packages.

## Backend & Data Flow

**Railway-native — no Supabase.** There is no `@supabase/supabase-js` dependency and no `supabase/` directory. Auth (login/signup/OAuth/anonymous) is handled by `services/auth/RailwayAuthService.ts`; the API server issues and verifies JWTs (issuer `crypto-survivors-api`, audience `crypto-survivors-client`).

**Railway Postgres** holds all game data. Schema in `railway-market-server/src/db/schema.sql`; numbered migrations `000`–`017` auto-apply on startup via `src/db/migrate.ts`.

```
Client --[fetch]--> API Server /api/v1/auth/*  (login/signup/OAuth/anonymous → Railway JWT)
Client --[SSE]----> Market Aggregator /api/v1/market/stream  (price + indicators, ~1s)
Client --[fetch]--> API Server /api/v1/*  (profile, sessions, wallet, leaderboard, telemetry)
Aggregator --[WS]--> Binance/Coinbase   ·   API server + aggregator share the same Postgres
```

- `services/api/RailwayClient.ts` — HTTP client, auto-attaches the Railway JWT (from `RailwayAuthTokenStore`) as `Authorization: Bearer`.
- `services/market/SSEMarketService.ts` — EventSource; reads `VITE_MARKET_AGGREGATOR_URL` and falls back to `VITE_RAILWAY_API_URL`.
- Two Railway services (API server + aggregator) share the same Postgres and deploy independently.

Market → gameplay: WS → Aggregator (server-computed RSI/ATR/Volume) → SSE → `SSEMarketService` → `ExperienceDirector` (services/director/, via `CurrentDifficultyRuntimeAdapter`) + `FlowStateManager` → `DifficultyContext` → SpawnSystem / CombatSystem / BuffManager.

## Architecture

- Layered: Presentation (React + `useRef`, never `useState` for 60fps data) ↔ `GameEngine.tsx` (`requestAnimationFrame` loop) ↔ singleton service layer ↔ data layer (Zustand for settings/progress only, Railway API for cloud, localStorage offline).
- Services live under `services/{category}/` (core, combat, difficulty, market, gameplay, auth, system, renderers, patterns/decorators, etc.). Each singleton: `class FooClass { static getInstance() }` and `export const Foo = FooClass.getInstance()` at file bottom.
- `EventBus` — type-safe Observer across systems; 100+ event types in `types/events.ts`. `on()` returns an unsubscribe; always clean up.
- `GameStateMachine` enforces `MENU → PLAYING → PAUSED / LEVEL_UP / GAMEOVER`.
- Runtime difficulty is managed by `ExperienceDirector` (`services/director/`) wrapped by `CurrentDifficultyRuntimeAdapter` (`services/difficulty/runtime/`) under the default `current` mode of the 3-mode runtime migration (`current` | `shadow` | `modular`). `CoreGameplayLoop` produces pacing juice rather than difficulty multipliers. `DifficultyContext` (`services/difficulty/DifficultyContext.ts`) holds mutable difficulty state and **must be `reset()` on game-over, cash-out, and continue** — see handlers in `hooks/useGameFlowController.ts`. The legacy `cycleFactor`-leak regression is guarded by `tests/services/difficulty/DifficultyContextReset.test.ts`.
- `@/*` path alias maps to the project root (tsconfig + vite.config + vitest.config).

## Performance Rules (non-negotiable for 60 FPS)

1. No `useState`/`setState` in the game loop — use `useRef` or singleton services inside `GameEngine.tsx`.
2. No allocations in the RAF loop — no `new Object()`, `[].map()`, `[].filter()`; use pre-allocated arrays.
3. Object pooling required for high-frequency entities (bullets, enemies, particles) via `services/combat/PoolManager.ts` (`getBullet()` / `releaseBullet()`).
4. `SpatialGrid` for collisions (`services/combat/SpatialGrid.ts`) — never O(N²) loops.
5. Pause-aware timing — drive timers from TimeService (`getGameTime()` / `getDeltaTime()`), not native `setTimeout()` (timers must freeze during pause/level-up).
6. `requestAnimationFrame` only, never `setInterval`; batch canvas draw calls; `OffscreenCanvas` for background pre-render.

## Code Conventions

- TS strict + `noUncheckedIndexedAccess: true`; no `any` in app code (allowed in tests). `type` over `interface`. Type-only imports enforced: `import { type Foo } from './bar'`. Prefix unused params with `_`.
- Discriminated unions for narrowing (e.g. `type: 'bear' | 'bull'`).
- Naming: `FooClass` (class) / `Foo` (exported singleton) · `PascalCase.tsx` components · `useFoo.ts` hooks · `SCREAMING_SNAKE_CASE` constants. Centralize all magic numbers in `config/` — never hardcode in services.
- ESLint relaxation specifics: bitwise, labels, and `++` in for-loops are allowed for game code; `no-console` warns (allowed: `warn`, `error`).
- Test files relax `no-explicit-any`, `no-non-null-assertion`, `no-console`.

## Production UI Contract

- Player-facing UI composes semantic tokens → themed primitives → structural components → shared patterns → screens. Admin, debug, performance, preview-lab and vfx-lab are exempt.
- Use `components/themed/` primitives for actions, fields, text and surfaces. Use `components/ui/` structural components once a layout repeats. Do not add direct `isRetro` presentation branches to production components; skin resolution belongs to the themed layer.
- `className` on themed primitives is layout-only: flow, grid/flex, sizing, positioning, overflow and order. Do not override colors, radius, shadows, typography, padding, border appearance or motion; add a typed variant instead.
- Use `lucide-react` for navigation/utility icons and `CardIcons` for game or brand content. Keep one primary CTA per surface, 44px targets, visible focus and reduced-motion support.
- `npm run check:ui-contract` is a hard gate. Legacy debt needs an owner, reason, rule list and expiry in `config/ui-contract/legacy-allowlist.json`; exemptions are temporary and only shrink.
- UI work must not add React state or allocations to HUD/requestAnimationFrame paths.

## Testing Quirks

- Unit/integration: `tests/**/*.test.ts(x)` — Vitest, jsdom, `pool: 'forks'`, `SKIP_INTEGRATION=true` injected via config. Setup in `tests/setup.ts` mocks Canvas, Howler, localStorage, `matchMedia`, `AudioContext`, `import.meta.env`, `requestAnimationFrame`, `WebSocket`, `fetch`, ResizeObserver. MSW handlers in `tests/mocks/handlers.ts`.
- E2E: `e2e/**/*.spec.ts` — Playwright. `webServer.command` is `npx vite` (not `npm run dev`, so no doc-sync/sitemap side effects). `reuseExistingServer: true`. Committed `e2e/storage-state.json` + `e2e/global-setup.ts`. `?no-sw=true` base URL disables the service worker. CI only runs the `@smoke` subset on chromium; full matrix (`chromium`, `mobile-chrome`, `firefox`, `webkit`) locally. `test:e2e:ui-contract` runs the committed critical-flow screenshots on Chromium; baseline writes require the explicit `:update` command.
- Singletons with `reset()` must call it in `beforeEach` — `check:reset-coverage` enforces coverage. Coverage targets `services/**`, `components/**`, `factories/**` via V8 (no hard threshold configured in `vitest.config.ts`).

## Workflow & Architecture Guardrails

- **Conventional Commits** enforced by commitlint (`feat:`, `fix:`, `perf:`, `test:`, `docs:`, `chore:`; optional scopes like `feat(auth):`).
- **Pre-commit** (husky + lint-staged): eslint --fix, prettier, `vitest related --run --pool=forks --maxWorkers=1 --bail=1` on changed `*.{ts,tsx}`, `check:ui-contract` on production UI. Market-server changes run `scripts/run-market-typecheck.js`.
- **Pre-push**: re-runs `npm run build`; if `railway-market-server/` changed, installs deps there and runs typecheck + build.
- **New singletons** must be added to `config/architecture/singleton-whitelist.json` or `check:architecture` fails CI. Prefer `GameRuntime` or explicit DI for session state instead of new singletons.
- **Anti-cheat**: extend `services/gameplay/validators/` (`GameplayValidator`, actively used by `MetaProgressionService` / `InventoryService`) — do **not** reintroduce optimistic `CoinService.creditCoins` reward calls; rewards are server-verified via `POST /api/v1/sessions/verify` (`railway-market-server/src/routes/sessions.ts`), which now consumes `exitType`/`portalType`/`maxStreak`.
- **Env**: `VITE_MARKET_RUNTIME_MODE` (`legacy`|`dual`|`runtime`) toggles the market-runtime authority path. Beta/prod must keep `VITE_VERIFY_COINS_ONLY=true` and `VITE_ANTI_CHEAT_SPEED_HACK_ENABLED=true`. Backend secrets (no `VITE_` prefix) live in `railway-market-server/.env`, not the frontend service.

## Adding Game Elements

**New enemy**: define config in `config/EnemyRegistry.ts` → factory in `factories/EnemyFactory.ts` → update `services/combat/SpawnSystem.ts` → register a pool in `PoolManager.ts` if needed.

**New buff/debuff**: create a decorator in `services/patterns/decorators/buffs/` or `debuffs/` extending `BaseDecorator` → implement stat modifications → wire into `BuffManager.addBuff()`/`addDebuff()` → emit `buffApplied`/`buffExpired` events for UI.

## Debugging Tools

- Analytics Dashboard: `Ctrl + Shift + A` (beta metrics, errors, devices).
- Admin Dashboard: `Ctrl + Shift + D` (config, price analysis, difficulty, spawn).
- Preview Lab: `Ctrl + Shift + V` (VFX + Assets + Sounds).
- Cheat Manager: `F1` (dev mode only).
- EventBus tracing: `EventBus.enableTracing()`.
- Debug snapshots & tools: `DebugService.captureSnapshot()` (or `window.gameDebug` in dev console).
