/**
 * PlayerStatsAdapter - Adapts Player object to IPlayerStats interface
 *
 * This adapter wraps the actual Player object and provides
 * the base values for the decorator chain.
 */

import { type Player } from '../../../types';
import { type IPlayerStats } from './IPlayerStats';

export class PlayerStatsAdapter implements IPlayerStats {
  constructor(private player: Player) {}

  getDamage(): number {
    return this.player.baseDamage;
  }

  getSpeed(): number {
    return this.player.speed;
  }

  getFireRate(): number {
    return this.player.fireRate;
  }

  getCritChance(): number {
    return this.player.critChance;
  }

  getCritDamage(): number {
    // Default crit damage is 2x crit chance
    return this.player.critChance * 2;
  }

  getArmor(): number {
    return this.player.armor;
  }

  getMagnet(): number {
    return this.player.magnet;
  }

  getProjectiles(): number {
    return this.player.projectiles;
  }

  getArea(): number {
    return this.player.area;
  }

  getLuck(): number {
    return this.player.luck;
  }

  getLifesteal(): number {
    return this.player.lifesteal;
  }

  getDodge(): number {
    return this.player.dodge;
  }
}
