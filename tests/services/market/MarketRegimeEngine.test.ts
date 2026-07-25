import { describe, expect, it } from 'vitest';
import { MarketRegimeEngine } from '../../../services/market/regime/MarketRegimeEngine';
import { type CanonicalMarketFrame } from '../../../types/marketCanonical';

const createFrame = (
  sequence: number,
  overrides: Partial<CanonicalMarketFrame> = {}
): CanonicalMarketFrame => {
  const timestamp = sequence * 1_000;

  return {
    revision: sequence,
    sequence,
    sourceSequence: sequence,
    sourceTimestamp: timestamp,
    receivedAt: timestamp,
    quality: 'LIVE',
    price: 50_000,
    pnlPercent: 0,
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
    ...overrides,
  };
};

describe('MarketRegimeEngine', () => {
  it('requires three live frames before emitting a volume-surge event', () => {
    const engine = new MarketRegimeEngine();

    expect(engine.update(createFrame(1, { normalizedVolume: 0.8 })).event).toBeNull();
    expect(engine.update(createFrame(2, { normalizedVolume: 0.8 })).event).toBeNull();

    const confirmed = engine.update(createFrame(3, { normalizedVolume: 0.8 }));

    expect(confirmed.event).toMatchObject({ family: 'VOLUME_SURGE', revision: 3 });
    expect(confirmed.snapshot).toMatchObject({
      revision: 3,
      regime: 'VOLATILE',
      activeEventFamily: 'VOLUME_SURGE',
    });
  });

  it('holds RSI state inside its hysteresis band until the exit threshold', () => {
    const engine = new MarketRegimeEngine();

    engine.update(createFrame(1, { rsi: 70 }));
    engine.update(createFrame(2, { rsi: 70 }));
    const entered = engine.update(createFrame(3, { rsi: 70 }));
    const held = engine.update(createFrame(4, { rsi: 68 }));
    const exited = engine.update(createFrame(5, { rsi: 65 }));

    expect(entered.state.rsiZone).toBe('OVERBOUGHT');
    expect(held.state.rsiZone).toBe('OVERBOUGHT');
    expect(exited.state.rsiZone).toBe('NEUTRAL');
  });

  it('does not emit stale-frame events or repeat an event during cooldown', () => {
    const engine = new MarketRegimeEngine();

    engine.update(createFrame(1, { normalizedVolume: 0.8 }));
    engine.update(createFrame(2, { normalizedVolume: 0.8 }));
    expect(
      engine.update(createFrame(3, { normalizedVolume: 0.8 })).event
    ).not.toBeNull();

    expect(
      engine.update(createFrame(4, { quality: 'STALE', whaleTier: 3 })).event
    ).toBeNull();

    engine.update(createFrame(5, { normalizedVolume: 0.5 }));
    engine.update(createFrame(6, { normalizedVolume: 0.8 }));
    engine.update(createFrame(7, { normalizedVolume: 0.8 }));
    expect(engine.update(createFrame(8, { normalizedVolume: 0.8 })).event).toBeNull();
  });

  it('emits a whale event only from a live frame at the configured tier', () => {
    const engine = new MarketRegimeEngine();

    expect(engine.update(createFrame(1, { whaleTier: 1 })).event).toBeNull();
    expect(
      engine.update(createFrame(2, { quality: 'STALE', whaleTier: 3 })).event
    ).toBeNull();
    expect(engine.update(createFrame(3, { whaleTier: 2 })).event).toMatchObject({
      family: 'WHALE_EVENT',
      revision: 3,
    });
  });

  it('replays identical frames into identical snapshots and event revisions', () => {
    const frames = [
      createFrame(1, { atrPercent: 0.02 }),
      createFrame(2, { atrPercent: 0.02 }),
      createFrame(3, { atrPercent: 0.02 }),
      createFrame(4, {
        macd: { value: 1, signal: 0.5, histogram: 0.5 },
        trendStrength: 0.7,
        trendDirection: 'UP',
      }),
      createFrame(5, {
        macd: { value: 1, signal: 0.5, histogram: 0.5 },
        trendStrength: 0.7,
        trendDirection: 'UP',
      }),
    ];

    const replay = () => {
      const engine = new MarketRegimeEngine();
      return frames.map(frame => engine.update(frame));
    };

    expect(replay()).toEqual(replay());
  });

  it('ranks ATR against rolling canonical history instead of a fixed reference', () => {
    const engine = new MarketRegimeEngine();

    expect(
      engine.update(createFrame(1, { atrPercent: 0.01 })).snapshot.volatility
    ).toBe(0.5);
    expect(
      engine.update(createFrame(2, { atrPercent: 0.02 })).snapshot.volatility
    ).toBe(1);
    expect(
      engine.update(createFrame(3, { atrPercent: 0.005 })).snapshot.volatility
    ).toBe(0);
  });

  it('does not count the same canonical sequence as multiple confirmations', () => {
    const engine = new MarketRegimeEngine();
    const first = createFrame(1, { normalizedVolume: 0.8 });

    expect(engine.update(first).event).toBeNull();
    expect(engine.update(first).event).toBeNull();
    expect(engine.update(first).event).toBeNull();
    expect(engine.update(createFrame(2, { normalizedVolume: 0.8 })).event).toBeNull();
    expect(
      engine.update(createFrame(3, { normalizedVolume: 0.8 })).event
    ).toMatchObject({
      family: 'VOLUME_SURGE',
    });
  });

  it('preserves the live regime while stale market pressure decays', () => {
    const engine = new MarketRegimeEngine();
    engine.update(createFrame(1, { normalizedVolume: 0.9 }), 8);
    engine.update(createFrame(2, { normalizedVolume: 0.9 }), 9);
    const live = engine.update(createFrame(3, { normalizedVolume: 0.9 }), 10);
    const earlyStale = engine.update(createFrame(4, { quality: 'STALE' }), 20);
    const lateStale = engine.update(createFrame(5, { quality: 'STALE' }), 35);

    expect(earlyStale.snapshot.regime).toBe(live.snapshot.regime);
    expect(earlyStale.snapshot.activeEventFamily).toBeNull();
    expect(earlyStale.snapshot.pressure).toBeLessThan(live.snapshot.pressure);
    expect(lateStale.snapshot.pressure).toBeLessThan(earlyStale.snapshot.pressure);
  });
});
