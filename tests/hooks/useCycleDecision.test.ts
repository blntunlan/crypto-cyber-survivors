/**
 * useCycleDecision Hook Tests
 *
 * Tests for the cycle decision state management hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCycleDecision } from '../../hooks/useCycleDecision';
import { EventBus } from '../../services/EventBus';

describe('useCycleDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Emit gameReset to clean up state between tests
    EventBus.emit('gameReset', {});
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useCycleDecision());

      expect(result.current.isPending).toBe(false);
      expect(result.current.cycleNumber).toBe(0);
      expect(result.current.lastDecision).toBeNull();
      expect(result.current.totalCyclesCompleted).toBe(0);
      expect(result.current.hasCashedOut).toBe(false);
    });
  });

  describe('cycleComplete Event', () => {
    it('should set isPending to true when cycleComplete is emitted', () => {
      const { result } = renderHook(() => useCycleDecision());

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.cycleNumber).toBe(1);
      expect(result.current.totalCyclesCompleted).toBe(1);
    });

    it('should update cycle number on subsequent cycles', () => {
      const { result } = renderHook(() => useCycleDecision());

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      });

      act(() => {
        EventBus.emit('cycleDecisionMade', {
          decision: 'CONTINUE',
          cycleNumber: 1,
        });
      });

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 2,
          totalElapsedSeconds: 600,
        });
      });

      expect(result.current.cycleNumber).toBe(2);
      expect(result.current.totalCyclesCompleted).toBe(2);
    });
  });

  describe('cycleDecisionMade Event', () => {
    it('should update state when CONTINUE decision is made', () => {
      const { result } = renderHook(() => useCycleDecision());

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      });

      act(() => {
        EventBus.emit('cycleDecisionMade', {
          decision: 'CONTINUE',
          cycleNumber: 1,
        });
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.lastDecision).toBe('CONTINUE');
      expect(result.current.hasCashedOut).toBe(false);
    });

    it('should set hasCashedOut when CASH_OUT decision is made', () => {
      const { result } = renderHook(() => useCycleDecision());

      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      });

      act(() => {
        EventBus.emit('cycleDecisionMade', {
          decision: 'CASH_OUT',
          cycleNumber: 1,
        });
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.lastDecision).toBe('CASH_OUT');
      expect(result.current.hasCashedOut).toBe(true);
    });
  });

  describe('Manual Controls', () => {
    it('should trigger decision screen manually', () => {
      const { result } = renderHook(() => useCycleDecision());

      act(() => {
        result.current.triggerDecision();
      });

      expect(result.current.isPending).toBe(true);
    });

    it('should force continue and emit event', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      const { result } = renderHook(() => useCycleDecision());

      // Set a cycle number first
      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 2,
          totalElapsedSeconds: 600,
        });
      });

      act(() => {
        result.current.forceContinue();
      });

      expect(emitSpy).toHaveBeenCalledWith('cycleDecisionMade', {
        decision: 'CONTINUE',
        cycleNumber: 2,
      });
    });

    it('should force cash out and emit event', () => {
      const emitSpy = vi.spyOn(EventBus, 'emit');
      const { result } = renderHook(() => useCycleDecision());

      // Set a cycle number first
      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 3,
          totalElapsedSeconds: 900,
        });
      });

      act(() => {
        result.current.forceCashOut();
      });

      expect(emitSpy).toHaveBeenCalledWith('cycleDecisionMade', {
        decision: 'CASH_OUT',
        cycleNumber: 3,
      });
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useCycleDecision());

      // Build up some state
      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 2,
          totalElapsedSeconds: 600,
        });
      });

      act(() => {
        EventBus.emit('cycleDecisionMade', {
          decision: 'CONTINUE',
          cycleNumber: 2,
        });
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.cycleNumber).toBe(0);
      expect(result.current.lastDecision).toBeNull();
      expect(result.current.totalCyclesCompleted).toBe(0);
      expect(result.current.hasCashedOut).toBe(false);
    });
  });

  describe('gameReset Event', () => {
    it('should reset state on gameReset', () => {
      const { result } = renderHook(() => useCycleDecision());

      // Build up some state
      act(() => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 5,
          totalElapsedSeconds: 1500,
        });
      });

      act(() => {
        EventBus.emit('cycleDecisionMade', {
          decision: 'CASH_OUT',
          cycleNumber: 5,
        });
      });

      expect(result.current.hasCashedOut).toBe(true);

      // Game reset
      act(() => {
        EventBus.emit('gameReset', {});
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.cycleNumber).toBe(0);
      expect(result.current.lastDecision).toBeNull();
      expect(result.current.hasCashedOut).toBe(false);
    });
  });
});
