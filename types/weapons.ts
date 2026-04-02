/**
 * Weapon System Types
 */

export type WeaponId =
  | 'quantum_bullet'
  | 'spread_shot'
  | 'laser'
  | 'boomerang'
  | 'aoe_nuke'
  | 'orbit_shield';

export type WeaponLevel = 1 | 2 | 3 | 4 | 5;

export interface WeaponInstance {
  id: WeaponId;
  level: WeaponLevel;
  cooldownTimer: number;
}

export interface WeaponMarketContext {
  atrPercent: number;
  rsiState: string;
  pnl: number;
  volumeNorm: number;
  isFavorable: boolean;
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  baseDamage: number;
  baseCooldown: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileCount: number;
  damagePerLevel: number;
  cooldownPerLevel: number;
  marketBonus: (ctx: WeaponMarketContext) => number;
  evolutionPair?: WeaponId;
  evolutionResult?: string;
}
