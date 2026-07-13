# CS-DIR-01 Baseline, Fixture, and Regression Lock Design

> **Status** approved design  
> Owner: Core Engineering  
> Created: 2026-07-12

**Goal:** Lock the current legacy Director behavior and performance reference without changing gameplay behavior, so the later CS-DIR-V1 migration can prove parity or identify deliberate drift.

**Authoritative source:** Clean `origin/main` at `1ce825ab` (`feat(hud): quiet war-room HUD refactor — ghost rail, overlay chrome, streamlined components`).

**Notion task:** `CS-DIR-01 — Baseline, fixture ve regression kilidini oluştur`

## Scope

**Included**

- A single Director baseline verification command.
- Recorded market fixtures for calm, trend-up, trend-down, volume-surge, volatility-spike, and stale/reconnect behavior.
- Versioned golden outputs for `UnifiedDirector`, `CoreGameplayLoop`, `SpawnSystem`, and the client reward preview calculator.
- Stable replay hashes for fixtures and legacy outputs.
- Deterministic 30/60/120 FPS pacing parity evidence.
- Recorded frame-time and allocation/heap reference measurements.
- A baseline report containing the source revision, fixture hashes, commands, and measurement environment.

**Excluded**

- Gameplay behavior changes.
- New Director contracts or feature flags; those belong to `CS-DIR-02`.
- Replacing legacy multiplier ownership.
- Strict cross-machine millisecond or heap thresholds.
- Updating Notion task status before all exit evidence is verified.

## Source Isolation

Implementation and evidence generation use an isolated worktree created from clean `origin/main` at `1ce825ab`. Existing uncommitted changes in the primary worktree are not part of this baseline and must not be copied into the isolated worktree.

Golden generation records the source revision in every fixture envelope. The generator refuses to regenerate legacy outputs when production files relevant to the baseline differ from the recorded source revision. Test, script, package-command, and report changes required to implement the baseline are permitted.

## Artifact Contract

Every recorded artifact uses a versioned envelope:

```typescript
type BaselineArtifact<TPayload> = {
  schemaVersion: 1;
  fixtureId: string;
  sourceRevision: string;
  producer: string;
  contentHash: string;
  payload: TPayload;
};
```

`contentHash` is the lowercase SHA-256 digest of canonical JSON for `payload`. Canonical serialization sorts object keys recursively while preserving array order. Non-finite numbers are rejected instead of silently serialized.

Readers fail with a targeted error when:

- `schemaVersion` is unsupported;
- `fixtureId` or `producer` is missing;
- `sourceRevision` is missing;
- canonical hashing finds an unsupported value;
- the stored `contentHash` differs from the payload hash.

## Market Scenario Fixtures

One versioned market scenario pack contains six named scenarios. Each frame has an explicit monotonic sequence, timestamp, price, volume, high, low, connection state, and player input fields required by the legacy pipeline.

| Scenario | Required behavior |
| --- | --- |
| `calm` | Narrow price range, stable volume, low ATR, no connection interruption |
| `trend-up` | Sustained positive slope with orderly highs/lows and non-spiking volume |
| `trend-down` | Sustained negative slope with orderly highs/lows and non-spiking volume |
| `volume-surge` | Stable-to-directional price action with a bounded, explicit volume surge window |
| `volatility-spike` | Wide high/low range and alternating price displacement without stale frames |
| `stale-reconnect` | Monotonic pre-stale sequence, explicit stale interval, reconnect at a new sequence, and no replay of missed events |

Scenario generation is pure: no `Math.random`, wall clock, filesystem input, or network input. The generated pack must byte-match its committed fixture after canonical serialization.

## Legacy Golden Layers

**UnifiedDirector**

The existing raw-rule golden suite is migrated to the versioned artifact format. It retains the existing neutral, profit, loss/mercy, and high-leverage zigzag inputs and adds explicit output hashes.

**Legacy Market-to-Difficulty Pipeline**

Each recorded market scenario is replayed through the current `MarketSignalPipeline`, including the real client indicator service, `DifficultyManager`, `DifficultyContext`, and `UnifiedDirector`. The harness controls game time and resets every singleton between runs.

**CoreGameplayLoop**

The harness controls `nowMs`, market momentum input, HP, enemy count, activity, and kill streak. It records phase transitions and sampled outputs at fixed simulation-time boundaries. Samples include phase, flow state, spawn/speed/damage multipliers, pulse, market intensity, and suggested BPM.

**SpawnSystem**

The harness controls game time, market signals, pool behavior, admin spawn config, and random selection. It records observable spawn intents rather than private fields: enemy type, position, elite state, requested difficulty, market position, and stat multipliers. Event subscriptions and singleton state are reset between scenarios.

**Reward Preview**

