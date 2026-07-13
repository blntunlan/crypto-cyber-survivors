# CS-DIR-01 Baseline, Fixture, and Regression Lock Implementation Plan

> **Status** approved implementation plan  
> Owner: Core Engineering  
> Created: 2026-07-12

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture clean `origin/main` legacy Director behavior in schema-versioned fixtures, deterministic golden tests, pacing parity checks, and an informational performance reference without changing production gameplay.

**Architecture:** A test-only baseline layer wraps every fixture and golden output in a SHA-256-verifiable envelope. Deterministic scenario and system harnesses replay real legacy code for each required surface, while the measurement harness records portable metadata but treats wall-clock and heap values as informational.

**Tech Stack:** TypeScript 5.8, Vitest 4 (jsdom/forks), Node `crypto`, Node `perf_hooks`, `tsx`, existing React/Vite test configuration.

## Global Constraints

- Create and work in `.worktrees/cs-dir-01` from detached commit `1ce825ab6045a63636422556a7fd5621df5a0328`; do not copy the primary worktree's uncommitted changes.
- Do not modify any production gameplay file under `services/`, `components/`, `hooks/`, `factories/`, or `config/` for this task.
- Fixtures and golden artifacts use `schemaVersion: 1`, lowercase SHA-256 payload hashes, and source revision `1ce825ab6045a63636422556a7fd5621df5a0328`.
- Scenario generation must not read network, wall-clock, filesystem, or `Math.random` state.
- Run tests with `--pool=forks --maxWorkers=1`; reset mutable singletons in each `beforeEach`.
- No `useState` or runtime-loop allocations are introduced; this task adds test/script/doc tooling only.
- Keep `npm run check:baseline` as the complete repository gate; add the Director reference validator without removing existing checks.
- Keep performance values informational: behavior, schema, hash, and parity failures are hard gates; cross-machine timing and heap differences are not.
- Do not create Git commits unless the user explicitly asks for one.
- Mirror every `docs/` file added by this plan into the matching `public/docs/` path and add both paths to their navigation files.

---

## File Structure

- `tests/golden/helpers/baselineArtifact.ts` — typed versioned artifact creation, canonical JSON serialization, SHA-256 hashing, and strict validation.
- `tests/golden/helpers/baselineArtifact.test.ts` — unit coverage for validation and hash determinism.
- `tests/golden/helpers/scenarios.ts` — existing rule scenarios plus the six explicit market scenarios and deterministic fixture generation.
- `tests/golden/helpers/legacyBaselineHarness.ts` — real-code replay helpers shared by pipeline, pacing, spawn, reward, and performance tests.
- `tests/golden/fixtures/market-scenarios.v1.json` — six committed canonical market scenarios.
- `tests/golden/fixtures/unified-rules.v1.json` — versioned UnifiedDirector rule output golden.
- `tests/golden/fixtures/legacy-pipeline.v1.json` — versioned legacy market-to-difficulty output golden.
- `tests/golden/fixtures/core-gameplay-loop.v1.json` — versioned CoreGameplayLoop samples and phase transitions.
- `tests/golden/fixtures/spawn-system.v1.json` — versioned observable legacy spawn intents.
- `tests/golden/fixtures/reward-preview.v1.json` — versioned client reward-preview outputs.
- `tests/golden/fixtures/performance-reference.v1.json` — versioned informational baseline report.
- `tests/golden/MarketScenarios.golden.test.ts` — market scenario schema and deterministic replay hash tests.
- `tests/golden/UnifiedDirectorRules.golden.test.ts` — migrated versioned UnifiedDirector golden test.
- `tests/golden/LegacyDifficultyPipeline.golden.test.ts` — migrated market scenario pipeline replay golden test.
- `tests/golden/CoreGameplayLoop.golden.test.ts` — replay hash and 30/60/120 FPS pacing parity.
- `tests/golden/SpawnSystem.golden.test.ts` — replay hash and observable spawn intent lock.
- `tests/golden/RewardPreview.golden.test.ts` — client preview golden lock and Railway parity.
- `tests/golden/PerformanceBaseline.golden.test.ts` — reference artifact validation and current informational measurement.
- `scripts/measure-director-baseline.ts` — stable command wrapper for the baseline Vitest suite.
- `docs/reports/CS_DIR_V1_BASELINE.md` — exact source revision, commands, artifact inventory, and policy.
- `package.json` — task-specific commands plus the complete-gate reference check.
- `docs/navigation.json`, `public/docs/navigation.json` — Design Specs and Reports navigation entries.

## Task 1 — Isolate the clean source and add artifact primitives

**Files:**

- Create: `.worktrees/cs-dir-01` from detached `1ce825ab6045a63636422556a7fd5621df5a0328`
- Create: `tests/golden/helpers/baselineArtifact.ts`
- Create: `tests/golden/helpers/baselineArtifact.test.ts`

**Interfaces:**

- Produces `BaselineArtifact<TPayload>`, `createBaselineArtifact`, `readBaselineArtifact`, `writeBaselineArtifact`, `canonicalJson`, `hashBaselinePayload`, and `assertBaselineProductionSource`.
- All later golden tests call `readBaselineArtifact<T>(fixtureName, expectedProducer)` and compare the returned `payload`.

