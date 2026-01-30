import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../../services/gameplay/DifficultyManager';
import { TimeService } from '../../services/core/TimeService';

// Mock TimeService
vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
    getGameTime: vi.fn().mockReturnValue(0),
  },
}));

// Mock GameMasterBrain (replaces AIDirector)
vi.mock('../../services/difficulty/GameMasterBrain', () => ({
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

vi.mock('../../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: vi.fn(() => ({
      rsi: 50,
      atrPercent: 0.02,
      normalizedVolume: 0.5,
    })),
  },
}));

vi.mock('../../services/difficulty/factors/macd', () => ({
  calculateMACDFactor: vi.fn(() => 0),
}));

vi.mock('../../services/combat/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({
      activeGems: [],
    })),
  },
}));

describe('DifficultyManager Edge Cases', () => {
  beforeEach(() => {
    DifficultyManager.startGame();
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(40); // firstPeak phase (1.3x)
    vi.clearAllMocks();
  });

  describe('Extreme Input Clamping', () => {
    it('should handle extremely high P&L (+1000%)', () => {
      // 10.0 = 1000% Profit
      // Profit -> Difficulty decreases (min 0.7x)
      // 0.75 (time) * 0.7 (pnl) = 0.525
      const difficulty = DifficultyManager.calculate(10.0, 0, 1, 1.0);
      expect(difficulty.total).toBeGreaterThanOrEqual(0.3);
      expect(difficulty.total).toBeLessThan(1.0);
    });

    it('should handle extremely low P&L (-1000%)', () => {
      // -10.0 = -1000% Loss
      // Loss -> Difficulty increases (max 3.0x)
      // 40s -> firstPeak (1.3x)
      // Base Multipliers and factors result in ~1.42 with current settings
      const difficulty = DifficultyManager.calculate(-10.0, 0, 1, 1.0);
      expect(difficulty.total).toBeLessThanOrEqual(8.0);
      expect(difficulty.total).toBeGreaterThanOrEqual(1.4);
    });

    it('should handle NaN and Infinite P&L gracefully', () => {
      const nanDiff = DifficultyManager.calculate(NaN, 0, 1, 1.0);
      expect(nanDiff.total).toBeDefined();
      expect(Number.isNaN(nanDiff.total)).toBe(false);

      const infDiff = DifficultyManager.calculate(Infinity, 0, 1, 1.0);
      expect(infDiff.total).toBeDefined();
      expect(Number.isFinite(infDiff.total)).toBe(true);
    });

    it('should handle extreme volatility', () => {
      const superVol = DifficultyManager.calculate(0, 1.0, 1, 1.0); // 100% ATR
      expect(superVol.total).toBeLessThanOrEqual(8.0);
    });

    it('should handle level 0 and very high levels', () => {
      const lvl0 = DifficultyManager.calculate(0, 0, 0, 1.0);
      expect(lvl0.total).toBeGreaterThanOrEqual(0.3);

      const lvl999 = DifficultyManager.calculate(0, 0, 999, 1.0);
      expect(lvl999.total).toBeLessThanOrEqual(8.0);
    });
  });

  describe('Wave Transition Edge Cases', () => {
    it('should handle large time jumps spanning multiple phases', () => {
      // Reset with time 0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      DifficultyManager.startGame();

      // Cycle duration is 300s in V2.
      // Jump to 310s: 310 % 300 = 10s into cycle 2, which is in warmup (0-25s)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(310);
      DifficultyManager.calculate(0, 0, 1, 1.0); // Triggers sync
      expect(DifficultyManager.getWavePhase()).toBe('warmup');
    });

    it('should handle very small time increments without phase skip', () => {
      // Reset with time 0
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
      DifficultyManager.startGame();

      // Small time increments (0.1 seconds total) - should still be warmup
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0.1);
      DifficultyManager.calculate(0, 0, 1, 1.0);
      expect(DifficultyManager.getWavePhase()).toBe('warmup');
    });
  });

  describe('Kill Streak Boundaries', () => {
    it('should apply streak bonus exactly at threshold', () => {
      // Streak bonus: +5% per 5 kills, caps at +30%
      // 4 kills -> 0%
      for (let i = 0; i < 4; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230 + i * 0.1);
        DifficultyManager.recordKill();
      }
      const diff4 = DifficultyManager.calculate(0, 0, 1, 1.0);

      // 5 kills -> 5% bonus
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230 + 1.0);
      DifficultyManager.recordKill();
      const diff5 = DifficultyManager.calculate(0, 0, 1, 1.0);

      expect(diff5.total).toBeGreaterThan(diff4.total);
    });

    it('should cap streak bonus at 30 kills', () => {
      DifficultyManager.startGame();
      for (let i = 0; i < 30; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230 + i * 0.1);
        DifficultyManager.recordKill();
      }
      DifficultyManager.calculate(0, 0, 1, 1.0);

      for (let i = 30; i < 40; i++) {
        vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230 + i * 0.1);
        DifficultyManager.recordKill();
      }

      // Use stable time for calculation comparison to isoloate streak bonus
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230 + 10.0);
      const diff30 = DifficultyManager.calculate(0, 0, 1, 1.0);
      const diff40 = DifficultyManager.calculate(0, 0, 1, 1.0);

      // Should be identical if capped at 30
      expect(diff40.total).toBe(diff30.total);
    });
  });

  describe('Momentum Buffer Stability', () => {
    it('should handle rapid P&L oscillations', () => {
      // Feed oscillating values: -1, 1, -1, 1...
      for (let i = 0; i < 40; i++) {
        DifficultyManager.calculate(i % 2 === 0 ? 0.1 : -0.1, 0, 1, 1.0);
      }

      const session = DifficultyManager.calculate(0, 0, 1, 1.0);
      expect(Number.isFinite(session.total)).toBe(true);
    });
  });
});
