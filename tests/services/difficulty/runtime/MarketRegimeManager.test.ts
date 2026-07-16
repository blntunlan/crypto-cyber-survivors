import { describe, expect, it } from 'vitest';
import { MarketRegimeManager } from '../../../../services/difficulty/runtime/managers/MarketRegimeManager';
import { type CanonicalMarketFrame } from '../../../../types/marketCanonical';

const createFrame = (
  overrides: Partial<CanonicalMarketFrame> = {}
): CanonicalMarketFrame => ({
  revision: 1,
  sequence: 1,
  sourceSequence: 1,
  sourceTimestamp: 1_000,
  receivedAt: 1_000,
  quality: 'LIVE',
  price: 110,
  pnlPercent: 0.1,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0.05,
  normalizedVolume: 1,
  whaleTier: 0,
  macd: { value: 1, signal: 0, histogram: 1 },
  priceChangePercent: 0.1,
  trendStrength: 1,
  trendDirection: 'UP',
  source: 'runtime',
  ...overrides,
});

const createInput = (frameOverrides: Partial<CanonicalMarketFrame> = {}) => ({
  frame: createFrame(frameOverrides),
  elapsedSeconds: 10,
  validFromTick: 10,
  inputRevision: 1,
});

describe('MarketRegimeManager', () => {
  it('decays stale market pressure and blocks new market encounters', () => {
    const manager = new MarketRegimeManager();
    const live = manager.update(createInput({ quality: 'LIVE' }));
    const stale = manager.update(
      createInput({ quality: 'STALE', sourceSequence: 2, sequence: 2, revision: 2 })
    );

    expect(stale.value.pressure).toBeLessThanOrEqual(live.value.pressure);
    expect(stale.value.activeEventFamily).toBeNull();
    expect(stale.quality).toBe('DEGRADED');
  });

  it('returns to the same neutral decision after reset', () => {
    const manager = new MarketRegimeManager();
    const fresh = manager.getSnapshot();
    manager.update(createInput());
    manager.reset();

    expect(manager.getSnapshot().value).toEqual(fresh.value);
    expect(manager.getSnapshot().quality).toBe('NEUTRAL');
  });
});
