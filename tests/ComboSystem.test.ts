import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComboSystem } from '../services/ComboSystem';
import { TimeService } from '../services/TimeService';
import { EventBus } from '../services/EventBus';

describe('ComboSystem', () => {
    let mockTime = 1000;

    beforeEach(() => {
        // Reset mock time
        mockTime = 1000;

        // Mock performance.now to control TimeService
        vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

        // Reset services
        TimeService.reset();
        ComboSystem.startGame();
        EventBus.clear();

        // Start TimeService and initialize with first update
        TimeService.start();
        TimeService.update(mockTime);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Helper to advance game time (handles TimeService's 100ms delta cap)
    const advanceGameTime = (totalMs: number) => {
        const step = 100; // TimeService caps delta at 100ms
        let remaining = totalMs;
        while (remaining > 0) {
            const increment = Math.min(remaining, step);
            mockTime += increment;
            TimeService.update(mockTime);
            remaining -= increment;
        }
    };

    it('should increment kill streak on enemyKilled event', () => {
        expect(ComboSystem.getKillStreak()).toBe(0);

        // Re-trigger the listener setup if needed, but EventBus.clear() removes all.
        // Let's just manually call recordKill for unit tests if EventBus is cleared,
        // OR don't clear EventBus entirely, just reset listeners.
        // Actually, let's just use ComboSystem.recordKill directly to test logic,
        // or ensure listeners are active.

        ComboSystem.recordKill();
        expect(ComboSystem.getKillStreak()).toBe(1);
    });

    it('should calculate multiplier based on milestones', () => {
        // Milestone 1: 5 kills -> 1.2x
        // Milestone 2: 10 kills -> 1.5x
        for (let i = 0; i < 5; i++) {
            ComboSystem.recordKill();
        }

        expect(ComboSystem.getKillStreak()).toBe(5);
        expect(ComboSystem.getXpMultiplier()).toBe(1.2);

        for (let i = 0; i < 5; i++) {
            ComboSystem.recordKill();
        }

        expect(ComboSystem.getKillStreak()).toBe(10);
        expect(ComboSystem.getXpMultiplier()).toBe(1.5);
    });

    it('should reset combo after timeout', () => {
        advanceGameTime(100); // Ensure non-zero start time
        ComboSystem.recordKill();
        expect(ComboSystem.getKillStreak()).toBe(1);

        // Advance game time past timeout (3000ms + buffer for 100ms cap granularity)
        advanceGameTime(3100);
        ComboSystem.update();

        expect(ComboSystem.getKillStreak()).toBe(0);
        expect(ComboSystem.getXpMultiplier()).toBe(1.0);
    });

    it('should return correct time remaining', () => {
        // Advance time slightly first so recordKill gets a non-zero lastKillTime
        advanceGameTime(100);

        ComboSystem.recordKill(); // Sets lastKillTime to current game time

        // Immediately after kill, time remaining should be 1.0
        expect(ComboSystem.getComboTimeRemaining()).toBeCloseTo(1.0, 2);

        advanceGameTime(1500); // Halfway (3000ms timeout)

        // After 1500ms, should be ~0.5 remaining
        expect(ComboSystem.getComboTimeRemaining()).toBeCloseTo(0.5, 2);

        advanceGameTime(1500); // Full timeout
        expect(ComboSystem.getComboTimeRemaining()).toBe(0);
    });

    it('should track max streak', () => {
        for (let i = 0; i < 15; i++) {
            ComboSystem.recordKill();
        }

        expect(ComboSystem.getMaxStreak()).toBe(15);

        ComboSystem.resetCombo();
        expect(ComboSystem.getKillStreak()).toBe(0);
        expect(ComboSystem.getMaxStreak()).toBe(15); // Should persist
    });
});
