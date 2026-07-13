import { useEffect } from 'react';
import { EventBus } from '../services/core/EventBus';
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

export function useDifficultyV2() {
  return {
    output: RUNTIME_OUTPUT,
    fovReduction: 0,
    shockActive: false,
    total: 1,
  };
}

export function useWavePhaseChange() {}

export function useLiquidationWarning(
  onWarning: (level: LiquidationWarning, distance: number) => void
) {
  useEffect(() => {
    const unsubscribe = EventBus.on(
      'liquidationWarning',
      (data: { level: LiquidationWarning; distance: number }) => {
        onWarning(data.level, data.distance);
      }
    );
    return unsubscribe;
  }, [onWarning]);
}

export function useBossWave() {}
export function useShockDetection(
  onShock: (intensity: number, direction: 'up' | 'down') => void
) {
  useEffect(() => {
    const unsubscribe = EventBus.on(
      'shockDetected',
      (data: { intensity: number; direction: 'up' | 'down' }) => {
        onShock(data.intensity, data.direction);
      }
    );
    return unsubscribe;
  }, [onShock]);
}

export default useDifficultyV2;
