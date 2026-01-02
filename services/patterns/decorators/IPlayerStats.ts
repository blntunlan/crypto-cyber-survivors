/**
 * IPlayerStats - Interface for player statistics
 *
 * Used by the Decorator Pattern to wrap and modify player stats.
 * All stat modifiers (buffs/debuffs) implement this interface.
 */

export interface IPlayerStats {
  getDamage(): number;
  getSpeed(): number;
  getFireRate(): number;
  getCritChance(): number;
  getCritDamage(): number;
  getArmor(): number;
  getMagnet(): number;
  getProjectiles(): number;
  getArea(): number;
  getLuck(): number; // Gem drop quality/quantity
  getLifesteal(): number; // % chance to heal on kill
  getDodge(): number; // % chance to avoid damage
}
