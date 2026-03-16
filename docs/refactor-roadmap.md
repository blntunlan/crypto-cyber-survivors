# Gameplay Refactor Review & Roadmap

## Executive Summary
- Portal reward architecture now mixes optimistic UI credits with server-side validation; without deterministic inputs (kills, level, cycle metadata) the edge function cannot reconstruct true rewards, exposing griefing vectors and inconsistent payouts.
- Game loop orchestration keeps accruing state between cycles (e.g., `difficultyContext.cycleFactor`, auto `cycleComplete` events) but the React memo + lifecycle guards were not updated, so competitive runs can desync UI, analytics, and Supabase sessions.
- Removal of gameplay validation/Shop orchestration deleted last safety nets for storefront + anti-cheat layers, yet dependent UI/tests were not reintroduced, leaving dead code (e.g., Admin dashboard) and <5% coverage on core auth/services modules.

The roadmap below sequences stabilization work before further feature refactors.

## Critical Findings (ordered)

### 1. Reward Calculator divergence (components/GameEngine.tsx:738, services/gameplay/PortalSystemV2.ts:448, supabase/functions/verify-game/index.ts:169)
- Evidence: Portal extraction now calls `CoinService.creditCoins` immediately while PortalSystemV2 approximates kill counts via coin totals; Supabase function expects real kills/levels to recompute reward with shared calculator but payload omits `exitType`, `portalType`, `maxStreak` data from client session metadata.
- Impact: Client earns optimistic coins that may not match server credit; verification RPC caps at 50k but cannot penalize or reconcile unverified sessions, risking dupes and negative UX.
- Refactor goals:
  1. Define a single `RewardPayload` DTO emitted by GameEngine containing kills, level, pnl, streak, exitType, portalType, survival time, cycle metadata.
  2. Update PortalSystemV2 to track actual kill counts (subscribe to `enemyKilled` with unique ID) instead of raw coin heuristics and emit deterministic payloads.
  3. Ensure `CoinService.creditCoins` becomes a pure notifier in DEV and defers to GameSessionService submit path for PROD; guard optimistic balance behind feature flag.

### 2. GameEngine memo + cycle events (components/GameEngine.tsx:765, components/GameEngine.tsx:1149)
- Evidence: `GameEngine` now accepts `gameMode` prop but memo comparator ignores it; cycle timer emits `cycleComplete` internally while `useGameFlowController` also listens to EventBus for manual/cheat triggers.
- Impact: Switching between SURVIVAL/COMPETITIVE does not rebuild GameEngine, so cycle timers keep running in unintended modes; duplicate events can set `cycleData` twice causing inconsistent difficultyContext updates.
- Refactor goals:
  1. Include `gameMode` and `marketDataRef` diffing in memo comparator or replace memoization with explicit `useMemo` around expensive services.
  2. Gate auto cycle emitter behind `gameMode === COMPETITIVE` and ensure a single source (either GameEngine or flow controller) raises `cycleComplete`.
  3. Add vitest coverage for memo invalidation (tests/components/GameEngine.test.tsx) and cycle event sequencing (tests/hooks/useGameFlowController.test.ts).

### 3. DifficultyContext leakage (hooks/useGameFlowController.ts:285, services/difficulty/DifficultyContext.ts:91)
- Evidence: `difficultyContext.updateInputs({ cycleFactor })` runs on continue but `resetFlowState` never clears the multiplier; difficulty reset only fires on `gameReset`/`gameStart` events, which are skipped when chaining cycles.
- Impact: Players that continue successive cycles see compounding multipliers even after death/menu transitions, altering spawn pressure unpredictably.
- Refactor goals:
  1. Extend `difficultyContext.reset()` to run when `handleGameOver` resolves and when `handleCashOut` completes.
  2. Track current cycle multiplier in state returned by `useGameFlowController` so UI + analytics know what difficulty is active.
  3. Cover with regression tests (`tests/hooks/useCycleDecision.test.ts`) using `act` to avoid existing warnings.

