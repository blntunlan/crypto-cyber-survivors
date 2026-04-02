/**
 * Characterization tests: Cycle Timer Logic
 *
 * Documents the current cycle-boundary calculation as implemented in GameEngine.tsx.
 * The formula:
 *   cycleDuration = GAME_MODE_CONFIGS[COMPETITIVE].cycleDurationSeconds  (300s)
 *   currentCycle = Math.floor(elapsed / cycleDuration) + 1
 *   emit cycleComplete when currentCycle > lastEmittedCycle
 *
 * These tests lock in this behavior before extracting to a utility function.
 */
import { describe, it, expect } from 'vitest';
import { GAME_MODE_CONFIGS, GameMode } from '../../../../types/gameMode';

/** Replicate the cycle calculation from GameEngine.tsx lines 926-929 */
function computeCurrentCycle(elapsedSeconds: number): number {
  const cycleDuration = GAME_MODE_CONFIGS[GameMode.COMPETITIVE].cycleDurationSeconds;
  return Math.floor(elapsedSeconds / cycleDuration) + 1;
}

/** Replicate the "should emit" check from GameEngine.tsx lines 932 */
function shouldEmitCycleComplete(
  elapsedSeconds: number,
  lastEmittedCycle: number
): boolean {
  return computeCurrentCycle(elapsedSeconds) > lastEmittedCycle;
}

describe('Cycle Timer Characterization', () => {
  it('COMPETITIVE cycle duration is 300 seconds', () => {
    expect(GAME_MODE_CONFIGS[GameMode.COMPETITIVE].cycleDurationSeconds).toBe(300);
  });

  it('CASUAL cycle duration is 0 (no cycles)', () => {
    expect(GAME_MODE_CONFIGS[GameMode.CASUAL].cycleDurationSeconds).toBe(0);
  });

  it('at t=0 the player is in cycle 1', () => {
    expect(computeCurrentCycle(0)).toBe(1);
  });

  it('at t=299s the player is still in cycle 1', () => {
    expect(computeCurrentCycle(299)).toBe(1);
  });

  it('at t=300s the player crosses into cycle 2', () => {
    expect(computeCurrentCycle(300)).toBe(2);
  });

  it('at t=599s the player is still in cycle 2', () => {
    expect(computeCurrentCycle(599)).toBe(2);
  });

  it('at t=600s the player crosses into cycle 3', () => {
    expect(computeCurrentCycle(600)).toBe(3);
  });

  it('should not emit when elapsed is still in the same cycle', () => {
    // lastEmitted=1, still in cycle 1 at t=200
    expect(shouldEmitCycleComplete(200, 1)).toBe(false);
  });

  it('should emit when elapsed crosses into a new cycle', () => {
    // lastEmitted=1, now in cycle 2 at t=300
    expect(shouldEmitCycleComplete(300, 1)).toBe(true);
  });

  it('should not double-emit for the same cycle boundary', () => {
    // already emitted cycle 2
    expect(shouldEmitCycleComplete(350, 2)).toBe(false);
  });

  it('handles skipped cycles (lag spike) by emitting for latest cycle only', () => {
    // Jump from cycle 1 straight to cycle 4 (elapsed=900)
    const cycle = computeCurrentCycle(900);
    expect(cycle).toBe(4);
    // The engine only checks > lastEmitted, so it emits once for the latest
    expect(shouldEmitCycleComplete(900, 1)).toBe(true);
    // After emitting, lastEmitted becomes 4 — no further emits until cycle 5
    expect(shouldEmitCycleComplete(900, 4)).toBe(false);
  });
});
