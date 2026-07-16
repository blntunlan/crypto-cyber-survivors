# Modular Difficulty Runtime Implementation Plan

> **Status:** approved design, ready for execution review
> Owner: Core Gameplay
> Created: 2026-07-15

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented difficulty control with one modular, versioned `RuntimeDifficultySnapshot` authority that is deterministic, traceable, safe under degraded inputs, and independently reversible through configuration.

**Architecture:** A non-singleton difficulty runtime owns a pre-allocated inbox, pure domain managers, atomic commit policy, trace ring buffer, and a snapshot composer. `DifficultyPhase` is the only simulation-boundary caller; it selects a current adapter, shadow comparison, or modular authority through one difficulty-mode resolver and sends one phase decision to all consumers.

**Tech Stack:** React 19, TypeScript 5.8 strict, Vite 6, Vitest/jsdom/forks, existing EventBus, canonical market frames, `requestAnimationFrame` game loop.

## Global Constraints

- Do not write production behavior before its dedicated failing Vitest assertion has been run and observed failing.
- Preserve existing unrelated worktree changes; modify only files listed by these tasks and their direct test/doc companions.
- Evolve `types/runtimeDifficulty.ts` in place; no second public difficulty snapshot type is permitted.
- `VITE_DIFFICULTY_RUNTIME_MODE=current|shadow|modular` is the only difficulty-authority selector; it is independent of `VITE_MARKET_RUNTIME_MODE`.
- Managers receive explicit input only. They do not import EventBus, React, stores, wall-clock APIs, `GameEngine`, `DifficultyManager`, or `UnifiedDirector`.
- `DifficultyPhase` receives simulation time only from `TickContext.clock`; seconds drive durations and staleness, while `frame` identifies commit boundaries and `validFromTick`.
- Event handlers mutate only pre-allocated inbox state. They never calculate a domain decision, spawn, mutate enemy stats, grant rewards, or update React state.
- Keep committed snapshots recursively read-only, numeric fields finite and range-validated, trace storage fixed-capacity, and hot-path arrays/objects pre-allocated.
- Add no new singleton. If a later task proves one unavoidable, update `config/architecture/singleton-whitelist.json` and its reset coverage in the same task.
- Do not change server-verified economy rewards; client difficulty can expose bounded XP, gem, loot-opportunity, mercy, and presentation decisions only.
- Do not create Git commits unless the user explicitly requests them.
- Mirror every updated `docs/` file to `public/docs/`, update both navigation files, and finish with `npm run check:baseline`.

---

## File Structure

- `types/runtimeDifficulty.ts` — canonical public, recursively read-only snapshot and nested public summaries.
- `types/marketCanonical.ts` — canonical frame provenance, including the preserved upstream source sequence.
- `types/events.ts` — typed `difficultyRunInitialized` and `difficultySnapshotCommitted` payloads plus revision-tagged compatibility events.
- `config/difficulty/DifficultyRuntimeConfig.ts` — versioned ranges, reason/clamp catalogs, telemetry capacity, inbox windows, failure grace, and shadow tolerances.
- `config/directorRuntime.ts` and `services/director/DirectorRuntimeMode.ts` — sole parsing and planning path for `current`, `shadow`, and `modular` modes.
- `services/difficulty/runtime/contracts.ts` — internal explicit manager inputs, staged decisions, phase decision, and replay event contracts.
- `services/difficulty/runtime/DifficultyInputInbox.ts` — fixed-memory coalescing, revision vector, world sample, lifecycle, and copied market-frame storage.
- `services/difficulty/runtime/DifficultyEventBridge.ts` — only EventBus-aware adapter; normalizes source events into the inbox and unsubscribes exactly once.
- `services/difficulty/runtime/managers/*.ts` — market, player, position, pacing, threat, recovery, and encounter managers with no hidden reads.
- `services/difficulty/runtime/DifficultySnapshotComposer.ts` — final mapping, validation, and immutable snapshot creation.
- `services/difficulty/runtime/DifficultyDecisionTraceRing.ts` — fixed-capacity revision and decision-ID trace lookup.
- `services/difficulty/runtime/DifficultyRuntimeOrchestrator.ts` — deterministic dirty-manager order, staged failure policy, commit, and trace emission.
- `services/difficulty/runtime/CurrentDifficultyRuntimeAdapter.ts` — wraps the current director path during `current`/`shadow` without letting it remain in `GameEngine`.
- `services/difficulty/runtime/DifficultyV2CompatibilityAdapter.ts` — pure snapshot-to-legacy-hook/event mapper.
- `services/gameplay/GameRuntime.ts`, `services/gameplay/phases/DifficultyPhase.ts`, and `components/GameEngine.tsx` — runtime ownership and the single phase boundary.
- `services/director/SpawnPlanBuilder.ts`, `services/combat/SpawnExecutor.ts`, and `services/gameplay/phases/SpawnPhase.ts` — one same-revision spawn decision and execution path.
- `services/presentation/PresentationDirector.ts`, `hooks/useDifficultyV2.ts`, `services/lootbox/LootboxService.ts`, and `services/gameplay/PortalSystemV2.ts` — snapshot consumers and temporary compatibility migration.
- `tests/services/difficulty/runtime/*.test.ts` — contract, inbox, manager, composer, orchestrator, replay, fallback, lifecycle, and performance tests.
- `tests/services/gameplay/DifficultyPhase.test.ts`, `tests/services/gameplay/GameRuntimeDependencyAudit.test.ts`, `tests/services/director/DirectorRuntimeConfig.test.ts`, `tests/hooks/useDifficultyV2.test.tsx` — boundary and compatibility coverage.
- `tests/golden/fixtures/modular-difficulty-shadow.v1.json` and `tests/golden/fixtures/modular-difficulty-approved-drift.v1.json` — versioned shadow scenarios and approved drift.
- `docs/reports/MODULAR_DIFFICULTY_RUNTIME_SHADOW.md` — shadow evidence, approving revision, and promotion decision.

