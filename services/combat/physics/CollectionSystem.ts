import { type IPoolManager } from '../../interfaces/IPoolManager';
import { type Player, type GameState, type Gem } from '../../../types';
import { type BuffGem } from '../../../types/BuffGem';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext } from './PhysicsContext';
import { EventBus } from '../../core/EventBus';
import { BuffManager } from '../../patterns/decorators/BuffManager';
import { lerp } from '../../../utils/math';
import { type ICollectionSystem } from '../../interfaces/IPhysicsSubsystems';
import { GAME_ENGINE } from '../../../constants';
import { ECONOMY_CONFIG } from '../../../config';

/**
 * CollectionSystem - Handles player interaction with collectible items (Gems, BuffGems).
 *
 * Responsibilities:
 * - Detecting collision between player and collectibles
 * - Implementing "Magnet" logic (pulling gems toward the player)
 * - Handling XP gain and level-up triggering
 * - Triggering visual and audio feedback (particles, sounds, floating text)
 */
export class CollectionSystem implements ICollectionSystem {
  private ctx: IPhysicsContext;

  constructor(context: IPhysicsContext = getPhysicsContext()) {
    this.ctx = context;
  }

  /**
   * Set a custom context (primarily for unit testing or theme-specific physics)
   */
  public setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default production context
   */
  public resetContext(): void {
    this.ctx = getPhysicsContext();
  }

  /**
   * Main update entry point for the collection system.
   */
  public update(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number
  ): void {
    const rawMagnet = this.ctx.stats.getMagnet(player);
    const effectiveMagnet = Math.min(rawMagnet, this.ctx.statCaps.MAX_MAGNET);

    this.handleGemCollections(pool, player, state, dtFactor, effectiveMagnet);
    this.handleBuffGemCollections(pool, player, state, dtFactor, effectiveMagnet);
  }

  /**
   * Processes all active standard XP gems.
   */
  private handleGemCollections(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    pool.activeGems.forEach(gem => {
      // 1. Lifetime check - gems despawn if not collected
      gem.elapsedLifetime ??= 0;
      gem.elapsedLifetime += dtFactor * GAME_ENGINE.MS_PER_FRAME;

      if (gem.elapsedLifetime >= ECONOMY_CONFIG.GEMS.LIFETIME_MS) {
        gem.active = false;
        return;
      }

      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      const pickupDist = player.radius + gem.radius;
      if (distSq < pickupDist * pickupDist) {
        this.collectGem(pool, player, gem, state);
        return;
      }

      if (gem.magnetized) {
        gem.vx ??= 0;
        gem.vy ??= 0;

        const dist = Math.sqrt(distSq);
        if (dist < 0.001) {
          return;
        }
        const tx = (dx / dist) * GAME_ENGINE.GEM_MAX_PULL_SPEED;
        const ty = (dy / dist) * GAME_ENGINE.GEM_MAX_PULL_SPEED;

        gem.vx = lerp(gem.vx, tx, GAME_ENGINE.GEM_STEER_FACTOR * dtFactor);
        gem.vy = lerp(gem.vy, ty, GAME_ENGINE.GEM_STEER_FACTOR * dtFactor);

        gem.x += gem.vx * dtFactor;
        gem.y += gem.vy * dtFactor;
      } else {
        const magnetRange = this.ctx.constants.GEM_MAGNET_BASE_RANGE + effectiveMagnet;
        const rangeSq = magnetRange * magnetRange;

        if (distSq < rangeSq && gem.elapsedLifetime > GAME_ENGINE.GEM_MAGNET_DELAY) {
          gem.magnetized = true;
          const popAngle = Math.random() * Math.PI * 2;
          const popSpeed =
            GAME_ENGINE.GEM_POP_SPEED_MIN +
            Math.random() * GAME_ENGINE.GEM_POP_SPEED_VAR;
          gem.vx = Math.cos(popAngle) * popSpeed;
          gem.vy = Math.sin(popAngle) * popSpeed;
        }
      }
    });
  }

  /**
   * Performs the logic for actually collecting an XP gem.
   */
  private collectGem(
    pool: IPoolManager,
    player: Player,
    gem: Gem,
    state: GameState
  ): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();
    const xpGain = Math.floor(gem.value * this.ctx.combo.getXpMultiplier());

    if (!isNaN(xpGain) && xpGain > 0) {
      player.exp += xpGain;
    }
    gem.active = false;
    this.ctx.audio.playGem();

    this.spawnCollectionParticles(pool, gem, perfConfig.particleMultiplier);

    EventBus.emit('gemCollected', {
      value: gem.value,
      isRare: gem.isRare ?? false,
    });

    EventBus.emit('xpGained', { amount: xpGain });