### 4. Removed gameplay validators (services/gameplay/*.ts deletions)
- Evidence: `GameplayValidator`, `ShopService`, `GameplaySessionOrchestrator` and their tests were deleted but dependent docs/components (Shop UI, admin overlays) still reference them, while `docs/DEPRECATED_CLEANUP_TRACKER.md` lists TODOs.
- Impact: Anti-cheat + marketplace guardrails are gone; upcoming market runtime refactor (skills list) requires orchestrator to broker Supabase writes.
- Refactor goals:
  1. Extract minimal validation subset (player inventory sanity, coin spend limits) into a new `services/gameplay/validators/` module with unit tests.
  2. Align Supabase coin provider to emit audit events to `railway-market-server` so removal does not silently bypass ledgering.
  3. Document new flow in `docs/services/market-runtime.md` and add freshness tests to map new sources.

### 5. Coverage + dead modules (coverage/components/admin/AdminDashboard.tsx.html, coverage/services/auth/SupabaseAuthService.ts.html)
- Evidence: Admin dashboard and Supabase auth service show 0–4% coverage; App.tsx/GameEngine surpass 300 lines each with limited targeted tests.
- Impact: Refactors risk regressions without detection; lint/test pipelines already slow (~6k vitest cases).
- Refactor goals:
  1. Slice `App.tsx` into screen routers/ui shells (<300 lines) and move admin-only tooling behind code-split boundaries with lazy-loaded providers.
  2. Backfill tests around SupabaseAuthService handshake, especially when `UserSessionService` returns anonymous IDs.
  3. Use MSW handlers to satisfy Supabase RPC requests and eliminate coverage run warnings.

## Roadmap

### Phase 0 – Stabilize Economy Contracts (Week 1)
- Build `RewardPayload` schema shared between client/server (TypeScript + Deno module) and retrofit `CoinService`, `PortalSystemV2`, `verify-game` to use it.
- Add deterministic kill tracking to PortalSystemV2 and emit `portalExtraction` with both payout + payload; unit-test conversions to RewardCalculator.
- Tighten SupabaseCoinProvider to enqueue reward payloads for verification instead of optimistic credits; gate with feature flag.

### Phase 1 – Game Loop Consistency (Week 2)
- Fix `GameEngineShared` memo comparator and break God-component into sub-hooks (`useCycleTimer`, `usePortalWatcher`).
- Refactor `useGameFlowController` to own cycle event emission; GameEngine raises typed events (startCycle/endCycle) only.
- Reset `difficultyContext` on cash-out/continue pathways; add regression tests eliminating act warnings.

### Phase 2 – Validator & Anti-Cheat Revival (Week 3–4)
- Reintroduce gameplay validators as composable middleware (inventory, market orders, session replay) with Vitest coverage and freshness tests.
- Wire validators into `GameSessionService.submitSession` so every reward submission passes through the same checks.
- Document validator contract and incident response steps inside `docs/DEPRECATED_CLEANUP_TRACKER.md` (convert to living spec).

### Phase 3 – Coverage/Architecture Hygiene (Parallel, ongoing)
- Split `App.tsx`, `GameEngine.tsx`, and `hooks/useMarketData.ts` into domain modules with <300 lines each; adopt story-based tests for admin UI.
- Configure MSW handlers for Supabase endpoints to stop warning spam and improve auth service coverage above 60%.
- Address Vite build warnings by removing dual static/dynamic imports (UserSessionService, PerformanceTracker, DeviceProfiler, CombatResolutionService, MarketStateService, SupabaseAuthService) to improve chunking.

### Success Metrics
- Reward verification discrepancies reduced to zero (client optimistic coins == server ledger) validated via integration test capturing Supabase RPC payloads.
- Competitive runs produce a single `cycleComplete` per cycle and `difficultyContext.cycleFactor` resets on death, proven by tests.
- Restored validator suite covers 80%+ of gameplay orchestration paths; no more suppressed tests or missing freshness mappings.
- Critical god files (<4) remain above 70% statement coverage with <350 LOC per module.

## Open Questions
- Should coin payouts ever bypass verify-game for offline/dev? Propose explicit `ECONOMY_DEV_MODE` flag to avoid accidental PROD usage.
- PortalSystemV2 currently infers kills from coin drops; do we have authoritative kill counts elsewhere (e.g., CombatSystem events) to tap into?
- Are we deprecating AdminDashboard entirely? If so, mark component + routes as experimental to avoid refactoring effort.
