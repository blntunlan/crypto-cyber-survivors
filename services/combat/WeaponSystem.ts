/**
 * WeaponSystem — Manages weapon inventory, upgrades, and firing.
 *
 * Weapons fire through the shared WeaponFiringPipeline, which provides:
 *   - SpatialGrid-based targeting with viewport culling
 *   - Predictive aiming (leading shots)
 *   - Behavior-specific projectile patterns (targeted/spread/burst)
 *
 * This ensures every weapon (base + extras) uses the exact same core
 * targeting and aiming logic — no more divergence between CombatSystem
 * base fire and WeaponSystem extra weapons.
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { PLAYER_STATS } from '../../config/PlayerConfig';
import { WEAPON_REGISTRY } from '../../config/WeaponRegistry';
import {
  type WeaponId,
  type WeaponLevel,
  type WeaponInstance,
  type WeaponMarketContext,
} from '../../types/weapons';
import { type IPoolManager } from '../interfaces/IPoolManager';
import { WeaponFiringPipeline } from './WeaponFiringPipeline';

class WeaponSystemClass {
  private weapons: WeaponInstance[] = [];
  static readonly MAX_WEAPONS = 2;

  addWeapon(id: WeaponId): boolean {
    const existing = this.weapons.find(w => w.id === id);
    if (existing) {
      return this.upgradeWeapon(id);
    }
    if (this.weapons.length >= WeaponSystemClass.MAX_WEAPONS) return false;
    this.weapons.push({ id, level: 1, cooldownTimer: 0 });
    EventBus.emit('weaponAcquired', { weaponId: id, slot: this.weapons.length - 1 });
    Logger.info(`[WeaponSystem] Acquired ${id}`);
    return true;
  }

  upgradeWeapon(id: WeaponId): boolean {
    const w = this.weapons.find(w => w.id === id);
    if (!w || w.level >= 5) return false;
    w.level = (w.level + 1) as WeaponLevel;
    EventBus.emit('weaponUpgraded', { weaponId: id, newLevel: w.level });
    Logger.info(`[WeaponSystem] Upgraded ${id} to level ${w.level}`);
    this.checkEvolution();
    return true;
  }

  private checkEvolution(): void {
    // 1. Standard evolution between two inventory weapons (if both are present in inventory)
    if (this.weapons.length >= 2) {
      const a = this.weapons[0];
      const b = this.weapons[1];
      if (a && b) {
        const cfgA = WEAPON_REGISTRY[a.id];
        const cfgB = WEAPON_REGISTRY[b.id];
        const evolutionResult =
          cfgA.evolutionPair === b.id
            ? cfgA.evolutionResult
            : cfgB.evolutionPair === a.id
              ? cfgB.evolutionResult
              : undefined;

        if (a.level === 5 && b.level === 5 && evolutionResult) {
          this.weapons = [{ id: evolutionResult, level: 5, cooldownTimer: 0 }];
          EventBus.emit('weaponEvolution', {
            from: [a.id, b.id],
            to: evolutionResult,
          });
          Logger.info(
            `[WeaponSystem] Evolution: ${a.id} + ${b.id} → ${evolutionResult}`
          );
          return;
        }
      }
    }

    // 2. Base weapon evolution: if laser reaches Level 5, it evolves with the implicit quantum_bullet
    const laserIndex = this.weapons.findIndex(w => w.id === 'laser' && w.level === 5);
    if (laserIndex !== -1) {
      const evolutionResult = 'hyper_cannon';
      this.weapons[laserIndex] = { id: evolutionResult, level: 5, cooldownTimer: 0 };
      EventBus.emit('weaponEvolution', {
        from: ['quantum_bullet', 'laser'],
        to: evolutionResult,
      });
      Logger.info(
        `[WeaponSystem] Evolution: quantum_bullet + laser → ${evolutionResult}`
      );
    }
  }

  /**
   * Tick all weapon cooldowns and fire through the shared pipeline.
   *
   * @param deltaTime - Frame delta in ms
   * @param playerX - Player world X
   * @param playerY - Player world Y
   * @param playerDamageMultiplier - Global damage multiplier (from stats)
   * @param marketCtx - Current market context for bonus calculation
   * @param pool - Pool manager for spawning projectiles
   * @param screenWidth - Viewport width for targeting culling
   * @param screenHeight - Viewport height for targeting culling
   */
  update(
    deltaTime: number,
    playerX: number,
    playerY: number,
    playerDamageMultiplier: number,
    marketCtx: WeaponMarketContext,
    pool: IPoolManager,
    screenWidth: number,
    screenHeight: number
  ): void {
    const normalizedDamageMultiplier =
      playerDamageMultiplier > 5
        ? playerDamageMultiplier / PLAYER_STATS.INITIAL_DAMAGE
        : playerDamageMultiplier;

    for (const weapon of this.weapons) {
      weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - deltaTime);
      if (weapon.cooldownTimer <= 0) {
        const cfg = WEAPON_REGISTRY[weapon.id];
        const damage =
          cfg.baseDamage *
          (1 + weapon.level * cfg.damagePerLevel) *
          cfg.marketBonus(marketCtx) *
          normalizedDamageMultiplier;

        // Fire through the shared pipeline — same targeting, aiming, and
        // viewport logic as the base weapon in CombatSystem
        const fired = WeaponFiringPipeline.fire({
          playerX,
          playerY,
          damage,
          level: weapon.level,
          config: cfg,
          pool,
          screenWidth,
          screenHeight,
        });

        if (fired) {
          // Emit event for audio/UI feedback only (no longer drives spawning)
          EventBus.emit('weaponFired', {
            weaponId: weapon.id,
            x: playerX,
            y: playerY,
            damage,
            level: weapon.level,
          });
        }

        const cooldown = Math.max(
          50,
          cfg.baseCooldown * (1 - weapon.level * cfg.cooldownPerLevel)
        );
        weapon.cooldownTimer = cooldown;
      }
    }
  }

  getWeapons(): ReadonlyArray<WeaponInstance> {
    return this.weapons;
  }

  hasWeapon(id: WeaponId): boolean {
    return this.weapons.some(w => w.id === id);
  }

  getWeaponLevel(id: WeaponId): number {
    return this.weapons.find(w => w.id === id)?.level ?? 0;
  }

  reset(): void {
    this.weapons = [];
  }
}

export const WeaponSystem = new WeaponSystemClass();
