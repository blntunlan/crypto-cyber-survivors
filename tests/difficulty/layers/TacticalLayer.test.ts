/**
 * TacticalLayer (Market Mapping) Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createTacticalLayer,
  TACTICAL_CONFIG,
  type MarketIndicators,
} from '../../../services/difficulty/layers/TacticalLayer';
import type { StrategicOutput } from '../../../services/difficulty/layers/StrategicLayer';

// Mock dependencies
vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

// Default strategic output for testing
const defaultStrategic: StrategicOutput = {
  difficultyMultiplier: 1.0,
  flowState: 'flow',
  deviationMagnitude: 0,
  trend: 0,
  confidence: 1,
  pid: {
    error: 0,
    integral: 0,
    derivative: 0,
    lastError: 0,
    lastUpdateTime: 0,
    output: 1.0,
    smoothedOutput: 1.0,
  },
};

// Default market indicators
const neutralMarket: MarketIndicators = {
  rsi: 50,
  atrPercent: 0.5,
  normalizedVolume: 0.5,
  priceChangePercent: 0,
  trend: 'sideways',
};

describe('TacticalLayer (Market Mapping)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createTacticalLayer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start with no cached output', () => {
      const layer = createTacticalLayer();
      expect(layer.getCurrentOutput()).toBeNull();
    });
  });

  describe('TACTICAL_CONFIG', () => {
    it('should have valid RSI thresholds', () => {
      expect(TACTICAL_CONFIG.RSI_OVERSOLD).toBeLessThan(50);
      expect(TACTICAL_CONFIG.RSI_OVERBOUGHT).toBeGreaterThan(50);
    });

    it('should have valid ATR thresholds', () => {
      expect(TACTICAL_CONFIG.ATR_LOW).toBeLessThan(TACTICAL_CONFIG.ATR_HIGH);
      expect(TACTICAL_CONFIG.ATR_HIGH).toBeLessThan(TACTICAL_CONFIG.ATR_EXTREME);
    });
  });

  describe('RSI-based enemy bias', () => {
    it('should favor bears when RSI overbought', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const overboughtMarket: MarketIndicators = {
        ...neutralMarket,
        rsi: 75, // Overbought
      };

      const output = layer.update(overboughtMarket, defaultStrategic);

      expect(output.bearSpawnMultiplier).toBeGreaterThan(output.bullSpawnMultiplier);
    });

    it('should favor bulls when RSI oversold', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const oversoldMarket: MarketIndicators = {
        ...neutralMarket,
        rsi: 25, // Oversold
      };

      const output = layer.update(oversoldMarket, defaultStrategic);

      expect(output.bullSpawnMultiplier).toBeGreaterThan(output.bearSpawnMultiplier);
    });

    it('should be neutral when RSI in middle', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(neutralMarket, defaultStrategic);

      expect(output.bearSpawnMultiplier).toBeCloseTo(output.bullSpawnMultiplier, 0.1);
    });
  });

  describe('ATR-based chaos level', () => {
    it('should be calm when ATR low', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const calmMarket: MarketIndicators = {
        ...neutralMarket,
        atrPercent: 0.2, // Low volatility
      };

      const output = layer.update(calmMarket, defaultStrategic);
      expect(output.chaosLevel).toBe('calm');
    });

    it('should be volatile when ATR high', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const volatileMarket: MarketIndicators = {
        ...neutralMarket,
        atrPercent: 2.0, // High volatility
      };

      const output = layer.update(volatileMarket, defaultStrategic);
      expect(output.chaosLevel).toBe('volatile');
    });

    it('should be extreme when ATR very high', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const extremeMarket: MarketIndicators = {
        ...neutralMarket,
        atrPercent: 4.0, // Extreme volatility
      };

      const output = layer.update(extremeMarket, defaultStrategic);
      expect(output.chaosLevel).toBe('extreme');
    });

    it('should increase elite chance with higher chaos', () => {
      const layer = createTacticalLayer();

      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);
      const calmOutput = layer.update(
        { ...neutralMarket, atrPercent: 0.2 },
        defaultStrategic
      );

      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);
      const extremeOutput = layer.update(
        { ...neutralMarket, atrPercent: 4.0 },
        defaultStrategic
      );

      expect(extremeOutput.eliteChanceBonus).toBeGreaterThan(
        calmOutput.eliteChanceBonus
      );
    });
  });

  describe('whale spawning', () => {
    it('should trigger whale spawn on high volume', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const highVolumeMarket: MarketIndicators = {
        ...neutralMarket,
        normalizedVolume: 0.9, // Volume spike
        trend: 'bullish',
      };

      const output = layer.update(highVolumeMarket, defaultStrategic);
      expect(output.shouldSpawnWhale).toBe(true);
      expect(output.whaleType).toBe('bull');
    });

    it('should respect whale cooldown', () => {
      const layer = createTacticalLayer();

      // First whale spawn
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);
      const highVolumeMarket: MarketIndicators = {
        ...neutralMarket,
        normalizedVolume: 0.9,
        trend: 'bullish',
      };
      layer.update(highVolumeMarket, defaultStrategic);

      // Immediate second attempt should fail
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);
      const output2 = layer.update(highVolumeMarket, defaultStrategic);
      expect(output2.shouldSpawnWhale).toBe(false);

      // After cooldown should succeed
      vi.advanceTimersByTime(TACTICAL_CONFIG.WHALE_COOLDOWN_MS + 100);
      const output3 = layer.update(highVolumeMarket, defaultStrategic);
      expect(output3.shouldSpawnWhale).toBe(true);
    });

    it('should not spawn whale on low volume', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(neutralMarket, defaultStrategic);
      expect(output.shouldSpawnWhale).toBe(false);
    });
  });

  describe('market mood', () => {
    it('should detect fear in volatile oversold market', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const fearMarket: MarketIndicators = {
        ...neutralMarket,
        rsi: 25,
        atrPercent: 2.0,
      };

      const output = layer.update(fearMarket, defaultStrategic);
      expect(output.marketMood).toBe('fear');
    });

    it('should detect greed in volatile overbought market', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const greedMarket: MarketIndicators = {
        ...neutralMarket,
        rsi: 75,
        atrPercent: 2.0,
      };

      const output = layer.update(greedMarket, defaultStrategic);
      expect(output.marketMood).toBe('greed');
    });

    it('should be neutral in calm market', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const calmMarket: MarketIndicators = {
        ...neutralMarket,
        atrPercent: 0.2,
      };

      const output = layer.update(calmMarket, defaultStrategic);
      expect(output.marketMood).toBe('neutral');
    });
  });

  describe('strategic multiplier integration', () => {
    it('should apply strategic multiplier to spawn weights', () => {
      const layer = createTacticalLayer();
      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);

      const highDiffStrategic: StrategicOutput = {
        ...defaultStrategic,
        difficultyMultiplier: 2.0,
      };

      const output = layer.update(neutralMarket, highDiffStrategic);

      // Spawn multipliers should be scaled by strategic
      expect(output.strategicMultiplier).toBe(2.0);
      expect(output.bearSpawnMultiplier).toBeGreaterThan(1.0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      const layer = createTacticalLayer();

      vi.advanceTimersByTime(TACTICAL_CONFIG.UPDATE_INTERVAL_MS + 100);
      layer.update(neutralMarket, defaultStrategic);

      layer.reset();

      expect(layer.getCurrentOutput()).toBeNull();
    });
  });
});
