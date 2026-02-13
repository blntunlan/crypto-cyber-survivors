import { describe, it, expect } from 'vitest';
import { type Player } from '../../../../../types';
import { PlayerStatsAdapter } from '../../../../../services/patterns/decorators/PlayerStatsAdapter';

function createPlayer(): Player {
  return {
    x: 10,
    y: 20,
    radius: 12,
    color: '#fff',
    level: 3,
    exp: 120,
    nextLevelExp: 350,
    hp: 100,
    maxHp: 120,
    invulnerabilityTimer: 0,
    baseDamage: 40,
    fireRate: 300,
    critChance: 0.25,
    critDamage: 2,
    area: 1.5,
    projectiles: 2,
    armor: 6,
    regen: 1,
    dodge: 0.1,
    speed: 7,
    luck: 4,
    lifesteal: 0.12,
    magnet: 90,
  } as Player;
}

describe('PlayerStatsAdapter', () => {
  it('maps player core stats through the decorator interface', () => {
    const adapter = new PlayerStatsAdapter(createPlayer());

    expect(adapter.getDamage()).toBe(40);
    expect(adapter.getSpeed()).toBe(7);
    expect(adapter.getFireRate()).toBe(300);
    expect(adapter.getArmor()).toBe(6);
    expect(adapter.getMagnet()).toBe(90);
    expect(adapter.getProjectiles()).toBe(2);
    expect(adapter.getArea()).toBe(1.5);
    expect(adapter.getLuck()).toBe(4);
    expect(adapter.getLifesteal()).toBe(0.12);
    expect(adapter.getDodge()).toBe(0.1);
  });

  it('derives crit damage as 2x crit chance', () => {
    const adapter = new PlayerStatsAdapter(createPlayer());

    expect(adapter.getCritChance()).toBe(0.25);
    expect(adapter.getCritDamage()).toBe(0.5);
  });
});