## Task 1: Lock the Public Contract and Rollout Mode

**Files:**
- Modify: `types/runtimeDifficulty.ts`
- Modify: `types/marketCanonical.ts`
- Modify: `types/events.ts`
- Create: `config/difficulty/DifficultyRuntimeConfig.ts`
- Modify: `services/director/DirectorRuntimeMode.ts`
- Modify: `config/directorRuntime.ts`
- Modify: `tests/services/director/DirectorRuntimeConfig.test.ts`
- Create: `tests/services/difficulty/runtime/RuntimeDifficultyContract.test.ts`

**Interfaces:**
- Produces `RuntimeDifficultySnapshot`, `DecisionQuality`, `DifficultyRuntimeMode`, `DirectorRuntimePlan`, `getDirectorRuntimeConfig`, `DIFFICULTY_RUNTIME_CONFIG`, `difficultyRunInitialized`, and `difficultySnapshotCommitted`.
- Later tasks consume `RuntimeDifficultySnapshot['meta']`, `RuntimeDifficultySnapshot['spawn']`, `RuntimeDifficultySnapshot['trace']`, and `DirectorRuntimePlan` unchanged.

- [ ] **Step 1: Write the contract and mode tests**

```typescript
import { describe, expect, it } from 'vitest';
import { getDirectorRuntimeConfig } from '../../../config/directorRuntime';
import { createNeutralRuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';

describe('runtime difficulty public contract', () => {
  it('creates a recursively read-only neutral snapshot with registered metadata', () => {
    const snapshot = createNeutralRuntimeDifficultySnapshot({
      tick: 12,
      inputRevision: 4,
    });

    expect(snapshot.meta).toMatchObject({
      revision: 0,
      validFromTick: 12,
      inputRevision: 4,
      quality: 'NEUTRAL',
    });
    expect(snapshot.enemy.healthMultiplier).toBe(1);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.trace)).toBe(true);
  });

  it.each([
    ['current', 'current', true, false, false],
    ['shadow', 'shadow', true, true, false],
    ['modular', 'modular', false, true, true],
    ['invalid', 'current', true, false, false],
  ] as const)(
    'resolves %s without consulting market runtime mode',
    (rawMode, mode, runsCurrentAdapter, runsModularShadow, appliesModularSnapshot) => {
      expect(getDirectorRuntimeConfig(rawMode)).toMatchObject({
        mode,
        runsCurrentAdapter,
        runsModularShadow,
        appliesModularSnapshot,
      });
    }
  );
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/RuntimeDifficultyContract.test.ts tests/services/director/DirectorRuntimeConfig.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `createNeutralRuntimeDifficultySnapshot` and the lower-case mode contract do not exist.

- [ ] **Step 3: Implement the canonical types, reason catalogs, and mode resolver**

Implement these exact exported contracts, keeping all numeric validation and neutral values in `DIFFICULTY_RUNTIME_CONFIG`:

```typescript
export const DIFFICULTY_RUNTIME_MODES = ['current', 'shadow', 'modular'] as const;
export type DifficultyRuntimeMode = (typeof DIFFICULTY_RUNTIME_MODES)[number];

export type DirectorRuntimePlan = {
  mode: DifficultyRuntimeMode;
  runsCurrentAdapter: boolean;
  runsModularShadow: boolean;
  appliesModularSnapshot: boolean;
};

export type DifficultySnapshotCommittedEvent = {
  snapshot: RuntimeDifficultySnapshot;
};

export type DifficultyRunInitializedEvent = {
  runId: string;
  seed: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
};

export interface CanonicalMarketFrame extends CanonicalMarketPayload {
  revision: number;
  sequence: number;
  sourceSequence: number;
  sourceTimestamp: number;
  receivedAt: number;
  quality: MarketFrameQuality;
}

