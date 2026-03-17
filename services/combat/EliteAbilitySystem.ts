/**
 * EliteAbilitySystem - Manages elite enemy abilities and their effects.
 *
 * Singleton service that ticks elite abilities each frame and handles
 * death-triggered effects like death_split and chain_explosion.
 */

import { type Enemy, type Player } from '../../types';
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
    // Private constructor for singleton pattern
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
   * @param _pool - Pool manager for spawning split enemies
   */
  onEliteDeath(enemy: Enemy, _pool: IPoolManager): void {
    if (!enemy.isElite || !enemy.eliteAbility) {
      return;
    }

    const ability = enemy.eliteAbility as EliteAbilityId;

    switch (ability) {
      case 'death_split':
        this.triggerDeathSplit(enemy);
        break;
      case 'chain_explosion':
        this.triggerChainExplosion(enemy);
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

  private triggerDeathSplit(enemy: Enemy): void {
    Logger.info(`[EliteAbility] death_split triggered at (${enemy.x}, ${enemy.y})`);

    // Emit event for SpawnSystem to handle actual minion creation
    EventBus.emit('eliteAbilityActivated', {
      type: 'death_split',
      x: enemy.x,
      y: enemy.y,
    });
  }

  private triggerChainExplosion(enemy: Enemy): void {
    Logger.info(`[EliteAbility] chain_explosion triggered at (${enemy.x}, ${enemy.y})`);

    EventBus.emit('eliteChainExplosion', {
      x: enemy.x,
      y: enemy.y,
      radius: ELITE_CONFIG.chainExplosionRadius,
      damage: ELITE_CONFIG.chainExplosionDamage,
    });
  }
}

// Export singleton instance
export const eliteAbilitySystem = EliteAbilitySystem.getInstance();
