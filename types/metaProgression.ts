/**
 * Meta Progression Types
 */

export type MetaUpgradeId =
  | 'DAMAGE_BOOST'
  | 'CRIT_MASTERY'
  | 'EXTRA_PROJECTILE'
  | 'HP_RESERVOIR'
  | 'ARMOR_PLATING'
  | 'DASH_COOLDOWN'
  | 'COIN_MAGNET'
  | 'LUCK_GENE'
  | 'XP_ACCELERATOR'
  | 'STARTING_LEVEL_2'
  | 'QUAD_CARD_CHOICE'
  | 'GRACE_EXTENSION';

export type MetaUpgradeCategory = 'combat' | 'survival' | 'economy' | 'special';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  icon: string;
  category: MetaUpgradeCategory;
  maxLevel: number;
  costPerLevel: number[];
}

export interface PlayerMetaState {
  metaCoins: number;
  upgrades: Record<MetaUpgradeId, number>;
  totalRunsCompleted: number;
  totalMetaCoinsEarned: number;
}
