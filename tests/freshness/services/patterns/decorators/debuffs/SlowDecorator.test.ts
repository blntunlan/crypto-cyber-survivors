import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { SlowDecorator } from '../../../../../../services/patterns/decorators/debuffs/SlowDecorator';

const baseStats: IPlayerStats = {
  getDamage: () => 100,
  getSpeed: () => 8,
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

describe('SlowDecorator', () => {
  it('uses default 50% slow when no custom value is provided', () => {
    const decorator = new SlowDecorator(baseStats);

    expect(decorator.getSpeed()).toBe(4);
  });

  it('supports custom slow values and description text', () => {
    const decorator = new SlowDecorator(baseStats, 0.8);

    expect(decorator.getSpeed()).toBeCloseTo(6.4, 6);
    expect(decorator.getDescription()).toBe('-20% movement speed');
  });

  it('exposes expected metadata', () => {
    const decorator = new SlowDecorator(baseStats);

    expect(decorator.getName()).toBe('Slowed');
    expect(decorator.getIcon()).toBe('🐌');
    expect(decorator.getDuration()).toBe(3000);
  });
});
