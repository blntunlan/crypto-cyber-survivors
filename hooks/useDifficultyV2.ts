import { useState, useEffect, useCallback, useRef } from 'react';
import { EventBus } from '../services/core/EventBus';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import type {
  DifficultyOutputV2,
  LiquidationWarning,
} from '../services/difficulty/types';

export function useDifficultyV2(updateInterval: number = 100) {
  const [state, setState] = useState({
    output: null as DifficultyOutputV2 | null,
    fovReduction: 0,
    shockActive: false,
    total: 1,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(() => {
    try {
      const output = DifficultyManager.getLatestOutput();
      if (!output) return;
      setState({
        output,
        fovReduction: output.fovReduction,
        shockActive: output.shockActive,
        total: output.total,
      });
    } catch {
      // Context not ready
    }
  }, []);

  useEffect(() => {
    updateState();
    intervalRef.current = setInterval(updateState, updateInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateState, updateInterval]);

  return state;
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
