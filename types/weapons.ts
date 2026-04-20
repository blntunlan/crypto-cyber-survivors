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

/**
 * Discriminated union of per-weapon visual profiles.
 *
 * Phase 0: every registered weapon uses `renderKind: 'default'` so nothing
 * changes visually. Later phases will swap individual weapons over to their
 * bespoke kinds (quantum/spread/boomerang/laser/nuke/orbit), at which point
 * the optional params below will start being read by ProjectileRenderer.
 *
 * Keep this loosely typed: exact param shapes are renderer-owned and may
 * evolve as we port VFX Lab previews. Until then, `params` is intentionally
 * permissive (string-keyed primitives) so extending one kind's visual config
 * doesn't ripple type changes across the codebase.
 */
export type WeaponRenderKind =
  | 'default'
  | 'quantum'
  | 'spread'
  | 'boomerang'
  | 'laser'
  | 'nuke'
  | 'orbit';

export type WeaponVisualParam = string | number | boolean;

export interface WeaponVisualConfig {
  renderKind: WeaponRenderKind;
  /** Optional renderer-specific tunables (colors, trail length, glow, etc.). */
  params?: Readonly<Record<string, WeaponVisualParam>>;
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
  /** Phase 0: visual profile. All existing weapons ship with `'default'`. */
  visual?: WeaponVisualConfig;
}