export const getDirectorRuntimeConfig = (
  rawMode: string | undefined = import.meta.env.VITE_DIFFICULTY_RUNTIME_MODE
): DirectorRuntimePlan => resolveDirectorRuntimePlan(parseDifficultyRuntimeMode(rawMode));
```

`types/runtimeDifficulty.ts` must export the complete approved snapshot from the design, `ReadonlyDeep`, all nested summaries, `createNeutralRuntimeDifficultySnapshot`, and `assertRuntimeDifficultySnapshot`. The assertion must reject non-finite values, values outside the configuration-owned ranges, unregistered reason/clamp codes, non-monotonic revision metadata, and mutable public objects. Add the two event names and their typed payloads to both `GameEvent` and `EventDataMap`; append `sourceSnapshotRevision` to the existing compatibility event payloads.

- [ ] **Step 4: Re-run the focused contract suite**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/RuntimeDifficultyContract.test.ts tests/services/director/DirectorRuntimeConfig.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with `current`, `shadow`, `modular`, invalid fallback, immutable neutral snapshot, and typed-event assertions green.

## Task 2: Build the Inbox and Event Bridge

**Files:**
- Create: `services/difficulty/runtime/contracts.ts`
- Create: `services/difficulty/runtime/DifficultyInputInbox.ts`
- Create: `services/difficulty/runtime/DifficultyEventBridge.ts`
- Modify: `services/core/GameStateManager.ts`
- Modify: `hooks/useGameFlowController.ts`
- Create: `tests/services/difficulty/runtime/DifficultyInputInbox.test.ts`
- Create: `tests/services/difficulty/runtime/DifficultyEventBridge.test.ts`

**Interfaces:**
- Produces `DifficultyInputInbox`, `DifficultyEventBridge`, `DifficultyRuntimeInputView`, `DifficultyWorldPressure`, and `DifficultyRunConstants`.
- `DifficultyRuntimeOrchestrator.commitIfNeeded(input: DifficultyRuntimeInputView, tick: number, elapsedSeconds: number)` consumes only the drained immutable view.

- [ ] **Step 1: Write failing inbox and bridge tests**

```typescript
it('coalesces same-tick player events and advances each affected revision once', () => {
  const inbox = new DifficultyInputInbox();
  inbox.recordPlayerHit({ damage: 5, remainingHp: 95 }, 10);
  inbox.recordPlayerHit({ damage: 4, remainingHp: 91 }, 10);

  const view = inbox.drain(10);

  expect(view.revisions).toEqual({ market: 0, player: 1, run: 0, world: 0 });
  expect(view.player.damageTaken).toBe(9);
});

it('makes a post-boundary canonical frame eligible only on the next tick', () => {
  const inbox = new DifficultyInputInbox();
  inbox.recordMarketFrame(createFrame({ sourceSequence: 4 }), 11);

  expect(inbox.drain(10).market.frame).toBeNull();
  expect(inbox.drain(11).market.frame?.sourceSequence).toBe(4);
});

it('unsubscribes every EventBus handler exactly once on dispose', () => {
  const bridge = new DifficultyEventBridge(new DifficultyInputInbox(), () => 20);
  bridge.start();
  bridge.dispose();
  bridge.dispose();

  expect(EventBus.listenerCount('playerHit')).toBe(0);
  expect(EventBus.listenerCount('canonicalMarketFrame')).toBe(0);
});
```

- [ ] **Step 2: Run the inbox tests and verify the expected failure**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultyInputInbox.test.ts tests/services/difficulty/runtime/DifficultyEventBridge.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the runtime inbox and bridge modules do not exist.

- [ ] **Step 3: Implement deterministic copied input collection**

Implement these public methods without EventBus imports in `DifficultyInputInbox`:

```typescript
public initializeRun(constants: DifficultyRunConstants, eligibleFromTick: number): void;
public recordMarketFrame(frame: Readonly<CanonicalMarketFrame>, eligibleFromTick: number): void;
public recordPlayerHit(event: PlayerHitEvent, eligibleFromTick: number): void;
public recordEnemyKilled(eligibleFromTick: number): void;
public recordDash(event: EventDataMap['playerDash'], eligibleFromTick: number): void;
public recordLevel(level: number, eligibleFromTick: number): void;
public recordWorldPressure(sample: DifficultyWorldPressure, tick: number): void;
public drain(tick: number): DifficultyRuntimeInputView;
public reset(): void;
public resetForCycleContinue(): void;
```

Copy canonical frame fields into one pre-allocated internal frame; preserve upstream `sourceSequence` separately from local arrival `sequence`; ignore source sequences not greater than the accepted source sequence. The bridge subscribes only to `canonicalMarketFrame`, `playerHit`, `enemyKilled`, `playerDash`, `bulletFired`, `levelUpComplete`, `gameReset`, `gameOver`, `cycleDecisionMade`, and the new `difficultyRunInitialized`; each callback calls an inbox method with `getCurrentTick() + 1`. `GameStateManager` emits `difficultyRunInitialized` only after entry and liquidation prices are locked. `useGameFlowController` emits the cycle lifecycle event instead of directly letting a manager retain prior-cycle telemetry.

- [ ] **Step 4: Re-run focused inbox tests**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultyInputInbox.test.ts tests/services/difficulty/runtime/DifficultyEventBridge.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with copied frames, source-sequence rejection, deterministic coalescing, lifecycle reset, and idempotent disposal proven.

## Task 3: Adapt Market, Position, and Pacing Managers

**Files:**
- Create: `services/difficulty/runtime/managers/MarketRegimeManager.ts`
- Create: `services/difficulty/runtime/managers/PositionRiskManager.ts`
- Create: `services/difficulty/runtime/managers/PacingManager.ts`
- Modify: `services/market/regime/MarketRegimeEngine.ts`
- Modify: `services/director/EncounterPlanner.ts`
- Create: `tests/services/difficulty/runtime/MarketRegimeManager.test.ts`
- Create: `tests/services/difficulty/runtime/PositionRiskManager.test.ts`
- Create: `tests/services/difficulty/runtime/PacingManager.test.ts`

**Interfaces:**
- Consumes `DifficultyRuntimeInputView` slices and `DIFFICULTY_RUNTIME_CONFIG`.
- Produces `DomainDecision<MarketDecisionSummary>`, `DomainDecision<PositionRiskSummary>`, and `DomainDecision<PacingDecisionSummary>`.

- [ ] **Step 1: Write failing manager tests**

```typescript
it('decays stale market pressure without changing healthy pacing output', () => {
  const market = new MarketRegimeManager();
  const pacing = new PacingManager();

  const live = market.update(createMarketInput({ quality: 'LIVE', volatility: 1 }));
  const stale = market.update(createMarketInput({ quality: 'STALE', volatility: 1 }));

  expect(stale.value.pressure).toBeLessThanOrEqual(live.value.pressure);
  expect(pacing.update({ elapsedSeconds: 180 }).quality).toBe('LIVE');
});

