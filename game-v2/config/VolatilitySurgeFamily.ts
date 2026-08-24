import { SIMULATION_HZ } from '@/game-v2/config/Mvp0Config';
import { assertIndicatorEventProfile } from '@/game-v2/contracts/IndicatorEventProfile';

/**
 * The Volatility Surge indicator-event family (design §6.2/§7.4, `V2-205`).
 *
 * `atrPercent` has no proven upper bound (`(atr / close) * 100`,
 * non-negative, but with no ceiling any validator enforces) — a different
 * anchor strategy than `V2-204`'s `trendStrength` midpoint. Instead, the
 * entry threshold reuses `railway-market-aggregator/src/indicators/ATRCalculator.ts`'s
 * own real, already-calibrated tier boundaries (Calm `< 0.005`, Normal
 * `< 0.015`, Volatile `< 0.03`, Chaos `>= 0.03`) — an indicator
 * classification fact, the same class of value `V2-200`'s `rsiState`
 * already carries through, not the excluded legacy gameplay-multiplier
 * *output* (`getSpawnRateMultiplier`'s return value, V2-ADR-085).
 */

/** ATRCalculator's own real "Chaos" tier boundary. */
export const VOLATILITY_SURGE_ENTRY_THRESHOLD = 0.03;

/** Matches design's own worked example precedent of an equal entry/exit threshold. */
export const VOLATILITY_SURGE_EXIT_THRESHOLD = VOLATILITY_SURGE_ENTRY_THRESHOLD;

/**
 * ATRCalculator's own real "Normal"/"Volatile" tier boundary: atrPercent
 * must recover to at most the real "Normal" volatility band before a new
 * surge can be flagged.
 */
export const VOLATILITY_SURGE_HYSTERESIS = VOLATILITY_SURGE_ENTRY_THRESHOLD - 0.015;

/** Matches V2-204's own derived duration: no family-specific reason to differ. */
export const VOLATILITY_SURGE_CONFIRMATION_TICKS = SIMULATION_HZ;

/** Matches V2-204's own derived duration and reasoning. */
export const VOLATILITY_SURGE_COOLDOWN_TICKS = 10 * SIMULATION_HZ;

/**
 * 2 real seconds: no hazard/telegraph system or constant exists yet to
 * anchor to. Chosen with stated reasoning, like V2-204's spawn-budget
 * multiplier; final tuning is V2-405's job.
 */
export const VOLATILITY_SURGE_TELEGRAPH_TICKS = 2 * SIMULATION_HZ;

export const VOLATILITY_SURGE_PROFILE = assertIndicatorEventProfile({
  id: 'volatility-surge',
  direction: 'above',
  entryThreshold: VOLATILITY_SURGE_ENTRY_THRESHOLD,
  exitThreshold: VOLATILITY_SURGE_EXIT_THRESHOLD,
  confirmationTicks: VOLATILITY_SURGE_CONFIRMATION_TICKS,
  cooldownTicks: VOLATILITY_SURGE_COOLDOWN_TICKS,
  hysteresis: VOLATILITY_SURGE_HYSTERESIS,
  priority: 1,
  outputKind: 'WORLD_EVENT',
  compatibleWith: [],
});
