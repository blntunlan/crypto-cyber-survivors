/**
 * EliteConfig - Configuration for the Elite Enemies system.
 *
 * Elite enemies are enhanced variants of normal enemies with boosted stats,
 * unique abilities, and guaranteed drops. Boss-type enemies cannot become elite.
 */

import { type EnemyId } from './EnemyRegistry';

// =============================================================================
// ELITE STAT CONFIGURATION
// =============================================================================

export const ELITE_CONFIG = {
  /** Base chance for any spawned enemy to become elite (0-1) */
  spawnChance: 0.15,
  /** Health multiplier applied to elite enemies */
  hpMultiplier: 2.5,
  /** Speed multiplier applied to elite enemies */
  speedMultiplier: 1.5,
  /** Damage multiplier applied to elite enemies */
  damageMultiplier: 1.8,
  /** Drop value multiplier for elite enemy rewards */
  dropValueMultiplier: 3.0,
  /** Whether elite enemies always drop gems */
  guaranteedDrop: true,
  /** Gold glow color for elite visual indicator */
  visualGlowColor: '#FFD700',
  /** Glow radius in pixels */
  visualGlowRadius: 8,
  /** Crown icon offset relative to enemy center */
  crownIconOffset: { x: 0, y: -20 },
  /** Heal aura radius for heal_aura ability */
  healAuraRadius: 120,
  /** Heal aura amount per tick (HP) */
  healAuraAmount: 5,
  /** Heal aura tick interval in seconds */
  healAuraTick: 1.0,
  /** Damage trail radius */
  damageTrailRadius: 30,
  /** Damage trail damage per second */
  damageTrailDps: 3,
  /** Death split: number of minions spawned */
  deathSplitCount: 2,
  /** Death split: health fraction of original */
  deathSplitHealthFraction: 0.3,
  /** Chain explosion radius */
  chainExplosionRadius: 80,
  /** Chain explosion damage */
  chainExplosionDamage: 15,
  /** Phase teleport cooldown in seconds */
  phaseTeleportCooldown: 3.0,
  /** Phase teleport distance */
  phaseTeleportDistance: 150,
} as const;

// =============================================================================
// ELITE ABILITY TYPES
// =============================================================================

export type EliteAbilityId =
  | 'heal_aura'
  | 'damage_trail'
  | 'death_split'
  | 'minion_spawn'
  | 'mirror_movement'
  | 'cage_trap'
  | 'chain_explosion'
  | 'phase_teleport';

// =============================================================================
// ENEMY-TO-ABILITY MAPPING
// =============================================================================

/** Boss enemy types that should never become elite */
const BOSS_ENEMY_IDS: ReadonlySet<string> = new Set<string>([
  'market_maker',
  'gatekeeper',
  '51_attack',
]);

/** Maps each non-boss enemy type to its elite ability */
const ELITE_ABILITY_MAP: Partial<Record<EnemyId, EliteAbilityId>> = {
  bear: 'heal_aura',
  bull: 'damage_trail',
  fud: 'phase_teleport',
  whale: 'death_split',
  liquidator: 'chain_explosion',
  pumpdump: 'minion_spawn',
  rsi: 'mirror_movement',
  rugpull: 'cage_trap',
  mev_bot: 'phase_teleport',
  flash_loan: 'chain_explosion',
  sandwich: 'cage_trap',
};

/**
 * Returns the elite ability for a given enemy type, or undefined for bosses.
 */
export function getEliteAbility(enemyId: string): EliteAbilityId | undefined {
  if (BOSS_ENEMY_IDS.has(enemyId)) {
    return undefined;
  }
  return ELITE_ABILITY_MAP[enemyId as EnemyId] ?? 'damage_trail';
}

/**
 * Returns whether an enemy type is eligible to become elite.
 */
export function canBeElite(enemyId: string): boolean {
  return !BOSS_ENEMY_IDS.has(enemyId);
}
