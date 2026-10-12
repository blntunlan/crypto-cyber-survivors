import { describe, expect, it } from 'vitest';

import { TREND_BREAKOUT_ENTRY_THRESHOLD } from '@/game-v2/config/TrendBreakoutFamily';
import { VOLATILITY_SURGE_ENTRY_THRESHOLD } from '@/game-v2/config/VolatilitySurgeFamily';
import {
  type MarketSnapshot,
  type TrendDirection,
  type WhaleTier,
} from '@/game-v2/contracts/MarketSnapshot';
import { MarketEncounterDirector } from '@/game-v2/market/MarketEncounterDirector';

const baseSnapshot = (
  overrides: Partial<
    Pick<
      MarketSnapshot,
      'trendStrength' | 'trendDirection' | 'atrPercent' | 'whaleTier'
    >
  >
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
  timestamp: 1_700_000_000_000,
  isSynthetic: false,
  ...overrides,
});

const CALM_TICK: MarketSnapshot = baseSnapshot({});

describe('MarketEncounterDirector', () => {
  it('composes primary-only when a single family activates', () => {
    const director = new MarketEncounterDirector();
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    let composed = { primary: null, support: null } as ReturnType<
      MarketEncounterDirector['step']
    >;
    for (let tick = 0; tick <= 60; tick += 1) {
      composed = director.step(baseSnapshot({ atrPercent: surgeLevel }), tick);
    }

    expect(composed.primary).toEqual({
      kind: 'WORLD_EVENT',
      hazardId: 'volatility-tremor',
      telegraphTicks: expect.any(Number),
    });
    expect(composed.support).toBeNull();
  });

  it('composes primary-only, dropping the loser, when two real families activate on the same tick', () => {
    const director = new MarketEncounterDirector();
    const breakoutLevel = TREND_BREAKOUT_ENTRY_THRESHOLD + 0.1;
    const trendDirection: TrendDirection = 'UP';

    // Trend/Breakout needs 60 ticks of sustained trendStrength to confirm;
    // Volume/Whale activates instantly. Holding whaleTier at 0 until the
    // exact tick Trend/Breakout confirms makes both real families
    // activate simultaneously, on tick 60 exactly.
    let composed = { primary: null, support: null } as ReturnType<
      MarketEncounterDirector['step']
    >;
    for (let tick = 0; tick < 60; tick += 1) {
      composed = director.step(
        baseSnapshot({ trendStrength: breakoutLevel, trendDirection }),
        tick
      );
      expect(composed.primary).toBeNull();
    }

    const whaleTier: WhaleTier = 2;
    composed = director.step(
      baseSnapshot({ trendStrength: breakoutLevel, trendDirection, whaleTier }),
      60
    );

    // Both real families' compatibleWith are still [] (V2-ADR-126), and
    // both share priority 1, so the ascending-id tie-break resolves it:
    // 'trend-breakout' < 'volume-whale'.
    expect(composed.primary).toEqual({
      kind: 'SPAWN',
      enemyBudget: expect.any(Number),
      themeId: 'bullish-breakout',
    });
    expect(composed.support).toBeNull();
  });

  it('composes primary: null, support: null on a calm tick', () => {
    const director = new MarketEncounterDirector();

    const composed = director.step(CALM_TICK, 0);

    expect(composed).toEqual({ primary: null, support: null });
  });

  it('resets all three underlying encounters', () => {
    const director = new MarketEncounterDirector();
    const surgeLevel = VOLATILITY_SURGE_ENTRY_THRESHOLD + 0.01;

    for (let tick = 0; tick < 30; tick += 1) {
      director.step(baseSnapshot({ atrPercent: surgeLevel }), tick);
    }

    director.reset();

    // A fresh confirmation cycle must take the full duration again, tick
    // count restarting from 0 without a monotonic-tick violation.
    let composed = { primary: null, support: null } as ReturnType<
      MarketEncounterDirector['step']
    >;
    for (let tick = 0; tick < 60; tick += 1) {
      composed = director.step(baseSnapshot({ atrPercent: surgeLevel }), tick);
      expect(composed.primary).toBeNull();
    }
    composed = director.step(baseSnapshot({ atrPercent: surgeLevel }), 60);
    expect(composed.primary).not.toBeNull();
  });
});
