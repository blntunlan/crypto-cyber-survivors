import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DifficultyManager } from '../../services/DifficultyManager';
import { TimeService } from '../../services/TimeService';
import { EventBus } from '../../services/EventBus';

describe('DifficultyManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TimeService.reset();
    DifficultyManager.reset();
    DifficultyManager.startGame(1);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Core Logic', () => {
    it('should calculate base difficulty at start', () => {
      const output = DifficultyManager.calculate(0, 0.02, 1, 1);
      expect(output.total).toBeGreaterThan(0.3);
    });

    it('should increase difficulty with leverage and loss', () => {
      DifficultyManager.startGame(10);
      const baseline = DifficultyManager.calculate(0, 0.02, 1, 1).total;

      DifficultyManager.reset(); // Reset history
      DifficultyManager.startGame(10);
      const hard = DifficultyManager.calculate(-0.1, 0.02, 1, 1).total;

      expect(hard).toBeGreaterThan(baseline);
    });

    it('should apply mercy when HP is low', () => {
      // Calculate normal difficulty (100% HP)
      const normal = DifficultyManager.calculate(-0.1, 0.02, 10, 1.0).total;

      // Calculate mercy difficulty with critical HP (5%)
      // @ts-expect-error: testing
      DifficultyManager.lastShockTime = -100000;
      const mercy = DifficultyManager.calculate(-0.1, 0.02, 10, 0.05).total;

      expect(mercy).toBeLessThan(normal);
    });
  });

  describe('Wave System', () => {
    it('should transition through phases correctly', () => {
      const phaseChanges: string[] = [];
      EventBus.on('wavePhaseChange', (data: any) => phaseChanges.push(data.phase));

      expect(DifficultyManager.getWavePhase()).toBe('warmup');

      // Warmup is 25s. Jump to 30s to be safely in buildup.
      TimeService.setGameTime(30000);
      DifficultyManager.updateWaveTimer(0);

      expect(DifficultyManager.getWavePhase()).toBe('buildup');
      expect(phaseChanges).toContain('buildup');
    });
  });

  describe('Momentum & Streaks', () => {
    it('should track kill streaks and reset on timeout', () => {
      DifficultyManager.recordKill(); // 1
      DifficultyManager.recordKill(); // 2
      expect(DifficultyManager.getKillStreak()).toBe(2);

      // Advance 10s (Timeout is 5s)
      TimeService.setGameTime(10000);

      DifficultyManager.recordKill(); // Should reset to 1
      expect(DifficultyManager.getKillStreak()).toBe(1);
    });

    it('should detect market shocks', () => {
      const shockSpy = vi.fn();
      EventBus.on('volatilityShock', shockSpy);

      DifficultyManager.startGame(1);
      // @ts-expect-error:  ensure cooldown is not active
      DifficultyManager.lastShockTime = -100000;

      // Advance past grace period (5s)
      TimeService.setGameTime(10000);

      // Sudden large 20% drop (threshold is 0.5%)
      // Need 6 points for shock detection in V2
      for (let i = 0; i < 3; i++) DifficultyManager.calculate(0, 0.02, 1, 1);
      for (let i = 0; i < 3; i++) DifficultyManager.calculate(-0.2, 0.02, 1, 1);

      expect(shockSpy).toHaveBeenCalled();
    });
  });

  describe('Utilities', () => {
    it('should return valid debug state', () => {
      const state = DifficultyManager.getDebugState();
      expect(state.systemName).toBe('DifficultyManager');
      expect(state.cycleNumber).toBeDefined();
    });

    it('should provide correct XP multiplier based on leverage', () => {
      DifficultyManager.startGame(1);
      expect(DifficultyManager.getXpMultiplier()).toBe(1.0);

      DifficultyManager.startGame(100);
      expect(DifficultyManager.getXpMultiplier()).toBeGreaterThan(1.5);
    });
  });
});
