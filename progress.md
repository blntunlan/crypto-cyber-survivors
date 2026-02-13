Original prompt: gameplay ekranında screenshake levelup screen ve pause ekranına geçince dursun oyun devam ederken etki edecek şekilde ayarlaya bilir miyiz

2026-02-11
- Investigated screen shake flow in `components/GameEngine.tsx`, `hooks/useGameStatusEffects.ts`, and `services/renderers/GameRenderer.ts`.
- Root cause: volatility-based shake injection was running outside `PLAYING`, and renderer shake transform had no status gate.
- Implemented:
  - `GameEngine`: volatility shake now applies only when `status === GameStatus.PLAYING`.
  - `useGameStatusEffects`: entering `PAUSED` or `LEVEL_UP` now clears `shake` and `critFlash`.
  - `GameRenderer`: screen shake transform now only runs in `PLAYING`.
- Added/updated tests:
  - `tests/hooks/useGameStatusEffects.test.tsx` for PAUSED/LEVEL_UP visual reset behavior.
  - `tests/GameRenderer.test.ts` to assert no shake transform in PAUSED/LEVEL_UP.
- Verification:
  - `npx vitest run tests/GameRenderer.test.ts tests/hooks/useGameStatusEffects.test.tsx`
  - Result: 2/2 test files passed, 15/15 tests passed.
  - `npx eslint components/GameEngine.tsx hooks/useGameStatusEffects.ts services/renderers/GameRenderer.ts tests/GameRenderer.test.ts tests/hooks/useGameStatusEffects.test.tsx`
  - Result: no lint errors.

2026-02-11
- New request: Main menu frame looked too subtle against background.
- Updated `components/screens/MainMenu.tsx` panel styling (modern theme only):
  - stronger base border + darker panel background,
  - deeper drop shadow for separation,
  - added two non-interactive overlay borders (outer + inner) for clearer frame definition.
- Verification:
  - `npx vitest run tests/screens/MainMenu.test.tsx` -> 12/12 tests passed.
  - `npx eslint components/screens/MainMenu.tsx --fix` then `npx eslint components/screens/MainMenu.tsx` -> no lint errors.
  - Visual check via Playwright screenshot:
    - `output/mainmenu-panel-verify.png` (landing/tutorial bypassed; hub -> play flow) confirms panel frame is visibly stronger against background.

2026-02-11
- New request: make MainMenu sizing visually consistent with HubMenu at premium quality.
- Updated `components/screens/MainMenu.tsx` scale rhythm to align with Hub card density:
  - container spacing and panel padding increased,
  - section separators and vertical spacing normalized,
  - game mode cards made taller and typography increased,
  - leverage chip touch targets enlarged,
  - LONG/SHORT action blocks enlarged,
  - Settings button minimum height and spacing increased.
- Verification:
  - `npx eslint components/screens/MainMenu.tsx` -> clean.
  - `npx vitest run tests/screens/MainMenu.test.tsx` -> 12/12 tests passed.
  - Visual compare artifacts:
    - `output/hub-compare-after.png`
    - `output/mainmenu-compare-after.png`
    - confirms closer visual scale consistency between Hub and MainMenu.

2026-02-11
- New request: leverage label/options felt cramped and font-theme inconsistent in MainMenu.
- Updated leverage section in `components/screens/MainMenu.tsx`:
  - increased header row breathing room (`mb-1.5`),
  - switched modern leverage typography to `font-cyber` with calmer tracking/weight,
  - ensured retro stays `font-retro-pixel`,
  - increased leverage chip container gaps/padding (`gap-2`, `py-3.5`),
  - increased chip minimum width and adjusted text size for readability.
- Verification:
  - `npx eslint components/screens/MainMenu.tsx` -> clean.
  - `npx vitest run tests/screens/MainMenu.test.tsx` -> 12/12 passed.
  - Visual check: `output/mainmenu-leverage-after.png` confirms less crowded leverage area.

