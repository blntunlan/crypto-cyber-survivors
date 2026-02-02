/**
 * DataResilienceService Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createDataResilienceService,
  RESILIENCE_CONFIG,
  DataResilienceService,
} from '../../services/market/DataResilienceService';

// Mock EventBus
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DataResilienceService', () => {
  let service: ReturnType<typeof createDataResilienceService>;

  beforeEach(() => {
    vi.useFakeTimers();
    service = createDataResilienceService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = DataResilienceService;
      expect(instance1).toBeDefined();
    });

    it('should have default connection status', () => {
      const state = service.getConnectionState();
      expect(state).toBe('disconnected');
    });
  });

  describe('RESILIENCE_CONFIG', () => {
    it('should have valid interpolation gap limit', () => {
      expect(RESILIENCE_CONFIG.MAX_INTERPOLATION_GAP_MS).toBeGreaterThan(0);
      expect(RESILIENCE_CONFIG.MAX_INTERPOLATION_GAP_MS).toBeLessThanOrEqual(120000);
    });

    it('should have valid fallback defaults', () => {
      expect(RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi).toBe(50);
      expect(RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent).toBeGreaterThan(0);
    });

    it('should have valid reconnect parameters', () => {
      expect(RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS).toBeGreaterThan(0);
      expect(RESILIENCE_CONFIG.MAX_RETRY_DELAY_MS).toBeGreaterThan(
        RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS
      );
    });
  });

  describe('interpolation', () => {
    it('should interpolate small gaps', () => {
      const data = [
        { timestamp: 1000, price: 100, rsi: 40, atrPercent: 0.5 },
        { timestamp: 3000, price: 120, rsi: 60, atrPercent: 0.7 },
      ];

      const filled = service.fillDataArray(data, 1000);

      expect(filled.length).toBe(3); // 1000, 2000, 3000
      expect(filled[1]?.timestamp).toBe(2000);
      expect(filled[1]?.price).toBe(110); // Linear interpolation
    });

    it('should fill small gaps correctly', () => {
      const data = [
        { timestamp: 1000, price: 100, rsi: 40, atrPercent: 0.5 },
        { timestamp: 5000, price: 200, rsi: 60, atrPercent: 0.7 },
      ];

      const filled = service.fillDataArray(data, 1000);

      // Should have interpolated points
      expect(filled.length).toBeGreaterThan(2);
    });

    it('should handle empty data array', () => {
      const filled = service.fillDataArray([], 1000);
      expect(filled).toEqual([]);
    });

    it('should handle single data point', () => {
      const data = [{ timestamp: 1000, price: 100, rsi: 50, atrPercent: 0.5 }];
      const filled = service.fillDataArray(data, 1000);
      expect(filled.length).toBe(1);
      expect(filled[0]?.timestamp).toBe(1000);
      expect(filled[0]?.price).toBe(100);
    });
  });

  describe('getCurrentData', () => {
    it('should return fallback values when no data', () => {
      const data = service.getCurrentData();

      expect(data.rsi).toBe(RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi);
      expect(data.atrPercent).toBe(RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent);
    });
  });

  describe('data quality metrics', () => {
    it('should return quality metrics', () => {
      const quality = service.getQualityMetrics();

      expect(quality).toHaveProperty('freshness');
      expect(quality).toHaveProperty('completeness');
      expect(quality).toHaveProperty('consistency');
      expect(quality).toHaveProperty('overallScore');
    });

    it('should have freshness between 0 and 1', () => {
      const quality = service.getQualityMetrics();
      expect(quality.freshness).toBeGreaterThanOrEqual(0);
      expect(quality.freshness).toBeLessThanOrEqual(1);
    });
  });

  describe('connection state', () => {
    it('should track connection state', () => {
      expect(service.getConnectionState()).toBe('disconnected');
    });
  });

  describe('stale data detection', () => {
    it('should detect stale data when no data received', () => {
      expect(service.isDataStale()).toBe(true);
    });

    it('should report not fresh when no data', () => {
      expect(service.isDataFresh()).toBe(false);
    });
  });

  describe('getRSI and getATRPercent', () => {
    it('should return fallback RSI when no data', () => {
      expect(service.getRSI()).toBe(RESILIENCE_CONFIG.FALLBACK_DEFAULTS.rsi);
    });

    it('should return fallback ATRPercent when no data', () => {
      expect(service.getATRPercent()).toBe(
        RESILIENCE_CONFIG.FALLBACK_DEFAULTS.atrPercent
      );
    });
  });

  describe('cache operations', () => {
    it('should start with empty cache', () => {
      const cached = service.getCachedData();
      expect(cached.length).toBe(0);
    });

    it('should return empty array for recent data', () => {
      const recent = service.getRecentData(10);
      expect(recent.length).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      service.reset();

      const state = service.getConnectionState();
      expect(state).toBe('disconnected');
      expect(service.getCachedData().length).toBe(0);
    });
  });

  describe('debug state', () => {
    it('should return debug info', () => {
      const debug = service.getDebugState();

      expect(debug).toHaveProperty('connectionState');
      expect(debug).toHaveProperty('cacheSize');
      expect(debug).toHaveProperty('quality');
    });
  });
});
