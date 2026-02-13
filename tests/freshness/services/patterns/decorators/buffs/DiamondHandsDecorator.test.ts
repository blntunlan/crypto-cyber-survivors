import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { DiamondHandsDecorator } from '../../../../../../services/patterns/decorators/buffs/DiamondHandsDecorator';

const baseStats: IPlayerStats = {
  getDamage: () => 100,
  getSpeed: () => 5,
  getFireRate: () => 300,
  getCritChance: () => 0.2,
  getCritDamage: () => 2,
  getArmor: () => 4,
  getMagnet: () => 40,
  getProjectiles: () => 2,
  getArea: () => 1,
  getLuck: () => 3,
  getLifesteal: () => 0.1,
  getDodge: () => 0.05,
};

describe('DiamondHandsDecorator', () => {
  it('adds permanent armor and crit bonuses', () => {
    const decorator = new DiamondHandsDecorator(baseStats);

    expect(decorator.getArmor()).toBe(9);
    expect(decorator.getCritChance()).toBeCloseTo(0.3, 6);
    expect(decorator.getDuration()).toBe(-1);
  });

  it('exposes stable metadata', () => {
    const decorator = new DiamondHandsDecorator(baseStats);

    expect(decorator.getName()).toBe('Diamond Hands');
    expect(decorator.getIcon()).toBe('💎');
    expect(decorator.getDescription()).toContain('+5 armor');
  });
});
