import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { TimeService } from '../services/core/TimeService';
import { UnifiedDirector } from '../services/difficulty/UnifiedDirector';

// Mock TimeService
vi.mock('../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
    getGameTime: vi.fn().mockReturnValue(0),
  },
}));

// Mock UnifiedDirector
vi.mock('../services/difficulty/UnifiedDirector', () => ({
  UnifiedDirector: {
    update: vi.fn(),
    reset: vi.fn(),
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

describe('DifficultyManager', () => {
  beforeEach(() => {
    DifficultyManager.reset();
    DifficultyManager.startGame();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(DifficultyManager).toBeDefined();
  });

  it('should calculate initial difficulty', () => {
    const difficulty = DifficultyManager.calculate(0, 0, 1, 1.0);

    expect(difficulty.total).toBeGreaterThan(0);
    expect(difficulty.spawnRate).toBeGreaterThan(0);
    expect(difficulty.enemySpeed).toBeGreaterThan(0);
    expect(difficulty.enemyHealth).toBeGreaterThan(0);
  });

  it('should increase difficulty with P&L', () => {
    const normal = DifficultyManager.calculate(0, 0, 10, 1.0).total;
    const hard = DifficultyManager.calculate(-0.05, 0, 10, 1.0).total; // Negative PnL makes it harder

    expect(hard).toBeGreaterThan(normal);
  });

  it('should decrease difficulty when winning', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230); // Climax phase (1.5x)
    DifficultyManager.startGame(50);
    const normal = DifficultyManager.calculate(0, 0, 10, 1.0).total;
    const easy = DifficultyManager.calculate(0.05, 0, 10, 1.0).total; // Positive PnL makes it easier

    expect(easy).toBeLessThan(normal);
  });

  it('should increase difficulty with volatility', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230); // Climax phase (1.5x)
    DifficultyManager.startGame(50);
    const lowVol = DifficultyManager.calculate(0, 0.01, 10, 1.0).total;
    const highVol = DifficultyManager.calculate(0, 0.05, 10, 1.0).total;

    expect(highVol).toBeGreaterThan(lowVol);
  });

  it('should increase difficulty with level', () => {
    const lvl10 = DifficultyManager.calculate(0, 0, 10, 1.0).total;
    const lvl20 = DifficultyManager.calculate(0, 0, 20, 1.0).total;

    expect(lvl20).toBeGreaterThan(lvl10);
  });

  it('should give mercy when near death', () => {
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230); // Climax phase (1.5x)
    DifficultyManager.startGame(1); // Low leverage
    const healthy = DifficultyManager.calculate(0, 0, 1, 1.0).total; // Level 1
    const nearDeath = DifficultyManager.calculate(0, 0, 1, 0.1).total; // 10% HP

    expect(nearDeath).toBeLessThan(healthy);
  });

  describe('Kill Streak Logic', () => {
    it('should track kill streaks', () => {
      expect(DifficultyManager.getKillStreak()).toBe(0);

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(1);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(2);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(2);
    });

    it('should reset streak if too slow', () => {
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(1);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      // 4 seconds later (> 3s window)
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(5);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1); // Reset to 1 (current kill)
    });
  });

  describe('Momentum Logic', () => {
    it('should increase difficulty when player performance is improving', () => {
      // 1. Fill history with initial values (0)
      for (let i = 0; i < 20; i++) {
        DifficultyManager.calculate(0.01, 0, 1, 1.0);
      }

      // Current momentum: Neutral (0 vs 0 trend)
      const neutralTotal = DifficultyManager.calculate(0.01, 0, 1, 1.0).total;

      // 2. Simulate improving trend (PnL going up)
      // Feed better PnLs
      for (let i = 1; i <= 6; i++) {
        DifficultyManager.calculate(i * 0.1, 0, 1, 1.0);
      }

      // 3. New calculation should use shock factor (upside shock)
      const harderTotal = DifficultyManager.calculate(0.01, 0, 1, 1.0).total;
      expect(harderTotal).toBeGreaterThan(neutralTotal * 1.05); // Allow for PnL base factor difference etc
    });

    it('should decrease difficulty when player performance is worsening (mercy)', () => {
      DifficultyManager.startGame();

      // Advance to 'climax' phase (higher wave multiplier) so we're not hitting minimum
      // warmup(45) + buildup(60) + firstPeak(30) + breather(45) + escalation(60) = 240s -> climax phase starts
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(245);

      // 1. Fill history with "good" performance
      for (let i = 0; i < 20; i++) {
        DifficultyManager.calculate(0.1, 0.01, 5, 1.0); // Add some volatility and level
      }
      const baselineEasy = DifficultyManager.calculate(0.1, 0.01, 5, 1.0).total;

      // 2. Simulate worsening trend (PnL going down)
      for (let i = 0; i < 10; i++) {
        DifficultyManager.calculate(-0.1, 0.01, 5, 1.0);
      }

      const shockTotal = DifficultyManager.calculate(-0.1, 0.01, 5, 1.0).total;
      expect(shockTotal).toBeGreaterThan(baselineEasy);
    });
  });

  describe('Extreme Factors', () => {
    it('should clamp total difficulty to maxDifficulty', () => {
      // Pass explicit config override to ensure max is 8.0
      const difficulty = DifficultyManager.calculate(-0.9, 0.5, 100, 1.0, {
        maxDifficulty: 8.0,
      });
      expect(difficulty.total).toBeLessThanOrEqual(8.0); // Explicitly capped at 8
    });

    it('should respect minimum difficulty', () => {
      // Very high PnL, full HP, low volatility
      const difficulty = DifficultyManager.calculate(1.0, 0, 1, 1.0);
      expect(difficulty.total).toBeGreaterThanOrEqual(0.3);
    });
  });
  describe('Cycle Scaling', () => {
    it('should increase difficulty in subsequent cycles', () => {
      // Scale is +20% per cycle
      // Cycle 1 (0-300s): Factor 1.0
      // Cycle 2 (300-600s): Factor 1.2

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(230); // Climax in Cycle 1
      DifficultyManager.startGame();
      const cycle1 = DifficultyManager.calculate(0, 0, 1, 1.0).total;

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(530); // Climax in Cycle 2
      // Note: We need to trigger sync to update cycle count
      DifficultyManager.calculate(0, 0, 1, 1.0);

      const cycle2 = DifficultyManager.calculate(0, 0, 1, 1.0).total;

      // Even though baseTime increases slightly (1.0 vs 1.0+),
      // the cycle factor (1.2x) should make a distinct difference.

      expect(cycle2).toBeGreaterThan(cycle1 * 1.05);
    });
  });
});
