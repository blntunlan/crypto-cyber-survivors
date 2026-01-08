/**
 * BuffGemSpawner - Spawns buff gems based on volume/volatility changes
 *
 * Monitors market volatility (difficulty) and spawns buff gems at random
 * positions when significant changes occur. Gems despawn after 5 seconds.
 *
 * Integration:
 * - Call update() each frame with current difficulty
 * - Gems are managed in PoolManager-like arrays
 * - PhysicsSystem handles collection detection
 */

import { type BuffGem, type BuffGemType, BUFF_GEM_CONFIGS } from '../../types/BuffGem';
import { type DecoratorConstructor } from '../patterns/decorators/BaseDecorator';
import {
  RageModeDecorator,
  DiamondHandsDecorator,
  BerserkDecorator,
  LuckBoostDecorator,
  SlowDecorator,
  VulnerableDecorator,
} from '../patterns/decorators';
import { Logger } from '../Logger';
import { EventBus } from '../EventBus';

// Map buff types to decorator classes
const BUFF_DECORATORS: Record<BuffGemType, DecoratorConstructor> = {
  rage: RageModeDecorator,
  diamond: DiamondHandsDecorator,
  berserk: BerserkDecorator,
  lucky: LuckBoostDecorator,
  slow: SlowDecorator,
  vulnerable: VulnerableDecorator,
};

// Only spawn positive buffs (debuff gems are much rarer)
const POSITIVE_BUFF_TYPES: BuffGemType[] = ['rage', 'diamond', 'berserk', 'lucky'];
const NEGATIVE_BUFF_TYPES: BuffGemType[] = ['slow', 'vulnerable'];

interface SpawnerConfig {
  /** Minimum volatility change to trigger spawn (as multiplier diff) */
  volatilityThreshold: number;
  /** Cooldown between spawns in ms */
  spawnCooldown: number;
  /** Max active buff gems at once */
  maxActiveGems: number;
  /** Gem lifetime in ms */
  gemLifetime: number;
  /** Gem radius */
  gemRadius: number;
  /** Chance to spawn debuff gem instead of buff (0-1) */
  debuffChance: number;
}

const DEFAULT_CONFIG: SpawnerConfig = {
  volatilityThreshold: 0.15,
  spawnCooldown: 3000,
  maxActiveGems: 3,
  gemLifetime: 5000,
  gemRadius: 20,
  debuffChance: 0.1,
};

class BuffGemSpawnerClass {
  private static instance: BuffGemSpawnerClass | null = null;

  private config: SpawnerConfig = DEFAULT_CONFIG;
  private activeGems: BuffGem[] = [];
  private freeGems: BuffGem[] = [];

  private lastDifficulty: number = 1;
  private lastSpawnTime: number = 0;
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  /** Game start timestamp - no spawns for first 10 seconds */
  private gameStartTime: number = 0;
  private static readonly GRACE_PERIOD_MS = 10000; // 10 seconds

  /** Track collected permanent buffs so they don't spawn again */
  private collectedPermanentBuffs: Set<BuffGemType> = new Set();

  private constructor() {
    // Listen for game reset to clear all gems
    EventBus.on('gameReset', () => {
      this.reset();
    });
  }

  static getInstance(): BuffGemSpawnerClass {
    return (BuffGemSpawnerClass.instance ??= new BuffGemSpawnerClass());
  }

