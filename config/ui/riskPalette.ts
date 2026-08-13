/**
 * Risk Palette - Casino signage accents for position CTAs and the leverage ladder.
 *
 * The deep "table" tones (CASINO_RED firebrick, CASINO_GREEN roulette felt) read as
 * muddy brown on the dark menu surface once the selection card mixes them down to
 * 5-22% against the inset background. Interactive risk surfaces therefore use the
 * high-luminance neon signage tones of the same palette so the ramp stays legible
 * and every step carries the same visual weight.
 *
 * Single source of truth: the menu label ("SAFE"/"DEGEN") and the chip colour are
 * driven by the same tier table, so they can never disagree.
 */

import { COLORS } from '../Colors';

export type LeverageRiskTier = {
  /** Inclusive upper bound of the tier. */
  readonly maxLeverage: number;
  readonly color: string;
  readonly labelKey: string;
};

/** Ordered low → high risk. Must stay aligned with `LEVERAGE_OPTIONS` in types.ts. */
export const LEVERAGE_RISK_TIERS: readonly LeverageRiskTier[] = [
  { maxLeverage: 1, color: COLORS.NEON_GREEN, labelKey: 'common.menu.lev_spot' },
  { maxLeverage: 2, color: COLORS.NEON_GREEN, labelKey: 'common.menu.lev_safe' },
  {
    maxLeverage: 5,
    color: COLORS.JACKPOT_YELLOW,
    labelKey: 'common.menu.lev_standard',
  },
  { maxLeverage: 10, color: COLORS.NEON_ORANGE, labelKey: 'common.menu.lev_risky' },
  {
    maxLeverage: Number.POSITIVE_INFINITY,
    color: COLORS.DUMP_ORANGE,
    labelKey: 'common.menu.lev_degen',
  },
] as const;

const HIGHEST_RISK_TIER = LEVERAGE_RISK_TIERS[LEVERAGE_RISK_TIERS.length - 1]!;

export const getLeverageRiskTier = (leverage: number): LeverageRiskTier =>
  LEVERAGE_RISK_TIERS.find(tier => leverage <= tier.maxLeverage) ?? HIGHEST_RISK_TIER;

/** Both ends of the risk ramp, reused for the leverage strip backdrop. */
export const LEVERAGE_RAMP_STOPS = [
  COLORS.NEON_GREEN,
  COLORS.JACKPOT_YELLOW,
  COLORS.NEON_ORANGE,
  COLORS.DUMP_ORANGE,
] as const;

/**
 * Position CTAs. LONG shares the safe end of the leverage ramp and SHORT its degen
 * end, so the menu reads as one risk system instead of three unrelated greens/reds.
 */
export const POSITION_ACCENTS = {
  LONG: COLORS.NEON_GREEN,
  SHORT: COLORS.DUMP_ORANGE,
} as const;
