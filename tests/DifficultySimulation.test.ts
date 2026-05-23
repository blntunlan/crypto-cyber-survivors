import { describe, expect, it } from 'vitest';
import { runDifficultySimulation } from './DifficultySimulation';

describe('Difficulty Mathematical Model Simulation', () => {
  it('should produce bounded difficulty factors for every scenario', () => {
    const results = runDifficultySimulation({ log: false });

    expect(results).toHaveLength(5);

    for (const result of results) {
      expect(Number.isFinite(result.total)).toBe(true);
      expect(Number.isFinite(result.spawnRate)).toBe(true);
      expect(Number.isFinite(result.enemySpeed)).toBe(true);
      expect(Number.isFinite(result.enemyHP)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0.2);
      expect(result.total).toBeLessThanOrEqual(10);
      expect(result.spawnRate).toBeGreaterThan(0);
      expect(result.enemySpeed).toBeGreaterThan(0);
      expect(result.enemyHP).toBeGreaterThan(0);
    }
  });

  it('should apply more pressure in the chaos scenario than at the start', () => {
    const results = runDifficultySimulation({ log: false });
    const start = results.find(result => result.name === 'Yeni Başlangıç');
    const chaos = results.find(
      result => result.name === '10. Dakika - Balina Etkisi / Kaos'
    );

    expect(start).toBeDefined();
    expect(chaos).toBeDefined();
    expect(chaos!.total).toBeGreaterThan(start!.total);
  });
});
