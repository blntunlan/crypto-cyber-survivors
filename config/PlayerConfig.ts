import { type Player } from '../types';
import { STAT_DEFINITIONS } from './StatRegistry';

/**
 * PlayerConfig - Player Base Stats and Caps
 *
 * NOW DRIVEN BY StatRegistry.
 * KEPT FOR BACKWARD COMPATIBILITY.
 */

export const PLAYER_STATS = {
  // =========================
  // COMBAT STATS
  // =========================
  INITIAL_DAMAGE: STAT_DEFINITIONS.baseDamage.defaultValue,
  INITIAL_FIRE_RATE: STAT_DEFINITIONS.fireRate.defaultValue,
  INITIAL_CRIT_CHANCE: STAT_DEFINITIONS.critChance.defaultValue,
  INITIAL_CRIT_DAMAGE: STAT_DEFINITIONS.critDamage.defaultValue,
  INITIAL_AREA: STAT_DEFINITIONS.area.defaultValue,
  INITIAL_PROJECTILES: STAT_DEFINITIONS.projectiles.defaultValue,

  // =========================
  // DEFENSE STATS
  // =========================
  INITIAL_HP: STAT_DEFINITIONS.hp.defaultValue,
  INITIAL_MAX_HP: STAT_DEFINITIONS.maxHp.defaultValue,
  INITIAL_ARMOR: STAT_DEFINITIONS.armor.defaultValue,
  INITIAL_REGEN: STAT_DEFINITIONS.regen.defaultValue,
  INITIAL_DODGE: STAT_DEFINITIONS.dodge.defaultValue,

  // =========================
  // MOVEMENT STATS
  // =========================
  INITIAL_SPEED: STAT_DEFINITIONS.speed.defaultValue,

  // =========================
  // ECONOMY STATS
  // =========================
  INITIAL_LUCK: STAT_DEFINITIONS.luck.defaultValue,
  INITIAL_LIFESTEAL: STAT_DEFINITIONS.lifesteal.defaultValue,
  INITIAL_MAGNET: STAT_DEFINITIONS.magnet.defaultValue,
  INITIAL_EXP_MULT: 1.0,
  INITIAL_GEM_VALUE_MULT: 1.0,

  // =========================
  // PROGRESSION
  // =========================
  INITIAL_LEVEL: 1,
  INITIAL_EXP: 0,
  INITIAL_NEXT_LEVEL_EXP: 100,
  LEVEL_EXP_MULTIPLIER: 1.35, // exp needed increases by 35% each level (was 50%)

  // =========================
  // STAT CAPS (prevents game breaking)
  // =========================
  MAX_FIRE_RATE: STAT_DEFINITIONS.fireRate.cap,
  MAX_CRIT_CHANCE: STAT_DEFINITIONS.critChance.cap,
  MAX_ARMOR: STAT_DEFINITIONS.armor.cap,
  MAX_SPEED: STAT_DEFINITIONS.speed.cap,
  MAX_LUCK: STAT_DEFINITIONS.luck.cap,
  MAX_LIFESTEAL: STAT_DEFINITIONS.lifesteal.cap,
  MAX_MAGNET: STAT_DEFINITIONS.magnet.cap,
  MAX_AREA: STAT_DEFINITIONS.area.cap,
  MAX_PROJECTILES: STAT_DEFINITIONS.projectiles.cap,
  MAX_DODGE: STAT_DEFINITIONS.dodge.cap,

  // =========================
  // VISUAL
  // =========================
  RADIUS: 12,
};

// Helper function to create initial player state
// Now dynamically builds stats from registry
export function createInitialPlayer(x: number, y: number, color: string = ''): Player {
  const playerBase = {
    x,
    y,
    radius: PLAYER_STATS.RADIUS,
    color,
    level: PLAYER_STATS.INITIAL_LEVEL,
    exp: PLAYER_STATS.INITIAL_EXP,
    nextLevelExp: PLAYER_STATS.INITIAL_NEXT_LEVEL_EXP,
  };

  // Populate all stats from registry using a typed reducer
  const stats = Object.values(STAT_DEFINITIONS).reduce(
    (acc, stat) => {
      acc[stat.id] = stat.defaultValue;
      return acc;
    },
    {} as Record<string, number>
  );

  return { ...playerBase, ...stats } as unknown as Player;
}

// Legacy export for backwards compatibility
export const PLAYER_INITIAL_HP = PLAYER_STATS.INITIAL_HP;
export const INITIAL_FIRE_RATE = PLAYER_STATS.INITIAL_FIRE_RATE;
