/**
 * useCycleDecision - Hook for managing cycle decision state
 *
 * Provides:
 * - Access to current cycle decision state
 * - Manual trigger for showing decision screen
 * - Callbacks for continue/cash out events
 *
 * @see docs/DIFFICULTY_SYSTEM_V2.md
 */

import { useState, useEffect, useCallback } from 'react';
import { EventBus } from '../services/EventBus';

export type CycleDecision = 'CONTINUE' | 'CASH_OUT';

interface CycleDecisionState {
  /** Whether a decision is pending */
  isPending: boolean;
  /** Current cycle number */
  cycleNumber: number;
  /** Last decision made */
  lastDecision: CycleDecision | null;
  /** Total cycles completed */
  totalCyclesCompleted: number;
  /** Whether player has cashed out */
  hasCashedOut: boolean;
}

interface UseCycleDecisionReturn extends CycleDecisionState {
  /** Manually trigger decision screen */
  triggerDecision: () => void;
  /** Force continue without showing screen */
  forceContinue: () => void;
  /** Force cash out without showing screen */
  forceCashOut: () => void;
  /** Reset state for new game */
  reset: () => void;
}

export function useCycleDecision(): UseCycleDecisionReturn {
  const [state, setState] = useState<CycleDecisionState>({
    isPending: false,
    cycleNumber: 0,
    lastDecision: null,
    totalCyclesCompleted: 0,
    hasCashedOut: false,
  });

  // Listen for cycle complete events
  useEffect(() => {
    const unsubComplete = EventBus.on(
      'cycleComplete',
      (data: { cycleNumber: number }) => {
        setState(prev => ({
          ...prev,
          isPending: true,
          cycleNumber: data.cycleNumber,
          totalCyclesCompleted: data.cycleNumber,
        }));
      }
    );

    return unsubComplete;
  }, []);

  // Listen for decision made events
  useEffect(() => {
    const unsubDecision = EventBus.on(
      'cycleDecisionMade',
      (data: { decision: CycleDecision; cycleNumber: number }) => {
        setState(prev => ({
          ...prev,
          isPending: false,
          lastDecision: data.decision,
          hasCashedOut: data.decision === 'CASH_OUT',
        }));

        // If cash out, trigger game over
        if (data.decision === 'CASH_OUT') {
          // Small delay to let the animation play
          setTimeout(() => {
            // Note: finalLevel and finalPnl will be overwritten by the game state manager
            EventBus.emit('gameOver', {
              finalLevel: 0,
              finalPnl: 0,
              reason: 'CASH_OUT',
            });
          }, 500);
        }
      }
    );

    return unsubDecision;
  }, []);

  // Reset on game reset
  useEffect(() => {
    const unsubReset = EventBus.on('gameReset', () => {
      setState({
        isPending: false,
        cycleNumber: 0,
        lastDecision: null,
        totalCyclesCompleted: 0,
        hasCashedOut: false,
      });
    });

    return unsubReset;
  }, []);

  const triggerDecision = useCallback(() => {
    setState(prev => ({ ...prev, isPending: true }));
  }, []);

  const forceContinue = useCallback(() => {
    EventBus.emit('cycleDecisionMade', {
      decision: 'CONTINUE',
      cycleNumber: state.cycleNumber,
    });
  }, [state.cycleNumber]);

  const forceCashOut = useCallback(() => {
    EventBus.emit('cycleDecisionMade', {
      decision: 'CASH_OUT',
      cycleNumber: state.cycleNumber,
    });
  }, [state.cycleNumber]);

  const reset = useCallback(() => {
    setState({
      isPending: false,
      cycleNumber: 0,
      lastDecision: null,
      totalCyclesCompleted: 0,
      hasCashedOut: false,
    });
  }, []);

  return {
    ...state,
    triggerDecision,
    forceContinue,
    forceCashOut,
    reset,
  };
}

export default useCycleDecision;
