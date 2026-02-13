import { describe, it, expect } from 'vitest';
import { ENEMY_DEFINITIONS } from '../../../config/EnemyRegistry';

describe('EnemyRegistry', () => {
  it('contains core enemy definitions', () => {
    expect(ENEMY_DEFINITIONS.bear).toBeDefined();
    expect(ENEMY_DEFINITIONS.bull).toBeDefined();
    expect(ENEMY_DEFINITIONS.fud).toBeDefined();
    expect(ENEMY_DEFINITIONS.whale).toBeDefined();
  });

  it('keeps ids and types unique and aligned', () => {
    const ids = Object.values(ENEMY_DEFINITIONS).map(enemy => enemy.id);
    const types = Object.values(ENEMY_DEFINITIONS).map(enemy => enemy.type);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(types).size).toBe(types.length);

    for (const enemy of Object.values(ENEMY_DEFINITIONS)) {
      expect(enemy.id.length).toBeGreaterThan(0);
      expect(enemy.type.length).toBeGreaterThan(0);
      expect(enemy.radius).toBeGreaterThan(0);
      expect(enemy.baseHealth).toBeGreaterThan(0);
      expect(enemy.baseSpeed).toBeGreaterThan(0);
      expect(enemy.baseDamage).toBeGreaterThan(0);
      expect(enemy.spawnWeight).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps manual-only bosses with zero spawn weight', () => {
    expect(ENEMY_DEFINITIONS.market_maker.spawnWeight).toBe(0);
    expect(ENEMY_DEFINITIONS.gatekeeper.spawnWeight).toBe(0);
  });
});
