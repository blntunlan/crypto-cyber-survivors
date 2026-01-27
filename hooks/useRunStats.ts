/**
 * useRunStats - Run Statistics Tracking Hook
 *
 * Tracks current run statistics (kills, streak, bonus XP)
 * by subscribing to ComboSystem updates via EventBus.
 */

import { useState, useEffect } from 'react';
import { EventBus } from '../services/core/EventBus';
import { ComboSystem } from '../services/combat/ComboSystem';

export interface RunStats {
  totalKills: number;
  maxStreak: number;
  totalBonusXp: number;
}

export const RUN_STATS_DEFAULTS: RunStats = {
  totalKills: 0,
  maxStreak: 0,
  totalBonusXp: 0,
};

export interface UseRunStatsReturn {
  runStats: RunStats;
  resetRunStats: () => void;
}

/**
 * Hook to track current run statistics
 */
export function useRunStats(): UseRunStatsReturn {
  const [runStats, setRunStats] = useState<RunStats>(RUN_STATS_DEFAULTS);

  // Subscribe to combo updates
  useEffect(() => {
    const unsub = EventBus.on('comboUpdate', () => {
      const state = ComboSystem.getState();
      setRunStats({
        totalKills: state.totalKills,
        maxStreak: state.maxStreak,
        totalBonusXp: state.totalBonusXp,
      });
    });
    return () => unsub();
  }, []);

  // Reset function for new game
  const resetRunStats = () => {
    setRunStats(RUN_STATS_DEFAULTS);
  };

  return {
    runStats,
    resetRunStats,
  };
}
