import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DifficultyManager } from '../../../services/DifficultyManager';
import { TimeService } from '../../../services/TimeService';
import { EventBus } from '../../../services/EventBus';

describe('DifficultyManager V2 - Streak Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    DifficultyManager.reset();
    // Reset TimeService mock if needed, or just set time
    vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should drop streak bonus after timeout even when no new kill occurs', () => {
    // 1. Start Game
    DifficultyManager.startGame(1);

    // 2. Get some kills to build streak
    // StreakFactor gives +0.05 per 5 kills. We need 10 kills for +0.10 (1.1x)
    for (let i = 0; i < 10; i++) {
      vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(i * 0.1);
      EventBus.emit('enemyKilled', { id: 'test', x: 0, y: 0 } as any); // Type assertion to bypass strict type checks if needed
    }

    // Verify high difficulty immediately after kills
    let output = DifficultyManager.calculate(0, 0, 1, 100);
    // factors are in output.factors.streakBonus
    // streakBonus is (factor - 1.0). So we expect 0.10 roughly.
    expect(output.factors.streakBonus).toBeGreaterThan(0.05);

    // 3. Advance time by 5 seconds (Streak timeout is usually 3s in Factor logic)
    vi.spyOn(TimeService, 'getGameTimeSeconds').mockReturnValue(10.0); // 5+ seconds later

    // 4. Calculate again
    output = DifficultyManager.calculate(0, 0, 1, 100);

    // 5. Verification
    // Streak bonus should default to 0 because timeSinceLastKill > 3000ms
    expect(output.factors.streakBonus).toBe(0);
  });
});
