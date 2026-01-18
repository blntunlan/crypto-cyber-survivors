import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/DifficultyManager';
import { TimeService } from '../services/TimeService';
import { EventBus } from '../services/EventBus';

// Mock TimeService
vi.mock('../services/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
  },
}));

describe('New Mechanics (Damping, XP, Shock)', () => {
  beforeEach(() => {
    DifficultyManager.startGame(1);
    vi.clearAllMocks();
  });

  describe('Volatility Damping', () => {
    it('should dampen volatility heavily in the early game', () => {
      // Early game (0s): Damping is 0.2
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);

      // Calculate with high ATR (5%)
      const earlyDifficulty = DifficultyManager.calculate(0, 0.05, 1, 100).total;

      // Late game (300s+): Damping is 1.0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(300);
      const lateDifficulty = DifficultyManager.calculate(0, 0.05, 1, 100).total;

      expect(earlyDifficulty).toBeLessThan(lateDifficulty);
      // Damping formula: deviation * 0.2 vs deviation * 1.0
      // Base volatility at 0.05 ATR is ~3.5 (clamped to 1.8 in previous code? Let's check...)
      // The code says: return Math.min(1.8, Math.max(0.9, 1 + atrPercent * 50));
      // 1 + 0.05 * 50 = 3.5. So it hits the 1.8 cap.
      // Deviation is 1.8 - 1.0 = 0.8.
      // Early (0.2 damping): 1.0 + 0.8 * 0.2 = 1.16
      // Late (1.0 damping): 1.0 + 0.8 * 1.0 = 1.80
    });

    it('should gradually increase difficulty over time even with constant inputs', () => {
      const inputs = { pnl: 0, atr: 0.02, level: 1, hp: 100 };

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      const startDiff = DifficultyManager.calculate(
        inputs.pnl,
        inputs.atr,
        inputs.level,
        inputs.hp
      ).total;

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(150);
      const midDiff = DifficultyManager.calculate(
        inputs.pnl,
        inputs.atr,
        inputs.level,
        inputs.hp
      ).total;

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(300);
      const endDiff = DifficultyManager.calculate(
        inputs.pnl,
        inputs.atr,
        inputs.level,
        inputs.hp
      ).total;

      expect(startDiff).toBeLessThan(midDiff);
      expect(midDiff).toBeLessThan(endDiff);
    });
  });

  describe('Leverage XP Scaling', () => {
    it('should provide 1.0x XP multiplier for 1x leverage', () => {
      DifficultyManager.startGame(1);
      expect(DifficultyManager.getXpMultiplier()).toBeCloseTo(1.0);
    });

    it('should provide ~1.5x XP multiplier for 10x leverage', () => {
      DifficultyManager.startGame(10);
      expect(DifficultyManager.getXpMultiplier()).toBeCloseTo(1.5);
    });

    it('should provide 2.0x XP multiplier for 100x leverage', () => {
      DifficultyManager.startGame(100);
      expect(DifficultyManager.getXpMultiplier()).toBeCloseTo(2.0);
    });
  });

  describe('Volatility Shock Detection', () => {
    it('should emit volatilityShock event on sudden PnL jump', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Start at 0
      DifficultyManager.calculate(0.0, 0, 1, 100);

      // Advance 1s and jump PnL by 0.6% (threshold is 0.5%)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(1);
      DifficultyManager.calculate(0.006, 0, 1, 100);

      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
    });

    it('should obey shockwave cooldown (10s)', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Establish baseline at 0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      DifficultyManager.calculate(0.0, 0, 1, 100);

      // Shock 1
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(1);
      DifficultyManager.calculate(0.006, 0, 1, 100);
      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
      emitSpy.mockClear();

      // Immediate shock 2 (within 10s)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(5);
      DifficultyManager.calculate(0.013, 0, 1, 100);
      expect(emitSpy).not.toHaveBeenCalledWith('volatilityShock', expect.anything());

      // After cooldown
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(12);
      DifficultyManager.calculate(0.02, 0, 1, 100);
      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
    });
  });
});
