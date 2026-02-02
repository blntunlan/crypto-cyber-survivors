/**
 * DirectorAdapter Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDirectorAdapter } from '../../services/difficulty/DirectorAdapter';
import type { DifficultyOutput } from '../../services/gameplay/DifficultyManager';

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
    getGameTimeSeconds: vi.fn(() => 0),
    getDeltaTime: vi.fn(() => 16),
    isPaused: vi.fn(() => false),
    setInterval: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../services/indicators/MarketIndicatorService', () => ({
  marketIndicatorService: {
    getState: vi.fn(() => ({
      rsi: 50,
      atrPercent: 0.5,
      normalizedVolume: 0.5,
      priceChange24h: 0,
      whaleTier: 0,
      rsiState: 'neutral',
    })),
  },
}));

vi.mock('../../services/difficulty/DirectorOrchestrator', () => ({
  DirectorOrchestrator: {
    update: vi.fn(() => ({
      spawnRate: 1.0,
      eliteChance: 0.1,
      bossChance: 0,
      enemyDamageMultiplier: 1.0,
      enemySpeedMultiplier: 1.0,
      enemyHealthMultiplier: 1.0,
      bearSpawnWeight: 1.0,
      bullSpawnWeight: 1.0,
      shouldSpawnWhale: false,
      whaleType: null,
      shouldSpawnPortal: false,
      portalType: null,
      flowState: 'flow',
      interventionActive: false,
      debugInfo: 'Test',
    })),
    reset: vi.fn(),
    getDebugState: vi.fn(() => ({})),
  },
}));

// Default old output for testing
const defaultOldOutput: DifficultyOutput = {
  spawnRate: 1.0,
  enemySpeed: 1.0,
  enemyDamage: 1.0,
  enemyHealth: 1.0,
  total: 1.0,
  factors: {
    baseTime: 1.0,
    pnlEffect: 1.0,
    volatility: 1.0,
    levelFactor: 1.0,
    waveMultiplier: 1.0,
    nearDeathMod: 1.0,
    streakBonus: 0,
    momentumMod: 1.0,
    cycleFactor: 1.0,
    leverageDamage: 1.0,
    leverageSpawn: 1.0,
    leverageSpeed: 1.0,
  },
};

describe('DirectorAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create adapter instance', () => {
      const adapter = createDirectorAdapter();
      expect(adapter).toBeDefined();
    });
  });

  describe('process', () => {
    it('should return blended output when enabled', () => {
      const adapter = createDirectorAdapter();

      const output = adapter.process(defaultOldOutput);

      expect(output).toBeDefined();
      expect(output.spawnRate).toBeDefined();
      expect(output.enemySpeed).toBeDefined();
    });

    it('should return old output when disabled', () => {
      const adapter = createDirectorAdapter();
      adapter.setEnabled(false);

      const output = adapter.process(defaultOldOutput);

      expect(output).toEqual(defaultOldOutput);
    });
  });

  describe('player HP tracking', () => {
    it('should track player HP updates', () => {
      const adapter = createDirectorAdapter();

      adapter.updatePlayerHP(50, 100);

      const state = adapter.getDebugState();
      expect(state.playerState).toBeDefined();
    });
  });

  describe('blend factor', () => {
    it('should allow setting blend factor', () => {
      const adapter = createDirectorAdapter();

      adapter.setBlendFactor(0.5);

      const state = adapter.getDebugState();
      expect(state.blendFactor).toBe(0.5);
    });

    it('should clamp blend factor to 0-1', () => {
      const adapter = createDirectorAdapter();

      adapter.setBlendFactor(2.0);
      expect(adapter.getDebugState().blendFactor).toBe(1.0);

      adapter.setBlendFactor(-0.5);
      expect(adapter.getDebugState().blendFactor).toBe(0.0);
    });
  });

  describe('debug state', () => {
    it('should provide debug state', () => {
      const adapter = createDirectorAdapter();

      const debugState = adapter.getDebugState();

      expect(debugState).toHaveProperty('enabled');
      expect(debugState).toHaveProperty('blendFactor');
      expect(debugState).toHaveProperty('playerState');
    });
  });

  describe('reset', () => {
    it('should reset state', () => {
      const adapter = createDirectorAdapter();

      adapter.updatePlayerHP(25, 100);
      adapter.reset();

      const state = adapter.getDebugState();
      const playerState = state.playerState as { hp: number };
      expect(playerState.hp).toBe(100);
    });
  });

  describe('getLastDirectorOutput', () => {
    it('should return null before first process', () => {
      const adapter = createDirectorAdapter();

      const output = adapter.getLastDirectorOutput();

      expect(output).toBeNull();
    });

    it('should return output after process', () => {
      const adapter = createDirectorAdapter();

      adapter.process(defaultOldOutput);
      const output = adapter.getLastDirectorOutput();

      expect(output).not.toBeNull();
    });
  });
});
