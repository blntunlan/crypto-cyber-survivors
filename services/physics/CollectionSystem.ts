import { type IPoolManager } from '../interfaces/IPoolManager';
import { type Player, type GameState, type Gem } from '../../types';
import { type BuffGem } from '../../types/BuffGem';
import { type IPhysicsContext } from './PhysicsTypes';
import { getPhysicsContext } from './PhysicsContext';
import { EventBus } from '../EventBus';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { lerp } from '../../utils/math';
import { type ICollectionSystem } from '../interfaces/IPhysicsSubsystems';

/**
 * CollectionSystem - Handles player interaction with collectible items (Gems, BuffGems).
 */
export class CollectionSystem implements ICollectionSystem {
  private ctx: IPhysicsContext;

  constructor(context: IPhysicsContext = getPhysicsContext()) {
    this.ctx = context;
  }

  /**
   * Set a custom context (for testing)
   */
  public setContext(context: IPhysicsContext): void {
    this.ctx = context;
  }

  /**
   * Reset to default context
   */
  public resetContext(): void {
    this.ctx = getPhysicsContext();
  }

  /**
   * Update collection logic for gems and buff gems
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

  private handleGemCollections(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    pool.activeGems.forEach(gem => {
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
        const maxSpeed = 22;
        const tx = (dx / dist) * maxSpeed;
        const ty = (dy / dist) * maxSpeed;
        const steerFactor = 0.12;

        gem.vx = lerp(gem.vx, tx, steerFactor * dtFactor);
        gem.vy = lerp(gem.vy, ty, steerFactor * dtFactor);

        gem.x += gem.vx * dtFactor;
        gem.y += gem.vy * dtFactor;
      } else {
        const magnetRange = this.ctx.constants.GEM_MAGNET_BASE_RANGE + effectiveMagnet;
        const rangeSq = magnetRange * magnetRange;

        if (distSq < rangeSq) {
          gem.magnetized = true;
          const popAngle = Math.random() * Math.PI * 2;
          const popSpeed = 3 + Math.random() * 3;
          gem.vx = Math.cos(popAngle) * popSpeed;
          gem.vy = Math.sin(popAngle) * popSpeed;
        }
      }
    });
  }

  private collectGem(
    pool: IPoolManager,
    player: Player,
    gem: Gem,
    state: GameState
  ): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();
    const xpGain = Math.floor(gem.value * this.ctx.combo.getXpMultiplier());

    player.exp += xpGain;
    gem.active = false;
    this.ctx.audio.playGem();

    this.spawnCollectionParticles(pool, gem, perfConfig.particleMultiplier);

    EventBus.emit('gemCollected', {
      value: gem.value,
      isRare: gem.isRare ?? false,
    });

    EventBus.emit('xpGained', { amount: xpGain });

    if (player.exp >= player.nextLevelExp && state.levelUpFreeze <= 0) {
      state.levelUpFreeze = 500;
      state.shake = 10;
      EventBus.emit('levelUpStart', {});
    }
  }

  private handleBuffGemCollections(
    pool: IPoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    const buffGems = this.ctx.buffGems.getActiveGems();

    for (const gem of buffGems) {
      if (!gem.active) continue;

      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      const magnetRange =
        (this.ctx.constants.GEM_MAGNET_BASE_RANGE + effectiveMagnet) * 0.6;
      if (distSq < magnetRange * magnetRange) {
        const dist = Math.sqrt(distSq);
        const pull = lerp(8, 2, dist / magnetRange) * dtFactor;
        gem.x += (dx / dist) * pull;
        gem.y += (dy / dist) * pull;
      }

      const pickupDist = player.radius + gem.radius;
      if (distSq < pickupDist * pickupDist) {
        this.collectBuffGem(pool, gem, state);
      }
    }
  }

  private collectBuffGem(pool: IPoolManager, gem: BuffGem, state: GameState): void {
    BuffManager.addEffect(gem.decoratorClass);
    this.ctx.audio.playGem();
    state.shake = 5;

    this.spawnBuffParticles(pool, gem);

    pool.getFloatingText(gem.x, gem.y - 20, gem.icon, gem.color, 32);
    this.ctx.buffGems.collectGem(gem);
  }

  private spawnCollectionParticles(
    pool: IPoolManager,
    gem: Gem,
    particleMultiplier: number
  ): void {
    const collectCfg = this.ctx.particles.collect;
    const count = Math.round(collectCfg.count * particleMultiplier);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = collectCfg.speed * (0.6 + Math.random() * 0.4);
      const part = pool.getParticle(
        gem.x,
        gem.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        gem.color
      );
      part.life = collectCfg.life;
      part.radius = collectCfg.radius ?? 2;
    }
  }

  private spawnBuffParticles(pool: IPoolManager, gem: BuffGem): void {
    const perfConfig = this.ctx.performance.getPerformanceConfig();
    const count = Math.round(16 * perfConfig.particleMultiplier);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 4 + Math.random() * 2;
      const part = pool.getParticle(
        gem.x,
        gem.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        gem.color
      );
      part.life = 0.8;
      part.radius = 4;
    }
  }
}