- [ ] **Step 1: Create the isolated worktree and confirm the source revision**

Run:

```powershell
git worktree add --detach .worktrees/cs-dir-01 1ce825ab6045a63636422556a7fd5621df5a0328
git -C .worktrees/cs-dir-01 rev-parse HEAD
git -C .worktrees/cs-dir-01 status --short
```

Expected: the printed commit is `1ce825ab6045a63636422556a7fd5621df5a0328` and `status --short` is empty.

- [ ] **Step 2: Write the failing artifact-helper tests**

Create `tests/golden/helpers/baselineArtifact.test.ts` with these test cases:

```typescript
import { describe, expect, it } from 'vitest';
import {
  BASELINE_SCHEMA_VERSION,
  createBaselineArtifact,
  hashBaselinePayload,
  validateBaselineArtifact,
} from './baselineArtifact';

const sourceRevision = '1ce825ab6045a63636422556a7fd5621df5a0328';

describe('baselineArtifact', () => {
  it('hashes equal objects with different key insertion order identically', () => {
    expect(hashBaselinePayload({ b: 2, a: { z: true, y: [3, 1] } })).toBe(
      hashBaselinePayload({ a: { y: [3, 1], z: true }, b: 2 })
    );
  });

  it('creates a schema-versioned artifact with a verified payload hash', () => {
    const artifact = createBaselineArtifact({
      fixtureId: 'artifact-test.v1',
      producer: 'baselineArtifact.test',
      sourceRevision,
      payload: { sample: [1, 2, 3] },
    });

    expect(artifact.schemaVersion).toBe(BASELINE_SCHEMA_VERSION);
    expect(validateBaselineArtifact(artifact, 'baselineArtifact.test').payload).toEqual({
      sample: [1, 2, 3],
    });
  });

  it('rejects a mismatched hash, unsupported schema, and non-finite payload', () => {
    const artifact = createBaselineArtifact({
      fixtureId: 'invalid.v1',
      producer: 'baselineArtifact.test',
      sourceRevision,
      payload: { sample: 1 },
    });

    expect(() => validateBaselineArtifact({ ...artifact, contentHash: '0'.repeat(64) })).toThrow(
      'contentHash'
    );
    expect(() => validateBaselineArtifact({ ...artifact, schemaVersion: 2 })).toThrow(
      'schemaVersion'
    );
    expect(() => hashBaselinePayload({ sample: Number.NaN })).toThrow('non-finite');
  });
});
```

- [ ] **Step 3: Run the helper test to verify it fails**

Run:

```powershell
Set-Location .worktrees/cs-dir-01
npx vitest run tests/golden/helpers/baselineArtifact.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `./baselineArtifact` does not exist.

- [ ] **Step 4: Add the minimal typed artifact implementation**

Create `tests/golden/helpers/baselineArtifact.ts` with this public contract:

```typescript
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const BASELINE_SCHEMA_VERSION = 1 as const;
export const BASELINE_SOURCE_REVISION = '1ce825ab6045a63636422556a7fd5621df5a0328';

export type BaselineArtifact<TPayload> = {
  schemaVersion: typeof BASELINE_SCHEMA_VERSION;
  fixtureId: string;
  sourceRevision: string;
  producer: string;
  contentHash: string;
  payload: TPayload;
};

type ArtifactInput<TPayload> = Omit<BaselineArtifact<TPayload>, 'schemaVersion' | 'contentHash'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Cannot hash non-finite number in baseline payload');
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
};

export const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value));

export const hashBaselinePayload = (payload: unknown): string =>
  createHash('sha256').update(canonicalJson(payload)).digest('hex');

export const createBaselineArtifact = <TPayload>(input: ArtifactInput<TPayload>): BaselineArtifact<TPayload> => ({
  ...input,
  schemaVersion: BASELINE_SCHEMA_VERSION,
  contentHash: hashBaselinePayload(input.payload),
});

export const validateBaselineArtifact = <TPayload>(
  value: unknown,
  expectedProducer?: string
): BaselineArtifact<TPayload> => {
  if (!isRecord(value)) throw new Error('Baseline artifact must be an object');
  if (value.schemaVersion !== BASELINE_SCHEMA_VERSION) throw new Error('Unsupported schemaVersion');
  if (typeof value.fixtureId !== 'string' || value.fixtureId.length === 0) throw new Error('Missing fixtureId');
  if (typeof value.sourceRevision !== 'string' || value.sourceRevision.length === 0) throw new Error('Missing sourceRevision');
  if (typeof value.producer !== 'string' || value.producer.length === 0) throw new Error('Missing producer');
  if (expectedProducer !== undefined && value.producer !== expectedProducer) throw new Error('Unexpected producer');
  if (typeof value.contentHash !== 'string' || value.contentHash !== hashBaselinePayload(value.payload)) {
    throw new Error('Invalid contentHash');
  }
  return value as BaselineArtifact<TPayload>;
};

