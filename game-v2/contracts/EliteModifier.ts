/**
 * Elite modifier codes (`V2-301`), mirroring `EnemyTelegraphState.ts`'s own
 * centralized-integer-code precedent so `EnemyComposer`/`EnemySystem`/
 * `CombatSystem` share one encoding instead of duplicating magic numbers.
 *
 * Exactly one modifier applies per elite entity — they are not stackable.
 */
export const ELITE_MODIFIER_NONE = 0;
export const ELITE_MODIFIER_TOUGH = 1;
export const ELITE_MODIFIER_SWIFT = 2;
export const ELITE_MODIFIER_VOLATILE = 3;

export type EliteModifierId =
  | typeof ELITE_MODIFIER_NONE
  | typeof ELITE_MODIFIER_TOUGH
  | typeof ELITE_MODIFIER_SWIFT
  | typeof ELITE_MODIFIER_VOLATILE;

/** The non-`NONE` modifiers `EnemyComposer` rolls uniformly among. */
export const ELITE_MODIFIER_KINDS: readonly EliteModifierId[] = [
  ELITE_MODIFIER_TOUGH,
  ELITE_MODIFIER_SWIFT,
  ELITE_MODIFIER_VOLATILE,
];