it('keeps long and short risk alignment opposite for the same upward price move', () => {
  const manager = new PositionRiskManager();
  const long = manager.update(createPositionInput({ side: 'LONG', currentPrice: 110 }));
  manager.reset();
  const short = manager.update(createPositionInput({ side: 'SHORT', currentPrice: 110 }));

  expect(long.value.alignment).toBeGreaterThan(0);
  expect(short.value.alignment).toBeLessThan(0);
});
```

- [ ] **Step 2: Run the three manager tests and verify they fail**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/MarketRegimeManager.test.ts tests/services/difficulty/runtime/PositionRiskManager.test.ts tests/services/difficulty/runtime/PacingManager.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the explicit runtime managers do not exist.

- [ ] **Step 3: Implement pure wrappers and repair timing units**

`MarketRegimeManager` wraps `MarketRegimeEngine` with an explicit copied frame input and maps stale quality to non-increasing pressure plus no new market encounter request. `PositionRiskManager` wraps `PositionRiskModel` with immutable `DifficultyRunConstants` and simulation `deltaSeconds`. `PacingManager` uses `SurvivalCurve` and the versioned pacing ranges; it accepts only `{ elapsedSeconds }` and returns seconds, never frame ticks.

Replace `eventTelegraphEndsAtTick` usage with `eventTelegraphEndsAtElapsedSeconds` throughout the adapted encounter path. `EncounterPlanner` must compare elapsed seconds with elapsed-second durations, while the final snapshot still receives `validFromTick` only from the orchestrator.

- [ ] **Step 4: Re-run the manager suite**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/MarketRegimeManager.test.ts tests/services/difficulty/runtime/PositionRiskManager.test.ts tests/services/difficulty/runtime/PacingManager.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with neutral, stale, deterministic, reset, long/short, and elapsed-seconds assertions green.

## Task 4: Adapt Player, Budget, Recovery, and Encounter Managers

**Files:**
- Create: `services/difficulty/runtime/managers/PlayerAdaptationManager.ts`
- Create: `services/difficulty/runtime/managers/ThreatBudgetManager.ts`
- Create: `services/difficulty/runtime/managers/RecoveryBudgetManager.ts`
- Create: `services/difficulty/runtime/managers/EncounterManager.ts`
- Modify: `services/director/ThreatBudgetAllocator.ts`
- Modify: `services/director/AdvantageAllocator.ts`
- Modify: `services/director/EncounterPlanner.ts`
- Create: `tests/services/difficulty/runtime/PlayerAdaptationManager.test.ts`
- Create: `tests/services/difficulty/runtime/BudgetAndEncounterManagers.test.ts`

**Interfaces:**
- `PlayerAdaptationManager.update(input: PlayerAdaptationInput): DomainDecision<PlayerDecisionSummary>`.
- `ThreatBudgetManager.reserve(input: ThreatReservationInput): ThreatReservation` is the sole credit reservation API.
- `RecoveryBudgetManager.update(input: RecoveryBudgetInput): DomainDecision<RecoveryDecisionSummary>`.
- `EncounterManager.update(input: EncounterManagerInput): DomainDecision<EncounterDecisionSummary>`.

- [ ] **Step 1: Write failing telemetry and safety tests**

```typescript
it('uses real rolling damage, kill, and dash telemetry instead of frame placeholders', () => {
  const manager = new PlayerAdaptationManager();
  const decision = manager.update(createPlayerInput({
    damageTaken: 24,
    killsInWindow: 30,
    dashesInWindow: 4,
    windowSeconds: 60,
  }));

  expect(decision.value.recentDamagePressure).toBeGreaterThan(0);
  expect(decision.value.killsPerMinute).toBe(30);
  expect(decision.value.mobilityUsage).toBeGreaterThan(0);
});

