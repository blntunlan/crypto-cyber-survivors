import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PoolManager } from '../../services/PoolManager';
import { MarketPosition } from '../../types';

// Mock factories
vi.mock('../../factories/EnemyFactory', () => ({
  enemyFactory: {
    createEnemy: vi.fn((type, x, y, diff, pos, aggro) => ({
      type,
      x,
      y,
      difficulty: diff,
      position: pos,
      aggroMultiplier: aggro,
      active: true,
      radius: 10,
      hp: 10,
      maxHp: 10,
      speed: 1,
      damage: 1,
      xpValue: 1,
      id: 1,
    })),
  },
}));

vi.mock('../../services/MarketStateService', () => ({
  marketStateService: {
    getState: vi.fn(() => ({ whaleTier: 0, enemyAggroMultiplier: 1.0 })),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
  },
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playWhaleArrival: vi.fn(),
  },
}));

describe('PoolManager', () => {
  let poolManager: PoolManager;

  beforeEach(() => {
    vi.clearAllMocks();
    poolManager = new PoolManager();
  });

  it('should initialize empty pools', () => {
    expect(poolManager.activeEnemies).toHaveLength(0);
    expect(poolManager.activeBullets).toHaveLength(0);
    expect(poolManager.activeGems).toHaveLength(0);
    expect(poolManager.activeParticles).toHaveLength(0);
    expect(poolManager.activeFloatingTexts).toHaveLength(0);
  });

  it('should get and recycle enemies', () => {
    const enemy1 = poolManager.getEnemy(0, 0, 1, MarketPosition.LONG, 'bear');
    expect(enemy1).toBeTruthy();
    expect(poolManager.activeEnemies).toHaveLength(1);

    // Reset it manually (simulating death/offscreen)
    poolManager.activeEnemies[0]!.active = false;

    // Cleanup should remove inactive
    poolManager.cleanup();
    expect(poolManager.activeEnemies).toHaveLength(0);

    // Get new one, should reuse if pool logic works (implementation specific)
    // Or at least return valid enemy
    const enemy2 = poolManager.getEnemy(10, 10, 1, MarketPosition.SHORT, 'bull');
    expect(enemy2).toBeTruthy();
    expect(poolManager.activeEnemies).toHaveLength(1);
  });

  it('should cap active count (max pool size)', () => {
    // PoolManager MAX_ACTIVE.floatingTexts = 50
    // Let's spam getting text
    for (let i = 0; i < 60; i++) {
      poolManager.getFloatingText(0, 0, 'test', 'white', 10);
    }

    expect(poolManager.activeFloatingTexts.length).toBeLessThanOrEqual(50);
    // It likely recycles oldest.
  });

  it('should clear all objects', () => {
    poolManager.getFloatingText(0, 0, 'a', 'white', 10);
    poolManager.getBullet(0, 0, 0, 0, 10, 10, 'red', false, false);
    expect(poolManager.activeFloatingTexts).toHaveLength(1);
    expect(poolManager.activeBullets).toHaveLength(1);

    poolManager.clearAll();

    expect(poolManager.activeFloatingTexts).toHaveLength(0);
    expect(poolManager.activeBullets).toHaveLength(0);
  });

  it('should pre-warm pools', () => {
    poolManager.preWarm({ gems: 10 });
    // It populates FREE list, not active
    // But we can check via debug or internal state.
    // Since active is empty, we verify logic runs without error
    expect(poolManager.activeGems).toHaveLength(0);

    // Getting one should be fast/consistent
    const gem = poolManager.getGem(0, 0, 10, 5, 'blue', false);
    expect(gem).toBeTruthy();
    expect(poolManager.activeGems).toHaveLength(1);
  });

  it('should reset pooled objects correctly', () => {
    const enemy = poolManager.getEnemy(0, 0, 1, MarketPosition.LONG);
    enemy.damageBuffer = 100;
    enemy.hasEnteredScreen = true;

    // Force cleanup simulation
    enemy.active = false;
    poolManager.cleanup();

    // Get again
    const recycled = poolManager.getEnemy(20, 20, 1, MarketPosition.SHORT);

    // Should be reset
    expect(recycled.damageBuffer).toBe(0);
    expect(recycled.hasEnteredScreen).toBe(false);
  });
});
