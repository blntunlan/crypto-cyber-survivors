/**
 * Config Index - Re-export all configurations
 */

// Colors (independent - no dependencies)
export { COLORS } from './Colors';
export type { ColorKey } from './Colors';

// Player
export {
  PLAYER_STATS,
  createInitialPlayer,
  PLAYER_INITIAL_HP,
  INITIAL_FIRE_RATE,
} from './PlayerConfig';

// Enemy
export {
  ENEMY_TYPES,
  ENEMY_SPAWN,
  ENEMY_SCALING,
  ENEMY_BASE_SPEED,
} from './EnemyConfig';
export type { EnemyType, EnemyTypeConfig } from './EnemyConfig';

// Game
export {
  DIFFICULTY_CONFIG,
  COMBAT_CONFIG,
  VISUAL_CONFIG,
  UI_CONFIG,
  LEVERAGE_TIERS,
  ECONOMY_CONFIG,
  CHEAT_CONFIG,
} from './GameConfig';
export type { WavePhase } from './GameConfig';
