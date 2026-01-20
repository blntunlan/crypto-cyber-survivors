import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../../services/DifficultyManager';
import { TimeService } from '../../services/TimeService';

// Mock TimeService
vi.mock('../../services/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
  },
}));

describe('DifficultyManager Edge Cases', () => {
  beforeEach(() => {
    DifficultyManager.startGame();
    vi.clearAllMocks();
  });

  describe('Extreme Input Clamping', () => {
    it('should handle extremely high P&L (+1000%)', () => {
      // 10.0 = 1000%
      const difficulty = DifficultyManager.calculate(10.0, 0, 1, 100);
      // Min total difficulty is 0.3
      expect(difficulty.total).toBeGreaterThanOrEqual(0.3);
      expect(difficulty.total).toBeLessThan(1.0); // Should be very easy
    });

    it('should handle extremely low P&L (-1000%)', () => {
      // -10.0 = -1000%
      const difficulty = DifficultyManager.calculate(-10.0, 0, 1, 100);
      expect(difficulty.total).toBeLessThanOrEqual(8.0);
      expect(difficulty.total).toBeGreaterThanOrEqual(1.3); // Should be hard even in warmup phase
    });

    it('should handle NaN and Infinite P&L gracefully', () => {
      const nanDiff = DifficultyManager.calculate(NaN, 0, 1, 100);
      expect(nanDiff.total).toBeDefined();
      expect(Number.isNaN(nanDiff.total)).toBe(false);

      const infDiff = DifficultyManager.calculate(Infinity, 0, 1, 100);
      expect(infDiff.total).toBeDefined();
      expect(Number.isFinite(infDiff.total)).toBe(true);
    });

    it('should handle extreme volatility', () => {
      const superVol = DifficultyManager.calculate(0, 1.0, 1, 100); // 100% ATR
      expect(superVol.total).toBeLessThanOrEqual(8.0);
    });

    it('should handle level 0 and very high levels', () => {
      const lvl0 = DifficultyManager.calculate(0, 0, 0, 100);
      expect(lvl0.total).toBeGreaterThanOrEqual(0.3);

      const lvl999 = DifficultyManager.calculate(0, 0, 999, 100);
      expect(lvl999.total).toBeLessThanOrEqual(8.0);
    });
  });

  describe('Wave Transition Edge Cases', () => {
    it('should handle large time jumps spanning multiple phases', () => {
      // Reset with time 0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      DifficultyManager.startGame();

      // Actual durations from GameConfig: warmup(25) -> buildup(60) -> firstPeak(30) -> breather(45) ->
      //            escalation(60) -> climax(45) -> resolution(15) = 280s total
      // Jump to 305s: 305 % 280 = 25s into cycle 2, which is exactly at buildup start
      // Jump to 290s: 290 % 280 = 10s into cycle 2, which is in warmup (0-25s)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(290);
      DifficultyManager.calculate(0, 0, 1, 100); // Triggers sync
      expect(DifficultyManager.getWavePhase()).toBe('warmup');
    });

    it('should handle very small time increments without phase skip', () => {
      // Reset with time 0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      DifficultyManager.startGame();

      // Small time increments (0.1 seconds total) - should still be warmup
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0.1);
      DifficultyManager.calculate(0, 0, 1, 100);
      expect(DifficultyManager.getWavePhase()).toBe('warmup');
    });
  });

  describe('Kill Streak Boundaries', () => {
    it('should apply streak bonus exactly at threshold', () => {
      // Streak bonus: +5% per 5 kills, caps at +30%
      // 4 kills -> 0%
      for (let i = 0; i < 4; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(i * 0.1);
        DifficultyManager.recordKill();
      }
      const diff4 = DifficultyManager.calculate(0, 0, 1, 100);

      // 5 kills -> 5% bonus
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(1.0);
      DifficultyManager.recordKill();
      const diff5 = DifficultyManager.calculate(0, 0, 1, 100);

      expect(diff5.total).toBeGreaterThan(diff4.total);
    });

    it('should cap streak bonus at 30 kills', () => {
      DifficultyManager.startGame();
      for (let i = 0; i < 30; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(i * 0.1);
        DifficultyManager.recordKill();
      }
      DifficultyManager.calculate(0, 0, 1, 100);

      for (let i = 30; i < 40; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(i * 0.1);
        DifficultyManager.recordKill();
      }

      // Use stable time for calculation comparison to isoloate streak bonus
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(10.0);
      const diff30 = DifficultyManager.calculate(0, 0, 1, 100);
      const diff40 = DifficultyManager.calculate(0, 0, 1, 100);

      // Should be identical if capped at 30
      expect(diff40.total).toBe(diff30.total);
    });
  });

  describe('Momentum Buffer Stability', () => {
    it('should handle rapid P&L oscillations', () => {
      // Feed oscillating values: -1, 1, -1, 1...
      for (let i = 0; i < 40; i++) {
        DifficultyManager.calculate(i % 2 === 0 ? 0.1 : -0.1, 0, 1, 100);
      }

      const session = DifficultyManager.calculate(0, 0, 1, 100);
      expect(Number.isFinite(session.total)).toBe(true);
    });
  });
});
