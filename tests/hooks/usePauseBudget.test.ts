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
  });
});
