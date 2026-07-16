import {
  getLootCacheFragmentChance,
  LOOT_CACHE_CONFIG,
} from '../../../config/LootCacheConfig';
import {
  type LootCacheResolution,
  type LootCacheResolveInput,
  type LootCacheRewardId,
} from '../../../types/lootCache';

export type LootCacheRandomSource = { nextFloat: () => number };

export class LootCacheRewardResolver {
  constructor(private readonly random: LootCacheRandomSource) {}

  resolve(input: LootCacheResolveInput): LootCacheResolution {
    if (
      !Number.isFinite(input.elapsedSeconds) ||
      !Number.isFinite(input.hpRatio) ||
      !Number.isFinite(input.levelProgress) ||
      !Number.isFinite(input.enemyCount)
    ) {
      return {
        primaryReward: 'data_dividend',
        secondaryReward: null,
        rewardStrength: LOOT_CACHE_CONFIG.rewardStrength[input.rarity],
        fragmentAwarded: false,
        persistFragment: false,
        fragmentChance: 0,
        nextPityMisses: input.pityMisses,
      };
    }

    const baseChance = getLootCacheFragmentChance(input.elapsedSeconds, input.rarity);
    const eligible = baseChance > 0;
    const pitySteps = Math.max(
      0,
      input.pityMisses - LOOT_CACHE_CONFIG.fragment.pityStartsAfterMisses + 1
    );
    const pityBonus = Math.min(
      LOOT_CACHE_CONFIG.fragment.pityMaximumBonus,
      pitySteps * LOOT_CACHE_CONFIG.fragment.pityStep
    );
    const fragmentChance = eligible ? baseChance + pityBonus : 0;
    const fragmentAwarded =
      input.forceFragmentPreview ||
      (eligible && this.random.nextFloat() < fragmentChance);
    const persistFragment = fragmentAwarded && !input.forceFragmentPreview;
    const nextPityMisses = !eligible
      ? input.pityMisses
      : fragmentAwarded
        ? 0
        : input.pityMisses + 1;

    let liquidityWeight: number = LOOT_CACHE_CONFIG.smartWeights.liquidity;
    let dataWeight: number = LOOT_CACHE_CONFIG.smartWeights.data;
    let overclockWeight: number = LOOT_CACHE_CONFIG.smartWeights.overclock;
    let circuitBreakerWeight: number = LOOT_CACHE_CONFIG.smartWeights.circuitBreaker;

    if (input.hpRatio < LOOT_CACHE_CONFIG.spawn.criticalHpRatio) {
      liquidityWeight += LOOT_CACHE_CONFIG.smartWeights.criticalHealthBonus;
    } else if (input.hpRatio > LOOT_CACHE_CONFIG.smartWeights.fullHealthCutoff) {
      liquidityWeight = 0;
    }

    if (input.levelProgress < LOOT_CACHE_CONFIG.smartWeights.lowProgressCutoff) {
      dataWeight += LOOT_CACHE_CONFIG.smartWeights.lowProgressBonus;
    }

    if (input.enemyCount >= LOOT_CACHE_CONFIG.smartWeights.highPressureEnemyCount) {
      overclockWeight += LOOT_CACHE_CONFIG.smartWeights.highPressureDamageBonus;
      circuitBreakerWeight += LOOT_CACHE_CONFIG.smartWeights.highPressureControlBonus;
    }

    if (input.overclockActive) {
      overclockWeight = 0;
    }
    if (input.enemyCount <= 0) {
      circuitBreakerWeight = 0;
    }

    const primaryReward = this.selectReward(
      liquidityWeight,
      dataWeight,
      overclockWeight,
      circuitBreakerWeight
    );

    if (input.rarity === 'legendary') {
      switch (primaryReward) {
        case 'liquidity_injection':
          liquidityWeight = 0;
          break;
        case 'data_dividend':
          dataWeight = 0;
          break;
        case 'overclock_contract':
          overclockWeight = 0;
          break;
        case 'circuit_breaker':
          circuitBreakerWeight = 0;
          break;
      }
    }

    let secondaryReward =
      input.rarity === 'legendary'
        ? this.selectReward(
            liquidityWeight,
            dataWeight,
            overclockWeight,
            circuitBreakerWeight
          )
        : null;
    if (secondaryReward === primaryReward) {
      secondaryReward =
        primaryReward === 'data_dividend' ? 'liquidity_injection' : 'data_dividend';
    }

    return {
      primaryReward,
      secondaryReward,
      rewardStrength: LOOT_CACHE_CONFIG.rewardStrength[input.rarity],
      fragmentAwarded,
      persistFragment,
      fragmentChance,
      nextPityMisses,
    };
  }

  private selectReward(
    liquidityWeight: number,
    dataWeight: number,
    overclockWeight: number,
    circuitBreakerWeight: number
  ): LootCacheRewardId {
    const totalWeight =
      liquidityWeight + dataWeight + overclockWeight + circuitBreakerWeight;
    if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
      return 'data_dividend';
    }

    let roll = this.random.nextFloat() * totalWeight;
    if (roll < liquidityWeight) {
      return 'liquidity_injection';
    }
    roll -= liquidityWeight;

    if (roll < dataWeight) {
      return 'data_dividend';
    }
    roll -= dataWeight;

    if (roll < overclockWeight) {
      return 'overclock_contract';
    }
    roll -= overclockWeight;

    if (roll < circuitBreakerWeight) {
      return 'circuit_breaker';
    }
    return 'data_dividend';
  }
}
