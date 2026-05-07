# Track: System Consolidation & Technical Debt Removal

## Objective
Unify fragmented systems, complete the transition to the phase-based game loop, and remove legacy/deprecated code to ensure architectural integrity and performance.

## Context & Background
The codebase currently contains multiple "ghost" systems:
1. **PortalSystem V1 vs V2:** Logic uses V2, but Rendering and Tests use V1.
2. **Incomplete Game Loop:** `GameLoopCoordinator` exists but most logic is still in `GameEngine.tsx`.
3. **Fragmented Progression:** `AchievementService` is empty, `MilestoneService` is active but disconnected.
4. **Identity Confusion:** "Legacy" terminology for active nickname systems.

## Implementation Plan

### Phase 1: Portal System Unification
- **Goal:** Eliminate PortalSystem V1 and move everything to V2.
- **Tasks:**
  - Update `GameRenderer.ts` to use `PortalSystemV2`.
  - Migrate all unit tests in `tests/services/PortalSystem.test.ts` to `tests/services/gameplay/PortalSystemV2.test.ts`.
  - Update any other services (e.g., `CombatSystem`) referencing V1.
  - Delete `services/gameplay/PortalSystem.ts`.

### Phase 2: Game Loop Decoupling
- **Goal:** Move logic from `GameEngine.tsx` into their respective `GameLoopPhase` classes.
- **Tasks:**
  - **SpawnPhase:** Move spawning logic and `SpawnSystem.update()` call.
  - **PhysicsPhase:** Move entity movement and collision resolution.
  - **EffectsPhase:** Move VFX decay and screen shake logic.
  - **MetricsPhase:** Move `ComboSystem`, `BuffManager`, and `MetricsService` updates.
  - **Refactor `GameEngine.tsx`:** Clean up the `update` loop to primarily call the coordinator.

### Phase 3: Progression & Identity Consolidation
- **Goal:** Functionalize achievements and clean up debt.
- **Tasks:**
  - Integrate `AchievementService` with `MilestoneService`.
  - Rename `LegacyStoredUser` to `PlayerProfile` or similar to reflect its active status.
  - Remove `services/core/Supabase.ts` and update callers to the modern client.

## Verification & Testing
- **Unit Tests:** Run `npm test` after each phase.
- **E2E Tests:** Run `npm run test:e2e` to ensure game flow (portals, level up) still works.
- **Performance:** Check `DevPerformanceOverlay` for stable FPS and reduced GC pressure.
