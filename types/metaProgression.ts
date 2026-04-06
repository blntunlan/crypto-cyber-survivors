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

export type MetaUpgradeIconId =
  | 'combat-damage'
  | 'combat-crit'
  | 'combat-projectile'
  | 'survival-hp'
  | 'survival-armor'
  | 'survival-dash'
  | 'economy-magnet'
  | 'economy-luck'
  | 'economy-xp'
  | 'special-headstart'
  | 'special-quad'
  | 'special-grace';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  icon: MetaUpgradeIconId;
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
