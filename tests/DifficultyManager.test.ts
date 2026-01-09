import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../services/DifficultyManager';
import { TimeService } from '../services/TimeService';

// Mock TimeService
vi.mock('../services/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn().mockReturnValue(0),
  },
}));

describe('DifficultyManager', () => {
  beforeEach(() => {
    DifficultyManager.startGame();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(DifficultyManager).toBeDefined();
  });

  it('should calculate initial difficulty', () => {
    const difficulty = DifficultyManager.calculate(0, 0, 1, 100);

    expect(difficulty.total).toBeGreaterThan(0);
    expect(difficulty.spawnRate).toBeGreaterThan(0);
    expect(difficulty.enemySpeed).toBeGreaterThan(0);
    expect(difficulty.enemyHealth).toBeGreaterThan(0);
  });

  it('should increase difficulty with P&L', () => {
    const normal = DifficultyManager.calculate(0, 0, 1, 100).total;
    const hard = DifficultyManager.calculate(-0.05, 0, 1, 100).total; // Negative PnL makes it harder

    expect(hard).toBeGreaterThan(normal);
  });

  it('should decrease difficulty when winning', () => {
    const normal = DifficultyManager.calculate(0, 0, 1, 100).total;
    const easy = DifficultyManager.calculate(0.05, 0, 1, 100).total; // Positive PnL makes it easier

    expect(easy).toBeLessThan(normal);
  });

  it('should increase difficulty with volatility', () => {
    const lowVol = DifficultyManager.calculate(0, 0.01, 1, 100).total;
    const highVol = DifficultyManager.calculate(0, 0.05, 1, 100).total;

    expect(highVol).toBeGreaterThan(lowVol);
  });

  it('should increase difficulty with level', () => {
    const lvl1 = DifficultyManager.calculate(0, 0, 1, 100).total;
    const lvl10 = DifficultyManager.calculate(0, 0, 10, 100).total;

    expect(lvl10).toBeGreaterThan(lvl1);
  });

  it('should give mercy when near death', () => {
    const healthy = DifficultyManager.calculate(0, 0, 1, 100).total;
    const nearDeath = DifficultyManager.calculate(0, 0, 1, 10).total; // 10% HP

    expect(nearDeath).toBeLessThan(healthy);
  });

  it('should cycle wave phases', () => {
    // Reset with time 0
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
    DifficultyManager.startGame();
    expect(DifficultyManager.getWavePhase()).toBe('warmup'); // Now starts with warmup

    // Warmup phase lasts 45s - advance to 45s
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(45);
    DifficultyManager.calculate(0, 0, 1, 100); // Triggers sync
    expect(DifficultyManager.getWavePhase()).toBe('buildup');

    // Buildup phase lasts 60s - advance to 105s (45+60)
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(105);
    DifficultyManager.calculate(0, 0, 1, 100);
    expect(DifficultyManager.getWavePhase()).toBe('firstPeak');

    // FirstPeak phase lasts 30s - advance to 135s (105+30)
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(135);
    DifficultyManager.calculate(0, 0, 1, 100);
    expect(DifficultyManager.getWavePhase()).toBe('breather');
  });

  it('should handle large time jumps (skipping phases)', () => {
    // Reset with time 0
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(0);
    DifficultyManager.startGame();

    // Current: warmup (initial)
    // New Cycle: warmup(45) -> buildup(60) -> firstPeak(30) -> breather(45) ->
    //            escalation(60) -> climax(45) -> resolution(15) = 300s total
    // After 310s, it should be 10s into the next 'warmup' phase
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(310);
    DifficultyManager.calculate(0, 0, 1, 100); // Triggers sync
    expect(DifficultyManager.getWavePhase()).toBe('warmup');
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
        DifficultyManager.calculate(0.01, 0, 1, 100);
      }

      // Current momentum: Neutral (0 vs 0 trend)
      const neutralTotal = DifficultyManager.calculate(0.01, 0, 1, 100).total;

      // 2. Simulate improving trend (PnL going up)
      // Feed better PnLs [0.02, 0.03, ..., 0.11] (last 10)
      for (let i = 1; i <= 10; i++) {
        DifficultyManager.calculate(i * 0.01, 0, 1, 100);
      }

      // 3. New calculation should use momentum multiplier 1.1
      const harderTotal = DifficultyManager.calculate(0.01, 0, 1, 100).total;
      expect(harderTotal).toBeGreaterThan(neutralTotal * 1.05); // Allow for PnL base factor difference etc
    });

    it('should decrease difficulty when player performance is worsening (mercy)', () => {
      DifficultyManager.startGame();

      // Advance to 'climax' phase (higher wave multiplier) so we're not hitting minimum
      // warmup(45) + buildup(60) + firstPeak(30) + breather(45) + escalation(60) = 240s -> climax phase starts
      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(245);

      // 1. Fill history with "good" performance
      for (let i = 0; i < 20; i++) {
        DifficultyManager.calculate(0.1, 0.01, 5, 100); // Add some volatility and level
      }
      const baselineEasy = DifficultyManager.calculate(0.1, 0.01, 5, 100).total;

      // 2. Simulate worsening trend (PnL going down)
      for (let i = 0; i < 10; i++) {
        DifficultyManager.calculate(0.01, 0.01, 5, 100);
      }

      const mercyTotal = DifficultyManager.calculate(0.1, 0.01, 5, 100).total;
      expect(mercyTotal).toBeLessThan(baselineEasy);
    });
  });

  describe('Extreme Factors', () => {
    it('should clamp total difficulty to maxDifficulty', () => {
      const difficulty = DifficultyManager.calculate(-0.9, 0.5, 100, 100);
      expect(difficulty.total).toBeLessThanOrEqual(8.0); // Default max is 8
    });

    it('should respect minimum difficulty', () => {
      // Very high PnL, full HP, low volatility
      const difficulty = DifficultyManager.calculate(1.0, 0, 1, 100);
      expect(difficulty.total).toBeGreaterThanOrEqual(0.3);
    });
  });
  describe('Cycle Scaling', () => {
    it('should increase difficulty in subsequent cycles', () => {
      // Scale is +20% per cycle
      // Cycle 1 (0-300s): Factor 1.0
      // Cycle 2 (300-600s): Factor 1.2

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(10); // Early in Cycle 1
      DifficultyManager.startGame();
      const cycle1 = DifficultyManager.calculate(0, 0, 1, 100).total;

      vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(310); // Early in Cycle 2
      // Note: We need to trigger sync to update cycle count
      DifficultyManager.calculate(0, 0, 1, 100);

      const cycle2 = DifficultyManager.calculate(0, 0, 1, 100).total;

      // Even though baseTime increases slightly (1.0 vs 1.0+),
      // the cycle factor (1.2x) should make a distinct difference.

      expect(cycle2).toBeGreaterThan(cycle1 * 1.1);
    });
  });
});