2026-02-11
- New request: apply these UI updates to mobile as well.
- Mobile-focused MainMenu refinements in `components/screens/MainMenu.tsx`:
  - reduced mobile outer padding and tightened top spacing to preserve vertical space,
  - reduced panel internal padding on mobile (`p-3.5`, keeps `sm:p-6` on larger screens),
  - leverage chips now use horizontal scroll on mobile (`flex-nowrap`, `overflow-x-auto`, `snap-x`) and wrap only from `sm` upwards,
  - leverage chip sizes tuned for mobile tap/readability without forcing dense wraps,
  - small gap adjustments in action button grid for mobile balance.
- Verification:
  - `npx eslint components/screens/MainMenu.tsx` -> clean (after `--fix`).
  - `npx vitest run tests/screens/MainMenu.test.tsx` -> 12/12 passed.
  - Mobile screenshot validation:
    - before: `output/mobile-mainmenu-before.png`
    - after: `output/mobile-mainmenu-after.png`
    - confirms improved leverage readability and better mobile spacing.

2026-02-11
- New request: fix mobile compatibility for Player Profile page.
- Updated `components/hub/PlayerProfile.tsx` for mobile:
  - modal now behaves like a mobile bottom sheet (`items-end`, `h-[92dvh]`, compact paddings),
  - header spacing and metadata typography tightened for small screens,
  - tabs made horizontally scrollable on mobile to prevent squashing,
  - content paddings/gaps reduced on mobile,
  - overview/stats/achievements cards and text sizes adjusted for small viewports.
- Layering fix:
  - profile modal z-index raised above toast notifications using `Z_LAYERS.TOAST + 1`.
- Verification:
  - `npx eslint components/hub/PlayerProfile.tsx` -> clean.
  - `npx vitest run tests/components/hub/HubMenu.test.tsx` -> 4/4 passed.
  - Mobile screenshots:
    - `output/mobile-playerprofile-overview.png`
  - `output/mobile-playerprofile-achievements.png`
  - `output/mobile-playerprofile-settings.png`
  - `output/mobile-playerprofile-overview-after.png`

2026-02-11
- New request: use Lucide icons for icons used in Player Profile flow.
- Updated `components/hub/PlayerProfile.tsx`:
  - added Lucide-based tab icons (overview/stats/achievements/settings),
  - added Lucide icon treatment for tester badge,
  - added Lucide icons for stat cards in the Stats tab.
- Updated `components/settings/ProfileSettings.tsx`:
  - replaced OAuth provider emoji icons with Lucide icons in linked accounts list.
- Updated `components/ui/UserAvatar.tsx`:
  - replaced provider badge glyph/emoji rendering with Lucide icons.
- Verification:
  - `npx eslint components/hub/PlayerProfile.tsx`
  - `npx eslint components/settings/ProfileSettings.tsx`
  - `npx eslint components/ui/UserAvatar.tsx`
  - `npx vitest run tests/components/hub/HubMenu.test.tsx`
  - Result: lint clean and tests passed (4/4).

2026-02-11
- New request: adapt mobile-styled PlayerProfile for desktop.
- Updated `components/hub/PlayerProfile.tsx` desktop responsiveness:
  - modal overlay now centers from `md` and uses larger desktop padding,
  - modal shell gets desktop-oriented dimensions (`md/lg` height + wider max width),
  - desktop spacing/typography increased in header, tabs, and content regions,
  - tabs remain scrollable on mobile but become full-width grid on desktop.
- Verification:
  - `npx eslint components/hub/PlayerProfile.tsx`
  - `npx vitest run tests/components/hub/HubMenu.test.tsx`
  - Result: lint clean and tests passed (4/4).

2026-02-11
- Bugfix request: desktop crashes when clicking PlayerProfile.
- Root cause:
  - `ProfileStatsService.getFullProfile()` can return `null` in some auth/session cases,
  - `PlayerProfile` content used non-null assertion (`profile!`) for overview/stats/achievements.
