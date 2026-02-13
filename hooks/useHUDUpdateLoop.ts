/**
 * useHUDUpdateLoop - Performance-optimized HUD Update Hook
 *
 * Handles tasks that require direct DOM manipulation or high-frequency
 * logic not suitable for standard React state.
 *
 * Note: High-frequency UI elements (HP, XP, Timer, FPS) are now
 * EVENT-DRIVEN for maximum performance.
 */

import type { RefObject } from 'react';
import type { GameStatus, Player } from '../types';

interface HUDLayoutOffset {
  x: number;
  y: number;
}

interface UseHUDUpdateLoopParams {
  status: GameStatus;
  player?: Player;
  containerRef: RefObject<HTMLDivElement | null>;
  comboPanelOffset?: HUDLayoutOffset;
}

/**
 * Hook for high-frequency HUD updates using direct DOM manipulation
 */
export function useHUDUpdateLoop({
  status: _status,
  player: _player,
  containerRef: _containerRef,
  comboPanelOffset: _comboPanelOffset = { x: 0, y: 0 },
}: UseHUDUpdateLoopParams): void {
  // Logic removed: Moved to Event-Driven systems (see WaveTimer, FPSCounter, AccountHealthPremium, ComboPanel)
  // This hook is kept for future high-frequency layout needs but currently does nothing to save CPU.
}
