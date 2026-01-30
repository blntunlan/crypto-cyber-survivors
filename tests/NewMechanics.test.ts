import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { TimeService } from '../services/core/TimeService';
import { EventBus } from '../services/core/EventBus';

// Mock TimeService
vi.mock('../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
    getGameTime: vi.fn().mockReturnValue(0),
  },
}));

// Mock GameMasterBrain
vi.mock('../services/difficulty/GameMasterBrain', () => ({
  GameMasterBrain: {
    update: vi.fn(),
    getOutputs: vi.fn(() => ({
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      gemDropRate: 1.0,
      xpMultiplier: 1.0,
      whaleType: 0,
      eventIntensity: 0.3,
      aggression: 0.4,
      chaos: 0.3,
      mercyWindow: 0.2,
      pressureRamp: 0.5,
    })),
  },
}));

vi.mock('../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: vi.fn(() => ({
      rsi: 50,
      atrPercent: 0.02,
      normalizedVolume: 0.5,
    })),
  },
}));

vi.mock('../services/difficulty/factors/macd', () => ({
  calculateMACDFactor: vi.fn(() => 0),
}));

vi.mock('../services/combat/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({
      activeGems: [],
    })),
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
      const earlyDifficulty = DifficultyManager.calculate(0, 0.05, 1, 1.0).total;

      // Buildup phase (60s): wave factor 0.85 (higher than warmup 0.75)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);
      const lateDifficulty = DifficultyManager.calculate(0, 0.05, 1, 1.0).total;

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
      const inputs = { pnl: 0, atr: 0.02, level: 1, hp: 1.0 };

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      const startDiff = DifficultyManager.calculate(
        inputs.pnl,
        inputs.atr,
        inputs.level,
        inputs.hp
      ).total;

      // Move to buildup (higher wave factor)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(60);
      const midDiff = DifficultyManager.calculate(
        inputs.pnl,
        inputs.atr,
        inputs.level,
        inputs.hp
      ).total;

      // Move to climax (even higher)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(240);
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

    it('should provide ~2.7x XP multiplier for 10x leverage', () => {
      DifficultyManager.startGame(10);
      expect(DifficultyManager.getXpMultiplier()).toBeCloseTo(2.73, 2);
    });

    it('should provide ~8.2x XP multiplier for 100x leverage', () => {
      DifficultyManager.startGame(100);
      expect(DifficultyManager.getXpMultiplier()).toBeCloseTo(8.2);
    });
  });

  describe('Volatility Shock Detection', () => {
    it('should emit volatilityShock event on sudden PnL jump', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Start at 0, fill history with 5 zeroes
      for (let i = 0; i < 5; i++) {
        DifficultyManager.calculate(0.0, 0, 1, 1.0);
      }

      // Advance to 10s (past 5s grace period) and jump PnL by 1% (threshold is 0.5%)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(10);
      DifficultyManager.calculate(0.1, 0, 1, 1.0);

      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
    });

    it('should suppress shock events during the first 5 seconds (Grace Period)', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Start at 0, fill history
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      for (let i = 0; i < 5; i++) {
        DifficultyManager.calculate(0.0, 0, 1, 1.0);
      }

      // Large jump at 2s (within grace period)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(2);
      DifficultyManager.calculate(0.2, 0, 1, 1.0);

      expect(emitSpy).not.toHaveBeenCalledWith('volatilityShock', expect.anything());
    });

    it('should obey shockwave cooldown (10s) after grace period', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');

      // Establish baseline at 0 with 5 zeroes
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      for (let i = 0; i < 5; i++) {
        DifficultyManager.calculate(0.0, 0, 1, 1.0);
      }

      // Shock 1 (at 6s, just after grace period)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(6);
      DifficultyManager.calculate(0.1, 0, 1, 1.0);
      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
      emitSpy.mockClear();

      // Immediate shock 2 (within 10s cooldown)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(10);
      DifficultyManager.calculate(0.2, 0, 1, 1.0);
      expect(emitSpy).not.toHaveBeenCalledWith('volatilityShock', expect.anything());

      // After cooldown (10s + 6s = 16s)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(17);
      DifficultyManager.calculate(0.3, 0, 1, 1.0);
      expect(emitSpy).toHaveBeenCalledWith('volatilityShock', expect.anything());
    });
  });
});
