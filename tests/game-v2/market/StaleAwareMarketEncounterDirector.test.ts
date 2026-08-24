import { describe, expect, it, vi } from 'vitest';

import { MARKET_STALE_THRESHOLD_MS } from '@/game-v2/config/MarketFreshness';
import { VOLATILITY_SURGE_ENTRY_THRESHOLD } from '@/game-v2/config/VolatilitySurgeFamily';
import { type MarketSnapshot } from '@/game-v2/contracts/MarketSnapshot';
import { MarketEncounterDirector } from '@/game-v2/market/MarketEncounterDirector';
import { StaleAwareMarketEncounterDirector } from '@/game-v2/market/StaleAwareMarketEncounterDirector';

const baseSnapshot = (
  overrides: Partial<Pick<MarketSnapshot, 'atrPercent' | 'timestamp'>>
): MarketSnapshot => ({
  schemaVersion: 1,
  asset: 'BTC',
  price: 65_000,
  rsi: 50,
  rsiState: 'NEUTRAL',
  atrPercent: 0.001,
  normalizedVolume: 1,
  volumePercentile: 0.5,
  whaleTier: 0,
  trendStrength: 0,
  trendDirection: 'NEUTRAL',
  timestamp: 0,
  isSynthetic: false,
  ...overrides,
});

const CALM_TICK: MarketSnapshot = baseSnapshot({});

describe('StaleAwareMarketEncounterDirector', () => {
  it('delegates to the wrapped director unchanged while fresh', () => {
    const wrapped = new MarketEncounterDirector();
    const direct = new MarketEncounterDirector();
    const staleAware = new StaleAwareMarketEncounterDirector(wrapped);
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    let staleAwareResult;
    let directResult;
    for (let tick = 0; tick <= 60; tick += 1) {
      const snapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 });
      staleAwareResult = staleAware.step(snapshot, tick, tick * 1000);
      directResult = direct.step(snapshot, tick);
    }

    expect(staleAwareResult).toEqual(directResult);
    expect(staleAwareResult?.primary).not.toBeNull();
  });

  it('reports no encounter and resets the wrapped director while stale', () => {
    const staleAware = new StaleAwareMarketEncounterDirector();
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    // Hold near-confirmation for most of the window, fresh.
    for (let tick = 0; tick < 59; tick += 1) {
      const snapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 });
      const result = staleAware.step(snapshot, tick, tick * 1000);
      expect(result.primary).toBeNull();
    }

    // The next snapshot is stale: activation must not fire even though
    // the underlying family would otherwise confirm on this exact tick.
    const staleSnapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: 0 });
    const staleNow = MARKET_STALE_THRESHOLD_MS + 1;
    const staleResult = staleAware.step(staleSnapshot, 59, staleNow);

    expect(staleResult).toEqual({ primary: null, support: null });

    // A fresh cycle after staleness must need the full confirmation
    // duration again, proving the wrapped director was genuinely reset.
    let resumedResult = { primary: null, support: null } as ReturnType<
      StaleAwareMarketEncounterDirector['step']
    >;
    for (let tick = 60; tick < 120; tick += 1) {
      const snapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 });
      resumedResult = staleAware.step(snapshot, tick, tick * 1000);
      expect(resumedResult.primary).toBeNull();
    }
    const finalSnapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: 120_000 });
    resumedResult = staleAware.step(finalSnapshot, 120, 120_000);
    expect(resumedResult.primary).not.toBeNull();
  });

  it("never calls the wrapped director's step while stale, only reset", () => {
    const wrapped = new MarketEncounterDirector();
    const stepSpy = vi.spyOn(wrapped, 'step');
    const resetSpy = vi.spyOn(wrapped, 'reset');
    const staleAware = new StaleAwareMarketEncounterDirector(wrapped);

    const staleSnapshot = baseSnapshot({ timestamp: 0 });
    staleAware.step(staleSnapshot, 0, MARKET_STALE_THRESHOLD_MS + 1);

    expect(stepSpy).not.toHaveBeenCalled();
    expect(resetSpy).toHaveBeenCalledOnce();
  });

  it('composes primary: null, support: null on a fresh calm tick', () => {
    const staleAware = new StaleAwareMarketEncounterDirector();

    const result = staleAware.step(CALM_TICK, 0, 0);

    expect(result).toEqual({ primary: null, support: null });
  });

  it('produces no replay burst: a long stale outage followed by resumption behaves like a fresh start', () => {
    const staleAware = new StaleAwareMarketEncounterDirector();
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    // A very long stale outage: many ticks, all reported stale.
    for (let tick = 0; tick < 1000; tick += 1) {
      const snapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: 0 });
      const result = staleAware.step(
        snapshot,
        tick,
        MARKET_STALE_THRESHOLD_MS + 1 + tick
      );
      expect(result).toEqual({ primary: null, support: null });
    }

    // Resumption: exactly one fresh confirmation cycle, no burst of
    // multiple activations from the "missed" period.
    let activationCount = 0;
    let result = { primary: null, support: null } as ReturnType<
      StaleAwareMarketEncounterDirector['step']
    >;
    for (let tick = 1000; tick <= 1060; tick += 1) {
      const snapshot = baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 });
      result = staleAware.step(snapshot, tick, tick * 1000);
      if (result.primary !== null) {
        activationCount += 1;
      }
    }

    expect(activationCount).toBe(1);
  });

  it('resets the wrapped director', () => {
    const wrapped = new MarketEncounterDirector();
    const staleAware = new StaleAwareMarketEncounterDirector(wrapped);
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    for (let tick = 0; tick < 30; tick += 1) {
      staleAware.step(
        baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }),
        tick,
        tick * 1000
      );
    }

    staleAware.reset();

    let result = { primary: null, support: null } as ReturnType<
      StaleAwareMarketEncounterDirector['step']
    >;
    for (let tick = 0; tick < 60; tick += 1) {
      result = staleAware.step(
        baseSnapshot({ atrPercent: surgeLevel, timestamp: tick * 1000 }),
        tick,
        tick * 1000
      );
      expect(result.primary).toBeNull();
    }
    result = staleAware.step(
      baseSnapshot({ atrPercent: surgeLevel, timestamp: 60_000 }),
      60,
      60_000
    );
    expect(result.primary).not.toBeNull();
  });
});
