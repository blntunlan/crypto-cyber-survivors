import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { BerserkDecorator } from '../../../../../../services/patterns/decorators/buffs/BerserkDecorator';

function createBaseStats(armor: number = 10): IPlayerStats {
  return {
    getDamage: () => 100,
    getSpeed: () => 5,
    getFireRate: () => 300,
    getCritChance: () => 0.2,
    getCritDamage: () => 2,
    getArmor: () => armor,
    getMagnet: () => 40,
    getProjectiles: () => 2,
    getArea: () => 1.2,
    getLuck: () => 3,
    getLifesteal: () => 0.1,
    getDodge: () => 0.05,
  };
}

describe('BerserkDecorator', () => {
  it('applies high-risk offensive multipliers', () => {
    const decorator = new BerserkDecorator(createBaseStats());

    expect(decorator.getDamage()).toBe(200);
    expect(decorator.getFireRate()).toBeCloseTo(201, 6);
    expect(decorator.getArmor()).toBe(7);
  });

  it('never returns negative armor and exposes metadata', () => {
    const decorator = new BerserkDecorator(createBaseStats(0));

    expect(decorator.getArmor()).toBe(0);
    expect(decorator.getName()).toBe('Berserk');
    expect(decorator.getIcon()).toBe('⚡');
    expect(decorator.getDuration()).toBe(8000);
    expect(decorator.getDescription()).toContain('+100% damage');
  });
});
