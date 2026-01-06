/**
 * CombatConfig - Configuration constants for combat resolution.
 *
 * Centralizes all magic numbers from CombatResolutionService
 * for easier tuning and testing.
 */

export const COMBAT_CONFIG = {
  /** Shockwave physics */
  SHOCKWAVE: {
    BASE_FORCE: 15, // Base knockback force
    STAGGER_DURATION: 0.5, // Stagger duration in seconds
  },

  /** Lifesteal mechanics */
  LIFESTEAL: {
    HEAL_AMOUNT_NORMAL: 3, // HP healed on normal kill
    HEAL_AMOUNT_WHALE: 8, // HP healed on whale kill
  },

  /** Death particle effects */
  PARTICLES: {
    NORMAL_COUNT: 10, // Particles on normal death
    SUPER_CRIT_COUNT: 30, // Particles on super crit death
    VELOCITY_RANGE: 6, // Max velocity for particles
  },

  /** Gem drops */
  GEMS: {
    BASE_VALUE_NORMAL: 15, // XP value for normal enemy gem
    BASE_VALUE_WHALE: 100, // XP value for whale enemy gem
    RARE_MULTIPLIER: 3, // Rare gems are worth 3x
    RARE_SIZE: 10, // Rare gem size
    NORMAL_SIZE: 7, // Normal gem size
    BONUS_SIZE: 5, // Bonus gem size
    BONUS_OFFSET: 20, // Max random offset for bonus gems
  },

  /** Luck mechanics */
  LUCK: {
    BASE_RARE_CHANCE: 0.05, // 5% base rare gem chance
    RARE_CHANCE_PER_LUCK: 0.03, // +3% per luck point
    MAX_RARE_CHANCE: 0.5, // Cap at 50%
    BONUS_GEM_CHANCE_PER_LUCK: 0.1, // 10% per luck point
    MAX_BONUS_GEM_CHANCE: 0.5, // Cap at 50%
    VALUE_BONUS_PER_LUCK: 0.01, // +1% value per luck point
    BONUS_VALUE_MULTIPLIER: 0.5, // Bonus gems worth 50% of base
  },
} as const;

export type CombatConfig = typeof COMBAT_CONFIG;
