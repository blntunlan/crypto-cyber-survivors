/**
 * Config Index - Re-export all configurations
 */

// Configuration Registry (Step 6)
export { ConfigRegistry } from './ConfigRegistry';
export { CONFIG_NS, type ConfigNamespace } from './namespaces';

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

// Market runtime
export {
  getMarketRuntimeConfig,
  getMarketRuntimeMode,
  MARKET_RUNTIME_MODES,
} from './marketRuntime';
export type { MarketRuntimeMode, MarketRuntimeConfig } from './marketRuntime';
export { getDirectorRuntimeConfig } from './directorRuntime';
export type {
  DirectorRuntimeMode,
  DirectorRuntimePlan,
} from '../services/director/DirectorRuntimeMode';

// =============================================================================
// AUTO-REGISTER configs with ConfigRegistry (debug/admin tooling only)
// =============================================================================
import { ConfigRegistry } from './ConfigRegistry';
import { CONFIG_NS } from './namespaces';
import { COLORS } from './Colors';
import { PLAYER_STATS } from './PlayerConfig';
import { ENEMY_TYPES, ENEMY_SPAWN, ENEMY_SCALING } from './EnemyConfig';
import {
  DIFFICULTY_CONFIG,
  COMBAT_CONFIG,
  LEVERAGE_TIERS,
  ECONOMY_CONFIG,
} from './GameConfig';

ConfigRegistry.register(CONFIG_NS.COLORS, COLORS);
ConfigRegistry.register(CONFIG_NS.PLAYER, PLAYER_STATS);
ConfigRegistry.register(CONFIG_NS.ENEMY, { ENEMY_TYPES, ENEMY_SPAWN, ENEMY_SCALING });
ConfigRegistry.register(CONFIG_NS.GAME, {
  DIFFICULTY_CONFIG,
  COMBAT_CONFIG,
  ECONOMY_CONFIG,
});
ConfigRegistry.register(CONFIG_NS.DIFFICULTY, { LEVERAGE_TIERS });
