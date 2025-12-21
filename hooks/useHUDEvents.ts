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
import { EventBus } from '../services/EventBus';
import { ComboSystem } from '../services/ComboSystem';
import { audio } from '../services/audioService';
import { COLORS } from '../constants';
import { type Player } from '../types';

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
export function useHUDEvents(player?: Player): UseHUDEventsReturn {
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
      (data: { name: string; color: string; sound: string }) => {
        if (milestoneTimeoutRef.current) clearTimeout(milestoneTimeoutRef.current);
        setUiMeta(prev => ({
          ...prev,
          milestoneText: data.name,
          milestoneColor: data.color,
        }));
        setShowMilestone(true);
        audio.playComboMilestone(
          data.sound as 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5'
        );
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

    const unsubEnemyKilled = EventBus.on('enemyKilled', () => {
      if (player && player.hp < player.maxHp * 0.1) {
        setClutchActive(true);
        if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
        clutchTimeoutRef.current = setTimeout(() => setClutchActive(false), 1500);
      }
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
  }, [player]);

  return {
    uiMeta,
    flash,
    showMilestone,
    clutchActive,
    achievement,
  };
}
