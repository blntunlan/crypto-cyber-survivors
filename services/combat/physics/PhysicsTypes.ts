/**
 * PhysicsTypes - Shared interfaces for physics systems
 *
 * This file provides abstraction layers for physics systems to reduce
 * direct coupling to concrete implementations. Systems depend on interfaces
 * rather than specific services.
 *
 * @note This improves testability and reduces import count in physics modules.
 */

import {
  type Particle,
  type Gem,
  type Enemy,
  type Bullet,
  type Player,
} from '../../../types';
import { type BuffGem } from '../../../types/BuffGem';
import { type PerformanceConfig } from '../../../types/DeviceProfile';

// =============================================================================
// POOL PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for entity pool operations
 * Abstracts PoolManager to allow testing with mocks
 */
export interface IPoolProvider {
  activeGems: Gem[];
  activeEnemies: Enemy[];
  activeBullets: Bullet[];

  getParticle(x: number, y: number, vx: number, vy: number, color: string): Particle;
  getFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size: number
  ): void;
}

// =============================================================================
// AUDIO PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for audio playback
 */
export interface IAudioProvider {
  playGem(): void;
  playHit(): void;
  playCrit(): void;
}

// =============================================================================
// STATS PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for player stat retrieval with buff decoration
 */
export interface IStatsProvider {
  isInitialized(): boolean;
  getMagnet(player: Player): number;
  getDodge(player: Player): number;
  getArmor(player: Player): number;
}

// =============================================================================
// PERFORMANCE PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for performance configuration
 */
export interface IPerformanceProvider {
  getPerformanceConfig(): PerformanceConfig;
}

// =============================================================================
// PARTICLE CONFIG INTERFACE
// =============================================================================

export interface IParticleConfig {
  count: number;
  speed: number;
  life: number;
  radius?: number;
}

export interface IParticleConfigProvider {
  collect: IParticleConfig;
  impact: IParticleConfig;
}

// =============================================================================
// BUFF GEM PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for buff gem operations
 */
export interface IBuffGemProvider {
  getActiveGems(): BuffGem[];
  collectGem(gem: BuffGem): void;
}

// =============================================================================
// COMBO PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for combo system operations
 */
export interface IComboProvider {
  getXpMultiplier(): number;
}

// =============================================================================
// CHEAT PROVIDER INTERFACE
// =============================================================================

/**
 * Interface for cheat state checks
 */
export interface ICheatProvider {
  isGodMode(): boolean;
}

// =============================================================================
// SPATIAL GRID INTERFACE
// =============================================================================

/**
 * Interface for spatial queries
 */
export interface ISpatialGrid<T> {
  getNearby(x: number, y: number): T[];
  forEachNearby(x: number, y: number, callback: (entity: T) => void): void;
}

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================

/**
 * Constants needed by physics systems
 * Extracted to reduce coupling to constants.ts
 */
export interface IPhysicsConstants {
  GEM_MAGNET_BASE_RANGE: number;
  ENEMY_OFFSCREEN_THRESHOLD: number;
  BULLET_SPEED: number;
  HIT_STOP_NORMAL: number;
  HIT_STOP_CRIT: number;
  NEAR_MISS_THRESHOLD: number;
  getGameTime(): number;
}

/**
 * Player stat caps needed by physics systems
 */
export interface IPlayerStatCaps {
  MAX_MAGNET: number;
  MAX_DODGE: number;
  MAX_ARMOR: number;
}

// =============================================================================
// PHYSICS CONTEXT
// =============================================================================

/**
 * PhysicsContext bundles all dependencies needed by physics systems
 * Pass this context instead of importing 14 different modules
 */
export interface IPhysicsContext {
  audio: IAudioProvider;
  stats: IStatsProvider;
  performance: IPerformanceProvider;
  particles: IParticleConfigProvider;
  buffGems: IBuffGemProvider;
  combo: IComboProvider;
  cheat: ICheatProvider;
  bulletGrid: ISpatialGrid<Bullet>;
  constants: IPhysicsConstants;
  statCaps: IPlayerStatCaps;
}

// =============================================================================
// COLORS SUBSET FOR PHYSICS
// =============================================================================

/**
 * Color constants needed by physics systems
 */
export interface IPhysicsColors {
  BULLET: string;
  CRIT: string;
  SUPER_CRIT: string;
  CASINO_RED: string;
  CASINO_GOLD: string;
  SLOT_SILVER: string;
}