    // Level up check
    if (player.exp >= player.nextLevelExp && state.levelUpFreeze <= 0) {
      state.levelUpFreeze = GAME_ENGINE.PENDING_LEVEL_UP_FREEZE_MS;
      state.shake = GAME_ENGINE.COLLECTION_SHAKE_LEVELUP;
      EventBus.emit('levelUpStart', {});
    }
  }

  /**
   * Processes all active volatility/buff gems.
   */
  private handleBuffGemCollections(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    const buffGems = this.ctx.buffGems.getActiveGems();

    for (const gem of buffGems) {
      if (!gem.active) {
        continue;
      }

      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      const magnetRange =
        (this.ctx.constants.GEM_MAGNET_BASE_RANGE + effectiveMagnet) *
        GAME_ENGINE.BUFF_GEM_MAGNET_FACTOR;
      if (
        distSq < magnetRange * magnetRange &&
        gem.elapsedLifetime > GAME_ENGINE.GEM_MAGNET_DELAY
      ) {
        // Buff Gem Magnet Pop (Visual only, no separate magnetized flag needed for now)
        if (!gem.velocityInitiated) {
          const popAngle = Math.random() * Math.PI * 2;
          const popSpeed =
            GAME_ENGINE.GEM_POP_SPEED_MIN +
            Math.random() * GAME_ENGINE.GEM_POP_SPEED_VAR;
          gem.vx = Math.cos(popAngle) * popSpeed;
          gem.vy = Math.sin(popAngle) * popSpeed;
          gem.velocityInitiated = true;
        }

        const dist = Math.sqrt(distSq);
        const pull =
          lerp(
            GAME_ENGINE.BUFF_GEM_PULL_MAX,
            GAME_ENGINE.BUFF_GEM_PULL_MIN,
            dist / magnetRange
          ) * dtFactor;

        // Apply smoother pull with steering for buff gems too
        const tx = (dx / dist) * pull;
        const ty = (dy / dist) * pull;

        gem.vx = lerp(gem.vx ?? 0, tx, 0.1 * dtFactor);
        gem.vy = lerp(gem.vy ?? 0, ty, 0.1 * dtFactor);

        gem.x += gem.vx * dtFactor;
        gem.y += gem.vy * dtFactor;
      }

      const pickupDist = player.radius + gem.radius;
      if (distSq < pickupDist * pickupDist) {
        this.collectBuffGem(pool, gem, state);
      }
    }
  }

  /**
   * Performs the logic for collecting a BuffGem.
   */
  private collectBuffGem(pool: IPoolManager, gem: BuffGem, state: GameState): void {
    BuffManager.addEffect(gem.decoratorClass);
    this.ctx.audio.playGem();
    state.shake = GAME_ENGINE.COLLECTION_SHAKE_NORMAL;

    this.spawnBuffParticles(pool, gem);

    pool.getFloatingText(
      gem.x,
      gem.y - GAME_ENGINE.BUFF_TEXT_OFFSET_Y,
      gem.icon,
      gem.color,
      GAME_ENGINE.BUFF_TEXT_SIZE
    );
    this.ctx.buffGems.collectGem(gem);
  }

  /**
   * Spawns feedback particles for standard gem collection.
   */
  private spawnCollectionParticles(
    pool: IPoolManager,
    gem: Gem,
    particleMultiplier: number
  ): void {
    const collectCfg = this.ctx.particles.collect;
    const count = Math.round(collectCfg.count * particleMultiplier);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed =
        collectCfg.speed *
        (GAME_ENGINE.GEM_PARTICLE_MIN_SPEED_FACTOR +
          Math.random() * GAME_ENGINE.GEM_PARTICLE_VAR_SPEED_FACTOR);
      const part = pool.getParticle(
        gem.x,
        gem.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        gem.color
      );
      part.life = collectCfg.life;
      part.radius = collectCfg.radius ?? GAME_ENGINE.GEM_PARTICLE_RADIUS;
    }
  }

  /**
   * Spawns enhanced feedback particles for BuffGem collection.
   */
  private spawnBuffParticles(pool: IPoolManager, gem: BuffGem): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();
    const count = Math.round(
      GAME_ENGINE.BUFF_PARTICLE_COUNT * perfConfig.particleMultiplier
    );

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed =
        GAME_ENGINE.BUFF_PARTICLE_SPEED_MIN +
        Math.random() * GAME_ENGINE.BUFF_PARTICLE_SPEED_VAR;
      const part = pool.getParticle(
        gem.x,
        gem.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        gem.color
      );
      part.life = GAME_ENGINE.BUFF_PARTICLE_LIFE;
      part.radius = GAME_ENGINE.BUFF_PARTICLE_RADIUS;
    }
  }
}