- Fix in `components/hub/PlayerProfile.tsx`:
  - added `loadError` state,
  - wrapped profile loading in try/catch/finally,
  - added null-safe fallback UI with Retry action,
  - removed unsafe `profile!` usage in tab rendering path.
- Verification:
  - `npx eslint components/hub/PlayerProfile.tsx`
  - `npx vitest run tests/components/hub/HubMenu.test.tsx`
  - Result: lint clean and tests passed (4/4).

2026-02-11
- New request: align desktop visual consistency (PlayerProfile + Hub/MainMenu/Settings/Pause/Liquidation language).
- Implemented consistency technique: shared modern surface tokens in `config/modernSurface.ts`:
  - unified overlay (`MODERN_SCREEN_OVERLAY`),
  - unified panel frame (`MODERN_PANEL_FRAME`),
  - unified double-border shell (`MODERN_PANEL_OUTER_BORDER`, `MODERN_PANEL_INNER_BORDER`),
  - unified top accent strip (`MODERN_PANEL_TOP_ACCENT`).
- Applied to:
  - `components/hub/PlayerProfile.tsx`
  - `components/screens/PauseMenu.tsx`
  - `components/settings/SettingsPanel.tsx`
  - `components/hud/LiquidationWarningOverlay.tsx` (modern typography/surface styling for warning text blocks).
- Updated UI sync expectation in `tests/screens/UISync.test.tsx` for new shared modern frame.
- Verification:
  - `npx eslint components/hub/PlayerProfile.tsx components/screens/PauseMenu.tsx components/settings/SettingsPanel.tsx components/hud/LiquidationWarningOverlay.tsx config/modernSurface.ts`
  - `npx eslint tests/screens/UISync.test.tsx`
  - `npx vitest run tests/screens/UISync.test.tsx tests/components/hub/HubMenu.test.tsx`
  - Result: lint clean, 9/9 tests passed.

2026-02-11
- Follow-up after multi-agent issue scan:
  - Fixed invalid Tailwind class composition in `components/screens/PauseMenu.tsx` run-stats grid.
  - Replaced broken interpolated class string (`md: grid ... gap-3${sizes.gap} ...`) with stable `cn(...)` composition.
- Verification:
  - `npx eslint components/screens/PauseMenu.tsx`
  - `npx vitest run tests/screens/UISync.test.tsx tests/screens/MainMenu.test.tsx`
  - `npm run lint:ui`
  - Result: lint clean, tests passed (17/17 for selected suites), UI audit still reports pre-existing project-wide warnings (81/100).

2026-02-11
- Domain fix pass (option 1 continuation): `LandingPage` + mobile controls + translation context typing.
- Updated `contexts/LanguageProvider.tsx`:
  - standardized `t(...)` return type to `string`,
  - preserved array-translation support by joining string arrays with newline (`\n`),
  - kept parameter interpolation for both string and array entries.
- Updated `components/screens/LandingPage.tsx`:
  - fixed framer-motion variant typing with `Variants`,
  - replaced string-widened motion `ease` in shared variants with typed bezier tuple,
  - replaced invalid `string -> string[]` casts with a `list(...)` parser using newline-split from `t(...)`,
  - reused parsed list arrays for roadmap and mode bullet lists.
- Updated mobile control helpers:
  - `components/mobile/DashButton.tsx`
  - `components/mobile/DragToMoveController.tsx`
  - hardened `hexToRgb(...)` against optional regex groups (`undefined`) to satisfy strict TS.
- Verification:
  - `npx eslint contexts/LanguageProvider.tsx components/screens/LandingPage.tsx components/mobile/DashButton.tsx components/mobile/DragToMoveController.tsx`
  - `npx tsc --noEmit 2>&1 | rg "components/mobile|components/screens/LandingPage|contexts/LanguageProvider"` (no matches)
  - `npx vitest run tests/components/hub/HubMenu.test.tsx tests/screens/MainMenu.test.tsx` (16/16 passed)
  - Global TS error count moved from `175` to `150` (remaining project-wide errors outside this domain).

