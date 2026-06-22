/**
 * EliteAbilitySystem - Manages elite enemy abilities and their effects.
 *
 * Singleton service that ticks elite abilities each frame and handles
 * death-triggered effects like death_split and chain_explosion.
 */

import { MarketPosition, type Enemy, type Player } from '../../types';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { EventBus } from '../core/EventBus';
import { ELITE_CONFIG, type EliteAbilityId } from '../../config/EliteConfig';
import { Logger } from '../system/Logger';

export class EliteAbilitySystem {
  private static instance: EliteAbilitySystem | null = null;

  /** Tracks heal aura cooldown per enemy (keyed by object reference via WeakMap) */
  private healAuraTimers: WeakMap<Enemy, number> = new WeakMap();

  /** Tracks phase teleport cooldown per enemy */
  private phaseTeleportTimers: WeakMap<Enemy, number> = new WeakMap();

  private constructor() {
    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): EliteAbilitySystem {
    return (EliteAbilitySystem.instance ??= new EliteAbilitySystem());
  }

  /**
   * Reset state for test isolation.
   */
  reset(): void {
    this.healAuraTimers = new WeakMap();
    this.phaseTeleportTimers = new WeakMap();
  }

  /**
   * Tick all elite abilities for active elite enemies.
   *
   * @param deltaTime - Frame delta in seconds
   * @param eliteEnemies - Array of active elite enemies
   * @param player - Current player state
   * @param pool - Pool manager for entity spawning
   * @param allEnemies - All active enemies (needed for heal_aura)
   */
  update(
    deltaTime: number,
    eliteEnemies: readonly Enemy[],
    player: Player,
    _pool: IPoolManager,
    allEnemies: readonly Enemy[]
  ): void {
    for (const enemy of eliteEnemies) {
      if (!enemy.active || enemy.isDying || !enemy.isElite) {
        continue;
      }

      const ability = enemy.eliteAbility as EliteAbilityId | undefined;
      if (!ability) {
        continue;
      }

      switch (ability) {
        case 'heal_aura':
          this.tickHealAura(deltaTime, enemy, allEnemies);
          break;
        case 'damage_trail':
          this.tickDamageTrail(enemy, player);
          break;
        case 'phase_teleport':
          this.tickPhaseTeleport(deltaTime, enemy, player);
          break;
        // Other abilities are passive or death-triggered
        default:
          break;
      }
    }
  }

  /**
   * Handle elite-specific death effects.
   *
   * @param enemy - The elite enemy that died
   * @param pool - Pool manager for spawning split enemies and applying explosions
   */
  onEliteDeath(enemy: Enemy, pool: IPoolManager): void {
    if (!enemy.isElite || !enemy.eliteAbility) {
      return;
    }

    const ability = enemy.eliteAbility as EliteAbilityId;

    switch (ability) {
      case 'death_split':
        this.triggerDeathSplit(enemy, pool);
        break;
      case 'chain_explosion':
        this.triggerChainExplosion(enemy, pool);
        break;
      default:
        break;
    }
  }

  /**
   * Heal nearby enemies within the aura radius.
   */
  applyHealAura(healer: Enemy, allEnemies: readonly Enemy[]): void {
    const radiusSq = ELITE_CONFIG.healAuraRadius * ELITE_CONFIG.healAuraRadius;

    for (const target of allEnemies) {
      if (!target.active || target.isDying || target === healer) {
        continue;
      }

      const dx = target.x - healer.x;
      const dy = target.y - healer.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        target.health = Math.min(
          target.health + ELITE_CONFIG.healAuraAmount,
          target.maxHealth
        );
      }
    }