it('applies mercy before reserving threat credits during stressed volatility', () => {
  const threat = new ThreatBudgetManager();
  const recovery = new RecoveryBudgetManager();
  const relief = recovery.update(createRecoveryInput({ recoveryNeed: 1 }));
  const reservation = threat.reserve(createThreatInput({
    requestedPressure: 1,
    maximumPressure: 1,
    mercy: relief.value.mercy,
  }));

  expect(reservation.finalPressure).toBeLessThan(1);
  expect(reservation.reservedCredits).toBeLessThanOrEqual(reservation.availableCredits);
});
```

- [ ] **Step 2: Run the manager tests and verify they fail**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/PlayerAdaptationManager.test.ts tests/services/difficulty/runtime/BudgetAndEncounterManagers.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the runtime manager contracts and reservation path do not exist.

- [ ] **Step 3: Implement allocation-free adaptation and atomic reservation**

Build `PlayerAdaptationManager` from explicit inbox windows, `IntensityModel`, and an adapted `PlayerPowerAnalyzer`; do not import `FlowStateManager`. Missing or invalid telemetry returns a neutral non-punitive decision with a registered reason code. Reserve credits once in `ThreatBudgetManager` after pacing and mercy bounds are applied, and copy the reservation into `SpawnDecisionSummary`; neither `SpawnPlanBuilder` nor `SpawnExecutor` may call `spend()`.

`EncounterManager` receives the reserved budget, market classification, pacing, and elapsed seconds. It emits telegraph/active/recovery/cooldown decisions and folds encounter stat modifiers into the same spawn directives used for health, damage, speed, behavior tier, and intent.

- [ ] **Step 4: Re-run the player/budget/encounter suite**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/PlayerAdaptationManager.test.ts tests/services/difficulty/runtime/BudgetAndEncounterManagers.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with real telemetry, neutral fallback, mercy cap, one reservation, and encounter modifier coverage.

## Task 5: Compose Atomic Snapshots, Traces, and Replay

**Files:**
- Create: `services/difficulty/runtime/DifficultyDecisionTraceRing.ts`
- Create: `services/difficulty/runtime/DifficultySnapshotComposer.ts`
- Create: `services/difficulty/runtime/DifficultyRuntimeOrchestrator.ts`
- Create: `tests/services/difficulty/runtime/DifficultySnapshotComposer.test.ts`
- Create: `tests/services/difficulty/runtime/DifficultyRuntimeOrchestrator.test.ts`
- Create: `tests/services/difficulty/runtime/DifficultyReplay.test.ts`

**Interfaces:**
- Produces `DifficultyRuntimeOrchestrator.commitIfNeeded(input, tick, elapsedSeconds): RuntimeCommitResult`.
- `RuntimeCommitResult` contains `committed: boolean`, `snapshot: RuntimeDifficultySnapshot`, and `reason: 'UNCHANGED' | 'CADENCE' | 'DIRTY' | 'LIFECYCLE' | 'FALLBACK'`.

- [ ] **Step 1: Write failing composition, fallback, and replay tests**

```typescript
it('retains the entire previous snapshot during a manager grace failure', () => {
  const runtime = createRuntimeWithThrowingMarketManager();
  const first = runtime.commitIfNeeded(createView({ marketRevision: 1 }), 10, 10).snapshot;
  const second = runtime.commitIfNeeded(createView({ marketRevision: 2 }), 11, 11).snapshot;

  expect(second).toBe(first);
  expect(second.meta.revision).toBe(1);
});

it('commits a degraded neutral-domain snapshot after grace expiry', () => {
  const runtime = createRuntimeWithThrowingMarketManager({ graceTicks: 0 });
  const result = runtime.commitIfNeeded(createView({ marketRevision: 2 }), 11, 11);

  expect(result.snapshot.meta.quality).toBe('DEGRADED');
  expect(result.snapshot.trace.fallbackCodes).toContain('MARKET_NEUTRAL_FALLBACK');
});

it('replays permuted same-tick events and 30/60/120-FPS clocks to the same hashes', () => {
  expect(runReplay(events, 1 / 30)).toEqual(runReplay(permutedEvents, 1 / 60));
  expect(runReplay(events, 1 / 120)).toEqual(runReplay(events, 1 / 60));
});
```

- [ ] **Step 2: Run the composer and replay tests and verify failure**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultySnapshotComposer.test.ts tests/services/difficulty/runtime/DifficultyRuntimeOrchestrator.test.ts tests/services/difficulty/runtime/DifficultyReplay.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because no modular orchestrator, trace ring, or atomic snapshot composer exists.

- [ ] **Step 3: Implement deterministic commit policy**

The orchestrator must update dirty managers in this order: lifecycle/validity, player safety, player adaptation, pacing, market and position, threat/recovery reservation, encounter, composer. Each manager stages state and output; only a successful full manager set promotes staged state. During a per-manager grace failure, retain the exact previous committed snapshot and do not promote any staged state. After grace expiry, use that manager's neutral decision against one coherent input revision vector and mark the new snapshot `DEGRADED`.

`DifficultySnapshotComposer` validates all fields, creates one recursively frozen snapshot, assigns monotonically increasing revision and deterministic `decisionId`, emits one `difficultySnapshotCommitted` event, and writes one compact trace object into the fixed-capacity ring. The ring supports `getByRevision(revision)` and `getByDecisionId(decisionId)` without unbounded history.

- [ ] **Step 4: Re-run composition and replay coverage**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultySnapshotComposer.test.ts tests/services/difficulty/runtime/DifficultyRuntimeOrchestrator.test.ts tests/services/difficulty/runtime/DifficultyReplay.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with revision monotonicity, immutable public snapshots, atomic fallback, reason catalogs, ordering invariance, replay hash, and FPS parity assertions green.

## Task 6: Move Authority to DifficultyPhase Behind the Current Adapter

**Files:**
- Create: `services/difficulty/runtime/CurrentDifficultyRuntimeAdapter.ts`
- Create: `services/difficulty/runtime/DifficultyRuntime.ts`
- Modify: `services/gameplay/GameRuntime.ts`
- Modify: `services/gameplay/phases/DifficultyPhase.ts`
- Modify: `services/gameplay/phases/SpawnPhase.ts`
- Modify: `components/GameEngine.tsx`
- Create: `tests/services/gameplay/DifficultyPhase.test.ts`
- Modify: `tests/services/gameplay/GameRuntimeDependencyAudit.test.ts`

**Interfaces:**
- `DifficultyRuntime.commitAtBoundary(input: DifficultyPhaseInput): DifficultyPhaseDecision` owns mode selection.
- `createDifficultyRuntime(mode: DifficultyRuntimeMode): DifficultyRuntime` constructs the non-singleton runtime, and `DifficultyRuntime.getInputSnapshot(): DifficultyRuntimeInputView` exposes test-only read-only diagnostics.
- `DifficultyPhaseDecision` contains `authority`, `activeSpawnPlan`, `activeRevision`, `snapshot: RuntimeDifficultySnapshot | null`, and `shadowSnapshot: RuntimeDifficultySnapshot | null`.

- [ ] **Step 1: Write failing phase-boundary tests**

```typescript
it('runs current authority through DifficultyPhase and removes the pre-phase engine call', () => {
  const runtime = createGameRuntime({ difficultyMode: 'current' });
  const phase = new DifficultyPhase(runtime.difficultyRuntime);
  const result = phase.execute(createPhaseInput({ frame: 40, elapsedMs: 4_000 }));

  expect(result.shared?.difficultyPhaseDecision).toMatchObject({
    authority: 'current',
    activeRevision: expect.any(Number),
  });
  expect(readFileSync('components/GameEngine.tsx', 'utf8')).not.toContain(
    'directorSpawnOrchestratorRef.current.update'
  );
});

