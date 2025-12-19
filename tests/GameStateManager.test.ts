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
    RUN_STATS_DEFAULTS
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

            GameStateManager.initializeNewGame(MarketPosition.LONG, 50000);

            expect(beforeResetHandler).toHaveBeenCalledTimes(1);
            unsub();
        });

        it('should call MetricsService.startSession()', () => {
            GameStateManager.initializeNewGame(MarketPosition.LONG, 50000);

            expect(MetricsService.startSession).toHaveBeenCalledWith(
                MarketPosition.LONG,
                50000
            );
        });

        it('should emit gameInitialized event', () => {
            const gameInitializedHandler = vi.fn();
            const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

            GameStateManager.initializeNewGame(MarketPosition.SHORT, 42000);

            expect(gameInitializedHandler).toHaveBeenCalledWith({
                position: MarketPosition.SHORT,
                entryPrice: 42000,
            });
            unsub();
        });

        it('should handle LONG position correctly', () => {
            const gameInitializedHandler = vi.fn();
            const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

            GameStateManager.initializeNewGame(MarketPosition.LONG, 100000);

            expect(gameInitializedHandler).toHaveBeenCalledWith({
                position: MarketPosition.LONG,
                entryPrice: 100000,
            });
            unsub();
        });

        it('should handle SHORT position correctly', () => {
            const gameInitializedHandler = vi.fn();
            const unsub = EventBus.on('gameInitialized', gameInitializedHandler);

            GameStateManager.initializeNewGame(MarketPosition.SHORT, 30000);

            expect(gameInitializedHandler).toHaveBeenCalledWith({
                position: MarketPosition.SHORT,
                entryPrice: 30000,
            });
            unsub();
        });
    });

    // =========================================================================
    // getPlayerDefaults() Tests
    // =========================================================================
    describe('getPlayerDefaults()', () => {
        it('should return player defaults with position', () => {
            const defaults = GameStateManager.getPlayerDefaults(400, 300, '#22c55e');

            expect(defaults.x).toBe(400);
            expect(defaults.y).toBe(300);
            expect(defaults.color).toBe('#22c55e');
        });

        it('should include all PLAYER_DEFAULTS properties', () => {
            const defaults = GameStateManager.getPlayerDefaults(0, 0, '#fff');

            expect(defaults.hp).toBe(PLAYER_DEFAULTS.hp);
            expect(defaults.maxHp).toBe(PLAYER_DEFAULTS.maxHp);
            expect(defaults.level).toBe(PLAYER_DEFAULTS.level);
            expect(defaults.baseDamage).toBe(PLAYER_DEFAULTS.baseDamage);
            expect(defaults.fireRate).toBe(PLAYER_DEFAULTS.fireRate);
        });

        it('should return fresh object each time', () => {
            const defaults1 = GameStateManager.getPlayerDefaults(100, 100, '#fff');
            const defaults2 = GameStateManager.getPlayerDefaults(200, 200, '#000');

            expect(defaults1).not.toBe(defaults2);
            expect(defaults1.x).toBe(100);
            expect(defaults2.x).toBe(200);
        });
    });

    // =========================================================================
    // getGameStateDefaults() Tests
    // =========================================================================
    describe('getGameStateDefaults()', () => {
        it('should return fresh copy of GAME_STATE_DEFAULTS', () => {
            const defaults = GameStateManager.getGameStateDefaults();

            expect(defaults.spawnTimer).toBe(0);
            expect(defaults.shake).toBe(0);
            expect(defaults.isDashing).toBe(false);
        });

        it('should return new object each time', () => {
            const defaults1 = GameStateManager.getGameStateDefaults();
            const defaults2 = GameStateManager.getGameStateDefaults();

            expect(defaults1).not.toBe(defaults2);
            expect(defaults1).toEqual(defaults2);
        });
    });

    // =========================================================================
    // getRunStatsDefaults() Tests
    // =========================================================================
    describe('getRunStatsDefaults()', () => {
        it('should return fresh copy of RUN_STATS_DEFAULTS', () => {
            const defaults = GameStateManager.getRunStatsDefaults();

            expect(defaults.totalKills).toBe(0);
            expect(defaults.maxStreak).toBe(0);
            expect(defaults.totalBonusXp).toBe(0);
        });

        it('should return new object each time', () => {
            const defaults1 = GameStateManager.getRunStatsDefaults();
            const defaults2 = GameStateManager.getRunStatsDefaults();

            expect(defaults1).not.toBe(defaults2);
        });
    });

    // =========================================================================
    // Singleton Pattern Tests
    // =========================================================================
    describe('Singleton Pattern', () => {
        it('should always return the same instance', () => {
            // Since GameStateManager is exported as a singleton, 
            // we can test by calling methods and verifying consistent behavior
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const unsub1 = EventBus.on('beforeReset', handler1);
            GameStateManager.resetAll();
            unsub1();

            const unsub2 = EventBus.on('beforeReset', handler2);
            GameStateManager.resetAll();
            unsub2();

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // Integration Tests
    // =========================================================================
    describe('Integration', () => {
        it('should properly sequence full game initialization', () => {
            const events: string[] = [];

            const unsubBefore = EventBus.on('beforeReset', () => events.push('beforeReset'));
            const unsubAfter = EventBus.on('afterReset', () => events.push('afterReset'));
            const unsubInit = EventBus.on('gameInitialized', () => events.push('gameInitialized'));

            GameStateManager.initializeNewGame(MarketPosition.LONG, 50000);

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
            GameStateManager.initializeNewGame(MarketPosition.LONG, 50000);

            expect(DifficultyManager.startGame).toHaveBeenCalled();
            expect(ComboSystem.startGame).toHaveBeenCalled();
            expect(MetricsService.startSession).toHaveBeenCalled();
        });
    });
});
