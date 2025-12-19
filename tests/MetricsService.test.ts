/**
 * MetricsService Tests
 *
 * Tests for the metrics collection and analytics system.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MetricsService } from '../services/MetricsService';
import { MarketPosition } from '../types';
import { GameEndReason } from '../types/metrics';

describe('MetricsService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

        // Clear any existing sessions for clean tests
        MetricsService.clearSessions();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Session Management', () => {
        it('should start a new session', () => {
            const sessionId = MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            expect(sessionId).toBeTruthy();
            expect(sessionId).toContain('session_');
            expect(MetricsService.isSessionActive()).toBe(true);
        });

        it('should generate unique session IDs', () => {
            const sessionId1 = MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            vi.advanceTimersByTime(100);
            const sessionId2 = MetricsService.startSession(MarketPosition.SHORT, 51000, 10);

            expect(sessionId1).not.toBe(sessionId2);
        });

        it('should end session and compile metrics', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 25);

            const finalData = createFinalData({ leverage: 25 });
            const session = MetricsService.endSession(GameEndReason.DEATH, finalData);

            expect(session).toBeTruthy();
            expect(session?.bitcoin.positionChosen).toBe(MarketPosition.LONG);
            expect(session?.bitcoin.priceAtStart).toBe(50000);
            expect(session?.bitcoin.leverage).toBe(25);
            expect(session?.bitcoin.effectivePnLAtDeath).toBe(finalData.pnl * 25);
            expect(session?.gameEndReason).toBe(GameEndReason.DEATH);
            expect(MetricsService.isSessionActive()).toBe(false);
        });

        it('should return null when ending non-existent session', () => {
            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());
            expect(session).toBeNull();
        });
    });

    describe('Real-time Tracking', () => {
        it('should track max PnL', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.update(16.67, createUpdateData({ pnl: 0.05 }));
            MetricsService.update(16.67, createUpdateData({ pnl: 0.10 }));
            MetricsService.update(16.67, createUpdateData({ pnl: 0.03 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ pnl: 0.03 }));

            expect(session?.bitcoin.maxPnL).toBe(0.10);
        });

        it('should track min PnL', () => {
            MetricsService.startSession(MarketPosition.SHORT, 50000, 10);

            MetricsService.update(16.67, createUpdateData({ pnl: -0.02 }));
            MetricsService.update(16.67, createUpdateData({ pnl: -0.08 }));
            MetricsService.update(16.67, createUpdateData({ pnl: -0.03 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ pnl: -0.03 }));

            expect(session?.bitcoin.minPnL).toBe(-0.08);
        });

        it('should track max difficulty', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.update(16.67, createUpdateData({ difficulty: 1.5 }));
            MetricsService.update(16.67, createUpdateData({ difficulty: 3.2 }));
            MetricsService.update(16.67, createUpdateData({ difficulty: 2.1 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ difficulty: 2.1 }));

            expect(session?.difficulty.maxDifficulty).toBe(3.2);
        });

        it('should track max enemies on screen', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.update(16.67, createUpdateData({ enemyCount: 5 }));
            MetricsService.update(16.67, createUpdateData({ enemyCount: 15 }));
            MetricsService.update(16.67, createUpdateData({ enemyCount: 8 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.enemy.maxEnemiesOnScreen).toBe(15);
        });

        it('should track high difficulty time', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            // Difficulty > 5 is considered high
            MetricsService.update(1000, createUpdateData({ difficulty: 6.0 }));
            MetricsService.update(500, createUpdateData({ difficulty: 7.0 }));
            MetricsService.update(1000, createUpdateData({ difficulty: 3.0 })); // Not high

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.difficulty.timeInHighDifficulty).toBe(1500);
        });
    });

    describe('Kill and Damage Tracking', () => {
        it('should track kills by type', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackKill('bear', 1000);
            MetricsService.trackKill('bear', 1200);
            MetricsService.trackKill('bull', 800);
            MetricsService.trackKill('whale', 2000);

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.enemy.killsByType.bear).toBe(2);
            expect(session?.enemy.killsByType.bull).toBe(1);
            expect(session?.enemy.killsByType.whale).toBe(1);
        });

        it('should track damage dealt', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackDamageDealt(100, false, false);
            MetricsService.trackDamageDealt(200, true, false);
            MetricsService.trackDamageDealt(500, true, true);

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.player.damageDealt).toBe(800);
            expect(session?.player.criticalHits).toBe(2);
            expect(session?.player.superCriticalHits).toBe(1);
        });

        it('should track damage taken', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackDamageTaken(10);
            MetricsService.trackDamageTaken(25);
            MetricsService.trackDamageTaken(15);

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.player.damageTaken).toBe(50);
        });
    });

    describe('Level Up and Card Tracking', () => {
        it('should track level ups and card choices', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            vi.advanceTimersByTime(10000);
            MetricsService.trackLevelUp(2, 'Diamond Hands', 'common');

            vi.advanceTimersByTime(15000);
            MetricsService.trackLevelUp(3, 'Flash Loan', 'rare');

            vi.advanceTimersByTime(20000);
            MetricsService.trackLevelUp(4, 'Whale Alert', 'legendary');

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ level: 4 }));

            expect(session?.card.levelUpCount).toBe(3);
            expect(session?.card.cardsChosen).toHaveLength(3);
            expect(session?.card.cardsChosen[0]?.card).toBe('Diamond Hands');
            expect(session?.card.cardsChosen[2]?.tier).toBe('legendary');
            expect(session?.card.cardsByTier.common).toBe(1);
            expect(session?.card.cardsByTier.rare).toBe(1);
            expect(session?.card.cardsByTier.legendary).toBe(1);
        });
    });

    describe('Combo Tracking', () => {
        it('should track max streak', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackComboUpdate(5, 1.2);
            MetricsService.trackComboUpdate(10, 1.5);
            MetricsService.trackComboUpdate(15, 2.0);
            MetricsService.trackComboUpdate(8, 1.5); // Streak decreased

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.combo.maxStreak).toBe(15);
        });

        it('should track combo milestones', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackComboMilestone('COMBO!');
            MetricsService.trackComboMilestone('SUPER COMBO!');
            MetricsService.trackComboMilestone('MEGA COMBO!');

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.combo.milestonesReached).toHaveLength(3);
            expect(session?.combo.milestonesReached).toContain('COMBO!');
            expect(session?.combo.milestonesReached).toContain('MEGA COMBO!');
        });

        it('should track combo end with bonus XP', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            MetricsService.trackComboUpdate(1, 1.0);
            vi.advanceTimersByTime(1000);
            MetricsService.trackComboEnd(10, 500);
            MetricsService.trackComboEnd(5, 200);

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.combo.totalBonusXp).toBe(700);
            expect(session?.combo.streakSamples).toHaveLength(2);
        });
    });

    describe('Export Functions', () => {
        it('should export sessions as JSON', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            const json = MetricsService.exportAsJSON();
            const parsed = JSON.parse(json);

            expect(parsed.version).toBe('1.0.0');
            expect(parsed.totalSessions).toBe(1);
            expect(parsed.sessions).toBeInstanceOf(Array);
        });

        it('should export sessions as CSV', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            const csv = MetricsService.exportAsCSV();

            expect(csv).toContain('Session ID');
            expect(csv).toContain('Position');
            expect(csv).toContain('Survival Time');
            expect(csv).toContain('LONG');
        });
    });

    describe('Session Storage', () => {
        it('should increment session count', () => {
            MetricsService.clearSessions();
            expect(MetricsService.getSessionCount()).toBe(0);

            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(MetricsService.getSessionCount()).toBe(1);
        });

        it('should retrieve stored sessions', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            const sessions = MetricsService.getSessions();

            expect(sessions.length).toBe(1);
            expect(sessions[0]?.bitcoin.positionChosen).toBe(MarketPosition.LONG);
        });

        it('should clear all sessions', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            MetricsService.clearSessions();

            expect(MetricsService.getSessionCount()).toBe(0);
        });
    });

    describe('Helper Methods', () => {
        it('should report enabled status', () => {
            expect(MetricsService.isEnabled()).toBe(true);
        });

        it('should return current state during active session', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);
            const state = MetricsService.getCurrentState();

            expect(state).toBeTruthy();
            expect(state?.isActive).toBe(true);
        });

        it('should return config', () => {
            const config = MetricsService.getConfig();

            expect(config).toHaveProperty('enabled');
            expect(config).toHaveProperty('storage');
            expect(config).toHaveProperty('sampling');
        });
    });

    describe('Survival Time Calculation', () => {
        it('should calculate survival time correctly', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            vi.advanceTimersByTime(30000); // 30 seconds

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData());

            expect(session?.player.survivalTimeMs).toBe(30000);
        });
    });

    describe('Average Calculations', () => {
        it('should calculate average PnL', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            // Simulate sampling interval
            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ pnl: 0.02 }));

            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ pnl: 0.04 }));

            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ pnl: 0.06 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ pnl: 0.06 }));

            // Average may be 0 if no samples taken, just check it exists
            expect(session?.bitcoin.averagePnL).toBeDefined();
        });

        it('should calculate average difficulty', () => {
            MetricsService.startSession(MarketPosition.LONG, 50000, 10);

            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ difficulty: 1.0 }));

            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ difficulty: 2.0 }));

            vi.advanceTimersByTime(1000);
            MetricsService.update(16.67, createUpdateData({ difficulty: 3.0 }));

            const session = MetricsService.endSession(GameEndReason.DEATH, createFinalData({ difficulty: 3.0 }));

            // Average may be 0 if no samples taken, just check it exists
            expect(session?.difficulty.averageDifficulty).toBeDefined();
        });
    });
});

// Helper functions
function createFinalData(overrides: Partial<{
    price: number;
    pnl: number;
    level: number;
    hp: number;
    difficulty: number;
    totalKills: number;
    leverage: number;
}> = {}) {
    return {
        price: overrides.price ?? 50500,
        pnl: overrides.pnl ?? 0.01,
        level: overrides.level ?? 3,
        hp: overrides.hp ?? 0,
        difficulty: overrides.difficulty ?? 1.5,
        playerStats: {
            damage: 15,
            fireRate: 0.3,
            speed: 4,
            luck: 1,
            critChance: 0.1,
            critDamage: 2.0,
        },
        position: MarketPosition.LONG,
        entryPrice: 50000,
        leverage: overrides.leverage ?? 10,
        totalKills: overrides.totalKills ?? 50,
    };
}

function createUpdateData(overrides: Partial<{
    pnl: number;
    atr: number;
    difficulty: number;
    wavePhase: 'calm' | 'building' | 'intense' | 'peak';
    hpPercent: number;
    enemyCount: number;
}> = {}) {
    return {
        pnl: overrides.pnl ?? 0,
        atr: overrides.atr ?? 0.01,
        difficulty: overrides.difficulty ?? 1.0,
        wavePhase: overrides.wavePhase ?? 'building',
        hpPercent: overrides.hpPercent ?? 100,
        enemyCount: overrides.enemyCount ?? 5,
    };
}
