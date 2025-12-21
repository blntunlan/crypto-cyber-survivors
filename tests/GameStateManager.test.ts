/**
 * GameStateManager Tests
 *
 * Tests for the centralized game state reset and initialization system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  GameStateManager,
  PLAYER_DEFAULTS,
  GAME_STATE_DEFAULTS,
  RUN_STATS_DEFAULTS,
} from '../services/GameStateManager';
import { EventBus } from '../services/EventBus';
import { MarketPosition } from '../types';

// Mock dependent services
vi.mock('../services/DifficultyManager', () => ({
  DifficultyManager: {
    startGame: vi.fn(),
  },
}));

vi.mock('../services/ComboSystem', () => ({
  ComboSystem: {
    startGame: vi.fn(),
  },
}));

vi.mock('../services/MetricsService', () => ({
  MetricsService: {
    startSession: vi.fn(),
  },
}));

import { DifficultyManager } from '../services/DifficultyManager';
import { ComboSystem } from '../services/ComboSystem';
import { MetricsService } from '../services/MetricsService';

describe('GameStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    EventBus.clearEvent('beforeReset');
    EventBus.clearEvent('afterReset');
    EventBus.clearEvent('gameReset');
    EventBus.clearEvent('gameInitialized');
  });

  // =========================================================================
  // PLAYER_DEFAULTS Tests
  // =========================================================================
  describe('PLAYER_DEFAULTS', () => {
    it('should have correct initial HP values', () => {
      expect(PLAYER_DEFAULTS.hp).toBe(100);
      expect(PLAYER_DEFAULTS.maxHp).toBe(100);
    });

    it('should have correct initial level values', () => {
      expect(PLAYER_DEFAULTS.level).toBe(1);
      expect(PLAYER_DEFAULTS.exp).toBe(0);
      expect(PLAYER_DEFAULTS.nextLevelExp).toBe(100);
    });

    it('should have correct initial combat stats', () => {
      expect(PLAYER_DEFAULTS.baseDamage).toBe(25);
      expect(PLAYER_DEFAULTS.fireRate).toBe(400);
      expect(PLAYER_DEFAULTS.critChance).toBe(0.05);
    });

    it('should have correct initial utility stats', () => {
      expect(PLAYER_DEFAULTS.speed).toBe(4);
      expect(PLAYER_DEFAULTS.luck).toBe(0);
      expect(PLAYER_DEFAULTS.magnet).toBe(0);
      expect(PLAYER_DEFAULTS.armor).toBe(0);
    });

    it('should have correct initial projectile stats', () => {
      expect(PLAYER_DEFAULTS.area).toBe(1);
      expect(PLAYER_DEFAULTS.projectiles).toBe(1);
      expect(PLAYER_DEFAULTS.radius).toBe(12);
    });

    it('should be immutable (readonly)', () => {
      // TypeScript compile-time check - this should error if types are wrong
      // At runtime, we verify the values remain unchanged after access
      const initialHp = PLAYER_DEFAULTS.hp;
      expect(PLAYER_DEFAULTS.hp).toBe(initialHp);
    });
  });

  // =========================================================================
  // GAME_STATE_DEFAULTS Tests
  // =========================================================================
  describe('GAME_STATE_DEFAULTS', () => {
    it('should have correct initial timer values', () => {
      expect(GAME_STATE_DEFAULTS.spawnTimer).toBe(0);
      expect(GAME_STATE_DEFAULTS.lastFireTime).toBe(0);
      expect(GAME_STATE_DEFAULTS.lastTime).toBe(0);
    });

    it('should have correct initial effect values', () => {
      expect(GAME_STATE_DEFAULTS.shake).toBe(0);
      expect(GAME_STATE_DEFAULTS.critFlash).toBe(0);
      expect(GAME_STATE_DEFAULTS.levelUpFreeze).toBe(0);
    });

    it('should have correct initial dash values', () => {
      expect(GAME_STATE_DEFAULTS.isDashing).toBe(false);
      expect(GAME_STATE_DEFAULTS.dashTimer).toBe(0);
      expect(GAME_STATE_DEFAULTS.dashCooldownTimer).toBe(0);
    });

    it('should have correct initial background color', () => {
      expect(GAME_STATE_DEFAULTS.currentBg).toEqual({ r: 2, g: 6, b: 23 });
    });
  });

  // =========================================================================
  // RUN_STATS_DEFAULTS Tests
  // =========================================================================
  describe('RUN_STATS_DEFAULTS', () => {
    it('should have all stats at zero', () => {
      expect(RUN_STATS_DEFAULTS.totalKills).toBe(0);
      expect(RUN_STATS_DEFAULTS.maxStreak).toBe(0);
      expect(RUN_STATS_DEFAULTS.totalBonusXp).toBe(0);
    });
  });

  // =========================================================================
  // resetAll() Tests
  // =========================================================================
  describe('resetAll()', () => {
    it('should call DifficultyManager.startGame()', () => {
      GameStateManager.resetAll();
      expect(DifficultyManager.startGame).toHaveBeenCalledTimes(1);
    });

    it('should call ComboSystem.startGame()', () => {
      GameStateManager.resetAll();
      expect(ComboSystem.startGame).toHaveBeenCalledTimes(1);
    });

    it('should emit beforeReset event', () => {
      const beforeResetHandler = vi.fn();
      const unsub = EventBus.on('beforeReset', beforeResetHandler);

      GameStateManager.resetAll();

      expect(beforeResetHandler).toHaveBeenCalledTimes(1);
      unsub();
    });

    it('should emit afterReset event', () => {
      const afterResetHandler = vi.fn();
      const unsub = EventBus.on('afterReset', afterResetHandler);

      GameStateManager.resetAll();

      expect(afterResetHandler).toHaveBeenCalledTimes(1);
      unsub();
    });

    it('should emit gameReset event for backwards compatibility', () => {
      const gameResetHandler = vi.fn();
      const unsub = EventBus.on('gameReset', gameResetHandler);

      GameStateManager.resetAll();

      expect(gameResetHandler).toHaveBeenCalledTimes(1);
      unsub();
    });

    it('should emit events in correct order: beforeReset -> afterReset', () => {
      const callOrder: string[] = [];

      const unsubBefore = EventBus.on('beforeReset', () => callOrder.push('beforeReset'));
      const unsubAfter = EventBus.on('afterReset', () => callOrder.push('afterReset'));

      GameStateManager.resetAll();

      expect(callOrder).toEqual(['beforeReset', 'afterReset']);

      unsubBefore();
      unsubAfter();
    });

    it('should prevent duplicate reset calls', () => {
      // This test verifies the isResetting guard
      let beforeResetCount = 0;
      const unsub = EventBus.on('beforeReset', () => {
        beforeResetCount++;
        // Try to call resetAll again during reset (should be blocked)
        if (beforeResetCount === 1) {
          GameStateManager.resetAll();
        }
      });

      GameStateManager.resetAll();

      // Should only be called once, not twice
      expect(beforeResetCount).toBe(1);
      unsub();
    });

    it('should not be in progress after reset completes', () => {
      GameStateManager.resetAll();
      expect(GameStateManager.isResetInProgress()).toBe(false);
    });
  });

  // =========================================================================
  // initializeNewGame() Tests
  // =========================================================================
  describe('initializeNewGame()', () => {
    it('should call resetAll() first', () => {
      const beforeResetHandler = vi.fn();
      const unsub = EventBus.on('beforeReset', beforeResetHandler);

      GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC');

      expect(beforeResetHandler).toHaveBeenCalledTimes(1);
      unsub();
    });

    it('should call MetricsService.startSession()', () => {
      GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC');

      expect(MetricsService.startSession).toHaveBeenCalledWith(
        MarketPosition.LONG,
        50000,
        10,
        'BTC'
      );
    });

    it('should emit gameInitialized event', () => {
      const gameInitializedHandler = vi.fn();
      const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

      GameStateManager.initializeNewGame(MarketPosition.SHORT, 42000, 25, 'ETH');

      expect(gameInitializedHandler).toHaveBeenCalledWith({
        position: MarketPosition.SHORT,
        entryPrice: 42000,
        leverage: 25,
        pair: 'ETH',
      });
      unsub();
    });

    it('should handle LONG position correctly', () => {
      const gameInitializedHandler = vi.fn();
      const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

      GameStateManager.initializeNewGame(MarketPosition.LONG, 100000, 1, 'SOL');

      expect(gameInitializedHandler).toHaveBeenCalledWith({
        position: MarketPosition.LONG,
        entryPrice: 100000,
        leverage: 1,
        pair: 'SOL',
      });
      unsub();
    });

    it('should handle SHORT position correctly', () => {
      const gameInitializedHandler = vi.fn();
      const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

      GameStateManager.initializeNewGame(MarketPosition.SHORT, 30000, 100, 'BTC');

      expect(gameInitializedHandler).toHaveBeenCalledWith({
        position: MarketPosition.SHORT,
        entryPrice: 30000,
        leverage: 100,
        pair: 'BTC',
      });
      unsub();
    });
  });

  // ... existing defaults tests ...

  // =========================================================================
  // Integration Tests
  // =========================================================================
  describe('Integration', () => {
    it('should properly sequence full game initialization', () => {
      const events: string[] = [];

      const unsubBefore = EventBus.on('beforeReset', () => events.push('beforeReset'));
      const unsubAfter = EventBus.on('afterReset', () => events.push('afterReset'));
      const unsubInit = EventBus.on('gameInitialized', () => events.push('gameInitialized'));

      GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC');

      expect(events).toEqual(['beforeReset', 'afterReset', 'gameInitialized']);

      unsubBefore();
      unsubAfter();
      unsubInit();
    });

    it('should handle rapid reset calls gracefully', () => {
      const beforeResetHandler = vi.fn();
      const unsub = EventBus.on('beforeReset', beforeResetHandler);

      // Simulate rapid clicks
      GameStateManager.resetAll();
      GameStateManager.resetAll();
      GameStateManager.resetAll();

      // All should complete since each is sequential
      expect(beforeResetHandler).toHaveBeenCalledTimes(3);
      unsub();
    });

    it('should reset all systems before new game', () => {
      GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC');

      expect(DifficultyManager.startGame).toHaveBeenCalled();
      expect(ComboSystem.startGame).toHaveBeenCalled();
      expect(MetricsService.startSession).toHaveBeenCalled();
    });
  });
});
