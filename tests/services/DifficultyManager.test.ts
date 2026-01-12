import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifficultyManager } from '../../services/DifficultyManager';
import { TimeService } from '../../services/TimeService';
import { EventBus } from '../../services/EventBus';
import { Logger } from '../../services/Logger';
import { WAVE_CONFIG } from '../../config/GameConfig';

// Mock dependencies
vi.mock('../../services/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(),
  },
}));

vi.mock('../../services/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('../../services/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../stores/admin/configStore', () => ({
  useAdminConfigStore: {
    getState: vi.fn(() => ({
      config: {
        difficulty: {
          base: 5,
          volatilityMultiplier: 1.0,
          maxDifficulty: 8.0,
        },
      },
    })),
  },
}));

describe('DifficultyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DifficultyManager.startGame(1);
    (TimeService.getGameTimeSeconds as any).mockReturnValue(0);
  });

  describe('startGame', () => {
    it('should reset state variables', () => {
      DifficultyManager.startGame(10);
      expect(DifficultyManager.getKillStreak()).toBe(0);
      expect(DifficultyManager.getWavePhase()).toBe('warmup');
      expect(DifficultyManager.getXpMultiplier()).toBeGreaterThan(1); // 10x leverage
    });

    it('should set xp multiplier based on leverage', () => {
      DifficultyManager.startGame(1);
      expect(DifficultyManager.getXpMultiplier()).toBe(1.0);

      DifficultyManager.startGame(100);
      // 1 + log10(100) * 0.5 = 1 + 2 * 0.5 = 2.0
      expect(DifficultyManager.getXpMultiplier()).toBe(2.0);
    });
  });

  describe('calculate', () => {
    it('should return valid difficulty output', () => {
      const output = DifficultyManager.calculate(
        0, // pnl
        0.01, // atrPercent
        1, // level
        100 // hpPercent
      );

      expect(output).toHaveProperty('spawnRate');
      expect(output).toHaveProperty('enemySpeed');
      expect(output).toHaveProperty('enemyHealth');
      expect(output).toHaveProperty('total');
      expect(output.total).toBeGreaterThan(0);
    });

    it('should clamp values', () => {
      const output = DifficultyManager.calculate(
        -100, // terrible pnl => huge loss factor
        0.5, // high volatility
        50, // high level
        10 // low hp (near death mod < 1.0)
      );

      expect(output.total).toBeLessThanOrEqual(8.0); // maxDifficulty
      expect(output.spawnRate).toBeLessThanOrEqual(4.0);
    });

    it('should detect shockwaves', () => {
      // Setup initial state
      (TimeService.getGameTimeSeconds as any).mockReturnValue(100);
      DifficultyManager.calculate(0, 0, 1, 100);

      // Huge jump
      (TimeService.getGameTimeSeconds as any).mockReturnValue(115); // > 10s passed
      DifficultyManager.calculate(0.01, 0, 1, 100); // 1% jump > 0.5% threshold

      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Sudden price movement')
      );
      expect(EventBus.emit).toHaveBeenCalledWith('volatilityShock', expect.anything());
    });
  });

  describe('Wave Progression', () => {
    it('should advance wave status over time', () => {
      // Start phase: warmup
      expect(DifficultyManager.getWavePhase()).toBe('warmup');

      // Advance time past warmup
      const warmupDuration = WAVE_CONFIG.DURATIONS.warmup;
      (TimeService.getGameTimeSeconds as any).mockReturnValue(warmupDuration + 1);

      // Trigger calculation (which syncs wave)
      DifficultyManager.calculate(0, 0, 1, 100);

      // Should have advanced to buildup (next phase in default order)
      // OR whatever the config says. Default order: warmup, buildup...
      expect(DifficultyManager.getWavePhase()).not.toBe('warmup');
      expect(EventBus.emit).toHaveBeenCalledWith('wavePhaseChange', expect.anything());
    });
  });

  describe('Streak Tracking', () => {
    it('should increment streak within time window', () => {
      (TimeService.getGameTimeSeconds as any).mockReturnValue(10);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      (TimeService.getGameTimeSeconds as any).mockReturnValue(12); // +2s
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(2);
    });

    it('should reset streak after timeout', () => {
      (TimeService.getGameTimeSeconds as any).mockReturnValue(10);
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);

      (TimeService.getGameTimeSeconds as any).mockReturnValue(15); // +5s (>3s timeout)
      DifficultyManager.recordKill();
      expect(DifficultyManager.getKillStreak()).toBe(1);
    });
  });
});