  /**
   * Initialize spawner with screen dimensions
   */
  initialize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.activeGems = [];
    this.lastDifficulty = 1;
    this.lastSpawnTime = 0;
    this.gameStartTime = Date.now();
    this.collectedPermanentBuffs.clear();
    Logger.debug('[BuffGemSpawner] Initialized');
  }

  /**
   * Update screen dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  /**
   * Main update loop - call each frame
   * @param difficulty Current market difficulty/volatility
   * @param deltaMs Time since last frame in ms
   */
  update(difficulty: number, deltaMs: number): void {
    const now = Date.now();

    // Update existing gems (pulse animation, lifetime check)
    this.updateActiveGems(deltaMs);

    // Grace period: no spawns for first 10 seconds
    const timeSinceStart = now - this.gameStartTime;
    if (timeSinceStart < BuffGemSpawnerClass.GRACE_PERIOD_MS) {
      this.lastDifficulty = difficulty;
      return;
    }

    // Check for volatility spike
    const diffChange = Math.abs(difficulty - this.lastDifficulty);
    const canSpawn =
      now - this.lastSpawnTime >= this.config.spawnCooldown &&
      this.activeGems.length < this.config.maxActiveGems;

    if (diffChange >= this.config.volatilityThreshold && canSpawn) {
      this.spawnRandomBuffGem();
      this.lastSpawnTime = now;
    }

    this.lastDifficulty = difficulty;
  }

  /**
   * Update active gems - handle lifetime and animations
   */
  private updateActiveGems(deltaMs: number): void {
    for (let i = this.activeGems.length - 1; i >= 0; i--) {
      const gem = this.activeGems[i];
      if (!gem) continue;

      // Update pulse animation
      gem.pulsePhase += deltaMs * 0.005;
      if (gem.pulsePhase > Math.PI * 2) {
        gem.pulsePhase -= Math.PI * 2;
      }

      // Check lifetime expiration
      gem.elapsedLifetime += deltaMs;
      if (gem.elapsedLifetime >= gem.lifetime) {
        gem.active = false;
        this.releaseGem(gem);
        Logger.debug(`[BuffGemSpawner] Gem expired: ${gem.buffType}`);
      }
    }
  }

  /**
   * Spawn a random buff gem at a random position
   */
  private spawnRandomBuffGem(): void {
    // Decide if this is a debuff
    const isDebuff = Math.random() < this.config.debuffChance;
    const buffTypes = isDebuff ? NEGATIVE_BUFF_TYPES : POSITIVE_BUFF_TYPES;

    // Select random buff type based on rarity weights
    const buffType = this.selectWeightedBuffType(buffTypes);
    if (!buffType) return;

    // Random position (avoid edges and center where player usually is)
    const margin = 80;
    const x = margin + Math.random() * (this.screenWidth - margin * 2);
    const y = margin + Math.random() * (this.screenHeight - margin * 2);

    this.spawnGem(buffType, x, y);
  }

  /**
   * Select a buff type weighted by rarity
   */
  private selectWeightedBuffType(types: BuffGemType[]): BuffGemType | null {
    // Filter out already collected permanent buffs
    const availableTypes = types.filter(t => !this.collectedPermanentBuffs.has(t));

    if (availableTypes.length === 0) {
      return null;
    }

    const totalWeight = availableTypes.reduce((sum, t) => sum + BUFF_GEM_CONFIGS[t].rarity, 0);
    let random = Math.random() * totalWeight;

    for (const type of availableTypes) {
      random -= BUFF_GEM_CONFIGS[type].rarity;
      if (random <= 0) {
        return type;
      }
    }
    return availableTypes[0] ?? null;
  }

  /**
   * Spawn a specific buff gem at position
   */
  spawnGem(buffType: BuffGemType, x: number, y: number): BuffGem {
    const config = BUFF_GEM_CONFIGS[buffType];
    const now = Date.now();

    // Get from pool or create new
    let gem = this.freeGems.pop();
    if (!gem) {
      gem = {
        active: true,
        x,
        y,
        radius: this.config.gemRadius,
        color: config.color,
        icon: config.icon,
        buffType,
        decoratorClass: BUFF_DECORATORS[buffType],
        spawnTime: now,
        elapsedLifetime: 0,
        lifetime: this.config.gemLifetime,
        pulsePhase: 0,
      };
    } else {
      Object.assign(gem, {
        active: true,
        x,
        y,
        radius: this.config.gemRadius,
        color: config.color,
        icon: config.icon,
        buffType,
        decoratorClass: BUFF_DECORATORS[buffType],
        spawnTime: now,
        elapsedLifetime: 0,
        lifetime: this.config.gemLifetime,
        pulsePhase: 0,
      });
    }

    this.activeGems.push(gem);

    EventBus.emit('buffGemSpawned', {
      type: buffType,
      x,
      y,
      isDebuff: config.isDebuff,
    });

    Logger.debug(`[BuffGemSpawner] Spawned ${buffType} gem at (${x.toFixed(0)}, ${y.toFixed(0)})`);

    return gem;
  }

  /**
   * Release gem back to pool
   */
  private releaseGem(gem: BuffGem): void {
    const index = this.activeGems.indexOf(gem);
    if (index > -1) {
      this.activeGems.splice(index, 1);
      this.freeGems.push(gem);
    }
  }

  /**
   * Called when player collects a gem
   */
  collectGem(gem: BuffGem): void {
    gem.active = false;
    this.releaseGem(gem);

    // Check if this is a permanent buff (duration === -1)
    // If so, add to collected set so it won't spawn again
    const decoratorInstance = new gem.decoratorClass({
      getDamage: () => 0,
      getSpeed: () => 0,
      getFireRate: () => 0,
      getCritChance: () => 0,
      getCritDamage: () => 0,
      getArmor: () => 0,
      getMagnet: () => 0,
      getProjectiles: () => 1,
      getArea: () => 1,
      getLuck: () => 0,
      getLifesteal: () => 0,
      getDodge: () => 0,
    });

    if (decoratorInstance.getDuration() === -1) {
      this.collectedPermanentBuffs.add(gem.buffType);
      Logger.info(`[BuffGemSpawner] Permanent buff collected: ${gem.buffType} - won't spawn again`);
    }

    EventBus.emit('buffGemCollected', {
      type: gem.buffType,
      decoratorClass: gem.decoratorClass.name,
    });

    Logger.debug(`[BuffGemSpawner] Collected ${gem.buffType} gem`);
  }

  /**
   * Get all active gems (for rendering and collision)
   */
  getActiveGems(): BuffGem[] {
    return this.activeGems;
  }

  /**
   * Force spawn a gem (for testing/debugging)
   */
  forceSpawn(buffType?: BuffGemType): BuffGem | null {
    const type =
      buffType ?? POSITIVE_BUFF_TYPES[Math.floor(Math.random() * POSITIVE_BUFF_TYPES.length)]!;
    const x = this.screenWidth / 2 + (Math.random() - 0.5) * 200;
    const y = this.screenHeight / 2 + (Math.random() - 0.5) * 200;
    return this.spawnGem(type, x, y);
  }

  /**
   * Clear all active gems
   */
  clearAll(): void {
    while (this.activeGems.length) {
      const gem = this.activeGems.pop()!;
      gem.active = false;
      this.freeGems.push(gem);
    }
  }

  /**
   * Reset spawner state
   */
  reset(): void {
    this.clearAll();
    this.lastDifficulty = 1;
    this.lastSpawnTime = 0;
    this.gameStartTime = Date.now();
    this.collectedPermanentBuffs.clear();
  }

  /**
   * Configure spawner
   */
  configure(config: Partial<SpawnerConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get remaining lifetime ratio for a gem (0-1)
   */
  getGemLifetimeRatio(gem: BuffGem): number {
    return Math.max(0, 1 - gem.elapsedLifetime / gem.lifetime);
  }
}

export const BuffGemSpawner = BuffGemSpawnerClass.getInstance();
