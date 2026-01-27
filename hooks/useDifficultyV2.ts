/**
 * useDifficultyV2 - React hook for accessing DifficultyContext V2
 *
 * Provides access to the new modular difficulty system with
 * real-time updates via EventBus subscriptions.
 *
 * @example
 * const { context, output, wavePhase, liquidationWarning } = useDifficultyV2();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventBus } from '../services/core/EventBus';
import { difficultyContext } from '../services/difficulty';
import type {
  DifficultyContextState,
  DifficultyOutputV2,
  WavePhase,
  LiquidationWarning,
} from '../services/difficulty';

interface DifficultyV2State {
  /** Full context state with all factors */
  context: DifficultyContextState | null;
  /** Calculated difficulty outputs for game systems */
  output: DifficultyOutputV2 | null;
  /** Current wave phase */
  wavePhase: WavePhase;
  /** Liquidation warning level */
  liquidationWarning: LiquidationWarning;
  /** FOV reduction for liquidation visual effect */
  fovReduction: number;
  /** Whether a market shock is active */
  shockActive: boolean;
  /** Total difficulty multiplier */
  total: number;
}

/**
 * Hook for accessing DifficultyContext V2
 *
 * @param updateInterval - How often to poll for updates (ms). Default: 100ms
 * @returns Current difficulty state
 */
export function useDifficultyV2(updateInterval: number = 100): DifficultyV2State {
  const [state, setState] = useState<DifficultyV2State>({
    context: null,
    output: null,
    wavePhase: 'warmup',
    liquidationWarning: 'NONE',
    fovReduction: 0,
    shockActive: false,
    total: 1,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback(() => {
    try {
      const context = difficultyContext.getContext();
      const output = difficultyContext.getDifficultyOutput();

      setState({
        context,
        output,
        wavePhase: output.wavePhase,
        liquidationWarning: output.liquidationWarning,
        fovReduction: output.fovReduction,
        shockActive: output.shockActive,
        total: output.total,
      });
    } catch {
      // Context may not be initialized yet
    }
  }, []);

  useEffect(() => {
    // Initial update
    updateState();

    // Periodic updates
    intervalRef.current = setInterval(updateState, updateInterval);

    // Listen for explicit updates
    const unsubscribe = EventBus.on('difficultyUpdated', updateState);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      unsubscribe();
    };
  }, [updateState, updateInterval]);

  return state;
}

/**
 * Hook for wave phase change events
 */
export function useWavePhaseChange(
  onPhaseChange: (phase: WavePhase, oldPhase: WavePhase) => void
): void {
  useEffect(() => {
    const unsubscribe = EventBus.on(
      'wavePhaseChange',
      (data: { phase: WavePhase; oldPhase: WavePhase }) => {
        onPhaseChange(data.phase, data.oldPhase);
      }
    );
    return unsubscribe;
  }, [onPhaseChange]);
}

/**
 * Hook for liquidation warning events
 */
export function useLiquidationWarning(
  onWarning: (level: LiquidationWarning, distance: number) => void
): void {
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

/**
 * Hook for boss wave events
 */
export function useBossWave(
  onBossWaveStart: (cycleNumber: number) => void,
  onBossWaveEnd: (cycleNumber: number) => void
): void {
  useEffect(() => {
    const unsubStart = EventBus.on('bossWaveStart', (data: { cycleNumber: number }) => {
      onBossWaveStart(data.cycleNumber);
    });
    const unsubEnd = EventBus.on('bossWaveEnd', (data: { cycleNumber: number }) => {
      onBossWaveEnd(data.cycleNumber);
    });

    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [onBossWaveStart, onBossWaveEnd]);
}

/**
 * Hook for shock detection events
 */
export function useShockDetection(
  onShock: (intensity: number, direction: 'up' | 'down') => void
): void {
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
