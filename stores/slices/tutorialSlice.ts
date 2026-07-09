import { type StateCreator } from 'zustand';
import { type TutorialPhase, type TutorialRunState } from '../../types/tutorial';
import { TUTORIAL_STEPS } from '../../config/TutorialConfig';

/**
 * Persisted tutorial runtime state. Single source of truth for tutorial
 * progress — replaces the legacy raw-localStorage keys and the old
 * `gameplaySlice.hasSeenTutorial` flag.
 */
export interface TutorialRuntimeState {
  /** Lifecycle state of the run. */
  runState: TutorialRunState;
  /** Active step id, or null when not in-progress. */
  currentStepId: string | null;
  /** Phase of the active step. */
  currentPhase: TutorialPhase;
  /** Ordered list of completed step ids (for resume / analytics). */
  completedSteps: string[];
  /** Wall-clock ms when the run started. */
  startedAt: number | null;
  /** Wall-clock ms when the run completed. */
  completedAt: number | null;
  /** Wall-clock ms when the run was skipped. */
  skippedAt: number | null;
  /** App version the user last saw the tutorial for (for "show again on new version"). */
  lastPlayedVersion: string | null;
}

export const DEFAULT_TUTORIAL: TutorialRuntimeState = {
  runState: 'not-started',
  currentStepId: null,
  currentPhase: 'menu-tour',
  completedSteps: [],
  startedAt: null,
  completedAt: null,
  skippedAt: null,
  lastPlayedVersion: null,
};

export interface TutorialActions {
  /** Begin a fresh tutorial run (auto on first visit, or replay from settings). */
  startTutorial: () => void;
  /** Jump to a specific step by id (used by director for surface transitions). */
  goToStep: (stepId: string) => void;
  /** Mark the current step complete and advance to the next (or complete the run). */
  advanceStep: () => void;
  /** Skip the tutorial from the current step. */
  skipTutorial: () => void;
  /** Complete the tutorial run. */
  completeTutorial: () => void;
  /** Reset tutorial state to defaults (used by replay + tests). */
  resetTutorial: () => void;
  /** Record the app version the tutorial was last shown for. */
  setLastPlayedVersion: (version: string) => void;
}

export interface TutorialSlice extends TutorialActions {
  tutorial: TutorialRuntimeState;
}

export const createTutorialSlice: StateCreator<TutorialSlice> = set => ({
  tutorial: { ...DEFAULT_TUTORIAL },

  startTutorial: () => {
    const first = TUTORIAL_STEPS[0];
    set(() => ({
      tutorial: {
        ...DEFAULT_TUTORIAL,
        runState: 'in-progress',
        currentStepId: first?.id ?? null,
        currentPhase: 'menu-tour',
        startedAt: Date.now(),
      },
    }));
  },

  goToStep: (stepId: string) => {
    const step = TUTORIAL_STEPS.find(s => s.id === stepId);
    if (!step) return;
    set(state => ({
      tutorial: {
        ...state.tutorial,
        currentStepId: stepId,
        currentPhase: 'menu-tour', // Phase is managed by components or EventBus now
      },
    }));
  },

  advanceStep: () => {
    set(state => {
      const tut = state.tutorial;
      if (tut.runState !== 'in-progress' || !tut.currentStepId) {
        return state;
      }
      const currentIdx = TUTORIAL_STEPS.findIndex(s => s.id === tut.currentStepId);
      if (currentIdx === -1) return state;

      const completedSteps = [...tut.completedSteps, tut.currentStepId];
      const nextIdx = currentIdx + 1;

      if (nextIdx >= TUTORIAL_STEPS.length) {
        return {
          tutorial: {
            ...tut,
            completedSteps,
            runState: 'completed',
            completedAt: Date.now(),
            currentStepId: null,
            currentPhase: 'done',
          },
        };
      }

      const next = TUTORIAL_STEPS[nextIdx]!;
      return {
        tutorial: {
          ...tut,
          completedSteps,
          currentStepId: next.id,
          currentPhase: 'menu-tour',
        },
      };
    });
  },

  skipTutorial: () => {
    set(state => ({
      tutorial: {
        ...state.tutorial,
        runState: 'skipped',
        skippedAt: Date.now(),
        currentStepId: null,
      },
    }));
  },

  completeTutorial: () => {
    set(state => ({
      tutorial: {
        ...state.tutorial,
        runState: 'completed',
        completedAt: Date.now(),
        currentStepId: null,
        currentPhase: 'done',
      },
    }));
  },

  resetTutorial: () => {
    set({ tutorial: { ...DEFAULT_TUTORIAL } });
  },

  setLastPlayedVersion: (version: string) => {
    set(state => ({
      tutorial: { ...state.tutorial, lastPlayedVersion: version },
    }));
  },
});

/** Selector for the tutorial runtime state. */
export const selectTutorial = (state: { tutorial: TutorialRuntimeState }) =>
  state.tutorial;
