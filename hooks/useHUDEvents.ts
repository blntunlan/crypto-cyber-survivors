/**
 * useHUDEvents - HUD Event Subscription Hook
 *
 * Handles all EventBus subscriptions for HUD:
 * - Combo updates
 * - Combo milestones
 * - Combo end
 * - Level up flash
 * - Clutch kills
 * - Game reset
 * - Achievements
 */

import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../services/core/EventBus';
import { ComboSystem } from '../services/combat/ComboSystem';
import { audio } from '../services/audio';
import { COLORS } from '../constants';
import { type Player, GameStatus } from '../types';

export interface ComboUIState {
  milestoneText: string;
  milestoneColor: string;
  maxStreak: number;
  totalBonusXp: number;
}

export interface Achievement {
  name: string;
  icon: string;
  color: string;
}

export interface UseHUDEventsReturn {
  uiMeta: ComboUIState;
  flash: number;
  showMilestone: boolean;
  clutchActive: boolean;
  achievement: Achievement | null;
}

/**
 * Hook for managing HUD event subscriptions
 */
export function useHUDEvents(
  player: Player | undefined,
  status: GameStatus
): UseHUDEventsReturn {
  const [uiMeta, setUiMeta] = useState<ComboUIState>({
    milestoneText: '',
    milestoneColor: COLORS.NEON_ORANGE,
    maxStreak: 0,
    totalBonusXp: 0,
  });
  const [flash, setFlash] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [clutchActive, setClutchActive] = useState(false);
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  // Timeout refs for cleanup
  const milestoneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clutchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const achievementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track critical state for "Clutch" (recovery) moment
  const wasCriticalRef = useRef(false);
  const clutchPendingRef = useRef(false);

  const triggerClutch = () => {
    setClutchActive(true);
    if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
    clutchTimeoutRef.current = setTimeout(() => setClutchActive(false), 2000); // Display for 2s
  };

  useEffect(() => {
    if (!player) return;

    const hpPercent = player.hp / player.maxHp;

    // 1. Mark as critical if HP drops below 20%
    if (hpPercent < 0.2) {
      wasCriticalRef.current = true;
    }

    // 2. Trigger CLUTCH if recovering from critical to > 50%
    if (wasCriticalRef.current && hpPercent > 0.5) {
      // If Level Up (which heals), defer the announcement until we return to gameplay
      if (status === GameStatus.LEVEL_UP) {
        clutchPendingRef.current = true;
        wasCriticalRef.current = false;
      } else {
        triggerClutch();
        wasCriticalRef.current = false;
      }
    }
  }, [player, status]);

  // Handle pending clutch when returning to PLAYING state
  useEffect(() => {
    if (status === GameStatus.PLAYING && clutchPendingRef.current) {
      triggerClutch();
      clutchPendingRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    const unsubUpdate = EventBus.on('comboUpdate', (data: { totalBonusXp: number }) => {
      setUiMeta(prev => ({
        ...prev,
        totalBonusXp: data.totalBonusXp,
        maxStreak: ComboSystem.getMaxStreak(),
      }));
    });

    const unsubMilestone = EventBus.on(
      'comboMilestone',
      (data: { name: string; color: string; sound?: string }) => {
        if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
        setUiMeta(prev => ({
          ...prev,
          milestoneText: data.name,
          milestoneColor: data.color,
        }));
        setShowMilestone(true);
        // Only play sound if provided (may be on cooldown)
        if (data.sound) {
          audio.playComboMilestone(
            data.sound as 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5'
          );
        }
        milestoneTimeoutRef.current = setTimeout(() => setShowMilestone(false), 2500);
      }
    );

    const unsubEnd = EventBus.on('comboEnd', (data: { bonusXp: number }) => {
      setUiMeta(prev => ({ ...prev, totalBonusXp: data.bonusXp }));
    });

    const unsubLevelUp = EventBus.on('levelUpStart', () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      setFlash(1.0);
      flashTimeoutRef.current = setTimeout(() => setFlash(0), 500);
    });

    // REMOVED: Enemy kill based clutch trigger
    const unsubEnemyKilled = EventBus.on('enemyKilled', () => {
      // Logic moved to HP recovery check above
    });

    const unsubReset = EventBus.on('gameReset', () => {
      setUiMeta({
        milestoneText: '',
        milestoneColor: COLORS.NEON_ORANGE,
        maxStreak: 0,
        totalBonusXp: 0,
      });
      setShowMilestone(false);
      setFlash(0);
      setClutchActive(false);
      setAchievement(null);
      wasCriticalRef.current = false;
      clutchPendingRef.current = false;
    });

    const unsubAchievement = EventBus.on(
      'milestoneAchieved',
      (data: { name: string; icon: string; color: string }) => {
        if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
        setAchievement({ name: data.name, icon: data.icon, color: data.color });
        achievementTimeoutRef.current = setTimeout(() => setAchievement(null), 3500);
      }
    );

    return () => {
      unsubUpdate();
      unsubMilestone();
      unsubEnd();
      unsubLevelUp();
      unsubEnemyKilled();
      unsubReset();
      unsubAchievement();
      if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
      if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
    };
  }, []); // Removed [player] dependency from this effect loop as it uses EventBus

  return {
    uiMeta,
    flash,
    showMilestone,
    clutchActive,
    achievement,
  };
}
