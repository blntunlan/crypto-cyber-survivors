import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { WeakenedDecorator } from '../../../../../../services/patterns/decorators/debuffs/WeakenedDecorator';

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
  getLuck: () => 5,
  getLifesteal: () => 0.1,
  getDodge: () => 0.05,
};

describe('WeakenedDecorator', () => {
  it('reduces damage and luck', () => {
    const decorator = new WeakenedDecorator(baseStats);

    expect(decorator.getDamage()).toBe(70);
    expect(decorator.getLuck()).toBe(3);
  });

  it('exposes expected metadata', () => {
    const decorator = new WeakenedDecorator(baseStats);

    expect(decorator.getName()).toBe('Weakened');
    expect(decorator.getIcon()).toBe('💀');
    expect(decorator.getDuration()).toBe(6000);
    expect(decorator.getDescription()).toContain('-30% damage');
  });
});
