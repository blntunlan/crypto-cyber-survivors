import { MVP0_ENEMY_SPAWN_BUDGET, SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

/**
 * The Trend/Breakout indicator-event family (design §6.2/§7.4, `V2-204`).
 *
 * `trendStrength` is provably bounded `[0, 1]`:
 * `railway-market-aggregator/src/services/indicatorService.ts` computes it
 * as `Math.abs((rsi - 50) / 50)`, and `rsi` is itself validated to
 * `[0, 100]` by `V2-200`'s `normalizeMarketUpdate`. Every threshold below
 * is derived from that proven range or from an existing real constant, not
 * chosen by feel (V2-ADR-106/107/108).
 */

/** The mathematical midpoint of trendStrength's proven [0, 1] range. */
export const TREND_BREAKOUT_ENTRY_THRESHOLD = 0.5;

/** Matches design's own worked example precedent of an equal entry/exit threshold. */
export const TREND_BREAKOUT_EXIT_THRESHOLD = TREND_BREAKOUT_ENTRY_THRESHOLD;

/**
 * Half the entry threshold: trendStrength must recover to at most half of
 * what triggered the breakout before a new one can arm.
 */
export const TREND_BREAKOUT_HYSTERESIS = TREND_BREAKOUT_ENTRY_THRESHOLD / 2;

/** 1 real second sustained, derived from SIMULATION_HZ like every other tick-count constant. */
export const TREND_BREAKOUT_CONFIRMATION_TICKS = SIMULATION_HZ;

/**
 * 10 real seconds: long enough that a market signal needs genuine
 * follow-through, not a momentary echo, to spawn a second breakout.
 * Chosen with stated reasoning, like `V2-108`'s own archetype
 * multipliers; final tuning is `V2-405`'s job.
 */
export const TREND_BREAKOUT_COOLDOWN_TICKS = 10 * SIMULATION_HZ;

/**
 * A themed wave spends several times a normal per-interval spawn budget.
 * Chosen with stated reasoning, like `TREND_BREAKOUT_COOLDOWN_TICKS`;
 * final tuning is `V2-405`'s job.
 */
export const TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER = 4;

export const TREND_BREAKOUT_SPAWN_BUDGET =
  MVP0_ENEMY_SPAWN_BUDGET * TREND_BREAKOUT_SPAWN_BUDGET_MULTIPLIER;

export const TREND_BREAKOUT_PROFILE = assertIndicatorEventProfile({
  id: 'trend-breakout',
  direction: 'above',
  entryThreshold: TREND_BREAKOUT_ENTRY_THRESHOLD,
  exitThreshold: TREND_BREAKOUT_EXIT_THRESHOLD,
  confirmationTicks: TREND_BREAKOUT_CONFIRMATION_TICKS,
  cooldownTicks: TREND_BREAKOUT_COOLDOWN_TICKS,
  hysteresis: TREND_BREAKOUT_HYSTERESIS,
  priority: 1,
  outputKind: 'SPAWN',
  compatibleWith: [],
});
