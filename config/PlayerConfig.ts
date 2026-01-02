/**
 * PlayerConfig - Player Base Stats and Caps
 *
 * Centralized player stat configuration for easy balancing.
 */

export const PLAYER_STATS = {
  // =========================
  // COMBAT STATS
  // =========================
  INITIAL_DAMAGE: 25,
  INITIAL_FIRE_RATE: 500, // ms between shots
  INITIAL_CRIT_CHANCE: 0.05, // 5%
  INITIAL_CRIT_DAMAGE: 2.0, // 2x multiplier
  INITIAL_AREA: 1.0,
  INITIAL_PROJECTILES: 1,

  // =========================
  // DEFENSE STATS
  // =========================
  INITIAL_HP: 100,
  INITIAL_MAX_HP: 100,
  INITIAL_ARMOR: 1, // Start with 1 so armor buffs/debuffs have effect
  INITIAL_REGEN: 0,
  INITIAL_DODGE: 0,

  // =========================
  // MOVEMENT STATS
  // =========================
  INITIAL_SPEED: 5,

  // =========================
  // ECONOMY STATS
  // =========================
  INITIAL_LUCK: 1, // Affects gem drop quality/quantity
  INITIAL_LIFESTEAL: 0, // % chance to heal on kill (0-50%)
  INITIAL_MAGNET: 30, // Base collection range
  INITIAL_EXP_MULT: 1.0,
  INITIAL_GEM_VALUE_MULT: 1.0,

  // =========================
  // PROGRESSION
  // =========================
  INITIAL_LEVEL: 1,
  INITIAL_EXP: 0,
  INITIAL_NEXT_LEVEL_EXP: 100,
  LEVEL_EXP_MULTIPLIER: 1.5, // exp needed increases by 50% each level

  // =========================
  // STAT CAPS (prevents game breaking)
  // =========================
  MAX_FIRE_RATE: 50, // minimum ms between shots
  MAX_CRIT_CHANCE: 0.95, // 95% max
  MAX_ARMOR: 15, // 75% damage reduction at max
  MAX_SPEED: 15,
  MAX_LUCK: 20, // Higher cap for better gem drops
  MAX_LIFESTEAL: 0.5, // 50% max lifesteal chance
  MAX_MAGNET: 300, // Max collection range
  MAX_AREA: 3.0, // Max projectile size multiplier
  MAX_PROJECTILES: 8,
  MAX_DODGE: 0.5, // 50%

  // =========================
  // VISUAL
  // =========================
  RADIUS: 12,
};

// Helper function to create initial player state
export function createInitialPlayer(x: number, y: number, color: string = '') {
  return {
    x,
    y,
    radius: PLAYER_STATS.RADIUS,
    color,
    hp: PLAYER_STATS.INITIAL_HP,
    maxHp: PLAYER_STATS.INITIAL_MAX_HP,
    level: PLAYER_STATS.INITIAL_LEVEL,
    exp: PLAYER_STATS.INITIAL_EXP,
    nextLevelExp: PLAYER_STATS.INITIAL_NEXT_LEVEL_EXP,
    speed: PLAYER_STATS.INITIAL_SPEED,
    fireRate: PLAYER_STATS.INITIAL_FIRE_RATE,
    critChance: PLAYER_STATS.INITIAL_CRIT_CHANCE,
    baseDamage: PLAYER_STATS.INITIAL_DAMAGE,
    luck: PLAYER_STATS.INITIAL_LUCK,
    lifesteal: PLAYER_STATS.INITIAL_LIFESTEAL,
    dodge: PLAYER_STATS.INITIAL_DODGE,
    magnet: PLAYER_STATS.INITIAL_MAGNET,
    armor: PLAYER_STATS.INITIAL_ARMOR,
    area: PLAYER_STATS.INITIAL_AREA,
    projectiles: PLAYER_STATS.INITIAL_PROJECTILES,
  };
}

// Legacy export for backwards compatibility
export const PLAYER_INITIAL_HP = PLAYER_STATS.INITIAL_HP;
export const INITIAL_FIRE_RATE = PLAYER_STATS.INITIAL_FIRE_RATE;