2026-02-12
- New request: disable in-game damage feedback stacking and show floating damage on every hit.
- Updated `services/combat/physics/CollisionSystem.ts`:
  - switched bullet-hit feedback from stacked/flush model to immediate per-hit floating text,
  - kept legacy buffer-decay path only for backward compatibility cleanup,
  - moved crit feedback (audio + `critHit` event) to per-hit timing,
  - reset legacy damage buffer fields on each hit to prevent accumulation.
- Updated `tests/services/physics/CollisionSystem.test.ts`:
  - changed expectations from delayed-buffer behavior to immediate floating text behavior,
  - verified crit and lethal-hit paths still emit visual feedback.
- Verification:
  - `npx vitest run tests/services/physics/CollisionSystem.test.ts` (13/13 passed)
  - `npx vitest run tests/PhysicsSystem.test.ts` (16/16 passed)
  - `npx eslint services/combat/physics/CollisionSystem.ts tests/services/physics/CollisionSystem.test.ts` (clean)

2026-02-12
- New request: reduce frame-drop feel during super-crit streaks (adaptive hit-stop).
- Implemented adaptive super-crit hit-stop governor:
  - Added `services/gameplay/HitStopGovernor.ts`.
  - Behavior:
    - tracks super-crit rate in a rolling window,
    - keeps normal hit-stop when rate is low,
    - scales down hit-stop duration when burst rate exceeds threshold,
    - skips very-close consecutive super-crit hit-stops under burst pressure.
- Integrated in `components/GameEngine.tsx`:
  - `hitStop` listener now routes duration through governor,
  - chained hit-stop is capped with `GAME_ENGINE.HIT_STOP_CHAIN_CAP_MS`,
  - governor resets when leaving `PLAYING`.
- Event payload update:
  - `types/events.ts`: `HitStopEvent` now supports `isSuperCrit?: boolean`.
  - `services/combat/physics/CollisionSystem.ts`: emits `isSuperCrit` on `hitStop`.
  - `services/gameplay/DifficultyManager.ts`: explicit `isSuperCrit: false` for volatility shock hit-stop event.
- Added tuning constants in `constants.ts`:
  - `HIT_STOP_CHAIN_CAP_MS`
  - `SUPER_CRIT_HITSTOP_WINDOW_MS`
  - `SUPER_CRIT_HITSTOP_RATE_THRESHOLD`
  - `SUPER_CRIT_HITSTOP_MAX_OVERLOAD_RATE`
  - `SUPER_CRIT_HITSTOP_MIN_SCALE`
  - `SUPER_CRIT_HITSTOP_MIN_INTERVAL_MS`
  - `SUPER_CRIT_HITSTOP_MIN_DURATION_MS`
- Tests:
  - Added `tests/services/gameplay/HitStopGovernor.test.ts` (4 tests).
  - Updated `tests/services/physics/CollisionSystem.test.ts` import path + strict typing for new expectations.
- Verification:
  - `npx eslint components/GameEngine.tsx services/gameplay/HitStopGovernor.ts services/combat/physics/CollisionSystem.ts services/gameplay/DifficultyManager.ts tests/services/gameplay/HitStopGovernor.test.ts tests/services/physics/CollisionSystem.test.ts types/events.ts constants.ts` (clean)
  - `npx vitest run tests/services/gameplay/HitStopGovernor.test.ts tests/services/physics/CollisionSystem.test.ts` (17/17 passed)

2026-02-13
- New request continuation: execute UI consistency checks and fix failing z-index E2E assertions.
- Root causes identified in `e2e/zindex-stacking.spec.ts`:
  - In-game settings panel hides Theme section, so expecting `Visual Style` was incorrect.
  - Cheat key `4` no longer triggers game over (now sets luck in `CheatManager`).
