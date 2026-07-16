import { type LootboxRarity } from './lootbox';

export type LootCacheRarity = LootboxRarity;
export type LootCacheRewardId =
  | 'liquidity_injection'
  | 'data_dividend'
  | 'overclock_contract'
  | 'circuit_breaker';
export type LootCachePhase = 'closed' | 'anticipation' | 'opening' | 'reward';
export type LootCacheSource = 'runtime' | 'debug';
export type LootCacheDebugMode = 'random' | 'jackpot';
export type LootCacheRarityWeights = Readonly<Record<LootCacheRarity, number>>;

export type LootCacheResolveInput = {
  elapsedSeconds: number;
  rarity: LootCacheRarity;
  hpRatio: number;
  levelProgress: number;
  enemyCount: number;
  overclockActive: boolean;
  pityMisses: number;
  forceFragmentPreview: boolean;
};

export type LootCacheResolution = {
  primaryReward: LootCacheRewardId;
  secondaryReward: LootCacheRewardId | null;
  rewardStrength: number;
  fragmentAwarded: boolean;
  persistFragment: boolean;
  fragmentChance: number;
  nextPityMisses: number;
};
