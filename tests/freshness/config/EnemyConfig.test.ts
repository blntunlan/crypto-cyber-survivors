import { describe, it, expect } from 'vitest';
import {
  ENEMY_TYPES,
  ENEMY_SPAWN,
  ENEMY_SCALING,
  ENEMY_BASE_SPEED,
} from '../../../config/EnemyConfig';

describe('EnemyConfig', () => {
  it('keeps each enemy key aligned with its declared type and positive stats', () => {
    for (const [enemyId, config] of Object.entries(ENEMY_TYPES)) {
      expect(config.type).toBe(enemyId);
      expect(config.baseHealth).toBeGreaterThan(0);
      expect(config.baseSpeed).toBeGreaterThan(0);
      expect(config.baseDamage).toBeGreaterThan(0);
      expect(config.spawnWeight).toBeGreaterThan(0);
    }
  });

  it('assigns special behaviors only where expected', () => {
    expect(ENEMY_TYPES.liquidator.special).toBe('explosive');
    expect(ENEMY_TYPES.pumpdump.special).toBe('growing');
    expect(ENEMY_TYPES.bear.special).toBeUndefined();
    expect(ENEMY_TYPES.bull.special).toBeUndefined();
  });

  it('keeps spawn and scaling constants in safe ranges', () => {
    expect(ENEMY_SPAWN.MIN_INTERVAL).toBeLessThan(ENEMY_SPAWN.BASE_INTERVAL);
    expect(ENEMY_SPAWN.MAX_ENEMIES).toBeGreaterThan(0);
    expect(ENEMY_SPAWN.THEMATIC_CHANCE).toBeGreaterThanOrEqual(0);
    expect(ENEMY_SPAWN.THEMATIC_CHANCE).toBeLessThanOrEqual(1);
    expect(ENEMY_SPAWN.SPAWN_DISTANCE).toBeGreaterThan(0);

    for (const value of Object.values(ENEMY_SCALING)) {
      expect(value).toBeGreaterThan(0);
    }

    expect(ENEMY_BASE_SPEED).toBeGreaterThan(0);
  });
});
