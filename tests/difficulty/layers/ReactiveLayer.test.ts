/**
 * ReactiveLayer (Emergency Interventions) Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ReactiveLayer,
  REACTIVE_CONFIG,
  type PlayerState,
} from '../../../services/difficulty/layers/ReactiveLayer';
import type { TacticalOutput } from '../../../services/difficulty/layers/TacticalLayer';

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

// Default tactical output for testing
const defaultTactical: TacticalOutput = {
  bearSpawnMultiplier: 1.0,
  bullSpawnMultiplier: 1.0,
  eliteChanceBonus: 0.1,
  speedVariance: 0.2,
  shouldSpawnWhale: false,
  whaleType: null,
  shouldSpawnPortal: false,
  portalType: null,
  chaosLevel: 'normal',
  marketMood: 'neutral',
  strategicMultiplier: 1.0,
  marketCondition: 'Test',
};

// Default player state
const healthyPlayer: PlayerState = {
  hpPercent: 0.5,
  isDead: false,
  lastDeathTime: 0,
  currentCombo: 0,
  recentDamageTaken: 0,
};

describe('ReactiveLayer (Emergency Interventions)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    ReactiveLayer.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('REACTIVE_CONFIG', () => {
    it('should have valid HP thresholds', () => {
      expect(REACTIVE_CONFIG.MERCY_HP_THRESHOLD).toBeLessThan(0.5);
      expect(REACTIVE_CONFIG.SWARM_HP_THRESHOLD).toBeGreaterThan(0.5);
    });

    it('should have valid mercy modifiers', () => {
      expect(REACTIVE_CONFIG.MERCY_SPAWN_MULTIPLIER).toBeLessThan(1.0);
      expect(REACTIVE_CONFIG.SWARM_SPAWN_MULTIPLIER).toBeGreaterThan(1.0);
    });
  });

  describe('mercy mode', () => {
    it('should activate mercy mode when HP critically low', () => {
      const dyingPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.15, // 15% HP - below MERCY_HP_THRESHOLD
      };

      const output = ReactiveLayer.process(dyingPlayer, defaultTactical);

      expect(output.interventionActive).toBe(true);
      expect(output.spawnRate).toBeLessThan(1.0);
    });

    it('should reduce enemy speed in mercy mode', () => {
      const dyingPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.15,
      };

      const output = ReactiveLayer.process(dyingPlayer, defaultTactical);

      expect(output.enemySpeedMultiplier).toBeLessThan(1.0);
    });

    it('should prevent whale spawns in mercy mode', () => {
      const dyingPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.15,
      };

      const whaleReadyTactical: TacticalOutput = {
        ...defaultTactical,
        shouldSpawnWhale: true,
        whaleType: 'bear',
      };

      const output = ReactiveLayer.process(dyingPlayer, whaleReadyTactical);

      expect(output.shouldSpawnWhale).toBe(false);
    });
  });

  describe('swarm mode', () => {
    it('should activate swarm mode when HP very high', () => {
      const tankPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.9, // 90% HP - above SWARM_HP_THRESHOLD
      };

      const output = ReactiveLayer.process(tankPlayer, defaultTactical);

      expect(output.spawnRate).toBeGreaterThan(1.0);
    });
  });

  describe('death cooldown', () => {
    it('should have reduced difficulty after death', () => {
      const respawnedPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.5,
        isDead: false,
        lastDeathTime: Date.now() - 1000, // Died 1 second ago
      };

      const output = ReactiveLayer.process(respawnedPlayer, defaultTactical);

      // Should be in death cooldown
      expect(output.spawnRate).toBeLessThan(1.5); // Reduced spawns
    });

    it('should expire after configured duration', () => {
      const respawnedPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.5,
        isDead: false,
        lastDeathTime: Date.now() - REACTIVE_CONFIG.DEATH_COOLDOWN_MS - 100, // Died long ago
      };

      const output = ReactiveLayer.process(respawnedPlayer, defaultTactical);

      // Death cooldown should be expired, normal behavior
      expect(output.interventionActive).toBe(false);
    });
  });

  describe('normal operation', () => {
    it('should pass through tactical output when HP is healthy', () => {
      const output = ReactiveLayer.process(healthyPlayer, defaultTactical);

      expect(output.flowState).toBe('flow');
      expect(output.interventionActive).toBe(false);
    });

    it('should preserve tactical multipliers in normal mode', () => {
      const highChaosTactical: TacticalOutput = {
        ...defaultTactical,
        bearSpawnMultiplier: 1.5,
        bullSpawnMultiplier: 0.8,
        chaosLevel: 'volatile',
      };

      const output = ReactiveLayer.process(healthyPlayer, highChaosTactical);

      expect(output.bearSpawnWeight).toBe(1.5);
      expect(output.bullSpawnWeight).toBe(0.8);
    });
  });

  describe('flow state detection', () => {
    it('should detect bored state when HP high', () => {
      const tankPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.85,
      };

      const output = ReactiveLayer.process(tankPlayer, defaultTactical);
      expect(output.flowState).toBe('bored');
    });

    it('should detect stressed state when HP low', () => {
      const lowHPPlayer: PlayerState = {
        ...healthyPlayer,
        hpPercent: 0.25,
      };

      const output = ReactiveLayer.process(lowHPPlayer, defaultTactical);
      expect(output.flowState).toBe('stressed');
    });

    it('should detect flow state when HP in middle', () => {
      const output = ReactiveLayer.process(healthyPlayer, defaultTactical);
      expect(output.flowState).toBe('flow');
    });
  });

  describe('combo protection', () => {
    it('should provide slight protection for high combos', () => {
      const comboPlayer: PlayerState = {
        ...healthyPlayer,
        currentCombo: 25, // Above HIGH_COMBO_THRESHOLD
      };

      const output = ReactiveLayer.process(comboPlayer, defaultTactical);

      // Should have slightly reduced spawn rate to protect combo
      // But not a major intervention
      expect(output.spawnRate).toBeLessThanOrEqual(1.0);
    });
  });

  describe('debug state', () => {
    it('should provide debug info', () => {
      ReactiveLayer.process(healthyPlayer, defaultTactical);

      const debugState = ReactiveLayer.getDebugState();

      expect(debugState).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      // Process some state
      ReactiveLayer.process(healthyPlayer, defaultTactical);

      // Reset
      ReactiveLayer.reset();

      // Should work normally after reset
      const output = ReactiveLayer.process(healthyPlayer, defaultTactical);
      expect(output).toBeDefined();
    });
  });
});
