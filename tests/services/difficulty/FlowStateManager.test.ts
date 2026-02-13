/**
 * FlowStateManager Tests
 *
 * Tests for AI Director V2 flow state detection and adaptive corrections.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FlowStateManager,
  createFlowStateManager,
  FLOW_STATE_CONFIG,
} from '../../../services/difficulty/FlowStateManager';

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

describe('FlowStateManager', () => {
  let manager: ReturnType<typeof createFlowStateManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createFlowStateManager();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = FlowStateManager;
      const instance2 = FlowStateManager;
      expect(instance1).toBe(instance2);
    });

    it('should start in flow state', () => {
      expect(manager.getCurrentState()).toBe('flow');
    });

    it('should have default metrics', () => {
      const metrics = manager.getMetrics();
      expect(metrics.hpPercent).toBe(100);
      expect(metrics.killRate).toBe(0);
      expect(metrics.dashesLast10s).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should have correct HP band values', () => {
      expect(FLOW_STATE_CONFIG.HP_BAND.min).toBe(35);
      expect(FLOW_STATE_CONFIG.HP_BAND.ideal).toBe(50);
      expect(FLOW_STATE_CONFIG.HP_BAND.max).toBe(65);
    });

    it('should have correct kill rate targets', () => {
      expect(FLOW_STATE_CONFIG.KILL_RATE.min).toBe(8);
      expect(FLOW_STATE_CONFIG.KILL_RATE.ideal).toBe(15);
      expect(FLOW_STATE_CONFIG.KILL_RATE.max).toBe(25);
    });

    it('should have correct critical HP thresholds', () => {
      expect(FLOW_STATE_CONFIG.HP_CRITICAL.nearDeath).toBe(20);
      expect(FLOW_STATE_CONFIG.HP_CRITICAL.comfortable).toBe(80);
    });
  });

  describe('Flow State Detection', () => {
    it('should detect flow state at healthy HP', () => {
      const analysis = manager.update(50, Date.now());
      expect(analysis.state).toBe('flow');
    });

    it('should detect bored state at high HP with low engagement', () => {
      // Simulate high HP for extended duration
      const startTime = Date.now();

      // Update multiple times with high HP to build up timeAboveHP80
      for (let i = 0; i < 20; i++) {
        manager.update(85, startTime + i * 1000);
      }

      const analysis = manager.update(85, startTime + 20000);
      expect(analysis.state).toBe('bored');
    });

    it('should detect stressed state at low HP with high frustration', () => {
      // Simulate low HP and panic dashing
      const startTime = Date.now();

      // Record multiple damage events and dashes
      for (let i = 0; i < 10; i++) {
        manager.recordDamageTaken(10, startTime + i * 500);
        manager.recordDash(startTime + i * 500);
      }

      // Update with low HP multiple times to build up timeBelowHP30
      for (let i = 0; i < 15; i++) {
        manager.update(25, startTime + 5000 + i * 1000);
      }

      const analysis = manager.update(25, startTime + 20000);
      expect(analysis.state).toBe('stressed');
    });
  });

  describe('Engagement Score', () => {
    it('should calculate engagement based on kill rate', () => {
      const startTime = Date.now();

      // Record kills
      for (let i = 0; i < 15; i++) {
        manager.recordKill(startTime + i * 4000);
      }

      manager.update(50, startTime + 60000);
      const analysis = manager.getLastAnalysis(startTime + 60000);

      expect(analysis.engagementScore).toBeGreaterThan(0);
      expect(analysis.engagementScore).toBeLessThanOrEqual(1);
    });

    it('should have low engagement with no activity', () => {
      const analysis = manager.update(50, Date.now());
      expect(analysis.engagementScore).toBeLessThan(0.5);
    });
  });

  describe('Frustration Score', () => {
    it('should calculate frustration from dash frequency', () => {
      const now = Date.now();

      // Spam dashes
      for (let i = 0; i < 8; i++) {
        manager.recordDash(now - i * 1000);
      }

      manager.update(30, now);
      const analysis = manager.getLastAnalysis(now);

      expect(analysis.frustrationScore).toBeGreaterThan(0);
    });

    it('should calculate frustration from damage taken', () => {
      const now = Date.now();

      // Take lots of damage
      for (let i = 0; i < 5; i++) {
        manager.recordDamageTaken(20, now - i * 1000);
      }

      manager.update(35, now);
      const analysis = manager.getLastAnalysis(now);

      expect(analysis.frustrationScore).toBeGreaterThan(0);
    });

    it('should have low frustration with no damage', () => {
      const analysis = manager.update(50, Date.now());
      expect(analysis.frustrationScore).toBeLessThan(0.3);
    });
  });

  describe('Near Death Detection', () => {
    it('should detect near death at critical HP', () => {
      const analysis = manager.update(15, Date.now());
      expect(analysis.isNearDeath).toBe(true);
    });

    it('should not detect near death at healthy HP', () => {
      const analysis = manager.update(50, Date.now());
      expect(analysis.isNearDeath).toBe(false);
    });
  });

  describe('Comfortable Detection', () => {
    it('should detect comfortable at high HP', () => {
      const analysis = manager.update(85, Date.now());
      expect(analysis.isComfortable).toBe(true);
    });

    it('should not detect comfortable at moderate HP', () => {
      const analysis = manager.update(60, Date.now());
      expect(analysis.isComfortable).toBe(false);
    });
  });

  describe('AFK Detection', () => {
    it('should detect AFK when no input for 5+ seconds', () => {
      const startTime = Date.now();
      manager.recordInput(startTime);

      // 6 seconds later without input
      const analysis = manager.update(50, startTime + 6000);
      expect(analysis.isAFK).toBe(true);
    });

    it('should not detect AFK with recent input', () => {
      const now = Date.now();
      manager.recordInput(now);

      const analysis = manager.update(50, now);
      expect(analysis.isAFK).toBe(false);
    });
  });

  describe('Corrections - Bored State', () => {
    it('should suggest increased difficulty when bored', () => {
      const startTime = Date.now();

      // Build up bored state
      for (let i = 0; i < 20; i++) {
        manager.update(90, startTime + i * 1000);
      }

      const analysis = manager.update(90, startTime + 20000);

      // Verify state was detected as bored
      expect(analysis.state).toBe('bored');
      // Bored state should increase spawn rate (>=1.0)
      expect(analysis.suggestedCorrections.spawnRateMultiplier).toBeGreaterThanOrEqual(
        1.0
      );
    });
  });

  describe('Corrections - Stressed State', () => {
    it('should suggest mercy when near death', () => {
      const analysis = manager.update(15, Date.now());

      expect(analysis.isNearDeath).toBe(true);
      expect(analysis.suggestedCorrections.mercyActive).toBe(true);
      expect(analysis.suggestedCorrections.mercyReduction).toBeGreaterThan(0);
    });

    it('should suggest reduced spawn rate when stressed', () => {
      const startTime = Date.now();

      // Build up stressed state with damage
      for (let i = 0; i < 10; i++) {
        manager.recordDamageTaken(15, startTime + i * 500);
        manager.recordDash(startTime + i * 500);
      }

      for (let i = 0; i < 15; i++) {
        manager.update(25, startTime + 5000 + i * 1000);
      }

      const analysis = manager.update(25, startTime + 20000);

      // Verify state was detected as stressed
      expect(analysis.state).toBe('stressed');
      // Stressed state should reduce spawn rate (<=1.0)
      expect(analysis.suggestedCorrections.spawnRateMultiplier).toBeLessThanOrEqual(
        1.0
      );
    });
  });

  describe('Corrections - Flow State', () => {
    it('should suggest minimal changes in flow', () => {
      const analysis = manager.update(50, Date.now());

      expect(analysis.state).toBe('flow');
      // Flow corrections should be close to 1.0
      expect(analysis.suggestedCorrections.spawnRateMultiplier).toBeGreaterThanOrEqual(
        0.9
      );
      expect(analysis.suggestedCorrections.spawnRateMultiplier).toBeLessThanOrEqual(
        1.15
      );
    });
  });

  describe('AFK Override', () => {
    it('should not apply mercy to AFK players', () => {
      const startTime = Date.now();
      manager.recordInput(startTime);

      // 6 seconds later, near death but AFK
      const analysis = manager.update(10, startTime + 6000);

      expect(analysis.isAFK).toBe(true);
      expect(analysis.suggestedCorrections.mercyActive).toBe(false);
    });
  });

  describe('Kill Tracking', () => {
    it('should track kills over 60 seconds', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        manager.recordKill(startTime + i * 1000);
      }

      manager.update(50, startTime + 30000);
      const metrics = manager.getMetrics();

      expect(metrics.killsLast60s).toBe(10);
    });

    it('should remove old kills after 60 seconds', () => {
      const startTime = Date.now();

      // Kills 70 seconds ago
      for (let i = 0; i < 5; i++) {
        manager.recordKill(startTime - 70000 + i * 1000);
      }

      // Recent kills
      for (let i = 0; i < 3; i++) {
        manager.recordKill(startTime + i * 1000);
      }

      manager.update(50, startTime + 5000);
      const metrics = manager.getMetrics();

      expect(metrics.killsLast60s).toBe(3);
    });
  });

  describe('Level Up Tracking', () => {
    it('should track level-up interval', () => {
      const startTime = Date.now();

      manager.recordLevelUp(2, startTime);
      manager.recordLevelUp(3, startTime + 25000);

      const metrics = manager.getMetrics();
      expect(metrics.levelUpInterval).toBe(25);
      expect(metrics.currentLevel).toBe(3);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      // Make some changes
      manager.recordKill(Date.now());
      manager.recordDash(Date.now());
      manager.update(30, Date.now());

      // Reset
      manager.reset();

      const metrics = manager.getMetrics();
      expect(metrics.hpPercent).toBe(100);
      expect(metrics.killsLast60s).toBe(0);
      expect(metrics.dashesLast10s).toBe(0);
      expect(manager.getCurrentState()).toBe('flow');
    });
  });

  describe('Debug State', () => {
    it('should provide debug information', () => {
      manager.update(50, Date.now());

      const debug = manager.getDebugState();
      expect(debug).toHaveProperty('state');
      expect(debug).toHaveProperty('hpPercent');
      expect(debug).toHaveProperty('killRate');
      expect(debug).toHaveProperty('engagement');
      expect(debug).toHaveProperty('frustration');
      expect(debug).toHaveProperty('corrections');
    });
  });
});