- Updated `e2e/zindex-stacking.spec.ts`:
  - deterministic setup in `beforeEach` (`localStorage.clear()`, `?no-sw=true`, `game_lang=en`),
  - replaced brittle settings assertion with heading + visuals checks,
  - replaced game-over trigger from keyboard `4` to `window.GameHelpers.triggerGameOver()`.
- Verification:
  - `npx playwright test e2e/zindex-stacking.spec.ts --project=chromium` -> 4/4 passed.
  - `npx playwright test e2e/visual.spec.ts e2e/zindex-stacking.spec.ts --project=chromium` -> 13/13 passed.
- Note: full `npm run test:e2e` remains very long (468 tests) and timed out in earlier run window.

2026-02-13
- Market runtime/sync continuation: hardened Phase-6 queue reliability for larger runs and reconnect scenarios.
- Updated `services/market/sync/MarketSyncStore.ts`:
  - added `requeueInflight(maxAgeMs)` to recover stale `inflight` records back to `pending`.
- Updated `services/market/sync/MarketSyncQueue.ts`:
  - `flush()` now returns structured result metadata (`reason`, `acked`, `retried`, `runId`),
  - added stale `inflight` recovery before each flush,
  - constrained each flush payload to a single `runId` (prevents mixed-run batch ambiguity),
  - added `flushAll()` to drain multiple batches in one call (bounded by config),
  - made `flushAll()` wait/retry briefly when another flush is already in progress,
  - made auto-flush interval configurable via queue config.
- Updated `services/market/sync/MarketSyncClient.ts`:
  - added defensive validation to reject mixed `runId` records in a single batch before issuing network request.
- Updated session/recovery integrations:
  - `services/auth/GameSessionService.ts` now uses `flushAll()` before submit/clear and logs flush summary.
  - `services/core/ErrorRecoveryService.ts` now uses `flushAll()` on reconnect/recovery paths.
- Tests:
  - expanded `tests/services/market/MarketSyncQueue.test.ts` with:
    - success ack behavior,
    - retry scheduling,
    - multi-batch `flushAll` draining,
    - stale inflight recovery call,
    - single-run payload scoping.
  - added `tests/services/market/MarketSyncClient.test.ts` for endpoint/mixed-run/auth-header behavior.
  - added `tests/services/market/MarketSyncStore.test.ts` for inflight requeue behavior.
- Verification:
  - `npm run lint`
  - `npm run test -- tests/services/market/MarketSyncClient.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/ErrorRecoveryService.test.ts tests/services/auth/GameSessionService.test.ts`
  - `npm run build`
  - Result: all passing; existing Vite chunk/dynamic-import warnings remain unchanged.

2026-02-13
- Market runtime continuation: switched `runtime` mode toward worker-authoritative tick application in `useMarketData`.
- Updated `hooks/useMarketData.ts`:
  - added runtime pending tick buffer (`runtimePendingTickEntriesRef`) to correlate worker snapshot responses with emitted ticks,
  - added runtime market mapping helper (`createRuntimeMarketData`) to project `MarketRuntimeSnapshot` into game `MarketData`,
  - moved runtime event + sync queue emission into shared helper (`emitRuntimeArtifacts`),
  - changed `runtime` mode flow:
    - when worker is available, tick is queued and UI/event authority is applied on worker snapshot callback,
    - when worker is unavailable, falls back to local runtime compute with explicit warning,
  - preserved `dual` mode behavior as legacy-authoritative output with runtime metadata/events.
  - fixed worker-authority same-seq overwrite guard so authoritative snapshot can replace provisional tick state (`runtimeSeq > snapshot.seq` check).
- Updated/added tests around sync hardening:
  - `tests/services/market/MarketSyncClient.test.ts`
  - `tests/services/market/MarketSyncQueue.test.ts`
  - `tests/services/market/MarketSyncStore.test.ts`
  - adjusted service tests with queue `flushAll` mocking:
    - `tests/services/auth/GameSessionService.test.ts`
    - `tests/services/ErrorRecoveryService.test.ts`
