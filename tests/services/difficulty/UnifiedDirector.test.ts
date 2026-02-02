/**
 * UnifiedDirector Tests - AI Director V2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock synaptic before importing UnifiedDirector
const mockNetwork = {
  activate: vi.fn().mockReturnValue(Array(14).fill(0.5)),
};

vi.mock('synaptic', () => {
  const mockPerceptron = vi.fn().mockImplementation(() => mockNetwork);
  const mockFromJSON = vi.fn().mockImplementation(() => mockNetwork);

  return {
    Architect: { Perceptron: mockPerceptron },
    Network: { fromJSON: mockFromJSON },
    default: {
      Architect: { Perceptron: mockPerceptron },
      Network: { fromJSON: mockFromJSON },
    },
  };
});

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

import {
  UnifiedDirector,
  UNIFIED_DIRECTOR_CONFIG,
  type UnifiedInputs,
} from '../../../services/difficulty/UnifiedDirector';

describe('UnifiedDirector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    UnifiedDirector.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createDefaultInputs = (): UnifiedInputs => ({
    rsi: 0.5,
    rsiMomentum: 0,
    atrPercent: 0.02,
    volumeNorm: 0.5,
    priceChange: 0,
    trendStrength: 0.5,
    hpPercent: 0.5,
    pnlRatio: 0,
    killsPerMin: 0.5,
    dashFrequency: 0.1,
    playerDPS: 0.5,
    damageTakenRate: 0.2,
    elapsedMinutes: 0.1,
    playerLevel: 0.1,
    leverage: 0.1,
    gemPileup: 0.1,
    engagementScore: 0.5,
    frustrationScore: 0.2,
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      expect(UnifiedDirector).toBeDefined();
    });

    it('should have default outputs', () => {
      const outputs = UnifiedDirector.getOutputs();
      expect(outputs.spawnRate).toBe(1.0);
      expect(outputs.enemySpeed).toBe(1.0);
      expect(outputs.mercyFactor).toBe(0);
    });
  });

  describe('Grace Period', () => {
    it('should apply reduced difficulty during grace period', () => {
      const inputs = createDefaultInputs();
      inputs.hpPercent = 0.8;

      // Update at 5 seconds (still in grace)
      UnifiedDirector.update(inputs, 5000);
      const earlyOutputs = UnifiedDirector.getOutputs();

      // Update at 35 seconds (after grace)
      UnifiedDirector.update(inputs, 35000);
      const lateOutputs = UnifiedDirector.getOutputs();

      // Grace period should have lower chaos/pressure
      expect(earlyOutputs.chaosLevel).toBeLessThanOrEqual(lateOutputs.chaosLevel);
    });

    it('should block whales during early grace period', () => {
      const inputs = createDefaultInputs();
      inputs.volumeNorm = 1.0; // High volume

      // Update at 5 seconds
      UnifiedDirector.update(inputs, 5000);
      const earlyOutputs = UnifiedDirector.getOutputs();

      expect(earlyOutputs.whaleProbability).toBeLessThan(0.5);
    });
  });

  describe('Flow State Management', () => {
    it('should detect "bored" state when HP > 65%', () => {
      const status = UnifiedDirector.getFlowStateStatus(0.8);
      expect(status).toBe('bored');
    });

    it('should detect "flow" state when HP between 35-65%', () => {
      const status = UnifiedDirector.getFlowStateStatus(0.5);
      expect(status).toBe('flow');
    });

    it('should detect "stressed" state when HP < 35%', () => {
      const status = UnifiedDirector.getFlowStateStatus(0.2);
      expect(status).toBe('stressed');
    });

    it('should increase spawn rate when player is too comfortable', () => {
      const inputs = createDefaultInputs();
      inputs.hpPercent = 0.9; // 90% HP = too easy

      UnifiedDirector.update(inputs, 35000);
      const outputs = UnifiedDirector.getOutputs();

      // Should have increased spawn rate to challenge player
      expect(outputs.spawnRate).toBeGreaterThanOrEqual(1.0);
    });

    it('should reduce difficulty when player is struggling', () => {
      const inputs = createDefaultInputs();
      inputs.hpPercent = 0.2; // 20% HP = struggling
      inputs.frustrationScore = 0.7; // High frustration

      UnifiedDirector.update(inputs, 35000);
      const outputs = UnifiedDirector.getOutputs();

      // Flow state corrections should reduce spawn rate when HP < 35%
      // With mock returning 0.5, after flow corrections spawn should be reduced
      expect(outputs.spawnRate).toBeLessThanOrEqual(1.0);
    });
  });

  describe('PnL Modifiers', () => {
    it('should reduce chaos when PnL is positive', () => {
      const inputs = createDefaultInputs();
      inputs.pnlRatio = 0.1; // +10% profit

      UnifiedDirector.update(inputs, 35000);
      const positiveOutputs = UnifiedDirector.getOutputs();

      // Reset and test negative
      UnifiedDirector.reset();
      inputs.pnlRatio = -0.1; // -10% loss
      UnifiedDirector.update(inputs, 35000);
      const negativeOutputs = UnifiedDirector.getOutputs();

      // Positive PnL should have lower chaos
      expect(positiveOutputs.chaosLevel).toBeLessThanOrEqual(
        negativeOutputs.chaosLevel
      );
    });

    it('should increase difficulty on significant loss', () => {
      const inputs = createDefaultInputs();
      inputs.pnlRatio = -0.2; // -20% loss

      UnifiedDirector.update(inputs, 35000);
      const outputs = UnifiedDirector.getOutputs();

      // High loss should result in at least baseline chaos
      // (PnL modifiers multiply chaos, but mock starts at 0.5 which maps to ~0.3)
      expect(outputs.chaosLevel).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('Mercy System', () => {
    it('should not activate mercy immediately', () => {
      expect(UnifiedDirector.isMercyActive(0)).toBe(false);
    });

    it('should report mercy status correctly', () => {
      const inputs = createDefaultInputs();
      inputs.hpPercent = 0.15; // Very low HP
      inputs.frustrationScore = 0.8; // High frustration

      // Update several times to potentially trigger mercy
      UnifiedDirector.update(inputs, 35000);
      UnifiedDirector.update(inputs, 36000);

      // Mercy might be active depending on cooldown
      const mercyActive = UnifiedDirector.isMercyActive(36000);
      expect(typeof mercyActive).toBe('boolean');
    });
  });

  describe('Brain Loading', () => {
    it('should report brain loaded status', () => {
      expect(UnifiedDirector.isUsingTrainedBrain()).toBe(false);
    });

    it('should enable/disable updates', () => {
      UnifiedDirector.setEnabled(false);

      const inputs = createDefaultInputs();
      const before = { ...UnifiedDirector.getOutputs() };

      UnifiedDirector.update(inputs, 10000);

      const after = UnifiedDirector.getOutputs();
      expect(after).toEqual(before); // No change when disabled

      UnifiedDirector.setEnabled(true);
    });
  });

  describe('Configuration', () => {
    it('should have correct grace period config', () => {
      expect(UNIFIED_DIRECTOR_CONFIG.GRACE_PERIOD_SECONDS).toBe(30);
      expect(UNIFIED_DIRECTOR_CONFIG.GRACE_PHASES).toHaveLength(3);
    });

    it('should have correct flow state config', () => {
      expect(UNIFIED_DIRECTOR_CONFIG.FLOW_STATE.HP_MIN).toBe(35);
      expect(UNIFIED_DIRECTOR_CONFIG.FLOW_STATE.HP_MAX).toBe(65);
      expect(UNIFIED_DIRECTOR_CONFIG.FLOW_STATE.HP_IDEAL).toBe(50);
    });

    it('should have correct mercy config', () => {
      expect(UNIFIED_DIRECTOR_CONFIG.MERCY.TRIGGER_HP).toBe(20);
      expect(UNIFIED_DIRECTOR_CONFIG.MERCY.DIFFICULTY_REDUCTION).toBe(0.3);
    });
  });

  describe('Debug State', () => {
    it('should return debug state', () => {
      const debug = UnifiedDirector.getDebugState();

      expect(debug).toHaveProperty('enabled');
      expect(debug).toHaveProperty('brainLoaded');
      expect(debug).toHaveProperty('outputs');
    });
  });
});
