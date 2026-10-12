import { MVP1_ABILITY_REGISTRY } from '@/game-v2/config/AbilityRegistry';
import {
  CONVERGENCE_THRESHOLD,
  LEVEL_2_XP_THRESHOLD,
  PLAYER_STARTING_LEVEL,
} from '@/game-v2/config/Mvp0Config';
import { MVP1_PASSIVE_REGISTRY } from '@/game-v2/config/PassiveRegistry';
import { ABILITY_MAX_TIER, ABILITY_SLOT_COUNT } from '@/game-v2/contracts/AbilitySlot';
import { PASSIVE_MAX_LEVEL, PASSIVE_SLOT_COUNT } from '@/game-v2/contracts/PassiveSlot';

/**
 * The repeating level curve (`V2-112`, V2-ADR-080 and V2-ADR-082).
 *
 * Lives in its own module rather than in `Mvp0Config.ts` for the same reason
 * `ProjectileCapacity.ts` does: it is derived from the registries, and both
 * registries already import their constants from `Mvp0Config.ts`, so deriving
 * it there would close an import cycle.
 */

/**
 * Every upgrade pick a player can still be offered, given the content that
 * actually exists.
 *
 * Keyed off registry **size**, not slot capacity alone: a slot with no
 * registered identity to put in it is not a reachable pick. MVP-1 registers
 * eight abilities but only one passive (`V2-401` authors the other nine in
 * MVP-4), so today the six passive slots contribute one slot's worth. When
 * `V2-401` lands, this grows on its own.
 *
 * Acquiring an ability counts as its Tier 1, so three picks complete an ability
 * and five complete a passive — minus the starting weapon, which design §5.1
 * grants before the run rather than offering as a card. `WeaponSystem.
 * resetPlayer` seats it at Tier 1, so exactly one Tier-1 acquisition is free
 * and the offer pool is one pick smaller than raw capacity.
 */
export const GRANTED_STARTING_WEAPON_PICKS = 1;

export const MVP1_TOTAL_BUILD_PICKS =
  Math.min(ABILITY_SLOT_COUNT, MVP1_ABILITY_REGISTRY.size) * ABILITY_MAX_TIER -
  GRANTED_STARTING_WEAPON_PICKS +
  Math.min(PASSIVE_SLOT_COUNT, MVP1_PASSIVE_REGISTRY.size) * PASSIVE_MAX_LEVEL;

/**
 * The level at which nothing is offerable any more.
 *
 * Derived so the cap and pool exhaustion coincide by construction, which is
 * what keeps `LevelUpOfferSystem.generateOffer`'s `no offerable candidates
 * exist` throw unreachable through ordinary play instead of needing a second
 * guard that could drift from the registries.
 */
export const MVP1_MAX_PLAYER_LEVEL = PLAYER_STARTING_LEVEL + MVP1_TOTAL_BUILD_PICKS;

const cumulativeXpForStep = (step: number): number => {
  let total = 0;

  for (let pick = 0; pick < MVP1_TOTAL_BUILD_PICKS; pick += 1) {
    total += LEVEL_2_XP_THRESHOLD + step * pick;
  }

  return total;
};

/**
 * The largest integer step for which a fully capped build still completes
 * inside `V2-109`'s Convergence baseline (V2-ADR-082).
 *
 * Computed rather than written down so it re-derives itself when the registries
 * grow: at today's 17 picks it resolves to `17` (2397 XP, 479.4 of the 480-kill
 * baseline — the build finishes just as the boss threshold arrives), and at the
 * post-`V2-401` 42 picks it resolves to `2`.
 */
export const LEVEL_XP_STEP = ((): number => {
  let step = 0;

  while (cumulativeXpForStep(step + 1) <= CONVERGENCE_THRESHOLD) {
    step += 1;
  }

  return step;
})();

/** Total XP needed to climb from `PLAYER_STARTING_LEVEL` to `MVP1_MAX_PLAYER_LEVEL`. */
export const MVP1_FULL_BUILD_XP_COST = cumulativeXpForStep(LEVEL_XP_STEP);

/**
 * XP required to advance from `level` to `level + 1`.
 *
 * Anchored on `LEVEL_2_XP_THRESHOLD`, so the first level-up still costs exactly
 * one grunt kill. Throws for a level outside the curve, including
 * `MVP1_MAX_PLAYER_LEVEL` itself — a capped player has no next level to buy.
 */
export const levelXpThreshold = (level: number): number => {
  if (
    !Number.isInteger(level) ||
    level < PLAYER_STARTING_LEVEL ||
    level >= MVP1_MAX_PLAYER_LEVEL
  ) {
    throw new RangeError('level must be an integer inside the level curve');
  }

  return LEVEL_2_XP_THRESHOLD + LEVEL_XP_STEP * (level - PLAYER_STARTING_LEVEL);
};

/** The step one higher than `LEVEL_XP_STEP`, exported so a test can pin maximality. */
export const cumulativeXpForStepAbove = (): number =>
  cumulativeXpForStep(LEVEL_XP_STEP + 1);
