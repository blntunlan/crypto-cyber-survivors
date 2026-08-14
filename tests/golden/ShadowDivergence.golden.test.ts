/**
 * Shadow divergence golden.
 *
 * `ModularDifficultyShadow.golden.test.ts` tests the *comparator* against
 * hand-authored fixtures. This one drives both shells — the `current`
 * ExperienceDirector and the `modular` orchestrator — through the same
 * deterministic market scenarios and records where they actually disagree.
 *
 * It exists to answer programme open decision #2 (which shell keeps authority)
 * with data instead of opinion, and then to keep that answer honest: once the
 * fixture is committed, any change that moves the two shells further apart
 * fails here.
 *
 * Regenerate deliberately:
 *   UPDATE_GOLDEN=1 npx vitest run tests/golden/ShadowDivergence.golden.test.ts
 */
import { describe, expect, it } from 'vitest';

import {
  createDifficultyRuntime,
  type DifficultyBoundaryInput,
} from '../../services/difficulty/runtime/DifficultyRuntime';
import { MarketPosition } from '../../types';
import { type CanonicalMarketFrame } from '../../types/marketCanonical';
import {
  MARKET_SCENARIOS,
  type MarketScenario,
  type MarketScenarioFrame,
} from './helpers/scenarios';
import {
  collectGoldenMismatches,
  isGoldenUpdateMode,
  readGoldenFixture,
  writeGoldenFixture,
} from './helpers/goldenIo';

const FIXTURE = 'shadow-divergence.v1.json';
// Drift values are ratios; a looser tolerance here would hide exactly the
// disagreement this fixture is meant to surface.
const TOLERANCE = 1e-6;

const ENTRY_PRICE = 50_000;
const TICKS_PER_FRAME = 6;
const DELTA_SECONDS = 1 / 6;
// The scenarios carry raw traded volume (800 baseline, 3200 during the surge),
// but `normalizedVolume` on a canonical frame is a ratio in roughly 0.1–3.
// Feeding the raw figure through would push every downstream signal far out of
// range and the comparison would measure the harness, not the two shells.
const SCENARIO_BASE_VOLUME = 800;

const toMarketFrame = (
  frame: MarketScenarioFrame,
  index: number
): CanonicalMarketFrame => {
  const spread = (frame.high - frame.low) / frame.price;
  const normalizedVolume = Math.min(
    Math.max(frame.volume / SCENARIO_BASE_VOLUME, 0.1),
    3
  );
  return {
    price: frame.price,
    pnlPercent: frame.rawPnl,
    // Deterministic pseudo-RSI: the scenarios carry price and volume only, and
    // the point is a repeatable input, not a faithful indicator.
    rsi: 50 + Math.max(-45, Math.min(45, frame.rawPnl * 500)),
    rsiState:
      frame.rawPnl > 0.04
        ? 'OVERBOUGHT'
        : frame.rawPnl < -0.04
          ? 'OVERSOLD'
          : 'NEUTRAL',
    atrPercent: Math.max(spread / 2, 0.0005),
    normalizedVolume,
    whaleTier: normalizedVolume > 2 ? 2 : normalizedVolume > 1.4 ? 1 : 0,
    macd: {
      value: frame.rawPnl,
      signal: frame.rawPnl / 2,
      histogram: frame.rawPnl / 2,
    },
    priceChangePercent: frame.rawPnl,
    trendStrength: Math.min(Math.abs(frame.rawPnl) * 8, 1),
    trendDirection:
      frame.rawPnl > 0.002 ? 'UP' : frame.rawPnl < -0.002 ? 'DOWN' : 'SIDEWAYS',
    source: 'runtime',
    revision: index + 1,
    sequence: frame.sequence,
    sourceSequence: frame.sequence,
    sourceTimestamp: frame.timestamp,
    receivedAt: frame.timestamp,
    quality: frame.connection === 'stale' ? 'STALE' : 'LIVE',
  };
};

const toBoundaryInput = (
  scenario: MarketScenario,
  frame: MarketScenarioFrame,
  index: number
): DifficultyBoundaryInput => ({
  tick: (index + 1) * TICKS_PER_FRAME,
  deltaSeconds: DELTA_SECONDS,
  elapsedSeconds: (index + 1) * TICKS_PER_FRAME * DELTA_SECONDS,
  marketFrame: toMarketFrame(frame, index),
  run: {
    runId: `shadow-${scenario.name}`,
    seed: 4_242,
    mode: 'TOKEN',
    greedLevel: 0,
  },
  position: {
    side: MarketPosition.LONG,
    leverage: 10,
    entryPrice: ENTRY_PRICE,
    liquidationPrice: ENTRY_PRICE * 0.5,
  },
  player: {
    hpRatio: frame.hpPercent,
    damageTakenPerSecond: 2,
    killsPerMinute: 30 + frame.level * 4,
    combatMastery: 0.5,
    buildPower: 0.4 + frame.level * 0.05,
    mobilityUsage: 0.3,
  },
  world: {
    width: 1280,
    height: 720,
    activeEnemies: 12 + frame.level * 3,
    maximumEnemies: 60,
    activePrimaryEncounters: 0,
    activeSupportEncounters: 0,
  },
});

type ScenarioDivergence = {
  scenario: string;
  comparisons: number;
  failed: number;
  /** Worst absolute drift seen per dimension, sorted by dimension name. */
  worstDriftByDimension: Array<{ dimension: string; worstDrift: number }>;
};

const measureScenario = (scenario: MarketScenario): ScenarioDivergence => {
  const runtime = createDifficultyRuntime('shadow');

  try {
    scenario.frames.forEach((frame, index) => {
      runtime.commitAtBoundary(toBoundaryInput(scenario, frame, index));
    });

    const records = runtime.getShadowComparisons();
    const worstByDimension = new Map<string, number>();

    for (const record of records) {
      for (const dimension of record.dimensions) {
        if (dimension.drift === null) continue;
        const drift = Math.abs(dimension.drift);
        const seen = worstByDimension.get(dimension.dimension) ?? 0;
        if (drift > seen) worstByDimension.set(dimension.dimension, drift);
      }
    }

    return {
      scenario: scenario.name,
      comparisons: records.length,
      failed: records.filter(record => !record.passed).length,
      worstDriftByDimension: [...worstByDimension.entries()]
        .map(([dimension, worstDrift]) => ({
          dimension,
          worstDrift: Number(worstDrift.toFixed(6)),
        }))
        .sort((a, b) => a.dimension.localeCompare(b.dimension)),
    };
  } finally {
    runtime.dispose();
  }
};

describe('modular vs current shadow divergence', () => {
  const measured = MARKET_SCENARIOS.map(measureScenario);

  it('actually runs the modular shell alongside the current one', () => {
    // Guards the premise: in `current` mode the modular orchestrator never
    // commits, so a zero here would mean the whole comparison is vacuous.
    for (const scenario of measured) {
      expect(
        scenario.comparisons,
        `${scenario.scenario} produced no comparison`
      ).toBeGreaterThan(0);
    }
  });

  it('matches the recorded divergence profile', () => {
    if (isGoldenUpdateMode()) {
      writeGoldenFixture(FIXTURE, { version: 'v1', scenarios: measured });
      return;
    }

    const expected = readGoldenFixture<{ scenarios: ScenarioDivergence[] }>(FIXTURE);
    const mismatches = collectGoldenMismatches(
      { scenarios: measured },
      { scenarios: expected.scenarios },
      TOLERANCE
    );

    expect(mismatches).toEqual([]);
  });
});
