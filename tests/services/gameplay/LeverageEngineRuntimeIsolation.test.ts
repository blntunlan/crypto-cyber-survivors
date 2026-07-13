import { beforeEach, describe, expect, it } from 'vitest';
import { LeverageEngine } from '../../../services/gameplay/LeverageEngine';

describe('LeverageEngine runtime isolation', () => {
  beforeEach(() => {
    LeverageEngine.reset();
  });

  it('keeps player risk and reward while neutralizing direct enemy and spawn modifiers', () => {
    LeverageEngine.setLeverage(100);
    LeverageEngine.updateMarketState(0.03, -0.2);

    const multipliers = LeverageEngine.getMultipliers();

    expect(multipliers.damageTaken).toBeGreaterThan(1);
    expect(multipliers.maxHpScale).toBeLessThan(1);
    expect(multipliers.gemValue).toBeGreaterThan(1);
    expect(multipliers.spawnRate).toBe(1);
    expect(multipliers.enemySpeed).toBe(1);
    expect(multipliers.enemyHP).toBe(1);
    expect(multipliers.enemyDamage).toBe(1);
    expect(multipliers.difficultyRampSpeed).toBe(1);
  });
});