The client `RewardCalculator` is the current reward-preview authority. Golden cases cover normal cycle completion, take-profit, stop-loss, flow/forced exits, death, AFK death, negative inputs, capped levels, positive PnL, negative PnL, and streak caps. Each case also verifies exact parity with the Railway shared calculator.

## Determinism and Pacing Parity

Each legacy harness runs twice in the same process and must produce the same canonical payload and hash.

The `CoreGameplayLoop` pacing harness simulates the same wall-clock duration at 30, 60, and 120 FPS. Inputs are functions of simulation time rather than frame index. The parity assertion compares:

- ordered phase-transition sequence;
- transition timestamps within one 30 FPS frame (`33.34 ms`);
- phase state at fixed whole-second samples;
- numeric output samples within an explicit floating-point tolerance.

The test does not require frame-by-frame equality because output smoothing legitimately samples at different frame boundaries. It requires equivalent behavior over equal simulation time.

## Performance Evidence

A dedicated measurement script warms the legacy harness before collecting samples. It records:

- source revision;
- Node version, platform, architecture, and timestamp;
- warm-up iteration count and measured iteration count;
- median and p95 iteration/frame time;
- heap used before and after the measured loop;
- heap delta and normalized bytes per simulated tick when available;
- scenario and artifact hashes used by the run.

The committed reference report is informational. CI verifies its schema, source revision, and linkage to the committed fixture hashes, then runs a fresh measurement and publishes the current values. CI does not fail solely because timing or heap values differ across machines. Behavioral hashes, schema validity, and pacing parity remain hard gates.

The measurement loop must not mutate gameplay outputs or feed results back into runtime logic.

## Commands and Gate Integration

`npm run check:director-baseline` performs the complete task-specific verification:

1. Run all Director baseline/golden tests in one Vitest process with one worker.
2. Validate the committed performance reference.
3. Run the informative current-environment measurement.

The existing `npm run check:baseline` remains the authoritative repository gate. It also invokes the Director performance-reference validator so a malformed or stale committed reference cannot be hidden by the general test run.

Golden regeneration remains explicit through `UPDATE_GOLDEN=1`; normal test runs never write committed fixtures.

## File Layout

- `tests/golden/helpers/goldenIo.ts` — artifact read/write, canonical serialization, hashing, and validation.
- `tests/golden/helpers/scenarios.ts` — deterministic market and legacy input generators.
- `tests/golden/fixtures/*.v1.json` — versioned market and output artifacts.
- `tests/golden/MarketScenarios.golden.test.ts` — market pack integrity and replay hash stability.
- `tests/golden/UnifiedDirectorRules.golden.test.ts` — versioned raw Director output lock.
- `tests/golden/LegacyDifficultyPipeline.golden.test.ts` — scenario replay through the legacy market/difficulty path.
- `tests/golden/CoreGameplayLoop.golden.test.ts` — legacy pacing outputs and 30/60/120 parity.
- `tests/golden/SpawnSystem.golden.test.ts` — observable legacy spawn decisions.
- `tests/golden/RewardPreview.golden.test.ts` — preview outputs and server parity.
- `scripts/measure-director-baseline.ts` — reference validation and informative measurement.
- `tests/golden/fixtures/performance-reference.v1.json` — committed measurement reference.
- `docs/reports/CS_DIR_V1_BASELINE.md` — evidence summary and reproduction commands.
- `package.json` — task-specific command and repository-gate integration.

## Test Strategy

Implementation follows test-first development:

1. Add failing artifact-schema/hash tests.
2. Implement the minimal artifact helper changes.
3. Add each missing scenario or golden suite as a failing test.
4. Generate its fixture only after the harness behavior is proven.
5. Run the suite normally to prove the committed artifact is sufficient.
6. Add and verify pacing parity.
7. Add and validate the performance report tooling.
8. Run `npm run check:director-baseline`.
9. Run the full `npm run check:baseline` gate from the isolated worktree.

Tests prefer real legacy code. Mocks are limited to clocks, random selection, network/event boundaries, admin configuration, and object pools where the real dependency would make deterministic observation impossible.

## Exit Evidence

`CS-DIR-01` is complete only when all of the following are true on the isolated clean-source worktree:

- `npm run check:director-baseline` passes.
- `npm run check:baseline` passes.
- Six required market scenarios exist and validate.
- Every committed fixture and golden output has `schemaVersion: 1` and a verified SHA-256 hash.
- UnifiedDirector, legacy market/difficulty, CoreGameplayLoop, SpawnSystem, and reward preview outputs are locked.
- Repeated replay produces identical hashes.
- 30/60/120 FPS pacing parity passes.
- Frame-time and heap/allocation reference measurements are committed and reproducible.
- The evidence report names the exact source revision and commands.
- Production gameplay behavior remains unchanged.
- Any unrelated pre-existing failure is documented separately rather than folded into this task.
