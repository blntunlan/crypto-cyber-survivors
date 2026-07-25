import { describe, expect, it, vi } from 'vitest';
import {
  CoreGameplayLoop,
  type CoreLoopPhase,
} from '../../services/gameplay/CoreGameplayLoop';
import { type FlowState } from '../../services/difficulty/FlowStateManager';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  hashBaselinePayload,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';
import { collectGoldenMismatches } from './helpers/goldenIo';

const { momentum } = vi.hoisted(() => ({
  momentum: {
    velocity: 0,
    acceleration: 0,
    magnitude: 0,
    direction: 'flat' as const,
    phase: 'DRIFTING' as const,
    intensity: 0.45,
    enemySpeedMod: 1.1,
    spawnRateMod: 1.15,
    gemValueMod: 1,
    suggestedBPM: 104,
    isFavorable: false,
  },
}));

vi.mock('../../services/market/PriceMomentumEngine', () => ({
  PriceMomentumEngine: { getLatest: () => momentum },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

type FrameRate = 30 | 60 | 120;

type PhaseTransition = {
  atMs: number;
  phase: CoreLoopPhase;
};

type PacingSample = {
  atMs: number;
  phase: CoreLoopPhase;
  flowState: FlowState;
  pulse: number;
  marketIntensity: number;
  suggestedBPM: number;
};

type PacingRun = {
  transitions: readonly PhaseTransition[];
  samples: readonly PacingSample[];
};

type CoreGameplayLoopGoldenPayload = {
  outputHash: string;
  run: PacingRun;
};

const FIXTURE_PATH = 'tests/golden/fixtures/core-gameplay-loop.v1.json';
const DURATION_MS = 24_000;
const MAX_TRANSITION_DRIFT_MS = 33.34;
const LEGACY_MAX_NUMERIC_DRIFT = 0.05;
const round = (value: number): number => Number(value.toFixed(8));

const runPacingSimulation = (fps: FrameRate): PacingRun => {
  const loop = new CoreGameplayLoop();
  loop.reset();
  const transitions: PhaseTransition[] = [];
  const samples: PacingSample[] = [];
  const deltaMs = 1_000 / fps;
  let previousPhase: CoreLoopPhase | undefined;

  for (let frame = 1; frame <= (DURATION_MS / 1_000) * fps; frame += 1) {
    const nowMs = frame * deltaMs;
    const output = loop.update({
      deltaMs,
      hpPercent: nowMs < 8_000 ? 72 : nowMs < 16_000 ? 34 : 56,
      enemyCount: nowMs < 8_000 ? 10 : nowMs < 16_000 ? 40 : 20,
      killStreak: nowMs < 8_000 ? 12 : 2,
      movementMagnitude: nowMs < 16_000 ? 0.65 : 0.25,
      isDashing: nowMs >= 8_000 && nowMs < 16_000,
      didAttack: frame % Math.max(1, Math.round(fps / 4)) === 0,
      elapsedMs: nowMs,
    });

    if (output.phase !== previousPhase) {
      transitions.push({ atMs: round(nowMs), phase: output.phase });
      previousPhase = output.phase;
    }

    if (frame % fps === 0) {
      samples.push({
        atMs: round(nowMs),
        phase: output.phase,
        flowState: output.flowState,
        pulse: round(output.pulse),
        marketIntensity: round(output.marketIntensity),
        suggestedBPM: output.suggestedBPM,
      });
    }
  }

  return { transitions, samples };
};

describe('Golden — CoreGameplayLoop pacing parity', () => {
  it('locks the 60 FPS legacy pacing run and preserves deterministic replay', () => {
    const run = runPacingSimulation(60);
    expect(hashBaselinePayload(runPacingSimulation(60))).toBe(hashBaselinePayload(run));

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact(FIXTURE_PATH, {
        fixtureId: 'core-gameplay-loop.v1',
        producer: 'core-gameplay-loop',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: { outputHash: hashBaselinePayload(run), run },
      });
    }

    const expected = readBaselineArtifact<CoreGameplayLoopGoldenPayload>(
      FIXTURE_PATH,
      'core-gameplay-loop'
    ).payload;
    const expectedPresentationRun: PacingRun = {
      transitions: expected.run.transitions,
      samples: expected.run.samples.map(sample => ({
        atMs: sample.atMs,
        phase: sample.phase,
        flowState: sample.flowState,
        pulse: sample.pulse,
        marketIntensity: sample.marketIntensity,
        suggestedBPM: sample.suggestedBPM,
      })),
    };
    expect(collectGoldenMismatches(run, expectedPresentationRun, 1e-8)).toEqual([]);
  });

  it('keeps transition drift within one 30 FPS frame across frame rates', () => {
    const baseline = runPacingSimulation(60);
    const thirty = runPacingSimulation(30);
    const oneTwenty = runPacingSimulation(120);

    for (const candidate of [thirty, oneTwenty]) {
      expect(candidate.transitions.map(item => item.phase)).toEqual(
        baseline.transitions.map(item => item.phase)
      );
      for (const [index, transition] of baseline.transitions.entries()) {
        expect(
          Math.abs(candidate.transitions[index]!.atMs - transition.atMs)
        ).toBeLessThanOrEqual(MAX_TRANSITION_DRIFT_MS);
      }
      for (const sample of baseline.samples) {
        const comparable = candidate.samples.find(item => item.atMs === sample.atMs);
        expect(comparable).toBeDefined();
        expect(comparable!.phase).toBe(sample.phase);
        expect(comparable!.flowState).toBe(sample.flowState);
        expect(Math.abs(comparable!.pulse - sample.pulse)).toBeLessThanOrEqual(
          LEGACY_MAX_NUMERIC_DRIFT
        );
      }
    }
  });
});
