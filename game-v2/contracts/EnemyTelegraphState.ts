/**
 * Numeric codes for the `World` telegraph columns (`V2-300`). Shared
 * between `EnemySystem` (writes `behavior` at spawn, reads `phase` for
 * movement) and `EnemyAttackSystem` (owns the phase machine) so neither
 * hardcodes the other's encoding.
 */
export const TELEGRAPH_BEHAVIOR_NONE = 0;
export const TELEGRAPH_BEHAVIOR_CHARGER = 1;
export const TELEGRAPH_BEHAVIOR_BLOATER = 2;
export const TELEGRAPH_BEHAVIOR_SNIPER = 3;

export const TELEGRAPH_PHASE_READY = 0;
export const TELEGRAPH_PHASE_TELEGRAPHING = 1;
export const TELEGRAPH_PHASE_ACTIVE = 2;
export const TELEGRAPH_PHASE_COOLDOWN = 3;
