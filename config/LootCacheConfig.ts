import {
  type LootCacheRarity,
  type LootCacheRarityWeights,
  type LootCacheRewardId,
} from '../types/lootCache';

const REWARD_LABELS: Readonly<Record<LootCacheRewardId, string>> = {
  liquidity_injection: '♥ LIQUIDITY INJECTION',
  data_dividend: '✦ DATA DIVIDEND',
  overclock_contract: '⚡ OVERCLOCK CONTRACT',
  circuit_breaker: '⏸ CIRCUIT BREAKER',
};

const TIME_BANDS = [
  {
    minSeconds: 0,
    rarityWeights: { common: 78, rare: 20, epic: 2, legendary: 0 },
    fragmentChance: { common: 0, rare: 0, epic: 0, legendary: 0 },
  },
  {
    minSeconds: 180,
    rarityWeights: { common: 65, rare: 27, epic: 7, legendary: 1 },
    fragmentChance: { common: 0, rare: 0, epic: 0.02, legendary: 0.08 },
  },
  {
    minSeconds: 420,
    rarityWeights: { common: 55, rare: 30, epic: 12, legendary: 3 },
    fragmentChance: { common: 0, rare: 0.01, epic: 0.05, legendary: 0.15 },
  },
  {
    minSeconds: 720,
    rarityWeights: { common: 45, rare: 32, epic: 18, legendary: 5 },
    fragmentChance: { common: 0, rare: 0.02, epic: 0.08, legendary: 0.25 },
  },
] as const;

export const LOOT_CACHE_CONFIG = {
  spawn: {
    firstWindowSeconds: { min: 35, max: 55 },
    repeatWindowSeconds: { min: 55, max: 95 },
    pressureDeferralSeconds: 15,
    comebackAccelerationSeconds: 10,
    criticalHpRatio: 0.35,
    placementAttempts: 5,
    minimumPlayerDistance: 180,
    maximumPlayerDistance: 320,
    enemyClearance: 48,
    viewportPadding: 72,
  },
  smartWeights: {
    liquidity: 25,
    data: 30,
    overclock: 25,
    circuitBreaker: 20,
    criticalHealthBonus: 70,
    lowProgressBonus: 25,
    highPressureControlBonus: 50,
    highPressureDamageBonus: 20,
    highPressureEnemyCount: 28,
    fullHealthCutoff: 0.8,
    lowProgressCutoff: 0.35,
  },
  rewardStrength: { common: 1, rare: 1.25, epic: 1.6, legendary: 1.5 },
  fragment: { pityStartsAfterMisses: 8, pityStep: 0.02, pityMaximumBonus: 0.1 },
  feedback: {
    proximityRadius: 96,
    proximityTickIntervalMs: { near: 120, edge: 360 },
    anticipationMs: 40,
    totalOpeningMs: 650,
    rewardPhaseProgress: 0.4,
    hitStopMs: { common: 70, rare: 80, epic: 90, legendary: 100 },
    particles: { common: 8, rare: 12, epic: 18, legendary: 28 },
    shake: { common: 0, rare: 1.5, epic: 2.5, legendary: 3.5 },
  },
  presentation: {
    tierText: {
      common: 'C COMMON',
      rare: 'R RARE',
      epic: 'E EPIC',
      legendary: 'L LEGENDARY',
    },
    tierIcon: { common: 'C', rare: 'R', epic: 'E', legendary: 'L' },
    rewardLabels: REWARD_LABELS,
    fragmentLabel: '◆ ENCRYPTED FRAGMENT',
    primaryTextSizePx: 20,
    secondaryTextSizePx: 16,
    fragmentTextSizePx: 18,
    secondaryOffsetY: 12,
    fragmentOffsetY: 28,
    travelSpeed: 1.2,
  },
  rewards: {
    healMaxHpFraction: 0.25,
    contactProtectionMs: 1500,
    xpNextLevelFraction: 0.35,
    xpGemCount: 8,
    overclockDurationMs: 10000,
    circuitBreakerSlowMs: 2500,
    circuitBreakerSlowMultiplier: 0.5,
    circuitBreakerPushPixels: 35,
  },
} as const;

export const getLootCacheRarityWeights = (
  elapsedSeconds: number
): LootCacheRarityWeights => {
  if (elapsedSeconds >= TIME_BANDS[3].minSeconds) {
    return TIME_BANDS[3].rarityWeights;
  }
  if (elapsedSeconds >= TIME_BANDS[2].minSeconds) {
    return TIME_BANDS[2].rarityWeights;
  }
  if (elapsedSeconds >= TIME_BANDS[1].minSeconds) {
    return TIME_BANDS[1].rarityWeights;
  }
  if (elapsedSeconds >= TIME_BANDS[0].minSeconds) {
    return TIME_BANDS[0].rarityWeights;
  }
  return TIME_BANDS[0].rarityWeights;
};

export const getLootCacheFragmentChance = (
  elapsedSeconds: number,
  rarity: LootCacheRarity
): number => {
  if (elapsedSeconds >= TIME_BANDS[3].minSeconds) {
    return TIME_BANDS[3].fragmentChance[rarity];
  }
  if (elapsedSeconds >= TIME_BANDS[2].minSeconds) {
    return TIME_BANDS[2].fragmentChance[rarity];
  }
  if (elapsedSeconds >= TIME_BANDS[1].minSeconds) {
    return TIME_BANDS[1].fragmentChance[rarity];
  }
  if (elapsedSeconds >= TIME_BANDS[0].minSeconds) {
    return TIME_BANDS[0].fragmentChance[rarity];
  }
  return TIME_BANDS[0].fragmentChance[rarity];
};
