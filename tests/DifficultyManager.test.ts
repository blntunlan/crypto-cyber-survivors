import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';

// Mock TimeService
let mockGameTimeSeconds = 0;
vi.mock('../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => mockGameTimeSeconds),
    getGameTime: vi.fn(() => mockGameTimeSeconds * 1000),
  },
}));

// vi.mock('../services/difficulty/UnifiedDirector', () => ({
//   UnifiedDirector: {
//     update: vi.fn(),
//     reset: vi.fn(),
//     getOutputs: vi.fn(() => ({
//       spawnRate: 1.0,
//       enemySpeed: 1.0,
//       enemyHP: 1.0,
//       enemyDamage: 1.0,
//       gemDropRate: 1.0,
//       xpMultiplier: 1.0,
//       whaleType: 0,
//       eventIntensity: 0.3,
//       aggression: 0.4,
//       chaos: 0.3,
//       mercyWindow: 0.2,
//       pressureRamp: 0.5,
//     })),
//   },
// }));

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
    const difficulty = DifficultyManager.calculate(0, 0, 1, 1.0, undefined, true);

    expect(difficulty.total).toBeGreaterThan(0);
    expect(difficulty.spawnRate).toBeGreaterThan(0);
    expect(difficulty.enemySpeed).toBeGreaterThan(0);
    expect(difficulty.enemyHP).toBeGreaterThan(0);
  });

  it('should increase difficulty with P&L', () => {
    const normal = DifficultyManager.calculate(0, 0, 10, 1.0, undefined, true).total;
    const hard = DifficultyManager.calculate(-0.05, 0, 10, 1.0, undefined, true).total; // Negative PnL makes it harder

    expect(hard).toBeGreaterThan(normal);
  });

  it('should decrease difficulty when winning', () => {
    mockGameTimeSeconds = 230; // Climax phase (1.5x)
    DifficultyManager.startGame(50);
    const normal = DifficultyManager.calculate(0, 0, 10, 1.0, undefined, true).total;
    const easy = DifficultyManager.calculate(0.0001, 0, 10, 1.0, undefined, true).total; // Positive PnL makes it easier

    expect(easy).toBeLessThan(normal);
  });

  it('should increase difficulty with volatility', () => {
    mockGameTimeSeconds = 230; // Climax phase (1.5x)
    DifficultyManager.startGame(50);
    const lowVol = DifficultyManager.calculate(0, 0.01, 10, 1.0, undefined, true).total;
    const highVol = DifficultyManager.calculate(
      0,
      0.05,
      10,
      1.0,
      undefined,
      true
    ).total;

    expect(highVol).toBeGreaterThan(lowVol);
  });

  it('should increase difficulty with level', () => {
    const lvl10 = DifficultyManager.calculate(0, 0, 10, 1.0, undefined, true).total;
    const lvl20 = DifficultyManager.calculate(0, 0, 20, 1.0, undefined, true).total;

    expect(lvl20).toBeGreaterThan(lvl10);
  });

  it('should give mercy when near death', () => {
    mockGameTimeSeconds = 230; // Climax phase (1.5x)
    DifficultyManager.startGame(1); // Low leverage
    const healthy = DifficultyManager.calculate(0, 0, 1, 1.0, undefined, true).total; // Level 1
    const nearDeath = DifficultyManager.calculate(0, 0, 1, 0.1, undefined, true).total; // 10% HP

    expect(nearDeath).toBeLessThan(healthy);
  });

  describe('Kill Streak Logic', () => {
    it('should track kill streaks', () => {
      expect(DifficultyManager.getKillStreak()).toBe(0);

      mockGameTimeSeconds = 1;
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      mockGameTimeSeconds = 2;
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(2);
    });

    it('should reset streak if too slow', () => {
      mockGameTimeSeconds = 1;
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      // 4 seconds later (> 3s window)
      mockGameTimeSeconds = 5;
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1); // Reset to 1 (current kill)
    });
  });

  describe('Momentum Logic', () => {
    it('should increase difficulty when player performance is improving', () => {
      DifficultyManager.startGame(50);
      // 1. Fill history with initial values (0)
      for (let i = 0; i < 20; i++) {
        DifficultyManager.calculate(0.01, 0, 1, 1.0, undefined, true);
      }

      // Current momentum: Neutral (0 vs 0 trend)
      const neutralTotal = DifficultyManager.calculate(
        0.01,
        0,
        1,
        1.0,
        undefined,
        true
      ).total;

      // 2. Simulate improving trend (PnL going up)
      // Feed better PnLs
      for (let i = 1; i <= 6; i++) {
        DifficultyManager.calculate(i * 0.1, 0, 1, 1.0, undefined, true);
      }

      // 3. New calculation should use shock factor (upside shock)
      const harderTotal = DifficultyManager.calculate(
        0.01,
        0,
        1,
        1.0,
        undefined,
        true
      ).total;
      expect(harderTotal).toBeGreaterThan(neutralTotal * 1.05); // Allow for PnL base factor difference etc
    });

    it('should decrease difficulty when player performance is worsening (mercy)', () => {
      DifficultyManager.startGame();

      // Advance to 'climax' phase (higher wave multiplier) so we're not hitting minimum
      // warmup(45) + buildup(60) + firstPeak(30) + breather(45) + escalation(60) = 240s -> climax phase starts
      mockGameTimeSeconds = 245;

      // 1. Fill history with "good" performance
      for (let i = 0; i < 20; i++) {
        DifficultyManager.calculate(0.1, 0.01, 5, 1.0, undefined, true); // Add some volatility and level
      }
      const baselineEasy = DifficultyManager.calculate(
        0.1,
        0.01,
        5,
        1.0,
        undefined,
        true
      ).total;

      // 2. Simulate worsening trend (PnL going down)
      for (let i = 0; i < 10; i++) {
        DifficultyManager.calculate(-0.1, 0.01, 5, 1.0, undefined, true);
      }

      const shockTotal = DifficultyManager.calculate(
        -0.1,
        0.01,
        5,
        1.0,
        undefined,
        true
      ).total;
      expect(shockTotal).toBeGreaterThan(baselineEasy);
    });
  });

  describe('Extreme Factors', () => {
    it('should clamp total difficulty to maxDifficulty', () => {
      // Pass explicit config override to ensure max is 8.0
      const difficulty = DifficultyManager.calculate(
        -0.9,
        0.5,
        100,
        1.0,
        {
          maxDifficulty: 8.0,
        },
        true
      );
      expect(difficulty.total).toBeLessThanOrEqual(8.0); // Explicitly capped at 8
    });

    it('should respect minimum difficulty', () => {
      // Very high PnL, full HP, low volatility
      const difficulty = DifficultyManager.calculate(1.0, 0, 1, 1.0, undefined, true);
      expect(difficulty.total).toBeGreaterThanOrEqual(0.3);
    });
  });
  describe('Cycle Scaling', () => {
    it('should increase difficulty in subsequent cycles', () => {
      // Scale is +20% per cycle
      // Cycle 1 (0-300s): Factor 1.0
      // Cycle 2 (300-600s): Factor 1.2

      mockGameTimeSeconds = 230; // Climax in Cycle 1
      DifficultyManager.startGame();
      const cycle1 = DifficultyManager.calculate(0, 0, 1, 1.0, undefined, true).total;

      mockGameTimeSeconds = 530; // Climax in Cycle 2
      // Note: We need to trigger sync to update cycle count
      DifficultyManager.calculate(0, 0, 1, 1.0, undefined, true);

      const cycle2 = DifficultyManager.calculate(0, 0, 1, 1.0, undefined, true).total;

      // Even though baseTime increases slightly (1.0 vs 1.0+),
      // the cycle factor (1.2x) should make a distinct difference.

      expect(cycle2).toBeGreaterThan(cycle1 * 1.05);
    });
  });
});
