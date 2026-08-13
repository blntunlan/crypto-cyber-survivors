import { describe, expect, it } from 'vitest';

import { DifficultyRuntimeOrchestrator } from '../../../../services/difficulty/runtime/DifficultyRuntimeOrchestrator';
import { MarketRegimeManager } from '../../../../services/difficulty/runtime/managers/MarketRegimeManager';
import {
  type DifficultyRuntimeInputView,
  type MarketRegimeManagerInput,
} from '../../../../services/difficulty/runtime/contracts';

type MarketFrame = NonNullable<DifficultyRuntimeInputView['market']['frame']>;

const createView = (
  marketRevision = 1,
  frameOverrides: Partial<MarketFrame> = {}
): DifficultyRuntimeInputView => ({
  revisions: { market: marketRevision, player: 1, run: 1, world: 1 },
  market: {
    frame: {
      revision: marketRevision,
      sequence: marketRevision,
      sourceSequence: marketRevision,
      sourceTimestamp: marketRevision * 1_000,
      receivedAt: marketRevision * 1_000,
      quality: 'LIVE',
      price: 101,
      pnlPercent: 0.01,
      rsi: 55,
      rsiState: 'NEUTRAL',
      atrPercent: 0.01,
      normalizedVolume: 0.4,
      whaleTier: 0,
      macd: { value: 1, signal: 0.5, histogram: 0.5 },
      priceChangePercent: 0.01,
      trendStrength: 0.6,
      trendDirection: 'UP',
      source: 'runtime',
      ...frameOverrides,
    },
  },
  player: {
    damageTaken: 5,
    remainingHp: 95,
    killsInWindow: 10,
    dashesInWindow: 2,
    shotsInWindow: 40,
    level: 5,
    windowSeconds: 60,
  },
  run: {
    constants: {
      runId: 'run-1',
      seed: 17,
      side: 'LONG',
      leverage: 2,
      entryPrice: 100,
      liquidationPrice: 50,
    },
    greedLevel: 0,
  },
  world: { activeEnemies: 10, maximumEnemies: 60, activeEncounters: 0 },
});

class ThrowOnSecondMarketManager extends MarketRegimeManager {
  private calls = 0;

  public override update(input: MarketRegimeManagerInput) {
    this.calls += 1;
    if (this.calls >= 2) throw new Error('market failed');
    return super.update(input);
  }
}

describe('DifficultyRuntimeOrchestrator', () => {
  it('retains the exact previous snapshot during manager grace failure', () => {
    const runtime = new DifficultyRuntimeOrchestrator({
      marketManager: new ThrowOnSecondMarketManager(),
    });
    const first = runtime.commitIfNeeded(createView(1), 10, 10).snapshot;

    const second = runtime.commitIfNeeded(createView(2), 11, 11);

    expect(second.committed).toBe(false);
    expect(second.snapshot).toBe(first);
    expect(second.snapshot.meta.revision).toBe(1);
  });

  it('commits a degraded neutral-domain snapshot after grace expiry', () => {
    const runtime = new DifficultyRuntimeOrchestrator({
      marketManager: new ThrowOnSecondMarketManager(),
      graceTicks: 0,
    });
    runtime.commitIfNeeded(createView(1), 10, 10);

    const result = runtime.commitIfNeeded(createView(2), 11, 11);

    expect(result.committed).toBe(true);
    expect(result.snapshot.meta.quality).toBe('DEGRADED');
    expect(result.snapshot.signals.market.pressure).toBe(0);
    expect(result.snapshot.trace.fallbackCodes).toContain('MARKET_NEUTRAL_FALLBACK');
  });

  it('lets the market move threat pressure instead of pinning it', () => {
    // Regression: market pressure was added raw (0..1 x 0.35) on top of the
    // pacing baseline and then clamped to a +-0.15 band, so it saturated at the
    // ceiling on every tick and no market move could change the run.
    const calmView = createView(1, {
      rsi: 50,
      atrPercent: 0.001,
      normalizedVolume: 0.02,
      whaleTier: 0,
      trendStrength: 0.02,
    });
    const hotView = createView(1, {
      rsi: 92,
      rsiState: 'OVERBOUGHT',
      atrPercent: 0.09,
      normalizedVolume: 0.98,
      whaleTier: 3,
      trendStrength: 0.95,
    });

    const calmRuntime = new DifficultyRuntimeOrchestrator();
    const hotRuntime = new DifficultyRuntimeOrchestrator();
    const calm = calmRuntime.commitIfNeeded(calmView, 10, 10).snapshot;
    const hot = hotRuntime.commitIfNeeded(hotView, 10, 10).snapshot;

    expect(hot.signals.market.pressure).toBeGreaterThan(calm.signals.market.pressure);
    expect(hot.pressure.total).toBeGreaterThan(calm.pressure.total);
    // The extra pressure reaches the entities the player actually fights.
    expect(hot.enemy.healthMultiplier).toBeGreaterThan(calm.enemy.healthMultiplier);
    expect(hot.spawn.spawnWindowSeconds).not.toBe(calm.spawn.spawnWindowSeconds);
  });

  it('feeds live market pressure into the threat credit budget', () => {
    const calmView = createView(1);
    const hotView = createView(1, {
      atrPercent: 0.09,
      normalizedVolume: 0.98,
      whaleTier: 3,
      trendStrength: 0.95,
    });

    const calm = new DifficultyRuntimeOrchestrator().commitIfNeeded(
      calmView,
      10,
      10
    ).snapshot;
    const hot = new DifficultyRuntimeOrchestrator().commitIfNeeded(
      hotView,
      10,
      10
    ).snapshot;

    // DirectorConfigV1.threat.weights.market used to be multiplied by a
    // hardcoded 0 inside ThreatBudgetManager.
    expect(hot.pressure.creditRate).toBeGreaterThan(calm.pressure.creditRate);
  });

  it('returns unchanged when neither cadence nor input revisions advance', () => {
    const runtime = new DifficultyRuntimeOrchestrator();
    const first = runtime.commitIfNeeded(createView(), 10, 10);

    const unchanged = runtime.commitIfNeeded(createView(), 10, 10.01);

    expect(first.committed).toBe(true);
    expect(unchanged).toMatchObject({ committed: false, reason: 'UNCHANGED' });
    expect(unchanged.snapshot).toBe(first.snapshot);
  });
});