export const readBaselineArtifact = <TPayload>(fixturePath: string, expectedProducer?: string) =>
  validateBaselineArtifact<TPayload>(JSON.parse(readFileSync(resolve(fixturePath), 'utf8')), expectedProducer);

export const writeBaselineArtifact = <TPayload>(fixturePath: string, input: ArtifactInput<TPayload>): void => {
  const destination = resolve(fixturePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(createBaselineArtifact(input), null, 2)}\n`);
};

export const assertBaselineProductionSource = (): void => {
  const paths = ['services/difficulty', 'services/gameplay', 'services/combat', 'services/market'];
  const result = spawnSync('git', ['diff', '--quiet', BASELINE_SOURCE_REVISION, '--', ...paths]);
  if (result.status !== 0) throw new Error(`Legacy production differs from ${BASELINE_SOURCE_REVISION}`);
};
```

Import `spawnSync` from `node:child_process`. Call `assertBaselineProductionSource()` immediately before every `UPDATE_GOLDEN` fixture write so tests, scripts, docs, and package changes may coexist but changed legacy behavior cannot be re-recorded silently.

- [ ] **Step 5: Run the helper test to verify it passes**

Run:

```powershell
npx vitest run tests/golden/helpers/baselineArtifact.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS with 3 tests.

## Task 2 — Record and verify the six canonical market scenarios

**Files:**

- Modify: `tests/golden/helpers/scenarios.ts`
- Create: `tests/golden/MarketScenarios.golden.test.ts`
- Create: `tests/golden/fixtures/market-scenarios.v1.json`

**Interfaces:**

- Produces `MarketScenarioFrame`, `MarketScenario`, `MARKET_SCENARIOS`, and `createMarketScenarioArtifact`.
- Pipeline and performance harnesses consume `MarketScenarioFrame` fields `sequence`, `timestamp`, `price`, `volume`, `high`, `low`, `connection`, `rawPnl`, `level`, and `hpPercent`.

- [ ] **Step 1: Write failing scenario invariant and replay-hash tests**

Create `tests/golden/MarketScenarios.golden.test.ts` with tests that assert this exact name set and deterministic artifact hash:

```typescript
expect(MARKET_SCENARIOS.map(scenario => scenario.name)).toEqual([
  'calm',
  'trend-up',
  'trend-down',
  'volume-surge',
  'volatility-spike',
  'stale-reconnect',
]);

const first = createMarketScenarioArtifact();
const second = createMarketScenarioArtifact();
expect(first).toEqual(second);
expect(first.contentHash).toBe(readBaselineArtifact('tests/golden/fixtures/market-scenarios.v1.json', 'market-scenarios').contentHash);

for (const scenario of first.payload.scenarios) {
  const connectedFrames = scenario.frames.filter(frame => frame.connection === 'connected');
  expect(connectedFrames.every((frame, index) => index === 0 || frame.sequence > connectedFrames[index - 1]!.sequence)).toBe(true);
}
```

Add a stale/reconnect assertion that finds at least one `stale` frame and verifies the first later connected frame has a larger sequence than the last connected pre-stale frame.

- [ ] **Step 2: Run the scenario test to verify it fails**

Run:

```powershell
npx vitest run tests/golden/MarketScenarios.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the market scenario exports and fixture do not exist.

- [ ] **Step 3: Add pure scenario generators and the versioned artifact builder**

Append the following type contract to `tests/golden/helpers/scenarios.ts` and implement each named scenario with 48 one-second frames:

```typescript
export type MarketConnectionState = 'connected' | 'stale';

export type MarketScenarioFrame = {
  sequence: number;
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  connection: MarketConnectionState;
  rawPnl: number;
  level: number;
  hpPercent: number;
};

export type MarketScenario = {
  name: 'calm' | 'trend-up' | 'trend-down' | 'volume-surge' | 'volatility-spike' | 'stale-reconnect';
  frames: readonly MarketScenarioFrame[];
};

export type MarketScenarioPayload = { scenarios: readonly MarketScenario[] };

export const MARKET_SCENARIOS: readonly MarketScenario[] = createMarketScenarios();

export const createMarketScenarioArtifact = () =>
  createBaselineArtifact<MarketScenarioPayload>({
    fixtureId: 'market-scenarios.v1',
    producer: 'market-scenarios',
    sourceRevision: BASELINE_SOURCE_REVISION,
    payload: { scenarios: MARKET_SCENARIOS },
  });
```

Use a shared `makeFrame` helper whose timestamp is `1_000_000 + step * 1_000`, whose high/low use an explicit percentage spread, whose `rawPnl` is `(price - 50_000) / 50_000`, and whose level is `1 + Math.floor(step / 12)`. Implement calm with `price = 50_000 + step * 2`, trend-up with `price = 50_000 * (1 + step * 0.0015)`, trend-down with `price = 50_000 * (1 - step * 0.0015)`, volume-surge with `volume = step >= 20 && step < 28 ? 3_200 : 800`, volatility-spike with alternating `price = 50_000 + (step % 2 === 0 ? 900 : -750)` for steps 18–29, and stale-reconnect with frames 18–23 marked `stale` and the first connected frame after them assigned `sequence: 10_000`.

Define `BASELINE_SOURCE_REVISION` once in `baselineArtifact.ts` as `export const BASELINE_SOURCE_REVISION = '1ce825ab6045a63636422556a7fd5621df5a0328';` and import it here.

- [ ] **Step 4: Generate the immutable market scenario artifact**

Add `UPDATE_GOLDEN` handling to `MarketScenarios.golden.test.ts`:

```typescript
if (process.env.UPDATE_GOLDEN === '1') {
  writeBaselineArtifact('tests/golden/fixtures/market-scenarios.v1.json', {
    fixtureId: 'market-scenarios.v1',
    producer: 'market-scenarios',
    sourceRevision: BASELINE_SOURCE_REVISION,
    payload: createMarketScenarioArtifact().payload,
  });
}
```

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/MarketScenarios.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
```

Expected: PASS and `tests/golden/fixtures/market-scenarios.v1.json` is created with `schemaVersion: 1`.

- [ ] **Step 5: Prove the committed scenario artifact is sufficient**

Run:

```powershell
npx vitest run tests/golden/MarketScenarios.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS without writing files.

## Task 3 — Migrate existing UnifiedDirector and legacy pipeline goldens

**Files:**

- Modify: `tests/golden/helpers/goldenIo.ts`
- Modify: `tests/golden/UnifiedDirectorRules.golden.test.ts`
- Modify: `tests/golden/LegacyDifficultyPipeline.golden.test.ts`
- Create: `tests/golden/helpers/legacyBaselineHarness.ts`
- Create: `tests/golden/fixtures/unified-rules.v1.json`
- Create: `tests/golden/fixtures/legacy-pipeline.v1.json`

**Interfaces:**

- Produces `runUnifiedDirectorRules`, `runLegacyPipelineScenario`, and `normalizeForGolden` from `legacyBaselineHarness.ts`.
- Existing `collectGoldenMismatches` remains available and compares decoded `payload` values.

- [ ] **Step 1: Add failing version-envelope assertions to both existing golden tests**

Replace their direct JSON fixture reads with:

```typescript
const expected = readBaselineArtifact<LegacyPipelinePayload>(
  'tests/golden/fixtures/legacy-pipeline.v1.json',
  'legacy-market-pipeline'
).payload;

expect(hashBaselinePayload(actual)).toBe(expected.outputHash);
expect(collectGoldenMismatches(actual, expected.outputs, TOLERANCE)).toEqual([]);
```

For UnifiedDirector, use `UnifiedDirectorGoldenPayload` with fields `outputHash` and `outputs` and producer `unified-director-rules`.

- [ ] **Step 2: Run the two tests to verify they fail on missing versioned fixtures**

Run:

```powershell
npx vitest run tests/golden/UnifiedDirectorRules.golden.test.ts tests/golden/LegacyDifficultyPipeline.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because `*.v1.json` artifacts are absent.

- [ ] **Step 3: Extract replay code into a shared deterministic harness**

Create `tests/golden/helpers/legacyBaselineHarness.ts`. Export:

```typescript
export const runUnifiedDirectorRules = (): readonly UnifiedDirectorGoldenOutput[] => {
  UnifiedDirector.reset();
  return RULE_SCENARIOS.flatMap(scenario => {
    const outputs: UnifiedDirectorOutput[] = [];
    for (let step = 0; step < RULE_SCENARIO_STEPS; step += 1) {
      outputs.push(normalizeForGolden(UnifiedDirector.update(scenario.inputsAt(step))));
    }
    return [{ name: scenario.name, outputs }];
  });
};

export const runLegacyPipelineScenario = (
  frames: readonly MarketScenarioFrame[],
  clock: { nowMs: number }
): readonly MarketPipelineResult[] => {
  const pipeline = createMarketSignalPipeline();
  DifficultyManager.reset();
  DifficultyContext.reset();
  UnifiedDirector.reset();
  return frames.map(frame => {
    clock.nowMs = frame.timestamp;
    return normalizeForGolden(
      pipeline.processTick({
        pair: 'BTC',
        position: MarketPosition.LONG,
        price: frame.price,
        volume: frame.volume,
        high: frame.high,
        low: frame.low,
        timestamp: frame.timestamp,
        rawPnl: frame.rawPnl,
        level: frame.level,
        hpPercent: frame.hpPercent,
      })
    );
  });
};
```

Keep the existing `TimeService` and `PoolManager` mocks in the pipeline test, because those mocks isolate only clock and pool boundaries while the tested indicator/difficulty code remains real.

- [ ] **Step 4: Generate and lock both versioned artifacts**

When `UPDATE_GOLDEN === '1'`, write payloads with these shapes:

```typescript
type UnifiedDirectorGoldenPayload = {
  outputHash: string;
  outputs: readonly UnifiedDirectorGoldenOutput[];
};

type LegacyPipelinePayload = {
  outputHash: string;
  outputs: Readonly<Record<MarketScenario['name'], readonly MarketPipelineResult[]>>;
};
```

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/UnifiedDirectorRules.golden.test.ts tests/golden/LegacyDifficultyPipeline.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
```

Expected: PASS and both `*.v1.json` artifacts contain verified SHA-256 payload hashes.

- [ ] **Step 5: Run normal deterministic replay verification**

Run:

```powershell
npx vitest run tests/golden/UnifiedDirectorRules.golden.test.ts tests/golden/LegacyDifficultyPipeline.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS; each test replays its inputs twice and asserts identical payload hashes before checking its committed golden output.

## Task 4 — Lock CoreGameplayLoop output and FPS pacing parity

**Files:**

- Create: `tests/golden/CoreGameplayLoop.golden.test.ts`
- Create: `tests/golden/fixtures/core-gameplay-loop.v1.json`

**Interfaces:**

- Produces `runPacingSimulation(fps: 30 | 60 | 120): PacingRun` inside the test.
- `PacingRun` is `{ transitions: readonly PhaseTransition[]; samples: readonly PacingSample[] }` where `PhaseTransition` is `{ atMs: number; phase: CoreLoopPhase }` and `PacingSample` is `{ atMs: number; phase: CoreLoopPhase; flowState: FlowState; spawnMultiplier: number; enemySpeedMultiplier: number; enemyDamageMultiplier: number; pulse: number; marketIntensity: number; suggestedBPM: number }`.

- [ ] **Step 1: Write the failing replay and parity tests**

Create a test that runs 30, 60, and 120 FPS against a 24-second time-based input function:

```typescript
const baseline = runPacingSimulation(60);
const thirty = runPacingSimulation(30);
const oneTwenty = runPacingSimulation(120);

expect(hashBaselinePayload(runPacingSimulation(60))).toBe(hashBaselinePayload(runPacingSimulation(60)));
expect(thirty.transitions.map(item => item.phase)).toEqual(baseline.transitions.map(item => item.phase));
expect(oneTwenty.transitions.map(item => item.phase)).toEqual(baseline.transitions.map(item => item.phase));

for (const [index, transition] of baseline.transitions.entries()) {
  expect(Math.abs(thirty.transitions[index]!.atMs - transition.atMs)).toBeLessThanOrEqual(33.34);
  expect(Math.abs(oneTwenty.transitions[index]!.atMs - transition.atMs)).toBeLessThanOrEqual(33.34);
}

for (const sample of baseline.samples) {
  const atThirty = thirty.samples.find(candidate => candidate.atMs === sample.atMs)!;
  const atOneTwenty = oneTwenty.samples.find(candidate => candidate.atMs === sample.atMs)!;
  expect(atThirty.phase).toBe(sample.phase);
  expect(atOneTwenty.phase).toBe(sample.phase);
  expect(atThirty.spawnMultiplier).toBeCloseTo(sample.spawnMultiplier, 2);
  expect(atOneTwenty.spawnMultiplier).toBeCloseTo(sample.spawnMultiplier, 2);
}
```

- [ ] **Step 2: Run the pacing test to verify it fails**

Run:

```powershell
npx vitest run tests/golden/CoreGameplayLoop.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the pacing harness and fixture are absent.

- [ ] **Step 3: Implement the controlled CoreGameplayLoop harness**

Mock only `PriceMomentumEngine.getLatest` to return a mutable preallocated momentum object. For each frame set `nowMs = Math.round(frameIndex * 1_000 / fps)` and call:

```typescript
loop.update({
  deltaMs: 1_000 / fps,
  hpPercent: nowMs < 8_000 ? 72 : nowMs < 16_000 ? 34 : 56,
  enemyCount: nowMs < 8_000 ? 10 : nowMs < 16_000 ? 40 : 20,
  killStreak: nowMs < 8_000 ? 12 : 2,
  movementMagnitude: nowMs < 16_000 ? 0.65 : 0.25,
  isDashing: nowMs >= 8_000 && nowMs < 16_000,
  didAttack: frameIndex % Math.max(1, Math.round(fps / 4)) === 0,
  nowMs,
});
```

Record a transition only when the returned `phase` differs from the prior phase. Record samples at `0`, `1_000`, ..., `24_000` ms after normalizing numeric fields to 8 decimal places.

- [ ] **Step 4: Generate the 60 FPS golden artifact**

Write payload `{ outputHash, run: runPacingSimulation(60) }` with producer `core-gameplay-loop` when `UPDATE_GOLDEN === '1'`.

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/CoreGameplayLoop.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
```

Expected: PASS and `core-gameplay-loop.v1.json` is written.

- [ ] **Step 5: Prove golden and 30/60/120 parity normally**

Run:

```powershell
npx vitest run tests/golden/CoreGameplayLoop.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS; the 60 FPS run matches its golden artifact and all three frame rates meet parity constraints.

## Task 5 — Lock observable legacy SpawnSystem decisions

**Files:**

- Create: `tests/golden/SpawnSystem.golden.test.ts`
- Create: `tests/golden/fixtures/spawn-system.v1.json`

**Interfaces:**

- Produces `runSpawnScenario(name, frames): readonly SpawnIntent[]`.
- `SpawnIntent` is `{ type: string; x: number; y: number; difficulty: number; side: MarketPosition; isElite: boolean }`.

- [ ] **Step 1: Write the failing observable-spawn golden test**

Create the test with a pool whose `getEnemy` records each request and returns a minimal enemy object:

```typescript
const intents: SpawnIntent[] = [];
const pool = {
  activeEnemies: [],
  getEnemy: vi.fn((x, y, difficulty, side, type) => {
    intents.push({ type: String(type), x, y, difficulty, side, isElite: false });
    return { x, y, type, isElite: false };
  }),
  getWhaleEnemy: vi.fn(),
} as unknown as IPoolManager;

expect(hashBaselinePayload(runSpawnScenario('calm', calmFrames))).toBe(
  hashBaselinePayload(runSpawnScenario('calm', calmFrames))
);
expect(readBaselineArtifact<SpawnGoldenPayload>('tests/golden/fixtures/spawn-system.v1.json', 'spawn-system').payload.outputHash).toBe(
  hashBaselinePayload(actual)
);
```

- [ ] **Step 2: Run the SpawnSystem golden test to verify it fails**

Run:

```powershell
npx vitest run tests/golden/SpawnSystem.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the harness and artifact do not exist.

- [ ] **Step 3: Implement deterministic SpawnSystem boundaries**

Mock `stores/admin/configStore` with the same `baseInterval: 1_000`, `maxEnemies: 100`, and `waveIntensity: 0.5` values used by `tests/services/SpawnSystem.test.ts`. Mock `Math.random` with the repeating sequence `[0.1, 0.3, 0.7, 0.9]`, reset it in `beforeEach`, call `SpawnSystem.resetInstance()`, and invoke its public method with each scenario frame:

```typescript
spawnSystem.update(
  1_000,
  1.25,
  800,
  600,
  MarketPosition.LONG,
  pool,
  frame.rawPnl,
  undefined,
  1,
  'BTC',
  1,
  1,
  { rsi: 50, rsiState: 'NEUTRAL', whaleTier: 0 }
);
```

Normalize every recorded intent using `Number(value.toFixed(8))`, discard object identity, and write `{ outputHash, scenarios }` with producer `spawn-system`.

- [ ] **Step 4: Generate and verify the SpawnSystem artifact**

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/SpawnSystem.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
npx vitest run tests/golden/SpawnSystem.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: first command writes `spawn-system.v1.json`; second command passes without writes.

## Task 6 — Lock client reward preview outputs and Railway parity

**Files:**

- Create: `tests/golden/RewardPreview.golden.test.ts`
- Create: `tests/golden/fixtures/reward-preview.v1.json`

**Interfaces:**

- Produces `REWARD_PREVIEW_CASES` and `runRewardPreviewGolden()`.
- `RewardPreviewGoldenPayload` is `{ outputHash: string; results: readonly { name: string; preview: RewardCalculationResult }[] }`; it intentionally excludes raw parameters so the invalid-input test case can pass `Number.NaN` to the calculators without writing a non-finite JSON value.

- [ ] **Step 1: Write failing golden and server-parity coverage**

Define cases named `cycle-complete`, `take-profit`, `stop-loss`, `flow-exit`, `forced-exit`, `death`, `afk-death`, `negative-input`, `level-cap`, `positive-pnl`, `negative-pnl`, and `streak-cap`. For every case run both calculators:

```typescript
const client = new ClientRewardCalculator().calculate(testCase.params);
const server = new ServerRewardCalculator().calculate(testCase.params);
expect(client).toEqual(server);
expect(actual.results.find(result => result.name === testCase.name)?.preview).toEqual(client);
```

Also assert repeated `runRewardPreviewGolden()` calls have equal SHA-256 payload hashes.

- [ ] **Step 2: Run the reward preview test to verify it fails**

Run:

```powershell
npx vitest run tests/golden/RewardPreview.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the golden artifact is absent.

- [ ] **Step 3: Implement the fixed reward-preview case set and artifact writer**

Use these `RewardCalculationParams` values verbatim in the named cases: `cycle-complete` `{ survivalTimeSeconds: 120, kills: 50, level: 5, pnl: 0.1, maxStreak: 15, exitType: 'cycle_complete' }`; `take-profit` `{ survivalTimeSeconds: 220, kills: 80, level: 7, pnl: 0.08, maxStreak: 30, exitType: 'portal', portalType: 'TAKE_PROFIT' }`; `stop-loss` `{ survivalTimeSeconds: 180, kills: 40, level: 4, pnl: 0.05, maxStreak: 12, exitType: 'portal', portalType: 'STOP_LOSS' }`; `flow-exit` `{ survivalTimeSeconds: 180, kills: 40, level: 4, pnl: 0.05, maxStreak: 12, exitType: 'portal', portalType: 'FLOW_EXIT' }`; `forced-exit` `{ survivalTimeSeconds: 180, kills: 40, level: 4, pnl: 0.05, maxStreak: 12, exitType: 'portal', portalType: 'FORCED' }`; `death` `{ survivalTimeSeconds: 120, kills: 25, level: 3, pnl: -0.2, maxStreak: 10, exitType: 'death' }`; `afk-death` `{ survivalTimeSeconds: 120, kills: 25, level: 3, pnl: 0.2, maxStreak: 10, exitType: 'afk_death' }`; `negative-input` `{ survivalTimeSeconds: -10, kills: -5, level: -1, pnl: Number.NaN, maxStreak: Number.NaN }`; `level-cap` `{ survivalTimeSeconds: 300, kills: 100, level: 10_000, pnl: 0.1, maxStreak: 40, exitType: 'cycle_complete' }`; `positive-pnl` `{ survivalTimeSeconds: 240, kills: 90, level: 8, pnl: 0.35, maxStreak: 45, exitType: 'cycle_complete' }`; `negative-pnl` `{ survivalTimeSeconds: 240, kills: 90, level: 8, pnl: -0.35, maxStreak: 45, exitType: 'cycle_complete' }`; and `streak-cap` `{ survivalTimeSeconds: 240, kills: 90, level: 8, pnl: 0.1, maxStreak: 10_000, exitType: 'cycle_complete' }`.

Map every case to `{ name, preview }`, then write `{ outputHash: hashBaselinePayload(results), results }` with producer `reward-preview`.

- [ ] **Step 4: Generate and verify the reward preview artifact**

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/RewardPreview.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
npx vitest run tests/golden/RewardPreview.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: PASS; every client preview remains exactly equal to the Railway calculator and the committed artifact.

## Task 7 — Add informational performance reference and command wrapper

**Files:**

- Create: `tests/golden/PerformanceBaseline.golden.test.ts`
- Create: `tests/golden/fixtures/performance-reference.v1.json`
- Create: `scripts/measure-director-baseline.ts`
- Modify: `package.json:6-23`

**Interfaces:**

- Produces `measureLegacyBaseline(): PerformanceMeasurement` with fields `nodeVersion`, `platform`, `architecture`, `warmupIterations`, `measuredIterations`, `medianMs`, `p95Ms`, `heapBeforeBytes`, `heapAfterBytes`, `heapDeltaBytes`, `bytesPerTick`, `scenarioHash`, and `sourceRevision`.
- `scripts/measure-director-baseline.ts` accepts `--reference-only`; normal mode runs the entire golden directory.

- [ ] **Step 1: Write the failing reference-shape test**

Create `PerformanceBaseline.golden.test.ts` with:

```typescript
const reference = readBaselineArtifact<PerformanceMeasurement>(
  'tests/golden/fixtures/performance-reference.v1.json',
  'performance-baseline'
);

expect(reference.payload.sourceRevision).toBe(BASELINE_SOURCE_REVISION);
expect(reference.payload.scenarioHash).toBe(
  readBaselineArtifact<MarketScenarioPayload>('tests/golden/fixtures/market-scenarios.v1.json', 'market-scenarios').contentHash
);
expect(reference.payload.warmupIterations).toBeGreaterThan(0);
expect(reference.payload.measuredIterations).toBeGreaterThan(0);
```

Run the measurement in the test and assert only that `medianMs >= 0`, `p95Ms >= medianMs`, and all heap fields are finite. Do not compare those current runtime values to the reference numbers.

- [ ] **Step 2: Run the performance test to verify it fails**

Run:

```powershell
npx vitest run tests/golden/PerformanceBaseline.golden.test.ts --pool=forks --maxWorkers=1
```

Expected: FAIL because the reference artifact and measurement harness do not exist.

- [ ] **Step 3: Implement the warmed measurement loop**

Use `performance.now()` from `node:perf_hooks`. Replay the `calm`, `volume-surge`, and `volatility-spike` scenarios through `runLegacyPipelineScenario`; run 20 warm-up iterations and 100 measured iterations. Compute sorted per-iteration elapsed times, median using `sorted[Math.floor(sorted.length / 2)]!`, and p95 using `sorted[Math.ceil(sorted.length * 0.95) - 1]!`. Sample `process.memoryUsage().heapUsed` immediately before and after the measured loop and set `bytesPerTick = heapDeltaBytes / (measuredIterations * totalScenarioFrames)`.

When `UPDATE_GOLDEN === '1'`, write the measured report as a `performance-baseline` artifact. On normal runs, write the fresh report only to `output/director-baseline/performance-current.json`; this directory is diagnostic output and must not be committed.

- [ ] **Step 4: Add the command wrapper and npm scripts**

Create `scripts/measure-director-baseline.ts`:

```typescript
import { spawnSync } from 'node:child_process';

const referenceOnly = process.argv.includes('--reference-only');
const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const targets = referenceOnly
  ? ['tests/golden/PerformanceBaseline.golden.test.ts']
  : ['tests/golden'];
const result = spawnSync(
  executable,
  ['vitest', 'run', ...targets, '--pool=forks', '--maxWorkers=1'],
  { stdio: 'inherit', env: { ...process.env, DIRECTOR_BASELINE_MEASURE: '1' } }
);

process.exit(result.status ?? 1);
```

Add these scripts to `package.json` and retain all existing scripts:

```json
"check:director-reference": "tsx scripts/measure-director-baseline.ts --reference-only",
"check:director-baseline": "tsx scripts/measure-director-baseline.ts",
"check:baseline": "npm run typecheck && npm run check:architecture && npm run check:reset-coverage && npm run lint && npm run check:director-reference && npm run test && npm run build"
```

- [ ] **Step 5: Generate the reference and verify normal command behavior**

Run:

```powershell
$env:UPDATE_GOLDEN = '1'
npx vitest run tests/golden/PerformanceBaseline.golden.test.ts --pool=forks --maxWorkers=1
Remove-Item Env:UPDATE_GOLDEN
npm run check:director-baseline
```

Expected: the first command writes `performance-reference.v1.json`; the second command passes and writes/updates only `output/director-baseline/performance-current.json`.

## Task 8 — Publish evidence documentation and run task/full gates

**Files:**

- Create: `docs/reports/CS_DIR_V1_BASELINE.md`
- Create: `public/docs/reports/CS_DIR_V1_BASELINE.md`
- Modify: `docs/navigation.json`
- Modify: `public/docs/navigation.json`
- Modify: `docs/superpowers/specs/2026-07-12-cs-dir-01-baseline-design.md`
- Create: `docs/superpowers/plans/2026-07-12-cs-dir-01-baseline-implementation.md`
- Create: `public/docs/superpowers/plans/2026-07-12-cs-dir-01-baseline-implementation.md`

**Interfaces:**

- Produces the repository-readable evidence handoff for CS-DIR-01.
- Does not create runtime imports or affect production bundle behavior.

- [ ] **Step 1: Write the baseline evidence report from verified artifacts**

Create `docs/reports/CS_DIR_V1_BASELINE.md` with a single H1, a status block, and these sections: `Source`, `Artifact Inventory`, `Commands`, `Pacing Parity`, `Performance Policy`, and `Exit Evidence`. State source revision `1ce825ab6045a63636422556a7fd5621df5a0328`, enumerate all seven `*.v1.json` artifacts, list `npm run check:director-baseline` and `npm run check:baseline`, state that behavior/hash/parity are hard gates, and state that timing/heap fields are informational. Do not duplicate volatile measurement values; identify `tests/golden/fixtures/performance-reference.v1.json` as the canonical measured record.

- [ ] **Step 2: Mirror docs and update both navigation files**

Apply the approved design and this plan text directly in the isolated worktree, then mirror each source document byte-for-byte into its matching `public/docs/` location. Do not copy any other file from the dirty primary worktree. Add `CS-DIR-01 Baseline Plan` in the `Design Specs` items and `CS-DIR-V1 Baseline Evidence` in the `Reports` items of both navigation JSON files.

- [ ] **Step 3: Verify docs and artifact mirroring**

Run:

```powershell
npm run docs:check
Get-FileHash docs/superpowers/specs/2026-07-12-cs-dir-01-baseline-design.md -Algorithm SHA256
Get-FileHash public/docs/superpowers/specs/2026-07-12-cs-dir-01-baseline-design.md -Algorithm SHA256
Get-FileHash docs/superpowers/plans/2026-07-12-cs-dir-01-baseline-implementation.md -Algorithm SHA256
Get-FileHash public/docs/superpowers/plans/2026-07-12-cs-dir-01-baseline-implementation.md -Algorithm SHA256
Get-FileHash docs/reports/CS_DIR_V1_BASELINE.md -Algorithm SHA256
Get-FileHash public/docs/reports/CS_DIR_V1_BASELINE.md -Algorithm SHA256
```

Expected: `docs:check` passes and each source/public pair has the same SHA-256 hash.

- [ ] **Step 4: Run the task-specific baseline gate**

Run:

```powershell
npm run check:director-baseline
```

Expected: PASS; all schema, hash, replay, UnifiedDirector, market pipeline, CoreGameplayLoop, SpawnSystem, reward-preview, FPS-parity, and informational performance-reference tests pass.

- [ ] **Step 5: Run the full repository baseline gate**

Run:

```powershell
npm run check:baseline
```

Expected: PASS; typecheck, singleton architecture, reset coverage, lint, Director reference, full tests, and production build all complete successfully.

- [ ] **Step 6: Record precise completion evidence without committing**

Run:

```powershell
git status --short
git diff --check
git diff --name-only
```

Expected: only the task files listed in this plan are changed; `git diff --check` prints no whitespace errors.

## Plan Self-Review

The plan maps every spec requirement to a task: source isolation (Task 1), schema/hash artifacts (Task 1), six fixtures (Task 2), UnifiedDirector and legacy pipeline golden outputs (Task 3), 30/60/120 pacing (Task 4), SpawnSystem (Task 5), reward preview and Railway parity (Task 6), frame-time/heap reference (Task 7), and commands/documented evidence/full gate (Task 8).

All contracts used after Task 1 are defined in Task 1; later artifact payload shapes are defined beside their producers. Every code-bearing task starts with a failing test, provides the intended implementation contract, then names exact verification commands. No production gameplay file is in the modification list.