- Verification:
  - `npm run lint`
  - `npm run test -- tests/hooks/useMarketData.test.ts tests/services/market/MarketRuntimeController.test.ts tests/services/market/MarketRuntimeWorker.test.ts tests/services/market/MarketCompute.test.ts tests/services/market/MarketSyncClient.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/ErrorRecoveryService.test.ts tests/services/auth/GameSessionService.test.ts`
  - `npm run build`
  - Result: passing; existing Vite dynamic-import/chunk warnings persist.

2026-02-13
- Difficulty pipeline alignment follow-up:
  - updated `services/difficulty/DifficultyContext.ts` to prefer runtime snapshot as MACD source-of-truth once runtime data is observed,
  - added runtime authority flag reset paths on `gameReset`, `reset()`, and history reset,
  - normalized runtime snapshot MACD into `MACDResult` shape (`value/signal/histogram`) for context consistency.
- Added targeted tests:
  - `tests/services/difficulty/DifficultyContext.test.ts`
    - indicator MACD fallback when runtime authority is absent,
    - runtime MACD persistence once runtime snapshot arrives,
    - reset path returning to indicator MACD source.
  - `tests/hooks/useMarketData.test.ts`
    - added runtime-mode worker authority test with mocked worker snapshot flow.
- Verification:
  - `npm run lint`
  - `npm run test -- tests/services/difficulty/DifficultyContext.test.ts tests/hooks/useMarketData.test.ts tests/services/market/MarketRuntimeController.test.ts tests/services/market/MarketRuntimeWorker.test.ts tests/services/market/MarketCompute.test.ts tests/services/market/MarketSyncClient.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/ErrorRecoveryService.test.ts tests/services/auth/GameSessionService.test.ts`
  - `npm run build`

2026-02-13
- Market runtime continuation (Phase-4 decoupling): removed indicator singleton dependency from game-loop spawn chain.
- Updated `components/GameEngine.tsx`:
  - removed per-frame `marketIndicatorService.update(...)` call,
  - passed runtime-aligned market signals (`rsi`, `rsiState`, `whaleTier`) into `SpawnSystem.update(...)`.
- Updated `services/combat/SpawnSystem.ts`:
  - removed `marketIndicatorService.getState()` usage,
  - added optional `marketSignals` input (`rsi`, `rsiState`, `whaleTier`),
  - resolved RSI state via provided state or hysteresis fallback,
  - computed enemy modifiers from RSI+position and forwarded them to pool enemy/whale creation,
  - reset RSI hysteresis cache on `reset()`.
- Updated pool contracts to accept runtime-provided RSI modifiers:
  - `services/interfaces/IPoolManager.ts`
  - `services/interfaces/ISpawnSystem.ts`
  - `services/combat/PoolManager.ts` (now uses passed modifier; defaults to neutral).
- Tests updated:
  - `tests/SpawnSystem.test.ts`
  - `tests/services/SpawnSystem.test.ts`
- Verification:
  - `npm run lint -- components/GameEngine.tsx services/combat/SpawnSystem.ts services/combat/PoolManager.ts services/interfaces/IPoolManager.ts services/interfaces/ISpawnSystem.ts tests/SpawnSystem.test.ts tests/services/SpawnSystem.test.ts`
  - `npm run test -- tests/SpawnSystem.test.ts tests/services/SpawnSystem.test.ts tests/services/PoolManager.test.ts tests/components/GameEngine.test.tsx`
  - `npm run test -- tests/hooks/useMarketData.test.ts tests/services/difficulty/DifficultyContext.test.ts tests/services/market/MarketRuntimeController.test.ts tests/services/market/MarketRuntimeWorker.test.ts tests/services/market/MarketCompute.test.ts tests/services/market/MarketSyncClient.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/ErrorRecoveryService.test.ts tests/services/auth/GameSessionService.test.ts tests/SpawnSystem.test.ts tests/services/SpawnSystem.test.ts tests/services/PoolManager.test.ts tests/components/GameEngine.test.tsx`
  - `npm run build`
  - Result: all passing; existing Vite dynamic-import/externalization warnings unchanged.

