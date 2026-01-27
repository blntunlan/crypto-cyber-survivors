/**
 * @fileoverview Tutorial State Management Hook
 * Manages tutorial progress, persistence, and analytics
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEYS,
  TUTORIAL_TOTAL_STEPS,
  type TutorialStep,
} from '../config/TutorialConfig';
import { Logger } from '../services/system/Logger';

interface TutorialState {
  /** Whether user has completed the tutorial */
  hasCompleted: boolean;
  /** Whether user has skipped the tutorial */
  hasSkipped: boolean;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Tutorial start timestamp for duration tracking */
  startedAt: number | null;
}

interface UseTutorialReturn {
  /** Whether to show the tutorial overlay */
  showTutorial: boolean;
  /** Current tutorial step */
  currentStep: TutorialStep;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether this is the first step */
  isFirstStep: boolean;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Skip the tutorial */
  skipTutorial: () => void;
  /** Complete the tutorial */
  completeTutorial: () => void;
  /** Start/restart the tutorial */
  startTutorial: () => void;
  /** Reset tutorial state (for dev/settings) */
  resetTutorial: () => void;
  /** Whether user has completed tutorial before */
  hasCompleted: boolean;
  /** Whether user has skipped tutorial before */
  hasSkipped: boolean;
}

/**
 * Load initial tutorial state from localStorage
 */
function loadTutorialState(): TutorialState {
  try {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEYS.COMPLETED) === 'true';
    const skipped = localStorage.getItem(TUTORIAL_STORAGE_KEYS.SKIPPED) === 'true';
    const lastStep = parseInt(
      localStorage.getItem(TUTORIAL_STORAGE_KEYS.LAST_STEP) ?? '0',
      10
    );

    return {
      hasCompleted: completed,
      hasSkipped: skipped,
      currentStepIndex: lastStep,
      startedAt: null,
    };
  } catch {
    Logger.warn('[useTutorial] Failed to load tutorial state from localStorage');
    return {
      hasCompleted: false,
      hasSkipped: false,
      currentStepIndex: 0,
      startedAt: null,
    };
  }
}

/**
 * Save tutorial state to localStorage
 */
function saveTutorialState(state: Partial<TutorialState>): void {
  try {
    if (state.hasCompleted !== undefined) {
      localStorage.setItem(TUTORIAL_STORAGE_KEYS.COMPLETED, String(state.hasCompleted));
      if (state.hasCompleted) {
        localStorage.setItem(TUTORIAL_STORAGE_KEYS.COMPLETED_AT, Date.now().toString());
      }
    }
    if (state.hasSkipped !== undefined) {
      localStorage.setItem(TUTORIAL_STORAGE_KEYS.SKIPPED, String(state.hasSkipped));
    }
    if (state.currentStepIndex !== undefined) {
      localStorage.setItem(
        TUTORIAL_STORAGE_KEYS.LAST_STEP,
        String(state.currentStepIndex)
      );
    }
  } catch {
    Logger.warn('[useTutorial] Failed to save tutorial state to localStorage');
  }
}

/**
 * Tutorial state management hook
 *
 * @example
 * ```tsx
 * const {
 *   showTutorial,
 *   currentStep,
 *   nextStep,
 *   skipTutorial,
 * } = useTutorial();
 *
 * if (showTutorial) {
 *   return <TutorialOverlay step={currentStep} onNext={nextStep} />;
 * }
 * ```
 */
export function useTutorial(): UseTutorialReturn {
  const [state, setState] = useState<TutorialState>(loadTutorialState);
  const [isActive, setIsActive] = useState(false);

  // Determine if we should show tutorial on first render
  useEffect(() => {
    const shouldShow = !state.hasCompleted && !state.hasSkipped;
    if (shouldShow) {
      // Small delay to ensure app is ready
      const timer = setTimeout(() => {
        setIsActive(true);
        setState(prev => ({ ...prev, startedAt: Date.now() }));
        Logger.info('[useTutorial] Tutorial started (first time)');
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - intentionally ignoring state deps

  const currentStep = useMemo(
    () => TUTORIAL_STEPS[state.currentStepIndex] ?? TUTORIAL_STEPS[0]!,
    [state.currentStepIndex]
  );

  const progress = useMemo(
    () => Math.round(((state.currentStepIndex + 1) / TUTORIAL_TOTAL_STEPS) * 100),
    [state.currentStepIndex]
  );

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextIndex = Math.min(prev.currentStepIndex + 1, TUTORIAL_TOTAL_STEPS - 1);
      saveTutorialState({ currentStepIndex: nextIndex });

      // Log step progress
      const nextStepData = TUTORIAL_STEPS[nextIndex];
      if (nextStepData) {
        Logger.debug(`[useTutorial] Step: ${nextStepData.id} (${nextIndex})`);
      }

      return { ...prev, currentStepIndex: nextIndex };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      const prevIndex = Math.max(prev.currentStepIndex - 1, 0);
      saveTutorialState({ currentStepIndex: prevIndex });
      return { ...prev, currentStepIndex: prevIndex };
    });
  }, []);

  const skipTutorial = useCallback(() => {
    const stepId = currentStep.id;

    setState(prev => ({
      ...prev,
      hasSkipped: true,
      currentStepIndex: 0,
      startedAt: null,
    }));
    saveTutorialState({ hasSkipped: true, currentStepIndex: 0 });
    setIsActive(false);

    Logger.info(`[useTutorial] Tutorial skipped at step: ${stepId}`);
  }, [currentStep.id]);

  const completeTutorial = useCallback(() => {
    const durationMs = state.startedAt ? Date.now() - state.startedAt : 0;

    setState(prev => ({
      ...prev,
      hasCompleted: true,
      currentStepIndex: 0,
      startedAt: null,
    }));
    saveTutorialState({ hasCompleted: true, currentStepIndex: 0 });
    setIsActive(false);

    Logger.info(`[useTutorial] Tutorial completed in ${durationMs}ms`);
  }, [state.startedAt]);

  const startTutorial = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStepIndex: 0,
      startedAt: Date.now(),
    }));
    saveTutorialState({ currentStepIndex: 0 });
    setIsActive(true);

    Logger.info('[useTutorial] Tutorial replayed');
  }, []);

  const resetTutorial = useCallback(() => {
    try {
      localStorage.removeItem(TUTORIAL_STORAGE_KEYS.COMPLETED);
      localStorage.removeItem(TUTORIAL_STORAGE_KEYS.COMPLETED_AT);
      localStorage.removeItem(TUTORIAL_STORAGE_KEYS.SKIPPED);
      localStorage.removeItem(TUTORIAL_STORAGE_KEYS.LAST_STEP);
    } catch {
      // Ignore localStorage errors
    }

    setState({
      hasCompleted: false,
      hasSkipped: false,
      currentStepIndex: 0,
      startedAt: null,
    });
    setIsActive(false);

    Logger.info('[useTutorial] Tutorial reset');
  }, []);

  return {
    showTutorial: isActive,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: TUTORIAL_TOTAL_STEPS,
    progress,
    isFirstStep: state.currentStepIndex === 0,
    isLastStep: state.currentStepIndex === TUTORIAL_TOTAL_STEPS - 1,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    startTutorial,
    resetTutorial,
    hasCompleted: state.hasCompleted,
    hasSkipped: state.hasSkipped,
  };
}

export default useTutorial;