it('runs the modular snapshot only as a non-authoritative comparison in shadow mode', () => {
  const decision = createDifficultyRuntime('shadow').commitAtBoundary(createPhaseInput());
  expect(decision.snapshot).toBeNull();
  expect(decision.shadowSnapshot).not.toBeNull();
});
```

- [ ] **Step 2: Run phase and dependency tests and verify failure**

Run:

```powershell
npx vitest run tests/services/gameplay/DifficultyPhase.test.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `DifficultyPhase` only updates `DifficultyContext` and `GameEngine` calls `DirectorSpawnOrchestrator` directly.

- [ ] **Step 3: Implement the one phase decision path**

`GameRuntime` constructs one non-singleton `DifficultyRuntime` with inbox, bridge, current adapter, modular orchestrator, and compatibility adapter. `DifficultyPhase.execute(input)` records bounded world pressure, builds an explicit phase input from `TickContext`, calls `commitAtBoundary`, and writes `difficultyPhaseDecision`, `spawnPlan`, and the current snapshot revision to shared state. `SpawnPhase` reads only the shared active plan.

Remove the old `directorSpawnInputRef`, direct `DirectorSpawnOrchestrator.update`, director preview write, and director-driven presentation block from `GameEngine`. Preserve run seed initialization by passing the same run ID and seed through `difficultyRunInitialized`; retain `lootCacheSystem.beginRun` at the lifecycle boundary rather than in a direct director branch.

- [ ] **Step 4: Re-run phase-boundary coverage**

Run:

```powershell
npx vitest run tests/services/gameplay/DifficultyPhase.test.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with current/shadow/modular selection, single phase decision, no direct engine authority, and no `DifficultyManager` runtime import.

## Task 7: Migrate Spawn, Stats, Rewards, and Presentation Consumers

**Files:**
- Modify: `services/director/SpawnPlanBuilder.ts`
- Modify: `services/combat/SpawnExecutor.ts`
- Modify: `services/presentation/PresentationDirector.ts`
- Create: `services/difficulty/runtime/DifficultyV2CompatibilityAdapter.ts`
- Modify: `hooks/useDifficultyV2.ts`
- Modify: `services/lootbox/LootboxService.ts`
- Modify: `services/gameplay/PortalSystemV2.ts`
- Modify: `services/combat/physics/CollectionSystem.ts`
- Create: `tests/services/difficulty/runtime/DifficultyV2CompatibilityAdapter.test.ts`
- Modify: `tests/services/director/SpawnPlanExecutor.test.ts`
- Modify: `tests/hooks/useDifficultyV2.test.tsx`

**Interfaces:**
- `SpawnPlanBuilder.build(input: RuntimeSpawnPlanBuildInput): SpawnPlan` consumes only snapshot summary, revision, seed, and world capacity.
- `DifficultyV2CompatibilityAdapter.toOutput(snapshot: RuntimeDifficultySnapshot): DifficultyOutputV2` and `emitTransitions(previous, current): void` preserve temporary UI contracts.

- [ ] **Step 1: Write failing same-revision consumer tests**

```typescript
it('expands and executes one snapshot revision with its enemy multipliers', () => {
  const snapshot = createRuntimeSnapshot({ revision: 9, healthMultiplier: 1.3 });
  const plan = new SpawnPlanBuilder().build(createRuntimeSpawnInput(snapshot));
  const result = new SpawnExecutor().execute(plan, createWorld());

  expect(plan.revision).toBe(9);
  expect(plan.intents.every(intent => intent.healthMultiplier === 1.3)).toBe(true);
  expect(result.spentThreat).toBeLessThanOrEqual(snapshot.pressure.availableCredits);
});

