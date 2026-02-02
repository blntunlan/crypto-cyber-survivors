/**
 * StrategicLayer (PID Controller) Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createStrategicLayer,
  PID_CONFIG,
} from '../../../services/difficulty/layers/StrategicLayer';

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

describe('StrategicLayer (PID Controller)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    createStrategicLayer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start with default output', () => {
      const layer = createStrategicLayer();
      const output = layer.getCurrentOutput();

      expect(output.difficultyMultiplier).toBe(1.0);
      expect(output.flowState).toBe('flow');
      expect(output.confidence).toBe(0);
    });
  });

  describe('PID_CONFIG', () => {
    it('should have valid target HP', () => {
      expect(PID_CONFIG.TARGET_HP_PERCENT).toBe(0.5);
    });

    it('should have valid flow bounds', () => {
      expect(PID_CONFIG.FLOW_HP_MIN).toBeLessThan(PID_CONFIG.TARGET_HP_PERCENT);
      expect(PID_CONFIG.FLOW_HP_MAX).toBeGreaterThan(PID_CONFIG.TARGET_HP_PERCENT);
    });

    it('should have valid output limits', () => {
      expect(PID_CONFIG.OUTPUT_MIN).toBeLessThan(1);
      expect(PID_CONFIG.OUTPUT_MAX).toBeGreaterThan(1);
    });
  });

  describe('update', () => {
    it('should increase difficulty when HP too high (bored)', () => {
      const layer = createStrategicLayer();

      // Advance time to allow update
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.8, 100); // 80% HP (above flow)

      // High HP → player is bored → spawn MORE enemies
      expect(output.flowState).toBe('bored');
      expect(output.difficultyMultiplier).toBeGreaterThan(1.0);
    });

    it('should decrease difficulty when HP too low (stressed)', () => {
      const layer = createStrategicLayer();

      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.2, 100); // 20% HP (below flow)

      // Low HP → player is stressed → spawn FEWER enemies
      expect(output.flowState).toBe('stressed');
      expect(output.difficultyMultiplier).toBeLessThan(1.0);
    });

    it('should maintain difficulty around target HP (flow)', () => {
      const layer = createStrategicLayer();

      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.5, 100); // 50% HP (at target)

      expect(output.flowState).toBe('flow');
      // Difficulty should be close to 1.0 at target
      expect(output.difficultyMultiplier).toBeCloseTo(1.0, 0.5);
    });

    it('should clamp output to limits', () => {
      const layer = createStrategicLayer();

      // Very low HP for extended period
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
        layer.update(0.05, 100);
      }

      const output = layer.getCurrentOutput();
      expect(output.difficultyMultiplier).toBeGreaterThanOrEqual(PID_CONFIG.OUTPUT_MIN);
      expect(output.difficultyMultiplier).toBeLessThanOrEqual(PID_CONFIG.OUTPUT_MAX);
    });

    it('should build confidence over time', () => {
      const layer = createStrategicLayer();

      const output1 = layer.update(0.5, 100);
      expect(output1.confidence).toBeLessThan(1);

      // Multiple updates
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
        layer.update(0.5, 100);
      }

      const output2 = layer.getCurrentOutput();
      expect(output2.confidence).toBe(1);
    });
  });

  describe('flow state detection', () => {
    it('should detect bored state above FLOW_HP_MAX', () => {
      const layer = createStrategicLayer();
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.7, 100); // Above 65%
      expect(output.flowState).toBe('bored');
    });

    it('should detect stressed state below FLOW_HP_MIN', () => {
      const layer = createStrategicLayer();
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.3, 100); // Below 35%
      expect(output.flowState).toBe('stressed');
    });

    it('should detect flow state within bounds', () => {
      const layer = createStrategicLayer();
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);

      const output = layer.update(0.5, 100); // 50%
      expect(output.flowState).toBe('flow');
    });
  });

  describe('integral anti-windup', () => {
    it('should clamp integral to prevent windup', () => {
      const layer = createStrategicLayer();

      // Sustained error in one direction
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
        layer.update(0.1, 100); // Very low HP
      }

      const state = layer.getDebugState() as { pidState: { integral: number } };
      expect(state.pidState.integral).toBeGreaterThanOrEqual(PID_CONFIG.INTEGRAL_MIN);
      expect(state.pidState.integral).toBeLessThanOrEqual(PID_CONFIG.INTEGRAL_MAX);
    });
  });

  describe('trend calculation', () => {
    it('should detect increasing HP trend', () => {
      const layer = createStrategicLayer();

      // HP increasing
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      layer.update(0.3, 100);
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      layer.update(0.5, 100);
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      const output = layer.update(0.7, 100);

      expect(output.trend).toBe(1); // Increasing
    });

    it('should detect decreasing HP trend', () => {
      const layer = createStrategicLayer();

      // HP decreasing
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      layer.update(0.7, 100);
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      layer.update(0.5, 100);
      vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
      const output = layer.update(0.3, 100);

      expect(output.trend).toBe(-1); // Decreasing
    });
  });

  describe('setGains', () => {
    it('should allow PID gain adjustment', () => {
      const layer = createStrategicLayer();

      layer.setGains(3.0, 0.2, 0.8);

      expect(PID_CONFIG.Kp).toBe(3.0);
      expect(PID_CONFIG.Ki).toBe(0.2);
      expect(PID_CONFIG.Kd).toBe(0.8);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const layer = createStrategicLayer();

      // Build up state
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(PID_CONFIG.UPDATE_INTERVAL_MS + 100);
        layer.update(0.3, 100);
      }

      layer.reset();

      const output = layer.getCurrentOutput();
      expect(output.difficultyMultiplier).toBe(1.0);
      expect(output.confidence).toBe(0);
    });
  });
});
