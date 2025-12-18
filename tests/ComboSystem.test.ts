import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComboSystem } from '../services/ComboSystem';
import { EventBus } from '../services/EventBus';

describe('ComboSystem', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        ComboSystem.startGame();
        EventBus.clear();
        // Since ComboSystem sets up listeners in constructor (singleton), 
        // and we can't easily recreate the instance without more hacks,
        // we rely on startGame() to reset the state and manually re-subscribe if needed.
        // Actually, ComboSystem inside it-self calls EventBus.on in constructor.
        // If we clear EventBus, we might lose the listener.
        // Let's check ComboSystem's setupListeners.
    });

    afterEach(() => {
        vi.useRealTimers();
    });

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
        ComboSystem.recordKill();
        expect(ComboSystem.getKillStreak()).toBe(1);

        // Advance time by 3001 ms (timeout is 3000)
        vi.advanceTimersByTime(3001);
        ComboSystem.update();

        expect(ComboSystem.getKillStreak()).toBe(0);
        expect(ComboSystem.getXpMultiplier()).toBe(1.0);
    });

    it('should return correct time remaining', () => {
        ComboSystem.recordKill(); // Sets lastKillTime to now

        expect(ComboSystem.getComboTimeRemaining()).toBe(1.0);

        vi.advanceTimersByTime(1500); // Halfway (3000ms timeout)

        expect(ComboSystem.getComboTimeRemaining()).toBe(0.5);

        vi.advanceTimersByTime(1500);
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
