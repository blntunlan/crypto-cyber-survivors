import { useEffect, useState } from 'react';
import { EventBus } from '../services/core/EventBus';
import { DifficultyV2CompatibilityAdapter } from '../services/difficulty/runtime/DifficultyV2CompatibilityAdapter';
import type {
  DifficultyOutputV2,
  LiquidationWarning,
} from '../services/difficulty/types';

const RUNTIME_OUTPUT: DifficultyOutputV2 = {
  total: 1,
  wavePhase: 'active',
  liquidationWarning: 'NONE',
  fovReduction: 0,
  shockActive: false,
  spawnRate: 1,
  enemySpeed: 1,
  enemyHP: 1,
  enemyDamage: 1,
  enemyVariety: 0,
  chaosLevel: 0,
  mercyFactor: 0,
  pressureIntensity: 0,
  whaleProbability: 0,
  xpMultiplier: 1,
  gemDropRate: 1,
};

const compatibilityAdapter = new DifficultyV2CompatibilityAdapter();

export function useDifficultyV2() {
  const [output, setOutput] = useState<DifficultyOutputV2>(RUNTIME_OUTPUT);
  // `output` is seeded with neutral values so consumers never handle null, which
  // also means they cannot tell seeded defaults from a committed snapshot.
  // Surface that explicitly rather than leaving readers to guess.
  const [hasSnapshot, setHasSnapshot] = useState(false);

  useEffect(
    () =>
      EventBus.on('difficultySnapshotCommitted', ({ snapshot }) => {
        setOutput(compatibilityAdapter.toOutput(snapshot));
        setHasSnapshot(true);
      }),
    []
  );

  return {
    output,
    hasSnapshot,
    fovReduction: output.fovReduction,
    shockActive: output.shockActive,
    total: output.total,
  };
}

export function useWavePhaseChange() {}

export function useLiquidationWarning(
  onWarning: (level: LiquidationWarning, distance: number) => void
) {
  useEffect(() => {
    const unsubscribe = EventBus.on('liquidationWarning', data => {
      onWarning(data.level, data.distance);
    });
    return unsubscribe;
  }, [onWarning]);
}

export function useBossWave() {}
export function useShockDetection(
  onShock: (intensity: number, direction: 'up' | 'down') => void
) {
  useEffect(() => {
    const unsubscribe = EventBus.on('shockDetected', data => {
      onShock(data.intensity, data.direction);
    });
    return unsubscribe;
  }, [onShock]);
}

export default useDifficultyV2;