2026-02-13
- Market runtime continuation (Phase-5 incremental): removed direct indicator singleton reads from `DifficultyManager` and sourced market brain inputs from `DifficultyContext`.
- Updated `services/gameplay/DifficultyManager.ts`:
  - removed `marketIndicatorService` and `calculateMACDFactor` dependencies,
  - mapped `rsi`, `atrPercent`, `normalizedVolume`, and `macd` directly from `difficultyContext.getContext().inputs`,
  - added backward-compatible MACD extraction (`value` / legacy `macd`) with safe fallback,
  - preserved existing momentum/trend logic and GameMaster input shaping.
- Verification:
  - `npm run test -- tests/DifficultyManager.test.ts tests/DifficultyMomentum.test.ts tests/edge/DifficultyManager.test.ts tests/services/DifficultyManager.test.ts tests/services/LeverageDifficulty.test.ts tests/services/LeverageScaling.test.ts tests/BitcoinPnlDifficulty.test.ts tests/NewMechanics.test.ts tests/difficulty/DirectorAdapter.test.ts tests/services/difficulty/AIDirector.test.ts`
  - `npm run test -- tests/hooks/useMarketData.test.ts tests/services/difficulty/DifficultyContext.test.ts tests/services/market/MarketRuntimeController.test.ts tests/services/market/MarketRuntimeWorker.test.ts tests/services/market/MarketCompute.test.ts tests/services/market/MarketSyncClient.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/ErrorRecoveryService.test.ts tests/services/auth/GameSessionService.test.ts tests/SpawnSystem.test.ts tests/services/SpawnSystem.test.ts tests/services/PoolManager.test.ts tests/components/GameEngine.test.tsx tests/DifficultyManager.test.ts tests/DifficultyMomentum.test.ts tests/edge/DifficultyManager.test.ts tests/services/DifficultyManager.test.ts`
  - `npm run build`
  - Result: all passing; existing Vite dynamic-import/externalization warnings unchanged.

2026-02-13
- Market runtime continuation (Phase-5 incremental): removed direct market-indicator singleton reads from Director pipeline bridges.
- Updated `services/difficulty/DirectorAdapter.ts`:
  - removed `marketIndicatorService.getState()` dependency,
  - now builds `DirectorInput` market fields (`marketRSI`, `marketATRPercent`, `marketVolume`) from `difficultyContext.getContext().inputs`,
  - preserves existing blend behavior; `marketPriceChange` remains neutral fallback (`0`).
- Updated `services/difficulty/AIDirector.ts`:
  - removed `marketIndicatorService` and `calculateMACDFactor` dependencies,
  - now derives RSI/ATR/volume and MACD directly from `difficultyContext` inputs,
  - keeps output contract and update cadence unchanged.
- Verification:
  - `npm run test -- tests/difficulty/DirectorAdapter.test.ts tests/services/difficulty/AIDirector.test.ts tests/DifficultyManager.test.ts tests/DifficultyMomentum.test.ts tests/edge/DifficultyManager.test.ts tests/services/DifficultyManager.test.ts`
  - `npm run build`
  - Result: passing; existing Vite dynamic-import/externalization warnings unchanged.
2026-02-13
- Market runtime continuation (Phase-5 alignment): removed direct `marketIndicatorService` dependency from `DifficultyContext`.
- Updated `services/difficulty/DifficultyContext.ts`:
  - removed MACD fallback pull (`marketIndicatorService.getState()`),
  - added `clientIndicatorsUpdated` ingestion for RSI/ATR/volume/whale + MACD (`macdValue/signal/histogram`) when runtime authority is absent,
  - preserved runtime authority behavior by ignoring client/server indicator side-channel updates after `marketRuntimeSnapshot` is observed,
  - retained runtime snapshot dedupe + reset paths.
