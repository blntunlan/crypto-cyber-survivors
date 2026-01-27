/**
 * useGameSetup - Game Initialization Hook
 *
 * Handles one-time setup on component mount:
 * - FPS Monitor start/stop
 * - Object pool pre-warming
 * - Background candle generation
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { FPSMonitor } from '../services/system/FPSMonitor';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { type PoolManager } from '../services/combat/PoolManager';
import { generateBackgroundCandles } from '../utils/backgroundCandles';
import type { GameState } from '../types';

interface UseGameSetupParams {
  /** Reference to pool manager */
  pool: RefObject<PoolManager>;
  /** Reference to game state */
  state: RefObject<GameState>;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
}

/**
 * Hook to handle game initialization and cleanup
 */
export function useGameSetup({ pool, state, width, height }: UseGameSetupParams): void {
  // Initial setup and object pool pre-warming
  useEffect(() => {
    // Start FPS monitor
    FPSMonitor.start();

    // Pre-warm object pools to prevent allocation stutters during gameplay
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    pool.current.preWarm({
      bullets: Math.round(80 * perfConfig.particleMultiplier),
      particles: Math.round(150 * perfConfig.particleMultiplier),
      gems: 20,
      texts: 30,
    });

    return () => {
      FPSMonitor.stop();
    };
  }, [pool]);

  // Update background candles on dimensions or adaptive profile changes
  useEffect(() => {
    const updateCandles = () => {
      const config = DeviceBenchmarkService.getPerformanceConfig();
      state.current.bgCandles = generateBackgroundCandles(width, height, config);
    };

    updateCandles();

    const unsubscribe = DeviceBenchmarkService.subscribe(() => {
      updateCandles();
    });

    return () => unsubscribe();
  }, [width, height, state]);
}
