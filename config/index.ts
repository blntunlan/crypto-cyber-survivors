/**
 * Config Index - Re-export all configurations
 */

// Player
export {
  PLAYER_STATS,
  createInitialPlayer,
  PLAYER_INITIAL_HP,
  INITIAL_FIRE_RATE,
} from './PlayerConfig';

// Enemy
export { ENEMY_TYPES, ENEMY_SPAWN, ENEMY_SCALING, ENEMY_BASE_SPEED } from './EnemyConfig';
export type { EnemyType, EnemyTypeConfig } from './EnemyConfig';

// Game
export {
  WAVE_CONFIG,
  DIFFICULTY_CONFIG,
  COMBAT_CONFIG,
  VISUAL_CONFIG,
  UI_CONFIG,
} from './GameConfig';
export type { WavePhase } from './GameConfig';
