/**
 * Achievement catalog — server-authoritative definitions.
 *
 * This is the single source of truth for all achievement metadata. Both the
 * achievements route (GET /api/v1/achievements) and the unlock evaluator
 * (session verification) read from here. The client Achievement type mirrors
 * these fields (see client types.ts).
 *
 * conditionType semantics (evaluated from trusted, server-side session metrics):
 *   total_kills      — cumulative SUM(kills) across all verified sessions
 *   survival_seconds — MAX(survival_seconds) across all verified sessions (best run)
 *   max_level        — MAX(level) across all verified sessions (best run)
 *   pnl_percent      — MAX raw PnL fraction in a single verified session
 *                      (computed from entry_price/exit_price/position)
 */

export type AchievementCategory = 'combat' | 'survival' | 'trading' | 'misc';

export type AchievementConditionType =
  | 'total_kills'
  | 'survival_seconds'
  | 'max_level'
  | 'pnl_percent';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconKey: string;
  conditionType: AchievementConditionType;
  conditionValue: number;
  rewardGold: number;
  isActive: boolean;
}

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  // ── Combat (cumulative kills) ───────────────────────────────────────────
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Defeat your first enemy',
    category: 'combat',
    iconKey: '⚔️',
    conditionType: 'total_kills',
    conditionValue: 1,
    rewardGold: 0,
    isActive: true,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Defeat 100 enemies total',
    category: 'combat',
    iconKey: '🗡️',
    conditionType: 'total_kills',
    conditionValue: 100,
    rewardGold: 50,
    isActive: true,
  },
  {
    id: 'slayer',
    name: 'Slayer',
    description: 'Defeat 1,000 enemies total',
    category: 'combat',
    iconKey: '💀',
    conditionType: 'total_kills',
    conditionValue: 1000,
    rewardGold: 150,
    isActive: true,
  },
  {
    id: 'destroyer',
    name: 'Destroyer',
    description: 'Defeat 5,000 enemies total',
    category: 'combat',
    iconKey: '🔥',
    conditionType: 'total_kills',
    conditionValue: 5000,
    rewardGold: 400,
    isActive: true,
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    description: 'Defeat 10,000 enemies total',
    category: 'combat',
    iconKey: '👑',
    conditionType: 'total_kills',
    conditionValue: 10000,
    rewardGold: 1000,
    isActive: true,
  },

  // ── Survival (best single-run duration) ─────────────────────────────────
  {
    id: 'survivor_1min',
    name: 'One Minute Warrior',
    description: 'Survive for 1 minute in a single run',
    category: 'survival',
    iconKey: '⏱️',
    conditionType: 'survival_seconds',
    conditionValue: 60,
    rewardGold: 25,
    isActive: true,
  },
  {
    id: 'survivor_3min',
    name: 'Three Minute Marksman',
    description: 'Survive for 3 minutes in a single run',
    category: 'survival',
    iconKey: '⏱️',
    conditionType: 'survival_seconds',
    conditionValue: 180,
    rewardGold: 75,
    isActive: true,
  },
  {
    id: 'survivor_5min',
    name: 'Five Minute Phoenix',
    description: 'Survive for 5 minutes in a single run',
    category: 'survival',
    iconKey: '🏆',
    conditionType: 'survival_seconds',
    conditionValue: 300,
    rewardGold: 200,
    isActive: true,
  },
  {
    id: 'survivor_10min',
    name: 'Ten Minute Titan',
    description: 'Survive for 10 minutes in a single run',
    category: 'survival',
    iconKey: '🏆',
    conditionType: 'survival_seconds',
    conditionValue: 600,
    rewardGold: 500,
    isActive: true,
  },

  // ── Progression (best single-run level) ─────────────────────────────────
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reach level 5 in a single run',
    category: 'misc',
    iconKey: '⬆️',
    conditionType: 'max_level',
    conditionValue: 5,
    rewardGold: 25,
    isActive: true,
  },
  {
    id: 'level_10',
    name: 'Veteran',
    description: 'Reach level 10 in a single run',
    category: 'misc',
    iconKey: '⬆️',
    conditionType: 'max_level',
    conditionValue: 10,
    rewardGold: 100,
    isActive: true,
  },
  {
    id: 'level_15',
    name: 'Elite',
    description: 'Reach level 15 in a single run',
    category: 'misc',
    iconKey: '🌟',
    conditionType: 'max_level',
    conditionValue: 15,
    rewardGold: 250,
    isActive: true,
  },
  {
    id: 'level_20',
    name: 'Ascendant',
    description: 'Reach level 20 in a single run',
    category: 'misc',
    iconKey: '🌟',
    conditionType: 'max_level',
    conditionValue: 20,
    rewardGold: 600,
    isActive: true,
  },

  // ── Trading (best single-run PnL) ───────────────────────────────────────
  {
    id: 'pnl_5',
    name: 'In The Green',
    description: 'Achieve 5% PnL in a single run',
    category: 'trading',
    iconKey: '📈',
    conditionType: 'pnl_percent',
    conditionValue: 0.05,
    rewardGold: 50,
    isActive: true,
  },
  {
    id: 'pnl_10',
    name: 'Market Wizard',
    description: 'Achieve 10% PnL in a single run',
    category: 'trading',
    iconKey: '📈',
    conditionType: 'pnl_percent',
    conditionValue: 0.1,
    rewardGold: 150,
    isActive: true,
  },
  {
    id: 'pnl_25',
    name: 'Crypto Whale',
    description: 'Achieve 25% PnL in a single run',
    category: 'trading',
    iconKey: '🐳',
    conditionType: 'pnl_percent',
    conditionValue: 0.25,
    rewardGold: 400,
    isActive: true,
  },
  {
    id: 'pnl_50',
    name: 'Diamond Hands',
    description: 'Achieve 50% PnL in a single run',
    category: 'trading',
    iconKey: '💎',
    conditionType: 'pnl_percent',
    conditionValue: 0.5,
    rewardGold: 1000,
    isActive: true,
  },
] as const;

/** Active achievements only (served to clients + evaluated for unlocks). */
export const ACTIVE_ACHIEVEMENTS: readonly AchievementDefinition[] =
  ACHIEVEMENT_CATALOG.filter((a) => a.isActive);

/** Quick lookup by ID. */
const ACHIEVEMENT_MAP: ReadonlyMap<string, AchievementDefinition> = new Map(
  ACHIEVEMENT_CATALOG.map((a) => [a.id, a]),
);

export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_MAP.get(id);
}

/**
 * Aggregate player stats used for achievement evaluation.
 * Derived from the sessions table (verified sessions only).
 */
export interface PlayerAggregateStats {
  totalKills: number;
  maxSurvivalSeconds: number;
  maxLevel: number;
  maxPnl: number;
}

/**
 * Check whether a single achievement's condition is met given aggregate stats.
 */
export function isAchievementConditionMet(
  achievement: AchievementDefinition,
  stats: PlayerAggregateStats
): boolean {
  switch (achievement.conditionType) {
    case 'total_kills':
      return stats.totalKills >= achievement.conditionValue;
    case 'survival_seconds':
      return stats.maxSurvivalSeconds >= achievement.conditionValue;
    case 'max_level':
      return stats.maxLevel >= achievement.conditionValue;
    case 'pnl_percent':
      return stats.maxPnl >= achievement.conditionValue;
    default:
      return false;
  }
}
