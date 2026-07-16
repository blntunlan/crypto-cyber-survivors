import { describe, expect, it } from 'vitest';

import { createDifficultyRuntime } from '../../../../services/difficulty/runtime/DifficultyRuntime';

const createFrame = () => ({
  revision: 1,
  sequence: 1,
  sourceSequence: 8,
  sourceTimestamp: 1_000,
  receivedAt: 1_000,
  quality: 'LIVE' as const,
  price: 101,
  pnlPercent: 0.01,
  rsi: 55,
  rsiState: 'NEUTRAL' as const,
  atrPercent: 0.01,
  normalizedVolume: 0.4,
  whaleTier: 0 as const,
  macd: { value: 1, signal: 0.5, histogram: 0.5 },
  priceChangePercent: 0.01,
  trendStrength: 0.6,
  trendDirection: 'UP' as const,
  source: 'runtime' as const,
});

describe('DifficultyRuntime lifecycle', () => {
  it('clears cycle adaptation while preserving run constants and market input', () => {
    const runtime = createDifficultyRuntime('modular');
    runtime.initializeRun({
      runId: 'run-1',
      seed: 17,
      side: 'LONG',
      leverage: 2,
      entryPrice: 100,
      liquidationPrice: 50,
    });
    runtime.recordMarketFrame(createFrame(), 1);
    runtime.recordPlayerHit({ damage: 30, remainingHp: 70 }, 1);

    runtime.resetForCycleContinue();
    const view = runtime.getInputSnapshot();

    expect(view.run.constants?.runId).toBe('run-1');
    expect(view.market.frame?.sourceSequence).toBe(8);
    expect(view.player.damageTaken).toBe(0);
    runtime.dispose();
  });

  it('allows repeated disposal without retaining event subscriptions', () => {
    const runtime = createDifficultyRuntime('shadow');

    expect(() => {
      runtime.dispose();
      runtime.dispose();
    }).not.toThrow();
  });
});
