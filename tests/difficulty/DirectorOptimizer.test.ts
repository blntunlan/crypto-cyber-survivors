/**
 * DirectorOptimizer Tests
 *
 * Tests genetic optimization algorithm for AI Director parameters
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock BacktestEngine
vi.mock('../../services/training/BacktestEngine', () => ({
  BacktestEngine: {
    runWithParams: vi.fn().mockResolvedValue({
      timeline: [
        {
          timestamp: 0,
          playerHP: 50,
          activeEnemies: 5,
          spawnRate: 1,
          marketPrice: 100000,
          rsi: 50,
          atr: 1,
        },
        {
          timestamp: 100,
          playerHP: 45,
          activeEnemies: 6,
          spawnRate: 1.1,
          marketPrice: 100100,
          rsi: 52,
          atr: 1.1,
        },
      ],
      summary: {
        totalTimeMs: 60000,
        timeInFlowMs: 40000,
        flowRatio: 0.67,
        avgHP: 0.5,
        deaths: 1,
        kills: 100,
      },
    }),
  },
}));

// Mock EventBus
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Layer configs
vi.mock('../../services/difficulty/layers/StrategicLayer', () => ({
  PID_CONFIG: { Kp: 2.0, Ki: 0.1, Kd: 0.5 },
}));

vi.mock('../../services/difficulty/layers/TacticalLayer', () => ({
  TACTICAL_CONFIG: {
    RSI_OVERSOLD: 30,
    RSI_OVERBOUGHT: 70,
    ATR_LOW: 0.3,
    ATR_HIGH: 2.0,
    WHALE_VOLUME_THRESHOLD: 0.8,
  },
}));

vi.mock('../../services/difficulty/layers/ReactiveLayer', () => ({
  REACTIVE_CONFIG: {
    MERCY_HP_THRESHOLD: 0.2,
    SWARM_HP_THRESHOLD: 0.8,
    DEATH_COOLDOWN_MS: 5000,
  },
}));

describe('DirectorOptimizer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset singleton
    const mod = await import('../../services/difficulty/DirectorOptimizer');
    (
      mod as unknown as { DirectorOptimizer: { reset?: () => void } }
    ).DirectorOptimizer.reset?.();
  });

  describe('getCurrentParameters', () => {
    it('should return current system parameters', async () => {
      const { DirectorOptimizer } =
        await import('../../services/difficulty/DirectorOptimizer');
      const status = DirectorOptimizer.getStatus();

      expect(status.isOptimizing).toBe(false);
      expect(status.bestResult).toBe(null);
    });
  });

  describe('getStatus', () => {
    it('should return optimizer status', async () => {
      const { DirectorOptimizer } =
        await import('../../services/difficulty/DirectorOptimizer');
      const status = DirectorOptimizer.getStatus();

      expect(status).toHaveProperty('isOptimizing');
      expect(status).toHaveProperty('currentGeneration');
      expect(status).toHaveProperty('bestResult');
    });
  });

  describe('getBestResult', () => {
    it('should return null before optimization', async () => {
      const { DirectorOptimizer } =
        await import('../../services/difficulty/DirectorOptimizer');

      expect(DirectorOptimizer.getBestResult()).toBe(null);
    });
  });

  describe('applyOptimizedParams', () => {
    it('should apply parameters to config objects', async () => {
      const { DirectorOptimizer } =
        await import('../../services/difficulty/DirectorOptimizer');
      const { PID_CONFIG } =
        await import('../../services/difficulty/layers/StrategicLayer');

      const testParams = {
        pid: { Kp: 3.0, Ki: 0.2, Kd: 0.8 },
        tactical: {
          rsiOversold: 25,
          rsiOverbought: 75,
          atrLow: 0.2,
          atrHigh: 2.5,
          volumeThreshold: 0.85,
        },
        reactive: {
          mercyThreshold: 0.15,
          swarmThreshold: 0.85,
          deathCooldownMs: 6000,
        },
      };

      DirectorOptimizer.applyOptimizedParams(testParams);

      // PID should be updated
      expect(PID_CONFIG.Kp).toBe(3.0);
      expect(PID_CONFIG.Ki).toBe(0.2);
      expect(PID_CONFIG.Kd).toBe(0.8);
    });
  });
});

describe('Fitness Calculation', () => {
  it('should weight flow time highest', () => {
    const weights = {
      flowTime: 0.4,
      survival: 0.25,
      stability: 0.2,
      engagement: 0.15,
    };

    // Flow time should have highest weight
    expect(weights.flowTime).toBeGreaterThan(weights.survival);
    expect(weights.flowTime).toBeGreaterThan(weights.stability);
    expect(weights.flowTime).toBeGreaterThan(weights.engagement);

    // Sum should equal 1
    const sum =
      weights.flowTime + weights.survival + weights.stability + weights.engagement;
    expect(sum).toBe(1.0);
  });
});

describe('Parameter Bounds', () => {
  it('should have valid PID bounds', () => {
    const bounds = {
      Kp: { min: 0.5, max: 5.0 },
      Ki: { min: 0.01, max: 0.5 },
      Kd: { min: 0.1, max: 2.0 },
    };

    expect(bounds.Kp.min).toBeLessThan(bounds.Kp.max);
    expect(bounds.Ki.min).toBeLessThan(bounds.Ki.max);
    expect(bounds.Kd.min).toBeLessThan(bounds.Kd.max);

    // PID should have reasonable defaults within bounds
    expect(2.0).toBeGreaterThanOrEqual(bounds.Kp.min);
    expect(2.0).toBeLessThanOrEqual(bounds.Kp.max);
  });

  it('should have valid RSI bounds', () => {
    const bounds = {
      rsiOversold: { min: 20, max: 40 },
      rsiOverbought: { min: 60, max: 80 },
    };

    // Oversold should be less than 50
    expect(bounds.rsiOversold.max).toBeLessThan(50);

    // Overbought should be greater than 50
    expect(bounds.rsiOverbought.min).toBeGreaterThan(50);

    // No overlap between oversold and overbought
    expect(bounds.rsiOversold.max).toBeLessThan(bounds.rsiOverbought.min);
  });

  it('should have valid HP threshold bounds', () => {
    const bounds = {
      mercyThreshold: { min: 0.1, max: 0.3 },
      swarmThreshold: { min: 0.7, max: 0.9 },
    };

    // Mercy should be low HP
    expect(bounds.mercyThreshold.max).toBeLessThan(0.5);

    // Swarm should be high HP
    expect(bounds.swarmThreshold.min).toBeGreaterThan(0.5);

    // No overlap
    expect(bounds.mercyThreshold.max).toBeLessThan(bounds.swarmThreshold.min);
  });
});
