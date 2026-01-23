import { type WavePhase } from '../types';
import { WAVE_PHASES } from '../constants';

/**
 * WaveFactor - Phase-based difficulty rhythm (Yo-Yo)
 * Cycles through 7 distinct phases every 300 seconds
 */
export function calculateWaveFactor({
  elapsedSeconds,
  cycleDuration = 300,
}: {
  elapsedSeconds: number;
  cycleDuration?: number;
}): {
  phase: WavePhase;
  factor: number;
  phaseProgress: number;
} {
  const cycleTime = elapsedSeconds % cycleDuration;
  let accumulated = 0;

  for (const phaseConfig of WAVE_PHASES) {
    if (cycleTime < accumulated + phaseConfig.duration) {
      const phaseElapsed = cycleTime - accumulated;
      const phaseProgress = phaseElapsed / phaseConfig.duration;

      return {
        phase: phaseConfig.name,
        factor: phaseConfig.multiplier,
        phaseProgress,
      };
    }
    accumulated += phaseConfig.duration;
  }

  // Fallback (should not happen if cycleDuration matches sum of phase durations)
  const lastPhase = WAVE_PHASES[WAVE_PHASES.length - 1]!;
  return {
    phase: lastPhase.name,
    factor: lastPhase.multiplier,
    phaseProgress: 1.0,
  };
}

/**
 * Get configuration for a specific phase
 */
export function getPhaseConfig(name: WavePhase) {
  return WAVE_PHASES.find(p => p.name === name) ?? WAVE_PHASES[0];
}

/**
 * Check if currently in boss wave (climax)
 */
export function isInBossWave(elapsedSeconds: number, cycleDuration = 300): boolean {
  const { phase } = calculateWaveFactor({ elapsedSeconds, cycleDuration });
  return phase === 'climax';
}

/**
 * Check if currently in resolution (final phase)
 */
export function isInResolutionPhase(
  elapsedSeconds: number,
  cycleDuration = 300
): boolean {
  const { phase } = calculateWaveFactor({ elapsedSeconds, cycleDuration });
  return phase === 'resolution';
}

/**
 * Get full timeline of phases for UI/Planning
 */
export function getPhaseTimeline(_cycleDuration: number = 300) {
  let startTime = 0;
  return WAVE_PHASES.map(phase => {
    const end = startTime + phase.duration;
    const item = {
      phase: phase.name,
      startTime,
      endTime: end,
      duration: phase.duration,
      multiplier: phase.multiplier,
    };
    startTime = end;
    return item;
  });
}
