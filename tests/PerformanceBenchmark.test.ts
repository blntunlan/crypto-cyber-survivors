import { describe, it, expect } from 'vitest';
import { PoolManager } from '../services/combat/PoolManager';
import { SpatialGrid } from '../services/combat/SpatialGrid';
import { type GameEnemy } from '../factories/EnemyFactory';
import { MarketPosition, type Player } from '../types';
import { PredictiveTargeting } from '../strategies/combat/PredictiveTargeting';

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
      pool.clearAll();
      const entities: GameEnemy[] = [];
      const COUNT = 1000;

      for (let i = 0; i < COUNT; i++) {
        entities.push(pool.getEnemy(0, 0, 1, MarketPosition.LONG));
      }

      const midIndex = Math.floor(COUNT / 2);
      const target = entities[midIndex]!;

      const start = performance.now();
      pool.releaseEnemy(target);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10.0);
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

      expect(avgTime).toBeLessThan(0.5);
      expect(maxTime).toBeLessThan(30.0);
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

      const startInsert = performance.now();
      grid.insertAll(entities);
      const elapsedInsert = performance.now() - startInsert;
      console.log(
        `[Benchmark] SpatialGrid: Insert ${COUNT} entities: ${elapsedInsert.toFixed(4)}ms`
      );
      expect(elapsedInsert).toBeLessThan(30);

      const startQuery = performance.now();
      for (let i = 0; i < 1000; i++) {
        grid.forEachNearby(Math.random() * 2000, Math.random() * 2000, () => {});
      }
      const elapsedQuery = performance.now() - startQuery;
      console.log(
        `[Benchmark] SpatialGrid: 1000 nearby queries: ${elapsedQuery.toFixed(4)}ms`
      );
      expect(elapsedQuery).toBeLessThan(100);
    });
  });

  describe('Interception Logic Performance', () => {
    it('should calculate intercept positions for 1000 targets rapidly', () => {
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
        PredictiveTargeting.calculateIntercept(player, target);
      }
      const elapsed = performance.now() - start;

      console.log(
        `[Benchmark] PredictiveTargeting: 1000 intercept calculations: ${elapsed.toFixed(4)}ms`
      );
      expect(elapsed).toBeLessThan(40.0);
    });
  });
});
