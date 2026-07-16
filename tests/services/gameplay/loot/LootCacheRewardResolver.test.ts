import { describe, expect, it } from 'vitest';
import { LootCacheRewardResolver } from '../../../../services/gameplay/loot/LootCacheRewardResolver';
import { type LootCacheResolveInput } from '../../../../types/lootCache';

class ScriptedRandom {
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  nextFloat(): number {
    const value = this.values[this.index] ?? this.values.at(-1) ?? 0;
    this.index += 1;
    return value;
  }
}

const createInput = (
  overrides: Partial<LootCacheResolveInput> = {}
): LootCacheResolveInput => ({
  elapsedSeconds: 720,
  rarity: 'epic',
  hpRatio: 0.6,
  levelProgress: 0.5,
  enemyCount: 10,
  overclockActive: false,
  pityMisses: 0,
  forceFragmentPreview: false,
  ...overrides,
});

const resolveWith = (
  randomValues: readonly number[],
  overrides: Partial<LootCacheResolveInput> = {}
) => {
  const resolver = new LootCacheRewardResolver(new ScriptedRandom(randomValues));
  return resolver.resolve(createInput(overrides));
};

describe('LootCacheRewardResolver', () => {
  it('does not grant legendary fragments before 180 seconds', () => {
    const result = resolveWith([0, 0], {
      elapsedSeconds: 179.999,
      rarity: 'legendary',
      pityMisses: 12,
    });

    expect(result.fragmentChance).toBe(0);
    expect(result.fragmentAwarded).toBe(false);
    expect(result.persistFragment).toBe(false);
    expect(result.nextPityMisses).toBe(12);
  });

  it('cannot choose Liquidity Injection at full HP', () => {
    const result = resolveWith([0.99, 0], { hpRatio: 1 });

    expect(result.primaryReward).toBe('data_dividend');
  });

  it('chooses Liquidity Injection at critical HP with a low roll', () => {
    const result = resolveWith([0.99, 0], { hpRatio: 0.2 });

    expect(result.primaryReward).toBe('liquidity_injection');
  });

  it('cannot choose Overclock Contract while Overclock is active', () => {
    const result = resolveWith([0.99, 0.8], { overclockActive: true });

    expect(result.primaryReward).toBe('circuit_breaker');
  });

  it('cannot choose Circuit Breaker without an active enemy target', () => {
    const result = resolveWith([0.99, 0.99], { enemyCount: 0 });

    expect(result.primaryReward).not.toBe('circuit_breaker');
  });

  it('returns two distinct rewards for Gold rarity', () => {
    const result = resolveWith([0.99, 0, 0], { rarity: 'legendary' });

    expect(result.primaryReward).toBe('liquidity_injection');
    expect(result.secondaryReward).toBe('data_dividend');
    expect(result.secondaryReward).not.toBe(result.primaryReward);
    expect(result.rewardStrength).toBe(1.5);
  });

  it('returns a distinct positive Gold fallback when Data is the only weighted reward', () => {
    const result = resolveWith([0.99, 0], {
      rarity: 'legendary',
      hpRatio: 1,
      enemyCount: 0,
      overclockActive: true,
    });

    expect(result.primaryReward).toBe('data_dividend');
    expect(result.secondaryReward).toBe('liquidity_injection');
    expect(result.secondaryReward).not.toBe(result.primaryReward);
  });

  it.each([
    ['elapsed time', { elapsedSeconds: Number.NaN }],
    ['HP ratio', { hpRatio: Number.POSITIVE_INFINITY }],
    ['level progress', { levelProgress: Number.NEGATIVE_INFINITY }],
    ['enemy count', { enemyCount: Number.NaN }],
  ] as const)('falls back to Data Dividend for non-finite %s', (_, override) => {
    const result = resolveWith([0], { ...override, pityMisses: 4 });

    expect(result).toEqual({
      primaryReward: 'data_dividend',
      secondaryReward: null,
      rewardStrength: 1.6,
      fragmentAwarded: false,
      persistFragment: false,
      fragmentChance: 0,
      nextPityMisses: 4,
    });
  });

  it('adds no pity bonus until eight eligible misses have completed', () => {
    const result = resolveWith([0.99, 0], { pityMisses: 7 });

    expect(result.fragmentChance).toBe(0.08);
    expect(result.nextPityMisses).toBe(8);
  });

  it('adds 0.02 fragment chance per miss after eight eligible misses', () => {
    expect(resolveWith([0.99, 0], { pityMisses: 8 }).fragmentChance).toBe(0.1);
    expect(resolveWith([0.99, 0], { pityMisses: 9 }).fragmentChance).toBe(0.12);
  });

  it('caps the fragment pity bonus at 0.10', () => {
    const result = resolveWith([0.99, 0], { pityMisses: 100 });

    expect(result.fragmentChance).toBe(0.18);
  });

  it('resets pity after awarding a fragment', () => {
    const result = resolveWith([0, 0], { pityMisses: 8 });

    expect(result.fragmentAwarded).toBe(true);
    expect(result.persistFragment).toBe(true);
    expect(result.nextPityMisses).toBe(0);
  });

  it('forces a non-persistent fragment preview without changing ineligible pity', () => {
    const result = resolveWith([0], {
      elapsedSeconds: 179.999,
      pityMisses: 5,
      forceFragmentPreview: true,
    });

    expect(result.fragmentAwarded).toBe(true);
    expect(result.persistFragment).toBe(false);
    expect(result.fragmentChance).toBe(0);
    expect(result.nextPityMisses).toBe(5);
    expect(result.primaryReward).toBe('liquidity_injection');
  });
});
