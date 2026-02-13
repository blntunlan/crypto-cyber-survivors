import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { LiquidatedDecorator } from '../../../../../../services/patterns/decorators/debuffs/LiquidatedDecorator';

const baseStats: IPlayerStats = {
  getDamage: () => 100,
  getSpeed: () => 5,
  getFireRate: () => 300,
  getCritChance: () => 0.2,
  getCritDamage: () => 2,
  getArmor: () => 4,
  getMagnet: () => 10,
  getProjectiles: () => 2,
  getArea: () => 1,
  getLuck: () => 3,
  getLifesteal: () => 0.1,
  getDodge: () => 0.05,
};

describe('LiquidatedDecorator', () => {
  it('applies severe offensive penalties', () => {
    const decorator = new LiquidatedDecorator(baseStats);

    expect(decorator.getDamage()).toBe(50);
    expect(decorator.getFireRate()).toBe(210);
    expect(decorator.getCritChance()).toBe(0.1);
  });

  it('exposes expected metadata', () => {
    const decorator = new LiquidatedDecorator(baseStats);

    expect(decorator.getName()).toBe('Liquidated');
    expect(decorator.getIcon()).toBe('📉');
    expect(decorator.getDuration()).toBe(8000);
    expect(decorator.getDescription()).toContain('-50% damage');
  });
});
