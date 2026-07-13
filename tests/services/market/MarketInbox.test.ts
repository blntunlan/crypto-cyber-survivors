import { describe, expect, it } from 'vitest';
import { MarketInbox } from '../../../services/market/feed/MarketInbox';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';

const createFrame = (
  sequence: number,
  sourceTimestamp: number = sequence * 1000,
  receivedAt: number = sourceTimestamp
): CanonicalMarketFrame => ({
  revision: sequence,
  sequence,
  sourceTimestamp,
  receivedAt,
  quality: 'LIVE',
  price: 50_000 + sequence,
  pnlPercent: 0.01 * sequence,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0.01,
  normalizedVolume: 0.5,
  whaleTier: 0,
  macd: { value: 0, signal: 0, histogram: 0 },
  priceChangePercent: 0,
  trendStrength: 0,
  trendDirection: 'SIDEWAYS',
  source: 'runtime',
});

describe('MarketInbox', () => {
  it('rejects duplicate and out-of-order market sequences', () => {
    const inbox = new MarketInbox();

    expect(inbox.offer(createFrame(4))).toBe(true);
    expect(inbox.offer(createFrame(4))).toBe(false);
    expect(inbox.offer(createFrame(3))).toBe(false);
    expect(inbox.getLatestFrame()).toMatchObject({ sequence: 4, revision: 4 });
  });

  it('keeps one locked market revision for an entire simulation tick', () => {
    const inbox = new MarketInbox();
    inbox.offer(createFrame(1));

    const firstTick = inbox.lockForSimulationTick(100, 1_000);
    inbox.offer(createFrame(2));

    expect(firstTick).toMatchObject({ sequence: 1, revision: 1 });
    expect(inbox.getLockedFrame()).toBe(firstTick);
    expect(inbox.lockForSimulationTick(101, 2_000)).toMatchObject({
      sequence: 2,
      revision: 2,
    });
  });

  it('transitions live frames through delayed and stale once until reconnect', () => {
    const inbox = new MarketInbox({ delayedAfterMs: 5_000, staleAfterMs: 10_000 });
    inbox.offer(createFrame(1, 1_000, 1_000));

    expect(inbox.refreshQuality(6_001)).toBe(true);
    expect(inbox.getLatestFrame()).toMatchObject({ quality: 'DELAYED' });
    expect(inbox.refreshQuality(11_001)).toBe(true);
    expect(inbox.getLatestFrame()).toMatchObject({ quality: 'STALE' });
    expect(inbox.refreshQuality(12_001)).toBe(false);

    inbox.offer(createFrame(2, 12_001, 12_001));
    expect(inbox.getLatestFrame()).toMatchObject({ sequence: 2, quality: 'LIVE' });
  });
});
