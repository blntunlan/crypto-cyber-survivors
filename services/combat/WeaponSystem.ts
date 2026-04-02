/**
 * WeaponSystem — Manages weapon inventory, upgrades, and firing
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { WEAPON_REGISTRY } from '../../config/WeaponRegistry';
import {
  type WeaponId,
  type WeaponLevel,
  type WeaponInstance,
  type WeaponMarketContext,
} from '../../types/weapons';

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
    if (this.weapons.length < 2) return;
    const a = this.weapons[0];
    const b = this.weapons[1];
    if (!a || !b) return;
    const cfgA = WEAPON_REGISTRY[a.id];
    if (
      a.level === 5 &&
      b.level === 5 &&
      cfgA.evolutionPair === b.id &&
      cfgA.evolutionResult
    ) {
      EventBus.emit('weaponEvolution', {
        from: [a.id, b.id],
        to: cfgA.evolutionResult,
      });
      Logger.info(
        `[WeaponSystem] Evolution: ${a.id} + ${b.id} → ${cfgA.evolutionResult}`
      );
    }
  }

  update(
    deltaTime: number,
    playerX: number,
    playerY: number,
    playerDamageMultiplier: number,
    marketCtx: WeaponMarketContext
  ): void {
    for (const weapon of this.weapons) {
      weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - deltaTime);
      if (weapon.cooldownTimer <= 0) {
        const cfg = WEAPON_REGISTRY[weapon.id];
        const damage =
          cfg.baseDamage *
          (1 + weapon.level * cfg.damagePerLevel) *
          cfg.marketBonus(marketCtx) *
          playerDamageMultiplier;

        EventBus.emit('weaponFired', {
          weaponId: weapon.id,
          x: playerX,
          y: playerY,
          damage,
          level: weapon.level,
        });

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
