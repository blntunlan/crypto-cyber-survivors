import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { LuckBoostDecorator } from '../../../../../../services/patterns/decorators/buffs/LuckBoostDecorator';

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
  getLuck: () => 0,
  getLifesteal: () => 0.1,
  getDodge: () => 0.05,
};

describe('LuckBoostDecorator', () => {
  it('applies additive luck and magnet bonuses', () => {
    const decorator = new LuckBoostDecorator(baseStats);

    expect(decorator.getLuck()).toBe(2);
    expect(decorator.getMagnet()).toBe(60);
  });

  it('exposes expected metadata', () => {
    const decorator = new LuckBoostDecorator(baseStats);

    expect(decorator.getName()).toBe('Lucky Star');
    expect(decorator.getIcon()).toBe('🍀');
    expect(decorator.getDuration()).toBe(15000);
    expect(decorator.getDescription()).toContain('+2 luck');
  });
});
