import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createDataResilienceService,
  RESILIENCE_CONFIG,
  DataResilienceService,
} from '../../services/market/DataResilienceService';
import { EventBus } from '../../services/core/EventBus';

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

  describe('Market Data Handling', () => {
    it('should process incoming market data', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      callback({
        price: 50000,
        volume: 1000,
        rsi: 60,
        atr: 500,
        atrPercent: 1.0,
      });

      expect(service.getConnectionState()).toBe('connected');
      expect(service.getPrice()).toBe(50000);
      expect(service.getRSI()).toBe(60);
      expect(service.isDataFresh()).toBe(true);
      expect(service.getCachedData()).toHaveLength(1);
    });

    it('should fill gaps between updates', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      // First data point
      vi.setSystemTime(1000);
      callback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      // Second data point after a 3s gap
      vi.setSystemTime(4000);
      callback({ price: 130, volume: 40, rsi: 80, atr: 4, atrPercent: 0.8 });

      // Should have: T=1000 (real), T=2000 (interp), T=3000 (interp), T=4000 (real)
      expect(service.getCachedData()).toHaveLength(4);
      expect(service.getQualityMetrics().interpolatedPoints).toBe(2);
      expect(service.getQualityMetrics().gapsFilled).toBe(1);
    });

    it('should not interpolate if gap is too large', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      vi.setSystemTime(1000);
      callback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      // 5 minute gap (exceeds MAX_INTERPOLATION_GAP_MS)
      vi.setSystemTime(1000 + RESILIENCE_CONFIG.MAX_INTERPOLATION_GAP_MS + 1000);
      callback({ price: 200, volume: 20, rsi: 60, atr: 2, atrPercent: 0.6 });

      expect(service.getCachedData()).toHaveLength(2);
      expect(service.getQualityMetrics().interpolatedPoints).toBe(0);
    });
  });

  describe('Connection Management', () => {
    it('should handle marketDataTimeout', () => {
      const timeoutCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketDataTimeout'
      )[1];

      // Move to connected state first so we can see the transition
      const dataCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];
      dataCallback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });
      expect(service.getConnectionState()).toBe('connected');

      vi.clearAllMocks();
      timeoutCallback();

      expect(service.getConnectionState()).toBe('reconnecting');
      expect(EventBus.emit).toHaveBeenCalledWith(
        'marketDataFallback',
        expect.any(Object)
      );
      expect(EventBus.emit).toHaveBeenCalledWith('marketConnectionStateChanged', {
        state: 'disconnected',
      });
      expect(EventBus.emit).toHaveBeenCalledWith('marketConnectionStateChanged', {
        state: 'reconnecting',
      });
    });

    it('should implement exponential backoff for reconnection', () => {
      const timeoutCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketDataTimeout'
      )[1];

      // Move to connected state first
      const dataCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];
      dataCallback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      vi.clearAllMocks();
      timeoutCallback();

      expect(EventBus.emit).toHaveBeenCalledWith('marketConnectionStateChanged', {
        state: 'disconnected',
      });
      vi.advanceTimersByTime(RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS);
      expect(EventBus.emit).toHaveBeenCalledWith('marketReconnectAttempt', {
        attempt: 1,
      });

      // Trigger second timeout
      timeoutCallback();
      vi.advanceTimersByTime(RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS);
      // Wait for second attempt with backoff (delay * 2)
      vi.advanceTimersByTime(RESILIENCE_CONFIG.INITIAL_RETRY_DELAY_MS);

      expect(EventBus.emit).toHaveBeenCalledWith('marketReconnectAttempt', {
        attempt: 2,
      });
    });

    it('should handle marketDataRecovered', () => {
      const recoveryCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketDataRecovered'
      )[1];

      service.reset();
      recoveryCallback();

      expect(service.getConnectionState()).toBe('connected');
    });
  });

  describe('Quality Metrics', () => {
    it('should calculate decaying freshness', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      vi.setSystemTime(1000);
      callback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      expect(service.getQualityMetrics().freshness).toBe(1.0);

      // Advance 15s (half of STALE_THRESHOLD_MS)
      vi.advanceTimersByTime(15000);
      expect(service.getQualityMetrics().freshness).toBeCloseTo(0.5, 1);

      // Advance to stale threshold
      vi.advanceTimersByTime(15000);
      expect(service.getQualityMetrics().freshness).toBe(0);
    });

    it('should calculate completeness based on interpolated points', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      vi.setSystemTime(1000);
      callback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      vi.setSystemTime(3000); // 1 interpolated point at 2000
      callback({ price: 110, volume: 11, rsi: 51, atr: 1.1, atrPercent: 0.51 });

      const quality = service.getQualityMetrics();
      // 3 points total (2 real, 1 interp), completeness = (3-1)/3 = 0.666...
      expect(quality.completeness).toBeCloseTo(0.67, 1);
    });
  });

  describe('Cache Trimming', () => {
    it('should trim cache when exceeding MAX_CACHE_SIZE', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      // Fill beyond limit
      for (let i = 0; i < RESILIENCE_CONFIG.MAX_CACHE_SIZE + 10; i++) {
        vi.setSystemTime(1000 + i * 1000);
        callback({ price: 100 + i, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });
      }

      expect(service.getCachedData()).toHaveLength(RESILIENCE_CONFIG.MAX_CACHE_SIZE);
      expect(service.getCachedData()[0]?.price).toBe(110); // First 10 should be shifted out
    });
  });

  describe('Utility Methods', () => {
    it('should return recent data', () => {
      const callbackEntry = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      );
      if (!callbackEntry) throw new Error('Callback not found');
      const emitData = callbackEntry[1];

      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(1000 + i * 1000);
        emitData({ price: 100 + i, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });
      }

      expect(service.getRecentData(3)).toHaveLength(3);
      expect(service.getRecentData(3)[2]?.price).toBe(104);
    });

    it('should handle gameReset', () => {
      const resetCallback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'gameReset'
      )[1];

      const callbackEntry = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      );
      if (!callbackEntry) throw new Error('Callback not found');
      const emitData = callbackEntry[1];

      vi.setSystemTime(1000);
      emitData({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });
      vi.setSystemTime(3000);
      emitData({ price: 120, volume: 12, rsi: 52, atr: 1.2, atrPercent: 0.52 });

      expect(service.getQualityMetrics().gapsFilled).toBe(1);

      resetCallback();
      expect(service.getQualityMetrics().gapsFilled).toBe(0);
    });
  });

  describe('Debug State', () => {
    it('should show formatted lastDataTime in debug state', () => {
      const callback = (EventBus.on as any).mock.calls.find(
        (call: any) => call[0] === 'marketStateUpdated'
      )[1];

      vi.setSystemTime(1700000000000);
      callback({ price: 100, volume: 10, rsi: 50, atr: 1, atrPercent: 0.5 });

      const debug = service.getDebugState();
      expect(debug.lastDataTime).toBe(new Date(1700000000000).toISOString());
    });
  });
});
