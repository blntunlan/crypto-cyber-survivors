/**
 * usePauseBudget Hook Tests
 *
 * Tests for the competitive mode pause budget system:
 * - 10 seconds max pause per minute
 * - No accumulation
 * - Auto-resume when budget depleted
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePauseBudget } from '../../hooks/usePauseBudget';
import { GameMode } from '../../types/gameMode';
import { GameStatus } from '../../types';

describe('usePauseBudget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Casual Mode', () => {
    it('should return null budget for casual mode (unlimited pause)', () => {
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.CASUAL, GameStatus.PLAYING)
      );

      expect(result.current.remainingSeconds).toBeNull();
      expect(result.current.isLimited).toBe(false);
    });

    it('should not trigger auto-resume in casual mode', () => {
      const onAutoResume = vi.fn();
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.CASUAL, GameStatus.PAUSED, onAutoResume)
      );

      // Wait 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(onAutoResume).not.toHaveBeenCalled();
      expect(result.current.remainingSeconds).toBeNull();
    });
  });

  describe('Competitive Mode', () => {
    it('should start with 10 seconds budget', () => {
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PLAYING)
      );

      expect(result.current.remainingSeconds).toBe(10);
      expect(result.current.maxSeconds).toBe(10);
      expect(result.current.isLimited).toBe(true);
    });

    it('should countdown when paused', () => {
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PAUSED)
      );

      expect(result.current.remainingSeconds).toBe(10);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.remainingSeconds).toBeCloseTo(7, 0);
    });

    it('should call onAutoResume when budget depleted', () => {
      const onAutoResume = vi.fn();
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PAUSED, onAutoResume)
      );

      // Wait 10+ seconds to fully deplete budget
      act(() => {
        vi.advanceTimersByTime(10500);
      });

      // Check remaining is 0
      expect(result.current.remainingSeconds).toBe(0);
      expect(onAutoResume).toHaveBeenCalledTimes(1);
    });

    it('should not countdown when playing', () => {
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PLAYING)
      );

      // Deplete some budget first
      const { rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Switch to playing - should stop countdown
      rerender({ status: GameStatus.PLAYING });

      const budgetBeforeWait = result.current.remainingSeconds;

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Budget should not decrease while playing
      expect(result.current.remainingSeconds).toBe(budgetBeforeWait);
    });

    it('should recharge budget after 60 seconds of playing', () => {
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // Use 5 seconds of pause
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.remainingSeconds).toBeCloseTo(5, 0);

      // Resume playing
      rerender({ status: GameStatus.PLAYING });

      // Wait 60 seconds while playing
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Budget should be recharged to 10
      expect(result.current.remainingSeconds).toBe(10);
    });

    it('should NOT accumulate beyond 10 seconds', () => {
      const { result } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PLAYING } }
      );

      // Play for 2 minutes without pausing
      act(() => {
        vi.advanceTimersByTime(120000);
      });

      // Should still be capped at 10 seconds
      expect(result.current.remainingSeconds).toBe(10);
    });

    it('should reset budget on game reset', () => {
      const { result } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // Use some budget
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(result.current.remainingSeconds).toBeCloseTo(2, 0);

      // Reset to menu
      const { result: newResult } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.MENU)
      );

      expect(newResult.current.remainingSeconds).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid pause/resume toggles', () => {
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PLAYING } }
      );

      // Rapid toggles
      for (let i = 0; i < 5; i++) {
        rerender({ status: GameStatus.PAUSED });
        act(() => {
          vi.advanceTimersByTime(100);
        });
        rerender({ status: GameStatus.PLAYING });
      }

      // Should have used ~0.5 seconds
      expect(result.current.remainingSeconds).toBeGreaterThan(9);
      expect(result.current.remainingSeconds).toBeLessThanOrEqual(10);
    });

    it('should return recharge progress', () => {
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // Use all budget
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      rerender({ status: GameStatus.PLAYING });

      // Wait 30 seconds (half recharge)
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.rechargeProgress).toBeCloseTo(0.5, 1);
    });

    it('should immediately Resume if paused while budget is 0 (recharging)', () => {
      const onAutoResume = vi.fn();
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status, onAutoResume),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // 1. Deplete budget
      act(() => {
        vi.advanceTimersByTime(11000); // 11 seconds (max is 10)
      });

      expect(result.current.remainingSeconds).toBe(0);
      expect(onAutoResume).toHaveBeenCalledTimes(1);

      // 2. Simulate auto-resume behavior (switch to PLAYING)
      rerender({ status: GameStatus.PLAYING });

      // 3. User immediately pauses again (while budget is still 0/recharging)
      rerender({ status: GameStatus.PAUSED });

      // Should IMMEDIATELY trigger auto-resume again
      expect(onAutoResume).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tab Visibility (Anti-Abuse & Background)', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
        writable: true,
      });
    });

    /** Helper: toggle document.hidden and dispatch visibilitychange */
    const setHidden = (hidden: boolean) => {
      act(() => {
        Object.defineProperty(document, 'hidden', {
          value: hidden,
          configurable: true,
          writable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    };

    it('should consume the budget while hidden (anti-abuse) but defer auto-resume to visible', () => {
      const onAutoResume = vi.fn();
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PAUSED, onAutoResume)
      );

      // 2s visible countdown -> budget ~8
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.remainingSeconds).toBeCloseTo(8, 0);

      // Hide tab; budget must STILL drain in wall-clock time so backgrounding
      // (mobile app-switch / desktop alt-tab) cannot be used to stall for free.
      setHidden(true);
      act(() => {
        vi.advanceTimersByTime(10000); // depletes the remaining 8s + 2s
      });
      expect(result.current.remainingSeconds).toBe(0);

      // Auto-resume must NOT fire while hidden (RAF suspended -> no delta jump)
      expect(onAutoResume).not.toHaveBeenCalled();

      // On return to visible, the deferred auto-resume fires cleanly
      setHidden(false);
      expect(onAutoResume).toHaveBeenCalledTimes(1);
    });

    it('should fire deferred auto-resume when becoming visible with budget already at 0', () => {
      const onAutoResume = vi.fn();
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status, onAutoResume),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // 1. Deplete budget to 0 while visible -> auto-resume fires immediately
      act(() => {
        vi.advanceTimersByTime(10500);
      });
      expect(onAutoResume).toHaveBeenCalledTimes(1);
      expect(result.current.remainingSeconds).toBe(0);

      // 2. Simulate the auto-resume (transition to PLAYING resets trigger flag)
      rerender({ status: GameStatus.PLAYING });

      // 3. Hide the tab, then re-pause (simulating the visibility auto-pause)
      setHidden(true);
      rerender({ status: GameStatus.PAUSED });

      // 4. While hidden: budget is 0 and PAUSED, but auto-resume must NOT fire
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(onAutoResume).toHaveBeenCalledTimes(1);

      // 5. Become visible -> deferred auto-resume fires
      setHidden(false);
      expect(onAutoResume).toHaveBeenCalledTimes(2);
    });

    it('should consume the full hidden wall-clock on return even if timers were suspended', () => {
      const onAutoResume = vi.fn();
      const { result } = renderHook(() =>
        usePauseBudget(GameMode.COMPETITIVE, GameStatus.PAUSED, onAutoResume)
      );

      // 2s visible -> budget ~8
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.remainingSeconds).toBeCloseTo(8, 0);

      // Hide and simulate full timer suspension: jump the system clock 30s
      // forward (throttled callbacks may or may not fire depending on browser)
      const hiddenStart = Date.now();
      setHidden(true);
      act(() => {
        vi.setSystemTime(new Date(hiddenStart + 30000));
      });

      // Auto-resume must never fire while hidden regardless of suspension
      expect(onAutoResume).not.toHaveBeenCalled();

      // Return to visible. The 30s of wall-clock pause time is consumed
      // (countdown is uncapped for anti-abuse) and the deferred auto-resume
      // fires cleanly — no way to escape the budget via tab suspension.
      setHidden(false);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.remainingSeconds).toBe(0);
      expect(onAutoResume).toHaveBeenCalledTimes(1);
    });

    it('should handle iOS BF-cache: pagehide hides, pageshow restores (no visibilitychange)', () => {
      const onAutoResume = vi.fn();
      const { result, rerender } = renderHook(
        ({ status }) => usePauseBudget(GameMode.COMPETITIVE, status, onAutoResume),
        { initialProps: { status: GameStatus.PAUSED } }
      );

      // 1. Deplete budget to 0 while visible -> auto-resume fires immediately
      act(() => {
        vi.advanceTimersByTime(10500);
      });
      expect(onAutoResume).toHaveBeenCalledTimes(1);
      expect(result.current.remainingSeconds).toBe(0);

      // 2. Simulate auto-resume (PLAYING resets the trigger flag)
      rerender({ status: GameStatus.PLAYING });

      // 3. iOS BF-cache freeze FIRST: pagehide(persisted) — visibilitychange
      //    may NOT fire on iOS in this path. The hook must treat the tab as
      //    hidden before any re-pause happens.
      act(() => {
        const e = new Event('pagehide');
        Object.defineProperty(e, 'persisted', { value: true });
        window.dispatchEvent(e);
      });

      // 4. Now re-pause WHILE hidden (budget still 0). Auto-resume must NOT
      //    fire because isTabVisible is false (deferred until restore).
      rerender({ status: GameStatus.PAUSED });
      expect(onAutoResume).toHaveBeenCalledTimes(1);

      // 5. Restore from BF cache via pageshow (persisted) — visibilitychange
      //    may not fire, so the hook must resync from pageshow.
      act(() => {
        const e = new Event('pageshow');
        Object.defineProperty(e, 'persisted', { value: true });
        window.dispatchEvent(e);
      });

      // Now visible again -> deferred auto-resume fires
      expect(onAutoResume).toHaveBeenCalledTimes(2);
    });
  });
});