    EventBus.emit('eliteAbilityActivated', {
      type: 'heal_aura',
      x: healer.x,
      y: healer.y,
    });
  }

  // =========================================================================
  // PRIVATE TICK METHODS
  // =========================================================================

  private tickHealAura(
    deltaTime: number,
    enemy: Enemy,
    allEnemies: readonly Enemy[]
  ): void {
    const timer = (this.healAuraTimers.get(enemy) ?? 0) + deltaTime;

    if (timer >= ELITE_CONFIG.healAuraTick) {
      this.applyHealAura(enemy, allEnemies);
      this.healAuraTimers.set(enemy, 0);
    } else {
      this.healAuraTimers.set(enemy, timer);
    }
  }

  private tickDamageTrail(enemy: Enemy, player: Player): void {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distSq = dx * dx + dy * dy;
    const radiusSq = ELITE_CONFIG.damageTrailRadius * ELITE_CONFIG.damageTrailRadius;

    if (distSq <= radiusSq) {
      // Emit event for visual feedback; actual damage is handled by combat system
      EventBus.emit('eliteAbilityActivated', {
        type: 'damage_trail',
        x: enemy.x,
        y: enemy.y,
      });
    }
  }

  private tickPhaseTeleport(deltaTime: number, enemy: Enemy, player: Player): void {
    const timer = (this.phaseTeleportTimers.get(enemy) ?? 0) + deltaTime;

    if (timer >= ELITE_CONFIG.phaseTeleportCooldown) {
      // Teleport closer to player
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const teleportDist = Math.min(ELITE_CONFIG.phaseTeleportDistance, dist * 0.5);
        enemy.x += (dx / dist) * teleportDist;
        enemy.y += (dy / dist) * teleportDist;

        EventBus.emit('eliteAbilityActivated', {
          type: 'phase_teleport',
          x: enemy.x,
          y: enemy.y,
        });
      }

      this.phaseTeleportTimers.set(enemy, 0);
    } else {
      this.phaseTeleportTimers.set(enemy, timer);
    }
  }

  // =========================================================================
  // DEATH-TRIGGERED ABILITIES
  // =========================================================================

  private triggerDeathSplit(enemy: Enemy, pool: IPoolManager): void {
    Logger.info(`[EliteAbility] death_split triggered at (${enemy.x}, ${enemy.y})`);

    const count = ELITE_CONFIG.deathSplitCount;
    const spawnRadius = Math.max(enemy.radius * 1.5, 24);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const minion = pool.getEnemy(
        enemy.x + Math.cos(angle) * spawnRadius,
        enemy.y + Math.sin(angle) * spawnRadius,
        1,
        MarketPosition.LONG,
        'bear',
        undefined,
        0.65,
        1.15
      );

      minion.isElite = false;
      minion.eliteAbility = undefined;
      minion.intent = 'fodder';
      minion.valueMultiplier = 1;
      minion.radius = Math.max(8, minion.radius * 0.75);
      minion.maxHealth = Math.max(
        1,
        enemy.maxHealth * ELITE_CONFIG.deathSplitHealthFraction
      );
      minion.health = minion.maxHealth;
      minion.damage = Math.max(1, enemy.damage * 0.35);
    }

    EventBus.emit('eliteAbilityActivated', {
      type: 'death_split',
      x: enemy.x,
      y: enemy.y,
    });
  }

  private triggerChainExplosion(enemy: Enemy, pool: IPoolManager): void {
    Logger.info(`[EliteAbility] chain_explosion triggered at (${enemy.x}, ${enemy.y})`);

    const radiusSq =
      ELITE_CONFIG.chainExplosionRadius * ELITE_CONFIG.chainExplosionRadius;
    let damagedCount = 0;

    for (const target of pool.activeEnemies) {
      if (!target.active || target.isDying || target === enemy) {
        continue;
      }

      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      if (dx * dx + dy * dy > radiusSq) {
        continue;
      }

      target.health = Math.max(1, target.health - ELITE_CONFIG.chainExplosionDamage);
      target.hitFlashTimer = 8;
      damagedCount++;
    }

    EventBus.emit('eliteChainExplosion', {
      x: enemy.x,
      y: enemy.y,
      radius: ELITE_CONFIG.chainExplosionRadius,
      damage: ELITE_CONFIG.chainExplosionDamage,
      damagedCount,
    });
  }
}

// Export singleton instance
export const eliteAbilitySystem = EliteAbilitySystem.getInstance();
