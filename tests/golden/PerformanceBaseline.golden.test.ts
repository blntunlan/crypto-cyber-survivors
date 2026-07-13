import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  BASELINE_SOURCE_REVISION,
  assertBaselineProductionSource,
  readBaselineArtifact,
  writeBaselineArtifact,
} from './helpers/baselineArtifact';
import { runLegacyPipelineScenarios } from './helpers/legacyBaselineHarness';
import { type MarketScenarioPayload } from './helpers/scenarios';

const { clock } = vi.hoisted(() => ({ clock: { nowMs: 0 } }));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTime: () => clock.nowMs,
    getGameTimeSeconds: () => clock.nowMs / 1_000,
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
  PoolManager: { getInstance: vi.fn(() => ({ activeGems: [] })) },
}));
vi.mock('../../services/system/Logger', () => ({
  Logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

type PerformanceMeasurement = {
  sourceRevision: string;
  scenarioHash: string;
  nodeVersion: string;
  platform: string;
  architecture: string;
  recordedAt: string;
  warmupIterations: number;
  measuredIterations: number;
  medianMs: number;
  p95Ms: number;
  heapBeforeBytes: number;
  heapAfterBytes: number;
  heapDeltaBytes: number;
  bytesPerTick: number;
};

const REFERENCE_PATH = 'tests/golden/fixtures/performance-reference.v1.json';
const CURRENT_OUTPUT_PATH = 'output/director-baseline/performance-current.json';
const WARMUP_ITERATIONS = 20;
const MEASURED_ITERATIONS = 100;
const TOTAL_TICKS = 282;

const percentile = (values: readonly number[], percentileValue: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * percentileValue) - 1]!;
};

const measureLegacyBaseline = (): PerformanceMeasurement => {
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1)
    runLegacyPipelineScenarios(clock);
  const heapBeforeBytes = process.memoryUsage().heapUsed;
  const elapsed: number[] = [];
  for (let iteration = 0; iteration < MEASURED_ITERATIONS; iteration += 1) {
    const startedAt = performance.now();
    runLegacyPipelineScenarios(clock);
    elapsed.push(performance.now() - startedAt);
  }
  const heapAfterBytes = process.memoryUsage().heapUsed;
  const scenarioHash = readBaselineArtifact<MarketScenarioPayload>(
    'tests/golden/fixtures/market-scenarios.v1.json',
    'market-scenarios'
  ).contentHash;
  const heapDeltaBytes = heapAfterBytes - heapBeforeBytes;
  return {
    sourceRevision: BASELINE_SOURCE_REVISION,
    scenarioHash,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    recordedAt: new Date().toISOString(),
    warmupIterations: WARMUP_ITERATIONS,
    measuredIterations: MEASURED_ITERATIONS,
    medianMs: percentile(elapsed, 0.5),
    p95Ms: percentile(elapsed, 0.95),
    heapBeforeBytes,
    heapAfterBytes,
    heapDeltaBytes,
    bytesPerTick: heapDeltaBytes / (MEASURED_ITERATIONS * TOTAL_TICKS),
  };
};

describe('Golden — legacy pipeline performance baseline', () => {
  it('validates the committed reference and records a fresh informational measurement', () => {
    const measurement = measureLegacyBaseline();
    expect(measurement.medianMs).toBeGreaterThanOrEqual(0);
    expect(measurement.p95Ms).toBeGreaterThanOrEqual(measurement.medianMs);
    expect(Number.isFinite(measurement.heapBeforeBytes)).toBe(true);
    expect(Number.isFinite(measurement.heapAfterBytes)).toBe(true);
    expect(Number.isFinite(measurement.bytesPerTick)).toBe(true);

    if (process.env.UPDATE_GOLDEN === '1') {
      assertBaselineProductionSource();
      writeBaselineArtifact(REFERENCE_PATH, {
        fixtureId: 'performance-reference.v1',
        producer: 'performance-baseline',
        sourceRevision: BASELINE_SOURCE_REVISION,
        payload: measurement,
      });
    }

    const reference = readBaselineArtifact<PerformanceMeasurement>(
      REFERENCE_PATH,
      'performance-baseline'
    ).payload;
    expect(reference.sourceRevision).toBe(BASELINE_SOURCE_REVISION);
    expect(reference.scenarioHash).toBe(measurement.scenarioHash);
    expect(reference.warmupIterations).toBeGreaterThan(0);
    expect(reference.measuredIterations).toBeGreaterThan(0);

    const outputPath = resolve(CURRENT_OUTPUT_PATH);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(measurement, null, 2)}\n`);
  });
});
