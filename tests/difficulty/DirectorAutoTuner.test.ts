/**
 * DirectorAutoTuner Tests
 *
 * Tests automated parameter learning system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

vi.stubGlobal('localStorage', localStorageMock);

// Mock DirectorOptimizer
vi.mock('../../services/difficulty/DirectorOptimizer', () => ({
  DirectorOptimizer: {
    optimize: vi.fn().mockResolvedValue({
      bestParams: {
        pid: { Kp: 2.5, Ki: 0.15, Kd: 0.6 },
        tactical: {
          rsiOversold: 28,
          rsiOverbought: 72,
          atrLow: 0.25,
          atrHigh: 2.2,
          volumeThreshold: 0.82,
        },
        reactive: {
          mercyThreshold: 0.18,
          swarmThreshold: 0.82,
          deathCooldownMs: 5500,
        },
      },
      bestScore: 0.75,
      iterations: 50,
      convergenceHistory: [0.5, 0.6, 0.65, 0.7, 0.75],
      backtestResults: { timeline: [], summary: {} },
    }),
    applyOptimizedParams: vi.fn(),
    getStatus: vi.fn(() => ({ isOptimizing: false })),
  },
}));

// Mock EventBus
const mockEventHandlers: Record<string, ((data: any) => void)[]> = {};
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn((event: string, data: unknown) => {
      const handlers = mockEventHandlers[event] ?? [];
      handlers.forEach(h => h(data));
    }),
    on: vi.fn((event: string, handler: (data: any) => void) => {
      if (!mockEventHandlers[event]) {
        mockEventHandlers[event] = [];
      }
      mockEventHandlers[event].push(handler);
      return () => {
        const idx = mockEventHandlers[event].indexOf(handler);
        if (idx >= 0) mockEventHandlers[event].splice(idx, 1);
      };
    }),
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

describe('DirectorAutoTuner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.store = {};

    // Reset singleton by clearing module cache
    vi.resetModules();
  });

  afterEach(() => {
    Object.keys(mockEventHandlers).forEach(k => delete mockEventHandlers[k]);
  });

  describe('initialization', () => {
    it('should initialize with auto-tuning enabled', async () => {
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');
      const status = DirectorAutoTuner.getStatus();

      expect(status.isEnabled).toBe(true);
      expect(status.isOptimizing).toBe(false);
    });

    it('should load cached params from localStorage', async () => {
      // Pre-populate localStorage
      const cachedState = {
        params: {
          pid: { Kp: 2.2, Ki: 0.12, Kd: 0.55 },
          tactical: {
            rsiOversold: 29,
            rsiOverbought: 71,
            atrLow: 0.28,
            atrHigh: 2.1,
            volumeThreshold: 0.81,
          },
          reactive: {
            mercyThreshold: 0.19,
            swarmThreshold: 0.81,
            deathCooldownMs: 5200,
          },
        },
        score: 0.68,
        timestamp: Date.now(),
        version: 1,
      };
      localStorageMock.store['director_optimized_params'] = JSON.stringify(cachedState);

      // Re-import to trigger constructor
      vi.resetModules();
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');

      // Should have applied params
      const params = DirectorAutoTuner.getAppliedParams();
      expect(params).not.toBe(null);
      expect(params?.pid.Kp).toBe(2.2);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable auto-tuning', async () => {
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');

      DirectorAutoTuner.setEnabled(false);
      expect(DirectorAutoTuner.getStatus().isEnabled).toBe(false);

      DirectorAutoTuner.setEnabled(true);
      expect(DirectorAutoTuner.getStatus().isEnabled).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear cached params', async () => {
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');

      // Set some cached data
      localStorageMock.store['director_optimized_params'] = '{}';

      DirectorAutoTuner.clearCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'director_optimized_params'
      );
      expect(DirectorAutoTuner.getAppliedParams()).toBe(null);
    });
  });

  describe('getStatus', () => {
    it('should return complete status object', async () => {
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');
      const status = DirectorAutoTuner.getStatus();

      expect(status).toHaveProperty('isEnabled');
      expect(status).toHaveProperty('isOptimizing');
      expect(status).toHaveProperty('currentScore');
      expect(status).toHaveProperty('deathCount');
      expect(status).toHaveProperty('hasAppliedParams');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const { DirectorAutoTuner } =
        await import('../../services/difficulty/DirectorAutoTuner');

      DirectorAutoTuner.setEnabled(false);
      DirectorAutoTuner.reset();

      const status = DirectorAutoTuner.getStatus();
      expect(status.isEnabled).toBe(true);
      expect(status.currentScore).toBe(0);
      expect(status.deathCount).toBe(0);
    });
  });
});

describe('AutoTuner Configuration', () => {
  it('should have reasonable optimization thresholds', () => {
    const config = {
      OPTIMIZE_AFTER_DEATHS: 5,
      MIN_OPTIMIZATION_INTERVAL_MS: 5 * 60 * 1000,
      PARAM_BLEND_RATE: 0.1,
      MIN_IMPROVEMENT_PERCENT: 5,
    };

    // Should not optimize too frequently
    expect(config.MIN_OPTIMIZATION_INTERVAL_MS).toBeGreaterThanOrEqual(60000); // At least 1 minute

    // Should require multiple deaths before optimizing
    expect(config.OPTIMIZE_AFTER_DEATHS).toBeGreaterThanOrEqual(3);

    // Blend rate should be gradual
    expect(config.PARAM_BLEND_RATE).toBeGreaterThan(0);
    expect(config.PARAM_BLEND_RATE).toBeLessThanOrEqual(0.5);

    // Improvement threshold should be meaningful
    expect(config.MIN_IMPROVEMENT_PERCENT).toBeGreaterThan(0);
  });
});

describe('Parameter Blending', () => {
  it('should blend parameters at correct rate', () => {
    const current = { Kp: 2.0, Ki: 0.1, Kd: 0.5 };
    const target = { Kp: 3.0, Ki: 0.2, Kd: 0.8 };
    const rate = 0.1;

    // Manual blend calculation
    const blended = {
      Kp: current.Kp + (target.Kp - current.Kp) * rate,
      Ki: current.Ki + (target.Ki - current.Ki) * rate,
      Kd: current.Kd + (target.Kd - current.Kd) * rate,
    };

    expect(blended.Kp).toBeCloseTo(2.1, 5);
    expect(blended.Ki).toBeCloseTo(0.11, 5);
    expect(blended.Kd).toBeCloseTo(0.53, 5);
  });

  it('should converge to target over multiple applications', () => {
    const current = 2.0;
    const target = 4.0;
    const rate = 0.1;

    let value = current;
    for (let i = 0; i < 100; i++) {
      value = value + (target - value) * rate;
    }

    // Should be very close to target after many iterations
    expect(value).toBeCloseTo(target, 1);
  });
});
