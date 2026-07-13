import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashBaselinePayload, readBaselineArtifact } from './helpers/baselineArtifact';
import { collectGoldenMismatches } from './helpers/goldenIo';
import { runLegacyPipelineScenarios } from './helpers/legacyBaselineHarness';

const { clock } = vi.hoisted(() => ({ clock: { nowMs: 0 } }));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTime: () => clock.nowMs,
    getGameTimeSeconds: () => clock.nowMs / 1000,
    update: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
  },
}));

vi.mock('../../services/combat/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({ activeGems: [] })),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const FIXTURE_PATH = 'tests/golden/fixtures/legacy-pipeline.v1.json';
const TOLERANCE = 1e-8;

type LegacyPipelinePayload = {
  outputHash: string;
  outputs: ReturnType<typeof runLegacyPipelineScenarios>;
};

describe('Golden — legacy market-to-difficulty pipeline', () => {
  beforeEach(() => {
    clock.nowMs = 0;
  });

  it('preserves the indicator projection captured by the legacy baseline', () => {
    const actual = runLegacyPipelineScenarios(clock);

    const expected = readBaselineArtifact<LegacyPipelinePayload>(
      FIXTURE_PATH,
      'legacy-market-pipeline'
    ).payload;
    expect(hashBaselinePayload(expected.outputs)).toBe(expected.outputHash);
    const expectedIndicators = Object.fromEntries(
      Object.entries(expected.outputs).map(([scenario, samples]) => [
        scenario,
        samples.map(sample => ({ indicators: sample.indicators })),
      ])
    ) as unknown as ReturnType<typeof runLegacyPipelineScenarios>;
    expect(collectGoldenMismatches(actual, expectedIndicators, TOLERANCE)).toEqual([]);
  });

  it('produces the same output hash across repeated runs in one process', () => {
    expect(hashBaselinePayload(runLegacyPipelineScenarios(clock))).toBe(
      hashBaselinePayload(runLegacyPipelineScenarios(clock))
    );
  });
});
