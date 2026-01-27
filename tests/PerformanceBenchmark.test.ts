import { describe, it, expect } from 'vitest';
import { PoolManager } from '../services/PoolManager';
import { SpatialGrid } from '../services/SpatialGrid';
import { CombatSystem } from '../services/CombatSystem';
import { type GameEnemy } from '../factories/EnemyFactory';
import { MarketPosition, type Player } from '../types';

/**
 * Performance Benchmark Suite
 *
 * Measures the efficiency of core game systems under stress.
 * Validates O(1) pooling and spatial optimization performance.
 */
describe('Performance Benchmark', () => {
  describe('ObjectPool Efficiency (O(1) Verification)', () => {
    it('should maintain stable release time regardless of pool size', () => {
      const pool = PoolManager.getInstance();
      pool.clearAll(); // Ensure fresh state for benchmark
      const entities: GameEnemy[] = [];
      const COUNT = 1000;

      // Fill the pool
      for (let i = 0; i < COUNT; i++) {
        entities.push(pool.getEnemy(0, 0, 1, MarketPosition.LONG));
      }

      // Benchmark single release from the middle (worst case for O(N))
      const midIndex = Math.floor(COUNT / 2);
      const target = entities[midIndex]!;

      const start = performance.now();
      pool.releaseEnemy(target);
      const elapsed = performance.now() - start;

      // O(1) should be extremely fast, but we allow 5ms for test environment jitter
      expect(elapsed).toBeLessThan(5.0);
    });

    it('should recycle objects without memory allocation spikes and maintain stability', () => {
      const pool = PoolManager.getInstance();
      pool.clearAll();
      const ITERATIONS = 10000;

      let totalTime = 0;
      let maxTime = 0;

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        const e = pool.getEnemy(0, 0, 1, MarketPosition.LONG);
        pool.releaseEnemy(e);
        const elapsed = performance.now() - start;

        totalTime += elapsed;
        if (elapsed > maxTime) maxTime = elapsed;
      }

      const avgTime = totalTime / ITERATIONS;
      const jitter = maxTime - avgTime;

      console.log(
        `[Stability] ObjectPool 10k Cycles: Avg: ${avgTime.toFixed(6)}ms | Max: ${maxTime.toFixed(6)}ms | Jitter: ${jitter.toFixed(6)}ms`
      );

      // Jitter should be very low in a stable O(1) system
      // Note: CI environments may have variable timing, so we use relaxed thresholds
      expect(avgTime).toBeLessThan(0.5);
      expect(maxTime).toBeLessThan(20.0); // Allow for CI variability
    });
  });

  describe('SpatialGrid Scalability', () => {
    it('should handle high entity density efficiently', () => {
      const grid = new SpatialGrid<any>(150);
      const COUNT = 5000;
      const entities = Array.from({ length: COUNT }, (_, i) => ({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        active: true,
        id: i,
      }));

      // Insertion Benchmark
      const startInsert = performance.now();
      grid.insertAll(entities);
      const elapsedInsert = performance.now() - startInsert;
      console.log(
        `[Benchmark] SpatialGrid: Insert ${COUNT} entities: ${elapsedInsert.toFixed(4)}ms`
      );
      expect(elapsedInsert).toBeLessThan(20);

      // Query Benchmark (1000 queries)
      const startQuery = performance.now();
      for (let i = 0; i < 1000; i++) {
        grid.forEachNearby(Math.random() * 2000, Math.random() * 2000, () => {});
      }
      const elapsedQuery = performance.now() - startQuery;
      console.log(
        `[Benchmark] SpatialGrid: 1000 nearby queries: ${elapsedQuery.toFixed(4)}ms`
      );
      expect(elapsedQuery).toBeLessThan(80);
    });
  });

  describe('CombatSystem Targeted Search', () => {
    it('should find nearest enemy among 1000 targets within frame budget', () => {
      const combat = CombatSystem.getInstance();
      const pool = PoolManager.getInstance();
      pool.clearAll();
      const player: Player = {
        x: 1000,
        y: 1000,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        nextLevelExp: 100,
      } as any;

      // Spawn 1000 enemies
      for (let i = 0; i < 1000; i++) {
        const e = pool.getEnemy(
          Math.random() * 2000,
          Math.random() * 2000,
          1,
          MarketPosition.LONG
        );
        e.hasEnteredScreen = true; // Required for targeting
      }

      const start = performance.now();
      combat['findNearestEnemy'](pool, player, 2000, 2000);
      const elapsed = performance.now() - start;

      console.log(
        `[Benchmark] CombatSystem: findNearestEnemy among 1000 targets: ${elapsed.toFixed(4)}ms`
      );

      // Full screen search for 1000 enemies should be efficient
      // Relaxed threshold for CI environments with variable performance
      expect(elapsed).toBeLessThan(20.0);
    });
  });

  describe('Interception Logic Performance', () => {
    it('should calculate intercept positions for 1000 targets rapidly', () => {
      const combat = CombatSystem.getInstance();
      const player: Player = {
        x: 0,
        y: 0,
        hp: 100,
        maxHp: 100,
        level: 1,
        exp: 0,
        nextLevelExp: 100,
      } as any;
      const target: any = { x: 500, y: 500, dist: 707, speed: 2 };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        combat['calculateInterceptPosition'](player, target);
      }
      const elapsed = performance.now() - start;

      console.log(
        `[Benchmark] CombatSystem: 1000 intercept calculations: ${elapsed.toFixed(4)}ms`
      );
      // Relaxed threshold for CI environments with variable performance
      expect(elapsed).toBeLessThan(30.0);
    });
  });
});
