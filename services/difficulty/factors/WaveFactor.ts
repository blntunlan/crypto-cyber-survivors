/**
 * Legacy V1 Support: Wave system removed
 *
 * This entire module is deprecated. Difficulty is now driven by market conditions,
 * not time-based wave phases. All functions return placeholder values for
 * backwards compatibility but should not be used in new code.
 *
 * Migration:
 * - Use DifficultyContext.getDifficultyOutput() for current difficulty
 * - Use MarketIndicatorService for market-driven factors
 * - Portal system handles game flow instead of wave cycles
 */
import { type WavePhase } from '../types';

/**
 * Legacy V1 Support: Returns static 'active' phase
 * WaveFactor - Phase-based difficulty rhythm (LEGACY)
 */
export function calculateWaveFactor({
  elapsedSeconds: _elapsedSeconds,
  cycleDuration: _cycleDuration = 300,
}: {
  elapsedSeconds: number;
  cycleDuration?: number;
}): {
  phase: WavePhase;
  factor: number;
  phaseProgress: number;
} {
  // AI Director V2: Always return 'active' phase with neutral factor
  return {
    phase: 'active',
    factor: 1.0,
    phaseProgress: 0.5,
  };
}

/**
 * Legacy V1 Support: Returns first (deprecated) phase config
 */
export function getPhaseConfig(_name: WavePhase) {
  return { name: 'active' as WavePhase, duration: 600, multiplier: 1.0 };
}

/**
 * Legacy V1 Support: Always returns false
 */
export function isInBossWave(_elapsedSeconds: number, _cycleDuration = 300): boolean {
  return false;
}

/**
 * Legacy V1 Support: Always returns false
 */
export function isInResolutionPhase(
  _elapsedSeconds: number,
  _cycleDuration = 300
): boolean {
  return false;
}

/**
 * Legacy V1 Support: Returns single 'active' phase
 */
export function getPhaseTimeline(_cycleDuration: number = 600) {
  return [
    {
      phase: 'active' as WavePhase,
      startTime: 0,
      endTime: _cycleDuration,
      duration: _cycleDuration,
      multiplier: 1.0,
    },
  ];
}