it('maps a committed snapshot to legacy hook output and revision-tagged transition events', () => {
  const adapter = new DifficultyV2CompatibilityAdapter();
  const snapshot = createRuntimeSnapshot({ liquidationProximity: 0.9, revision: 7 });

  expect(adapter.toOutput(snapshot).liquidationWarning).not.toBe('NONE');
  adapter.emitTransitions(null, snapshot);
  expect(receivedWarning).toMatchObject({ sourceSnapshotRevision: 7 });
});
```

- [ ] **Step 2: Run consumer tests and verify failure**

Run:

```powershell
npx vitest run tests/services/director/SpawnPlanExecutor.test.ts tests/services/difficulty/runtime/DifficultyV2CompatibilityAdapter.test.ts tests/hooks/useDifficultyV2.test.tsx --pool=forks --maxWorkers=1
```

Expected: FAIL because the builder consumes `GameplaySnapshot`, the executor path has no canonical snapshot revision, and the hook returns constants.

- [ ] **Step 3: Implement consumers with no raw authority reads**

Refactor `SpawnPlanBuilder` to use the committed `RuntimeDifficultySnapshot` spawn, pressure, enemy, and encounter fields. It must not reserve or spend credits; those are already reserved in the snapshot. `SpawnExecutor` applies the plan's same-revision multipliers only. `CollectionSystem` applies the committed XP/gem opportunity mapping without replacing server-verified rewards.

Refactor `PresentationDirector` to accept `RuntimeDifficultySnapshot` data, not `GameplaySnapshot`; preserve `PriceMomentumEngine` only as a presentation-only suggested-BPM source. Implement the compatibility adapter and make `useDifficultyV2()` subscribe to `difficultySnapshotCommitted` with throttled React updates outside RAF. Migrate `LootboxService` to the adapter's revision-tagged `difficultyUpdated` event; make `PortalSystemV2` consume canonical or committed snapshot transitions only, removing raw client-indicator difficulty reactions.

- [ ] **Step 4: Re-run consumer coverage**

Run:

```powershell
npx vitest run tests/services/director/SpawnPlanExecutor.test.ts tests/services/difficulty/runtime/DifficultyV2CompatibilityAdapter.test.ts tests/hooks/useDifficultyV2.test.tsx --pool=forks --maxWorkers=1
```

Expected: PASS with one revision across spawn/stats/rewards/presentation, active hook output, and compatibility events proven.

## Task 8: Add Shadow Fixtures, Comparison, and Operational Evidence

**Files:**
- Create: `services/difficulty/runtime/ShadowComparisonRecorder.ts`
- Create: `config/difficulty/ShadowComparisonConfig.ts`
- Create: `tests/golden/fixtures/modular-difficulty-shadow.v1.json`
- Create: `tests/golden/fixtures/modular-difficulty-approved-drift.v1.json`
- Create: `tests/services/difficulty/runtime/ShadowComparisonRecorder.test.ts`
- Create: `tests/golden/ModularDifficultyShadow.golden.test.ts`
- Create: `docs/reports/MODULAR_DIFFICULTY_RUNTIME_SHADOW.md`

**Interfaces:**
- `ShadowComparisonRecorder.record(current: CurrentDirectorSnapshot, modular: RuntimeDifficultySnapshot): ShadowComparisonRecord`.
- `ShadowComparisonRecord` reports every configured dimension, tolerance, outcome, and approved-drift reference.

- [ ] **Step 1: Write failing shadow comparison tests**

```typescript
it('requires exact equality for discrete quality and fallback fields', () => {
  const record = new ShadowComparisonRecorder().record(
    createCurrentSnapshot({ quality: 'LIVE' }),
    createRuntimeSnapshot({ quality: 'DEGRADED' })
  );

  expect(record.passed).toBe(false);
  expect(record.failures).toContainEqual(
    expect.objectContaining({ dimension: 'quality' })
  );
});

it('accepts only manifest-listed continuous drift within its configured tolerance', () => {
  const record = new ShadowComparisonRecorder(configWithApprovedPressureDrift()).record(
    createCurrentSnapshot({ threatTarget: 1 }),
    createRuntimeSnapshot({ pressure: 1.02 })
  );

  expect(record.passed).toBe(true);
});
```

- [ ] **Step 2: Run shadow tests and verify failure**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/ShadowComparisonRecorder.test.ts tests/golden/ModularDifficultyShadow.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because no modular comparison recorder, fixtures, tolerances, or manifest exist.

- [ ] **Step 3: Implement bounded shadow evidence**

Compare pressure target/credit rate, spawn count/composition, enemy multipliers, mercy/recovery, encounter timing, presentation intensity, quality, and fallback fields. Require exact equality for discrete fields and use `ShadowComparisonConfig` only for continuous tolerances. Store only fixed-capacity records; every allowed drift must resolve to the versioned manifest with scenario, dimension, rationale, Core Gameplay owner, and expiry review date.

Populate fixtures from deterministic current-adapter scenarios and document the resulting comparison command, artifact versions, approving revision placeholder, and promotion criteria in `docs/reports/MODULAR_DIFFICULTY_RUNTIME_SHADOW.md`.

- [ ] **Step 4: Re-run shadow tests**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/ShadowComparisonRecorder.test.ts tests/golden/ModularDifficultyShadow.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with exact discrete checks, bounded continuous drift, fixture hashes, and report inventory covered.

## Task 9: Wire Lifecycle, Reset, Architecture Guards, and Legacy Retirement

**Files:**
- Modify: `services/gameplay/GameRuntime.ts`
- Modify: `services/core/ResetOrchestrator.ts`
- Modify: `hooks/useGameFlowController.ts`
- Modify: `services/gameplay/DifficultyManager.ts`
- Modify: `services/difficulty/index.ts`
- Modify: `services/director/ShadowDirectorRuntime.ts`
- Modify: `tests/services/difficulty/DifficultyContextReset.test.ts`
- Modify: `tests/services/gameplay/GameRuntimeDependencyAudit.test.ts`
- Create: `tests/services/difficulty/runtime/DifficultyRuntimeLifecycle.test.ts`

**Interfaces:**
- `DifficultyRuntime.reset(): void`, `resetForCycleContinue(): void`, and `dispose(): void` are the sole lifecycle entry points.
- Later cleanup leaves `DifficultyManager` as a temporary snapshot adapter only; no production runtime consumer calls `calculate()` or reads `UnifiedDirector` output.

- [ ] **Step 1: Write failing lifecycle and architecture tests**

```typescript
it('clears per-cycle adaptation while preserving run constants and live market input', () => {
  const runtime = createDifficultyRuntime('modular');
  runtime.initializeRun(createRunConstants());
  runtime.recordMarketFrame(createFrame({ sourceSequence: 8 }), 1);
  runtime.recordPlayerHit({ damage: 30, remainingHp: 70 }, 1);

  runtime.resetForCycleContinue();
  const view = runtime.getInputSnapshot();

  expect(view.run.constants.runId).toBe('run-1');
  expect(view.market.frame?.sourceSequence).toBe(8);
  expect(view.player.damageTaken).toBe(0);
});

