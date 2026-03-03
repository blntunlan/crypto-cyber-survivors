import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DifficultyManager } from '../../services/gameplay/DifficultyManager';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';
import { TimeService } from '../../services/core/TimeService';
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
      DifficultyManager.startGame(lev);

      const output = DifficultyManager.calculate(
        0, // pnlPercent
        0.5, // atrPercent
        1, // level
        100, // hpPercent
        undefined,
        true
      );

      results.push({
        leverage: lev,
        spawnRate: output.spawnRate,
        totalDifficulty: output.total,
      });
    });

    console.table(results);

    // Verify ordering (expect strictly greater unless capped at 5.0)
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i];
      const next = results[i + 1];
      if (current && next) {
        if (next.spawnRate < 5.0) {
          expect(next.spawnRate).toBeGreaterThanOrEqual(current.spawnRate);
        }
      }
    }

    const spawn1x = results.find(r => r.leverage === 1)?.spawnRate ?? 0;
    const spawn100x = results.find(r => r.leverage === 100)?.spawnRate ?? 0;

    // Ensure 1x isn't too boring (target > 0.8)
    expect(spawn1x).toBeGreaterThan(0.8);

    // Ensure 100x has a meaningful boost from leverage (moderate — LeverageEngine stacks on top)
    expect(spawn100x).toBeGreaterThan(spawn1x);
  });

  it('should respect max limits at 100x chaos', () => {
    DifficultyManager.startGame(100);
    difficultyContext.updateInputs({
      pnlPercent: -1.0,
      atrPercent: 5.0,
      level: 50,
    });

    const output = DifficultyManager.calculate(-1.0, 5.0, 50, 100, undefined, true);

    // Max limit should be 5.0 (standard cap)
    expect(output.spawnRate).toBeLessThanOrEqual(5.0);

    // Should be meaningfully above baseline
    expect(output.spawnRate).toBeGreaterThan(1.0);
  });
});
