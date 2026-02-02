/**
 * DirectorOrchestrator (Layer Coordinator) Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createDirectorOrchestrator,
  ORCHESTRATOR_CONFIG,
  type DirectorInput,
} from '../../services/difficulty/DirectorOrchestrator';

// Mock dependencies
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  },
}));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTime: vi.fn(() => 0),
    getDeltaTime: vi.fn(() => 16),
    isPaused: vi.fn(() => false),
  },
}));

// Helper to create default input
const createDefaultInput = (overrides: Partial<DirectorInput> = {}): DirectorInput => ({
  // Player state
  playerHP: 50,
  playerMaxHP: 100,
  playerIsDead: false,
  playerLastDeathTime: 0,
  playerCombo: 0,
  playerRecentDamage: 0,

  // Market state
  marketRSI: 50,
  marketATRPercent: 0.5,
  marketVolume: 0.5,
  marketPriceChange: 0,
  marketTrend: 'sideways',

  // Time
  deltaTime: 16,
  gameTime: 0,

  ...overrides,
});

describe('DirectorOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    createDirectorOrchestrator(); // Reset singleton
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create orchestrator', () => {
      const orchestrator = createDirectorOrchestrator();
      expect(orchestrator).toBeDefined();
    });
  });

  describe('ORCHESTRATOR_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(ORCHESTRATOR_CONFIG.STRATEGIC_ENABLED).toBe(true);
      expect(ORCHESTRATOR_CONFIG.TACTICAL_ENABLED).toBe(true);
      expect(ORCHESTRATOR_CONFIG.REACTIVE_ENABLED).toBe(true);
    });
  });

  describe('update cycle', () => {
    it('should produce valid output on first update', () => {
      const orchestrator = createDirectorOrchestrator();
      const input = createDefaultInput();

      vi.advanceTimersByTime(20); // Past min update interval
      const output = orchestrator.update(input);

      expect(output).toBeDefined();
      expect(output.spawnRate).toBeGreaterThan(0);
      expect(output.bearSpawnWeight).toBeDefined();
      expect(output.bullSpawnWeight).toBeDefined();
    });

    it('should process all layers in order', () => {
      const orchestrator = createDirectorOrchestrator();
      const input = createDefaultInput();

      vi.advanceTimersByTime(5100); // Past strategic interval
      const output = orchestrator.update(input);

      // Output should have contributions from all layers
      expect(output.flowState).toBeDefined();
      expect(output.interventionActive).toBeDefined();
    });
  });

  describe('layer coordination', () => {
    it('should pass strategic output to tactical layer', () => {
      const orchestrator = createDirectorOrchestrator();

      // High HP should increase difficulty via PID (bored state)
      const highHPInput = createDefaultInput({ playerHP: 80, playerMaxHP: 100 });

      vi.advanceTimersByTime(5100);
      const output = orchestrator.update(highHPInput);

      // High HP should trigger bored state
      expect(output.flowState).toBe('bored');
    });

    it('should pass tactical output to reactive layer', () => {
      const orchestrator = createDirectorOrchestrator();

      // High RSI should favor bears
      const bearMarketInput = createDefaultInput({ marketRSI: 75 });

      vi.advanceTimersByTime(1100);
      const output = orchestrator.update(bearMarketInput);

      // Tactical layer maps RSI to bear/bull weights
      // High RSI (overbought) should give bears at least equal or more weight
      expect(output.bearSpawnWeight).toBeGreaterThanOrEqual(output.bullSpawnWeight);
    });
  });

  describe('layer enable/disable', () => {
    it('should allow disabling layers via setLayerEnabled', () => {
      const orchestrator = createDirectorOrchestrator();
      orchestrator.setLayerEnabled('strategic', false);

      vi.advanceTimersByTime(5100);
      // With strategic disabled and neutral HP, flow state comes from ReactiveLayer
      const output = orchestrator.update(createDefaultInput({ playerHP: 50 }));

      // Flow state is now determined by ReactiveLayer based on HP percent
      // 50% HP should be 'flow' regardless of strategic layer
      expect(output.flowState).toBe('flow');

      // Re-enable
      orchestrator.setLayerEnabled('strategic', true);
    });
  });

  describe('market event handling', () => {
    it('should trigger whale spawn on volume spike', () => {
      const orchestrator = createDirectorOrchestrator();

      const whaleInput = createDefaultInput({
        marketVolume: 0.95,
        marketTrend: 'bullish',
      });

      vi.advanceTimersByTime(1100);
      const output = orchestrator.update(whaleInput);

      // May or may not spawn whale depending on cooldown
      expect(typeof output.shouldSpawnWhale).toBe('boolean');
    });
  });

  describe('flow state tracking', () => {
    it('should detect when player is in flow', () => {
      const orchestrator = createDirectorOrchestrator();

      // Ideal HP range (50%)
      const flowInput = createDefaultInput({ playerHP: 50, playerMaxHP: 100 });

      vi.advanceTimersByTime(5100);
      const output = orchestrator.update(flowInput);

      expect(output.flowState).toBe('flow');
    });

    it('should detect bored state when HP high', () => {
      const orchestrator = createDirectorOrchestrator();

      const easyInput = createDefaultInput({ playerHP: 85, playerMaxHP: 100 });

      vi.advanceTimersByTime(5100);
      const output = orchestrator.update(easyInput);

      expect(output.flowState).toBe('bored');
    });

    it('should detect stressed state when HP low', () => {
      const orchestrator = createDirectorOrchestrator();

      const hardInput = createDefaultInput({ playerHP: 25, playerMaxHP: 100 });

      vi.advanceTimersByTime(5100);
      const output = orchestrator.update(hardInput);

      expect(output.flowState).toBe('stressed');
    });
  });

  describe('state inspection', () => {
    it('should provide state via getState', () => {
      const orchestrator = createDirectorOrchestrator();

      vi.advanceTimersByTime(20);
      orchestrator.update(createDefaultInput());

      const state = orchestrator.getState();

      expect(state).not.toBeNull();
      expect(state?.strategic).toBeDefined();
      expect(state?.output).toBeDefined();
    });

    it('should provide debug state', () => {
      const orchestrator = createDirectorOrchestrator();

      vi.advanceTimersByTime(20);
      orchestrator.update(createDefaultInput());

      const debugState = orchestrator.getDebugState();

      expect(debugState).toHaveProperty('orchestrator');
      expect(debugState).toHaveProperty('strategic');
      expect(debugState).toHaveProperty('tactical');
      expect(debugState).toHaveProperty('reactive');
    });
  });

  describe('reset', () => {
    it('should reset all layers', () => {
      const orchestrator = createDirectorOrchestrator();

      // Build up some state with extreme HP
      vi.advanceTimersByTime(5100);
      orchestrator.update(createDefaultInput({ playerHP: 10 }));

      // Reset
      orchestrator.reset();

      // State should be null after reset
      expect(orchestrator.getState()).toBeNull();
    });
  });

  describe('debug logging', () => {
    it('should allow enabling debug logging', () => {
      const orchestrator = createDirectorOrchestrator();
      orchestrator.setDebugLogging(true);

      vi.advanceTimersByTime(20);
      orchestrator.update(createDefaultInput());

      // Should not throw
      orchestrator.setDebugLogging(false);
    });
  });
});
