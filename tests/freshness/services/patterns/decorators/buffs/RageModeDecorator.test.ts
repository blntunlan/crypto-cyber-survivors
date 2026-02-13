import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { RageModeDecorator } from '../../../../../../services/patterns/decorators/buffs/RageModeDecorator';

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

describe('RageModeDecorator', () => {
  it('applies temporary damage and speed multipliers', () => {
    const decorator = new RageModeDecorator(baseStats);

    expect(decorator.getDamage()).toBe(150);
    expect(decorator.getSpeed()).toBe(6);
  });

  it('exposes expected metadata', () => {
    const decorator = new RageModeDecorator(baseStats);

    expect(decorator.getName()).toBe('Rage Mode');
    expect(decorator.getIcon()).toBe('🔥');
    expect(decorator.getDuration()).toBe(10000);
    expect(decorator.getDescription()).toContain('+50% damage');
  });
});
