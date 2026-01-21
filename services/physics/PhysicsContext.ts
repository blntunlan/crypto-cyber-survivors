/**
 * PhysicsContext - Dependency injection container for physics systems
 *
 * This factory creates the context object that bundles all dependencies
 * needed by CollisionSystem and CollectionSystem. Instead of importing
 * 14+ modules, physics systems receive this single context object.
 *
 * Benefits:
 * - Reduced coupling (systems depend on interfaces, not implementations)
 * - Better testability (easy to mock the context)
 * - Single source of dependency wiring
 */

import {
  type IPhysicsContext,
  type IAudioProvider,
  type IStatsProvider,
  type IPerformanceProvider,
  type IParticleConfigProvider,
  type IBuffGemProvider,
  type IComboProvider,
  type ICheatProvider,
  type ISpatialGrid,
  type IPhysicsConstants,
  type IPlayerStatCaps,
  type IPhysicsColors,
} from './PhysicsTypes';

import { type Bullet, type Player } from '../../types';
import { audio } from '../AudioService';
import { TimeService } from '../TimeService';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { ParticleConfigService } from '../ParticleConfigService';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';
import { ComboSystem } from '../ComboSystem';
import { CheatManager } from '../CheatManager';
import { bulletGrid } from '../SpatialGrid';
import { GAME_ENGINE } from '../../constants';
import { PLAYER_STATS } from '../../config/PlayerConfig';
import { COLORS } from '../../config/Colors';

// =============================================================================
// ADAPTER IMPLEMENTATIONS
// =============================================================================

/**
 * Adapter for AudioService
 */
const audioAdapter: IAudioProvider = {
  playGem: () => audio.playGem(),
  playHit: () => audio.playHit(),
  playCrit: () => audio.playCrit(),
};

/**
 * Adapter for BuffManager stats
 */
const statsAdapter: IStatsProvider = {
  isInitialized: () => BuffManager.isInitialized(),
  getMagnet: (player: Player) =>
    BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getMagnet()
      : player.magnet,
  getDodge: (player: Player) =>
    BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getDodge()
      : player.dodge,
  getArmor: (player: Player) =>
    BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getArmor()
      : player.armor,
};

/**
 * Adapter for DeviceBenchmarkService
 */
const performanceAdapter: IPerformanceProvider = {
  getPerformanceConfig: () => DeviceBenchmarkService.getPerformanceConfig(),
};

/**
 * Adapter for ParticleConfigService
 */
const particlesAdapter: IParticleConfigProvider = {
  get collect() {
    return ParticleConfigService.collect;
  },
  get impact() {
    return ParticleConfigService.impact;
  },
};

/**
 * Adapter for BuffGemSpawner
 */
const buffGemsAdapter: IBuffGemProvider = {
  getActiveGems: () => BuffGemSpawner.getActiveGems(),
  collectGem: gem => BuffGemSpawner.collectGem(gem),
};

/**
 * Adapter for ComboSystem
 */
const comboAdapter: IComboProvider = {
  getXpMultiplier: () => ComboSystem.getXpMultiplier(),
};

/**
 * Adapter for CheatManager
 */
const cheatAdapter: ICheatProvider = {
  isGodMode: () => CheatManager.isGodMode(),
};

/**
 * Adapter for SpatialGrid
 */
const bulletGridAdapter: ISpatialGrid<Bullet> = {
  getNearby: (x: number, y: number) => bulletGrid.getNearby(x, y),
  getNearbyInto: (x: number, y: number, target: Bullet[]) =>
    bulletGrid.getNearbyInto(x, y, target),
  forEachNearby: (x: number, y: number, callback: (entity: Bullet) => void) =>
    bulletGrid.forEachNearby(x, y, callback),
};

/**
 * Constants subset for physics
 */
const physicsConstants: IPhysicsConstants = {
  GEM_MAGNET_BASE_RANGE: GAME_ENGINE.GEM_MAGNET_BASE_RANGE,
  ENEMY_OFFSCREEN_THRESHOLD: GAME_ENGINE.ENEMY_OFFSCREEN_THRESHOLD,
  BULLET_SPEED: GAME_ENGINE.BULLET_SPEED,
  HIT_STOP_NORMAL: GAME_ENGINE.HIT_STOP_NORMAL,
  HIT_STOP_CRIT: GAME_ENGINE.HIT_STOP_CRIT,
  NEAR_MISS_THRESHOLD: GAME_ENGINE.NEAR_MISS_THRESHOLD,
  getGameTime: () => TimeService.getGameTime(),
};

/**
 * Player stat caps for physics
 */
const statCaps: IPlayerStatCaps = {
  MAX_MAGNET: PLAYER_STATS.MAX_MAGNET,
  MAX_DODGE: PLAYER_STATS.MAX_DODGE,
  MAX_ARMOR: PLAYER_STATS.MAX_ARMOR,
};

/**
 * Colors subset for physics
 */
export const physicsColors: IPhysicsColors = {
  BULLET: COLORS.BULLET,
  CRIT: COLORS.CRIT,
  SUPER_CRIT: COLORS.SUPER_CRIT,
  CASINO_RED: COLORS.CASINO_RED,
  CASINO_GOLD: COLORS.CASINO_GOLD,
  SLOT_SILVER: COLORS.SLOT_SILVER,
};

// =============================================================================
// CONTEXT FACTORY
// =============================================================================

/**
 * Default physics context using real implementations
 */
export const defaultPhysicsContext: IPhysicsContext = {
  audio: audioAdapter,
  stats: statsAdapter,
  performance: performanceAdapter,
  particles: particlesAdapter,
  buffGems: buffGemsAdapter,
  combo: comboAdapter,
  cheat: cheatAdapter,
  bulletGrid: bulletGridAdapter,
  constants: physicsConstants,
  statCaps: statCaps,
};

/**
 * Create a physics context with optional overrides for testing
 */
export function createPhysicsContext(
  overrides: Partial<IPhysicsContext> = {}
): IPhysicsContext {
  return {
    ...defaultPhysicsContext,
    ...overrides,
  };
}

/**
 * Get the default physics context
 * Use this in production code
 */
export function getPhysicsContext(): IPhysicsContext {
  return defaultPhysicsContext;
}