- Updated `types/events.ts`:
  - extended `ClientIndicatorsUpdatedEvent` with optional MACD fields (`macdValue`, `macdSignal`, `macdHistogram`).
- Updated `services/indicators/ClientIndicatorService.ts`:
  - included MACD values in emitted `clientIndicatorsUpdated` payload.
- Updated tests:
  - `tests/services/difficulty/DifficultyContext.test.ts` now validates client-indicator fallback, runtime authority lock, and post-reset fallback behavior.
- Market-sync robustness follow-up:
  - fixed Supabase realtime proxy mismatch by adding `channel(...)` passthrough in `services/supabase/client.ts` (resolved runtime `supabase.channel is not a function` path during `MarketStateService.init`).
- Verification:
  - `npx eslint services/difficulty/DifficultyContext.ts services/indicators/ClientIndicatorService.ts types/events.ts tests/services/difficulty/DifficultyContext.test.ts services/supabase/client.ts`
  - `npm run test -- tests/services/difficulty/DifficultyContext.test.ts tests/services/indicators/ClientIndicatorService.test.ts`
  - `npm run test -- tests/DifficultyManager.test.ts tests/DifficultyMomentum.test.ts tests/edge/DifficultyManager.test.ts tests/services/DifficultyManager.test.ts tests/difficulty/DirectorAdapter.test.ts tests/services/difficulty/AIDirector.test.ts`
  - `npm run test -- tests/services/supabase/client.test.ts tests/services/MarketStateService.test.ts`
- Playwright smoke (develop-web-game skill):
  - ran `web_game_playwright_client.js` against local Vite server with `action_payloads.json`.
  - artifacts: `output/market-sync-smoke/shot-0.png`, `output/market-sync-smoke/errors-0.json`.
  - confirmed previous `supabase.channel` console error is gone; remaining console errors are pre-existing landing-page markup/CSP warnings.
2026-02-13
- Market runtime continuation (Phase-4/5 cleanup): removed remaining `GameEngine` runtime-path dependency on `marketIndicatorService`.
- Updated `components/GameEngine.tsx`:
  - replaced indicator warmup with `ClientIndicatorService` warmup (`setPair`, `setPosition`, `warmup(history)`),
  - switched RSI/whale visual subscriptions from `rsiStateChanged` + `whaleTierChanged` to `clientIndicatorsUpdated`,
  - preserved whale-impact visual effect with tier-up detection.
- Updated tests:
  - `tests/components/GameEngine.test.tsx` now mocks `ClientIndicatorService` and asserts `clientIndicatorsUpdated` handling.
- Verification:
  - `npx eslint components/GameEngine.tsx tests/components/GameEngine.test.tsx`
  - `npm run test -- tests/components/GameEngine.test.tsx tests/services/difficulty/DifficultyContext.test.ts tests/services/indicators/ClientIndicatorService.test.ts`
  - `npm run test -- tests/hooks/useMarketData.test.ts tests/services/market/MarketRuntimeController.test.ts tests/services/market/MarketRuntimeWorker.test.ts tests/services/market/MarketCompute.test.ts tests/services/market/MarketSyncQueue.test.ts tests/services/market/MarketSyncStore.test.ts tests/services/market/MarketSyncClient.test.ts`
- Playwright smoke rerun:
  - command: `web_game_playwright_client.js` against local Vite with `action_payloads.json`.
  - artifacts: `output/market-sync-smoke/shot-0.png`, `output/market-sync-smoke/errors-0.json`.
  - result: no `supabase.channel` error; only pre-existing landing HTML nesting/CSP console warnings remain.
2026-02-13
- Verification pass (post GameEngine/client-indicator decoupling):
  - `npm run build` succeeded.
  - Existing Vite warnings about externalized modules and mixed static/dynamic imports remain unchanged.
