import { describe, it, expect } from 'vitest';
import { type IPlayerStats } from '../../../../../../services/patterns/decorators/IPlayerStats';
import { VulnerableDecorator } from '../../../../../../services/patterns/decorators/debuffs/VulnerableDecorator';

function createBaseStats(armor: number): IPlayerStats {
  return {
    getDamage: () => 100,
    getSpeed: () => 8,
    getFireRate: () => 300,
    getCritChance: () => 0.2,
    getCritDamage: () => 2,
    getArmor: () => armor,
    getMagnet: () => 10,
    getProjectiles: () => 2,
    getArea: () => 1,
    getLuck: () => 3,
    getLifesteal: () => 0.1,
    getDodge: () => 0.05,
  };
}

describe('VulnerableDecorator', () => {
  it('reduces armor by 50%', () => {
    const decorator = new VulnerableDecorator(createBaseStats(10));

    expect(decorator.getArmor()).toBe(5);
  });

  it('clamps armor to zero when wrapped value is negative', () => {
    const decorator = new VulnerableDecorator(createBaseStats(-4));

    expect(decorator.getArmor()).toBe(0);
  });

  it('exposes expected metadata', () => {
    const decorator = new VulnerableDecorator(createBaseStats(10));

    expect(decorator.getName()).toBe('Vulnerable');
    expect(decorator.getIcon()).toBe('🛡️');
    expect(decorator.getDuration()).toBe(5000);
    expect(decorator.getDescription()).toBe('-50% armor');
  });
});
