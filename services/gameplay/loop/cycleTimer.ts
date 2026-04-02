import { GAME_MODE_CONFIGS, GameMode } from '../../../types/gameMode';

export interface CycleTimerResult {
  /** Current cycle number (1-based) */
  currentCycle: number;
  /** Whether a new cycle boundary was crossed since lastEmittedCycle */
  shouldEmit: boolean;
}

/**
 * Pure function that computes the current cycle number and whether a cycleComplete
 * event should be emitted. Extracted from GameEngine.tsx cycle timer logic.
 *
 * Only applies to COMPETITIVE mode (cycleDurationSeconds > 0).
 * In CASUAL mode (cycleDurationSeconds === 0) this returns cycle 1 with no emit.
 */
export function evaluateCycleTimer(
  elapsedSeconds: number,
  lastEmittedCycle: number,
  gameMode: GameMode
): CycleTimerResult {
  if (gameMode !== GameMode.COMPETITIVE) {
    return { currentCycle: 1, shouldEmit: false };
  }

  const cycleDuration = GAME_MODE_CONFIGS[GameMode.COMPETITIVE].cycleDurationSeconds;
  if (cycleDuration <= 0) {
    return { currentCycle: 1, shouldEmit: false };
  }

  const currentCycle = Math.floor(elapsedSeconds / cycleDuration) + 1;
  return {
    currentCycle,
    shouldEmit: currentCycle > lastEmittedCycle,
  };
}
