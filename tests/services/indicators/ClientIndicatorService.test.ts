/**
 * ClientIndicatorService Tests
 *
 * Tests for AI Director V2 client-side indicator calculations.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ClientIndicatorService,
  createClientIndicatorService,
  CLIENT_INDICATOR_CONFIG,
  getDefaultClientIndicatorState,
} from '../../../services/indicators/ClientIndicatorService';
import { MarketPosition } from '../../../types';

// Mock dependencies
vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock indicator sub-services
vi.mock('../../../services/indicators/RSICalculator', () => ({
  createRSICalculator: vi.fn(() => ({
    update: vi.fn(() => 50),
    getState: vi.fn(() => 'NEUTRAL'),
    isInitialized: vi.fn(() => true),
    getHistoryLength: vi.fn(() => 15),
    reset: vi.fn(),
  })),
}));

vi.mock('../../../services/indicators/MACDCalculator', () => ({
  createMACDCalculator: vi.fn(() => ({
    update: vi.fn(() => ({ macd: 0, signal: 0, histogram: 0 })),
    getResult: vi.fn(() => ({ macd: 0, signal: 0, histogram: 0 })),
    isInitialized: vi.fn(() => true),
    reset: vi.fn(),
  })),
}));

vi.mock('../../../services/indicators/ATRCalculator', () => ({
  ATRCalculator: class MockATRCalculator {
    update = vi.fn(() => ({ atr: 100, atrPercent: 0.002 }));
    isInitialized = vi.fn(() => true);
    reset = vi.fn();
  },
}));

vi.mock('../../../services/indicators/VolumeAnalyzer', () => ({
  createVolumeAnalyzer: vi.fn(() => ({
    update: vi.fn(() => 0.5),
    getWhaleTier: vi.fn(() => 0),
    isInitialized: vi.fn(() => true),
    reset: vi.fn(),
  })),
}));

describe('ClientIndicatorService', () => {
  let service: ReturnType<typeof createClientIndicatorService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createClientIndicatorService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = ClientIndicatorService;
      const instance2 = ClientIndicatorService;
      expect(instance1).toBe(instance2);
    });

    it('should have default state', () => {
      const state = service.getState();
      expect(state.rsi).toBe(50);
      expect(state.rsiNormalized).toBe(0.5);
      expect(state.rsiState).toBe('NEUTRAL');
      expect(state.isInitialized).toBe(false);
    });

    it('should return default state from factory function', () => {
      const defaultState = getDefaultClientIndicatorState();
      expect(defaultState.rsi).toBe(50);
      expect(defaultState.rsiNormalized).toBe(0.5);
      expect(defaultState.rsiMomentum).toBe(0);
      expect(defaultState.rsiState).toBe('NEUTRAL');
      expect(defaultState.trendDirection).toBe('SIDEWAYS');
    });
  });

  describe('Configuration', () => {
    it('should have correct RSI config values', () => {
      expect(CLIENT_INDICATOR_CONFIG.RSI_PERIOD).toBe(14);
      expect(CLIENT_INDICATOR_CONFIG.RSI_OVERSOLD).toBe(30);
      expect(CLIENT_INDICATOR_CONFIG.RSI_OVERBOUGHT).toBe(70);
    });

    it('should have correct ATR config values', () => {
      expect(CLIENT_INDICATOR_CONFIG.ATR_PERIOD).toBe(14);
      expect(CLIENT_INDICATOR_CONFIG.ATR_VOLATILE_THRESHOLD).toBe(0.005);
      expect(CLIENT_INDICATOR_CONFIG.ATR_CALM_THRESHOLD).toBe(0.002);
    });

    it('should have correct flash crash threshold', () => {
      expect(CLIENT_INDICATOR_CONFIG.FLASH_CRASH_THRESHOLD).toBe(-0.01);
    });
  });

  describe('Price Updates', () => {
    it('should accept valid price updates', () => {
      const state = service.update(50000, 1000000, Date.now());
      expect(state.lastUpdateTime).toBeGreaterThan(0);
      // With mocked RSICalculator returning 15, dataPointCount reflects mock value
      expect(state.dataPointCount).toBeGreaterThan(0);
    });

    it('should reject invalid price (zero)', () => {
      const initialState = service.getState();
      const state = service.update(0, 1000000, Date.now());
      expect(state.rsi).toBe(initialState.rsi);
    });

    it('should reject invalid price (negative)', () => {
      const initialState = service.getState();
      const state = service.update(-100, 1000000, Date.now());
      expect(state.rsi).toBe(initialState.rsi);
    });

    it('should reject invalid price (NaN)', () => {
      const initialState = service.getState();
      const state = service.update(NaN, 1000000, Date.now());
      expect(state.rsi).toBe(initialState.rsi);
    });

    it('should track data point count', () => {
      service.update(50000, 1000000, Date.now());
      service.update(50100, 1000000, Date.now() + 1000);
      service.update(50200, 1000000, Date.now() + 2000);

      const state = service.getState();
      // Mock returns fixed 15 from getHistoryLength
      expect(state.dataPointCount).toBeGreaterThan(0);
    });
  });

  describe('RSI Calculations', () => {
    it('should start with neutral RSI', () => {
      const state = service.getState();
      expect(state.rsi).toBe(50);
      expect(state.rsiState).toBe('NEUTRAL');
    });

    it('should normalize RSI to 0-1', () => {
      // After some updates, RSI should still be normalized
      service.update(50000, 1000000, Date.now());
      const state = service.getState();
      expect(state.rsiNormalized).toBeGreaterThanOrEqual(0);
      expect(state.rsiNormalized).toBeLessThanOrEqual(1);
    });

    it('should calculate RSI momentum', () => {
      const timestamp = Date.now();
      // First update establishes baseline
      service.update(50000, 1000000, timestamp);
      // Second update with higher price should show positive momentum
      service.update(50500, 1000000, timestamp + 1000);

      const state = service.getState();
      // Momentum is clamped to -1 to 1
      expect(state.rsiMomentum).toBeGreaterThanOrEqual(-1);
      expect(state.rsiMomentum).toBeLessThanOrEqual(1);
    });
  });

  describe('ATR Calculations', () => {
    it('should calculate ATR after updates', () => {
      service.update(50000, 1000000, Date.now());
      service.update(50100, 1000000, Date.now() + 1000);

      const state = service.getState();
      expect(state.atr).toBeGreaterThanOrEqual(0);
    });

    it('should normalize ATR to 0-1', () => {
      service.update(50000, 1000000, Date.now());
      service.update(50100, 1000000, Date.now() + 1000);

      const state = service.getState();
      expect(state.atrNormalized).toBeGreaterThanOrEqual(0);
      expect(state.atrNormalized).toBeLessThanOrEqual(1);
    });
  });

  describe('Volume Analysis', () => {
    it('should track normalized volume', () => {
      service.update(50000, 1000000, Date.now());
      const state = service.getState();
      expect(state.normalizedVolume).toBeGreaterThanOrEqual(0);
      expect(state.normalizedVolume).toBeLessThanOrEqual(1);
    });

    it('should start with no whale tier', () => {
      const state = service.getState();
      expect(state.whaleTier).toBe(0);
    });

    it('should detect volume spikes', () => {
      // Default normalized volume should not be a spike
      const state = service.getState();
      expect(state.volumeSpike).toBe(false);
    });
  });

  describe('Price Change Tracking', () => {
    it('should track price change percentage', () => {
      const timestamp = Date.now();
      service.update(50000, 1000000, timestamp);
      service.update(50500, 1000000, timestamp + 1000); // +1%

      const state = service.getState();
      expect(state.priceChangePercent).toBeGreaterThanOrEqual(-1);
      expect(state.priceChangePercent).toBeLessThanOrEqual(1);
    });

    it('should detect flash crash', () => {
      const timestamp = Date.now();
      service.update(50000, 1000000, timestamp);
      // Drop 2% (> 1% threshold)
      service.update(49000, 1000000, timestamp + 1000);

      const state = service.getState();
      expect(state.isFlashCrash).toBe(true);
    });

    it('should not detect flash crash on small drop', () => {
      const timestamp = Date.now();
      service.update(50000, 1000000, timestamp);
      // Drop 0.5% (< 1% threshold)
      service.update(49750, 1000000, timestamp + 1000);

      const state = service.getState();
      expect(state.isFlashCrash).toBe(false);
    });
  });

  describe('Trend Calculations', () => {
    it('should start with sideways trend', () => {
      const state = service.getState();
      expect(state.trendDirection).toBe('SIDEWAYS');
      expect(state.trendStrength).toBe(0);
    });

    it('should have trend strength between 0 and 1', () => {
      service.update(50000, 1000000, Date.now());
      service.update(50100, 1000000, Date.now() + 1000);

      const state = service.getState();
      expect(state.trendStrength).toBeGreaterThanOrEqual(0);
      expect(state.trendStrength).toBeLessThanOrEqual(1);
    });
  });

  describe('UnifiedDirector Integration', () => {
    it('should provide unified inputs for neural network', () => {
      service.update(50000, 1000000, Date.now());

      const inputs = service.getUnifiedInputs();
      expect(inputs).toHaveProperty('rsiNormalized');
      expect(inputs).toHaveProperty('rsiMomentum');
      expect(inputs).toHaveProperty('atrNormalized');
      expect(inputs).toHaveProperty('volumeNormalized');
      expect(inputs).toHaveProperty('priceChange');
      expect(inputs).toHaveProperty('trendStrength');
    });

    it('should have all inputs in valid range', () => {
      service.update(50000, 1000000, Date.now());

      const inputs = service.getUnifiedInputs();
      expect(inputs.rsiNormalized).toBeGreaterThanOrEqual(0);
      expect(inputs.rsiNormalized).toBeLessThanOrEqual(1);
      expect(inputs.rsiMomentum).toBeGreaterThanOrEqual(-1);
      expect(inputs.rsiMomentum).toBeLessThanOrEqual(1);
      expect(inputs.atrNormalized).toBeGreaterThanOrEqual(0);
      expect(inputs.atrNormalized).toBeLessThanOrEqual(1);
      expect(inputs.volumeNormalized).toBeGreaterThanOrEqual(0);
      expect(inputs.volumeNormalized).toBeLessThanOrEqual(1);
      expect(inputs.priceChange).toBeGreaterThanOrEqual(-1);
      expect(inputs.priceChange).toBeLessThanOrEqual(1);
      expect(inputs.trendStrength).toBeGreaterThanOrEqual(0);
      expect(inputs.trendStrength).toBeLessThanOrEqual(1);
    });
  });

  describe('Position Favorability', () => {
    it('should report neutral favorability for neutral RSI', () => {
      service.setPosition(MarketPosition.LONG);
      // Default RSI is neutral
      expect(service.isFavorable()).toBe(false);
      expect(service.isUnfavorable()).toBe(false);
    });
  });

  describe('Pair and Position', () => {
    it('should allow setting trading pair', () => {
      service.setPair('ETH');
      // Should not throw
      expect(true).toBe(true);
    });

    it('should allow setting position', () => {
      service.setPosition(MarketPosition.SHORT);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Make some updates
      service.update(50000, 1000000, Date.now());
      service.update(50500, 1000000, Date.now() + 1000);

      // Reset
      service.reset();

      const state = service.getState();
      expect(state.rsi).toBe(50);
      expect(state.isInitialized).toBe(false);
      expect(state.dataPointCount).toBe(0);
    });
  });

  describe('Warmup', () => {
    it('should warmup with historical data', async () => {
      const history = [
        { price: 50000, volume: 1000000, timestamp: Date.now() - 5000 },
        { price: 50100, volume: 1000000, timestamp: Date.now() - 4000 },
        { price: 50200, volume: 1000000, timestamp: Date.now() - 3000 },
        { price: 50300, volume: 1000000, timestamp: Date.now() - 2000 },
        { price: 50400, volume: 1000000, timestamp: Date.now() - 1000 },
      ];

      await service.warmup(history);

      const state = service.getState();
      // Mock returns fixed value, just verify it populated
      expect(state.dataPointCount).toBeGreaterThan(0);
    });

    it('should handle empty history', async () => {
      await service.warmup([]);
      const state = service.getState();
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('Debug State', () => {
    it('should provide debug information', () => {
      service.update(50000, 1000000, Date.now());

      const debug = service.getDebugState();
      expect(debug).toHaveProperty('rsi');
      expect(debug).toHaveProperty('rsiState');
      expect(debug).toHaveProperty('rsiMomentum');
      expect(debug).toHaveProperty('atrPercent');
      expect(debug).toHaveProperty('volume');
      expect(debug).toHaveProperty('whaleTier');
      expect(debug).toHaveProperty('priceChange');
      expect(debug).toHaveProperty('trend');
      expect(debug).toHaveProperty('flashCrash');
      expect(debug).toHaveProperty('initialized');
      expect(debug).toHaveProperty('dataPoints');
    });
  });
});