it('removes UnifiedDirector and DifficultyManager.calculate from production consumers', () => {
  for (const file of productionDifficultyConsumers) {
    const source = readFileSync(file, 'utf8');
    expect(source).not.toContain('UnifiedDirector');
    expect(source).not.toContain('DifficultyManager.calculate');
  }
});
```

- [ ] **Step 2: Run lifecycle and audit tests and verify failure**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultyRuntimeLifecycle.test.ts tests/services/difficulty/DifficultyContextReset.test.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because runtime lifecycle ownership and production-import audits have not replaced legacy reset behavior.

- [ ] **Step 3: Implement ordered lifecycle and remove runtime authority leaks**

Wire `GameRuntime.reset()` and `dispose()` to call the runtime in this exact order: bridge, inbox, domain managers, budgets, encounter state, orchestrator revision, trace ring. `resetForCycleContinue()` preserves immutable run constants and accepted market frame while clearing player windows, reservations, encounter state, and trace history. Disposal invokes bridge unsubscribe once even after repeated calls.

Convert `DifficultyManager` to the temporary compatibility snapshot adapter and remove it from active runtime wiring. Task 10 may delete that adapter only after its production-import audit proves it has no remaining consumer. Update `ShadowDirectorRuntime` to record the current-adapter versus modular snapshot comparison only. Update dependency audits to reject raw market/player authority imports in spawn, rewards, presentation, and hooks.

- [ ] **Step 4: Re-run lifecycle and audit coverage**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime/DifficultyRuntimeLifecycle.test.ts tests/services/difficulty/DifficultyContextReset.test.ts tests/services/gameplay/GameRuntimeDependencyAudit.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with no state/subscription leaks, cycle preservation rules, reset coverage, and legacy authority audit assertions green.

## Task 10: Verify Rollout Modes and Complete the Repository Gate

**Files:**
- Modify: `docs/reports/MODULAR_DIFFICULTY_RUNTIME_SHADOW.md`
- Modify: `docs/superpowers/specs/2026-07-15-modular-difficulty-runtime-design.md`
- Modify: `docs/navigation.json`
- Mirror: matching `public/docs/` files and `public/docs/navigation.json`

**Interfaces:**
- `current` changes no gameplay authority.
- `shadow` records comparisons while current remains active.
- `modular` makes the committed `RuntimeDifficultySnapshot` authority active and rolls back through `VITE_DIFFICULTY_RUNTIME_MODE=current` only.

- [ ] **Step 1: Write the final mode and integration assertions**

```typescript
it.each(['current', 'shadow', 'modular'] as const)(
  'keeps one active spawn revision in %s mode',
  mode => {
    const result = runRuntimeModeScenario(mode);
    expect(result.activeSpawnRevision).toBe(result.consumerRevisions.spawn);
    expect(result.activeSpawnRevision).toBe(result.consumerRevisions.presentation);
  }
);

it('rolls modular authority back to current through configuration only', () => {
  expect(runRuntimeModeScenario('modular').requiresMigration).toBe(false);
  expect(runRuntimeModeScenario('current').requiresMigration).toBe(false);
});
```

- [ ] **Step 2: Run targeted runtime suites first**

Run:

```powershell
npx vitest run tests/services/difficulty/runtime tests/services/gameplay/DifficultyPhase.test.ts tests/services/director tests/hooks/useDifficultyV2.test.tsx tests/golden/ModularDifficultyShadow.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with mode, manager, replay, lifecycle, consumer, and shadow scenarios green.

- [ ] **Step 3: Record evidence and synchronize documentation**

Update the shadow report with executed fixture IDs, comparison result, approved-drift manifest version, and Core Gameplay approval revision. Update the design status only after all Definition-of-Done gates are satisfied. Run:

```powershell
npm run docs:sync
node scripts/check-docs-navigation.mjs
```

Expected: PASS with matching source/public documentation and no missing navigation links.

- [ ] **Step 4: Run the full required gate**

Run:

```powershell
npm run check:baseline
```

Expected: PASS: typecheck, architecture check, reset coverage, lint, full test suite, and production build all complete with exit code `0`.

## Plan Self-Review

| Spec requirement | Implementation task |
| --- | --- |
| One canonical snapshot, mode resolver, registered codes, typed events | Task 1 |
| Event bridge, input coalescing, source sequence, lifecycle inputs | Task 2 |
| Market, position, pacing, player, threat, recovery, encounter managers | Tasks 3 and 4 |
| Atomic commit, fallback, trace, replay, FPS parity | Task 5 |
| Current adapter, phase boundary, no direct `GameEngine` authority | Task 6 |
| Spawn/stats/rewards/presentation/UI revision migration | Task 7 |
| Shadow fixtures, tolerance, report, approval gate | Task 8 |
| Reset, disposal, compatibility, legacy cleanup, architecture audit | Task 9 |
| Configuration rollback and complete repository validation | Task 10 |

The plan uses the same exported names in producer and consumer tasks, contains no placeholder tasks, keeps exact tuning values in configuration, and requires a failing test before every production implementation step.
