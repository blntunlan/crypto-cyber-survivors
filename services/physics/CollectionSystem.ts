import { type Player, type GameState, type Gem } from '../../types';
import { type BuffGem } from '../../types/BuffGem';
import { type PoolManager } from '../PoolManager';
import { audio } from '../AudioService';
import { EventBus } from '../EventBus';
import { ComboSystem } from '../ComboSystem';
import { GAME_ENGINE } from '../../constants';
import { PLAYER_STATS } from '../../config/PlayerConfig';
import { ParticleConfigService } from '../ParticleConfigService';
import { DeviceBenchmarkService } from '../DeviceBenchmarkService';
import { BuffManager } from '../patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../spawners/BuffGemSpawner';
import { lerp } from '../../utils/math';
import { type PerformanceConfig } from '../../types/DeviceProfile';

/**
 * CollectionSystem - Handles player interaction with collectible items (Gems, BuffGems).
 * Includes magnet logic and collection effects.
 */
export class CollectionSystem {
  /**
   * Update collection logic for gems and buff gems
   */
  public static update(
    pool: PoolManager,
    player: Player,
    state: GameState,
    dtFactor: number
  ): void {
    // Get effective magnet with system-level cap
    const rawMagnet = BuffManager.isInitialized()
      ? BuffManager.getDecoratedStats().getMagnet()
      : player.magnet;
    const effectiveMagnet = Math.min(rawMagnet, PLAYER_STATS.MAX_MAGNET);

    this.handleGemCollections(pool, player, state, dtFactor, effectiveMagnet);
    this.handleBuffGemCollections(pool, player, state, dtFactor, effectiveMagnet);
  }

  private static handleGemCollections(
    pool: PoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    pool.activeGems.forEach(gem => {
      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      const magnetRange = GAME_ENGINE.GEM_MAGNET_BASE_RANGE + effectiveMagnet;
      const rangeSq = magnetRange * magnetRange;

      // Magnet pull
      if (distSq < rangeSq) {
        const dist = Math.sqrt(distSq);
        const pull = lerp(12, 2, dist / magnetRange) * dtFactor;
        gem.x += (dx / dist) * pull;
        gem.y += (dy / dist) * pull;
      }

      // Pickup
      const pickupDist = player.radius + gem.radius;
      if (distSq < pickupDist * pickupDist) {
        this.collectGem(pool, player, gem, state);
      }
    });
  }

  private static collectGem(pool: PoolManager, player: Player, gem: Gem, state: GameState): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    const xpGain = Math.floor(gem.value * ComboSystem.getXpMultiplier());

    player.exp += xpGain;
    gem.active = false;
    audio.playGem();

    this.spawnCollectionParticles(pool, gem, perfConfig);

    EventBus.emit('gemCollected', {
      value: gem.value,
      isRare: gem.isRare ?? false,
    });

    // Notify about xp gain for UI or other systems
    EventBus.emit('xpGained', { amount: xpGain });

    // Level up check
    if (player.exp >= player.nextLevelExp && state.levelUpFreeze <= 0) {
      state.levelUpFreeze = 500;
      state.shake = 10;
      EventBus.emit('levelUpStart', {});
    }
  }

  private static handleBuffGemCollections(
    pool: PoolManager,
    player: Player,
    state: GameState,
    dtFactor: number,
    effectiveMagnet: number
  ): void {
    const buffGems = BuffGemSpawner.getActiveGems();

    for (const gem of buffGems) {
      if (!gem.active) continue;

      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const distSq = dx * dx + dy * dy;

      // Weaker magnet for buff gems
      const magnetRange = (GAME_ENGINE.GEM_MAGNET_BASE_RANGE + effectiveMagnet) * 0.6;
      if (distSq < magnetRange * magnetRange) {
        const dist = Math.sqrt(distSq);
        const pull = lerp(8, 2, dist / magnetRange) * dtFactor;
        gem.x += (dx / dist) * pull;
        gem.y += (dy / dist) * pull;
      }

      // Pickup
      const pickupDist = player.radius + gem.radius;
      if (distSq < pickupDist * pickupDist) {
        this.collectBuffGem(pool, gem, state);
      }
    }
  }

  private static collectBuffGem(pool: PoolManager, gem: BuffGem, state: GameState): void {
    BuffManager.addEffect(gem.decoratorClass);
    audio.playGem();
    state.shake = 5;

    this.spawnBuffParticles(pool, gem);

    pool.getFloatingText(gem.x, gem.y - 20, gem.icon, gem.color, 32);
    BuffGemSpawner.collectGem(gem);
  }

  private static spawnCollectionParticles(
    pool: PoolManager,
    gem: Gem,
    perfConfig: PerformanceConfig
  ): void {
    const collectCfg = ParticleConfigService.collect;
    const count = Math.round(collectCfg.count * perfConfig.particleMultiplier);

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
      part.radius = collectCfg.radius;
    }
  }

  private static spawnBuffParticles(pool: PoolManager, gem: BuffGem): void {
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
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
