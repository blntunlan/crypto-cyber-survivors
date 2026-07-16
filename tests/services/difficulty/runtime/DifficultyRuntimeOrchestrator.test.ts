import { describe, expect, it } from 'vitest';

import { DifficultyRuntimeOrchestrator } from '../../../../services/difficulty/runtime/DifficultyRuntimeOrchestrator';
import { MarketRegimeManager } from '../../../../services/difficulty/runtime/managers/MarketRegimeManager';
import {
  type DifficultyRuntimeInputView,
  type MarketRegimeManagerInput,
} from '../../../../services/difficulty/runtime/contracts';

const createView = (marketRevision = 1): DifficultyRuntimeInputView => ({
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

  it('returns unchanged when neither cadence nor input revisions advance', () => {
    const runtime = new DifficultyRuntimeOrchestrator();
    const first = runtime.commitIfNeeded(createView(), 10, 10);

    const unchanged = runtime.commitIfNeeded(createView(), 10, 10.01);

    expect(first.committed).toBe(true);
    expect(unchanged).toMatchObject({ committed: false, reason: 'UNCHANGED' });
    expect(unchanged.snapshot).toBe(first.snapshot);
  });
});
