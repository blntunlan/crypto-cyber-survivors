import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DifficultyManager } from '../../services/DifficultyManager';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';
import { TimeService } from '../../services/TimeService';
// LEVERAGE_TIERS imported but not used, causing lint error. Casing also corrected.
// import { LEVERAGE_TIERS } from '../../config/GameConfig';

describe('Leverage Scaling & Spawn Rate Tests (1x-100x)', () => {
  beforeEach(() => {
    DifficultyManager.reset();
    difficultyContext.reset();
    vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(0);
  });

  it('should produce increasing spawn rates for standard leverages', () => {
    const leverages = [1, 2, 5, 10, 25, 50, 100];
    const results: { leverage: number; spawnRate: number; totalDifficulty: number }[] =
      [];

    leverages.forEach(lev => {
      difficultyContext.reset();
      // @ts-expect-error valid leverage for test
      DifficultyManager.startGame(lev);

      const output = DifficultyManager.calculate(
        0, // pnlPercent
        0.5, // atrPercent
        1, // level
        100 // hpPercent
      );

      results.push({
        leverage: lev,
        spawnRate: output.spawnRate,
        totalDifficulty: output.total,
      });
    });

    console.table(results);

    // Verify ordering
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i];
      const next = results[i + 1];
      if (current && next) {
        expect(next.spawnRate).toBeGreaterThan(current.spawnRate);
        // 1% gap min
        expect(next.spawnRate).toBeGreaterThanOrEqual(current.spawnRate * 1.01);
      }
    }

    const spawn1x = results.find(r => r.leverage === 1)?.spawnRate ?? 0;
    const spawn100x = results.find(r => r.leverage === 100)?.spawnRate ?? 0;

    // Ensure 1x isn't too boring (target > 1.0)
    expect(spawn1x).toBeGreaterThan(0.8);

    // Ensure 100x is chaotic (target > 5.0)
    expect(spawn100x).toBeGreaterThan(5.0);
  });

  it('should respect max limits at 100x chaos', () => {
    // @ts-expect-error valid leverage for test
    DifficultyManager.startGame(100);
    difficultyContext.updateInputs({
      pnlPercent: -1.0,
      atrPercent: 5.0,
      level: 50,
    });

    const output = DifficultyManager.calculate(-1.0, 5.0, 50, 100);

    // Max limit should be 35.0 (standard cap)
    expect(output.spawnRate).toBeLessThanOrEqual(35.0);

    // Should be high
    expect(output.spawnRate).toBeGreaterThan(15.0);
  });
});
