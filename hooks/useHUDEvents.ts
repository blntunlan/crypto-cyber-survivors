/**
 * useHUDEvents - HUD Event Subscription Hook
 *
 * Handles all EventBus subscriptions for HUD:
 * - Combo milestones + in-run milestone announcements (queued)
 * - Level up flash
 * - Clutch kills
 * - Game reset
 * - Achievements
 */

import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../services/core/EventBus';
import { audio } from '../services/audio';
import {
  ANNOUNCER_MILESTONE_TYPES,
  HIDDEN_GAMEPLAY_MILESTONE_TYPES,
  MILESTONE_ANNOUNCEMENT,
} from '../config/MilestoneConfig';
import { type MilestoneAchievedEvent } from '../types/events';
import { type Player, GameStatus } from '../types';

export interface Achievement {
  name: string;
  icon: string;
  color: string;
}

/** A single center-screen announcement (combo milestone or in-run milestone). */
export interface ActiveAnnouncement {
  /** Monotonic id — used as a React key so animations restart per entry */
  seq: number;
  kind: 'combo' | 'milestone' | 'danger';
  name: string;
  nameKey?: string;
  nameParams?: Record<string, string | number>;
  color: string;
  icon?: string;
  sound?: string;
}

export interface UseHUDEventsReturn {
  flash: number;
  announcement: ActiveAnnouncement | null;
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
  const [flash, setFlash] = useState(0);
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const [clutchActive, setClutchActive] = useState(false);
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  // Announcement queue (refs — event-driven, never touched in the RAF loop)
  const queueRef = useRef<ActiveAnnouncement[]>([]);
  const activeAnnouncementRef = useRef<ActiveAnnouncement | null>(null);
  const announcementSeqRef = useRef(0);

  // Timeout refs for cleanup
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    const playAnnouncementSound = (entry: ActiveAnnouncement) => {
      if (!entry.sound) return;
      if (entry.kind === 'combo') {
        audio.playComboMilestone(
          entry.sound as 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5'
        );
      } else if (entry.sound === 'tension') {
        audio.playSlowdownTension();
      } else if (entry.sound === 'glint') {
        audio.playAchievementGlint();
      }
    };

    const displayDuration = (entry: ActiveAnnouncement) =>
      entry.kind === 'combo'
        ? MILESTONE_ANNOUNCEMENT.COMBO_DISPLAY_MS
        : MILESTONE_ANNOUNCEMENT.DISPLAY_MS;

    const scheduleHide = (entry: ActiveAnnouncement) => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = setTimeout(() => {
        showTimeoutRef.current = null;
        activeAnnouncementRef.current = null;
        setAnnouncement(null);
        gapTimeoutRef.current = setTimeout(() => {
          gapTimeoutRef.current = null;
          showNext();
        }, MILESTONE_ANNOUNCEMENT.GAP_MS);
      }, displayDuration(entry));
    };

    const showNext = () => {
      const next = queueRef.current.shift();
      if (!next) return;
      activeAnnouncementRef.current = next;
      setAnnouncement(next);
      playAnnouncementSound(next);
      scheduleHide(next);
    };

    const chainIdle = () =>
      !activeAnnouncementRef.current &&
      !showTimeoutRef.current &&
      !gapTimeoutRef.current;

    const enqueue = (entry: ActiveAnnouncement, priority: boolean) => {
      if (priority) {
        queueRef.current.unshift(entry);
      } else {
        queueRef.current.push(entry);
        // Bound the queue: newest info matters most, drop the oldest pending
        while (queueRef.current.length > MILESTONE_ANNOUNCEMENT.MAX_QUEUE) {
          queueRef.current.shift();
        }
      }
      if (chainIdle()) showNext();
    };

    const clearAnnouncements = () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current);
      showTimeoutRef.current = null;
      gapTimeoutRef.current = null;
      queueRef.current = [];
      activeAnnouncementRef.current = null;
      setAnnouncement(null);
    };

    const unsubMilestone = EventBus.on(
      'comboMilestone',
      (data: { name: string; color: string; sound?: string }) => {
        const entry: ActiveAnnouncement = {
          seq: ++announcementSeqRef.current,
          kind: 'combo',
          name: data.name,
          color: data.color,
          sound: data.sound,
        };
        if (activeAnnouncementRef.current?.kind === 'combo') {
          // Escalating combo replaces the shown one in place and resets its timer
          activeAnnouncementRef.current = entry;
          setAnnouncement(entry);
          playAnnouncementSound(entry);
          scheduleHide(entry);
        } else {
          // A milestone is showing (combo takes priority) or the chain is idle
          enqueue(entry, true);
        }
      }
    );

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
      clearAnnouncements();
      setFlash(0);
      setClutchActive(false);
      setAchievement(null);
      wasCriticalRef.current = false;
      clutchPendingRef.current = false;
    });

    const unsubAchievement = EventBus.on(
      'milestoneAchieved',
      (data: MilestoneAchievedEvent) => {
        // In-run milestones (kills/time/level/pnl/danger) go to the queued
        // center-screen announcer
        if (ANNOUNCER_MILESTONE_TYPES.has(data.type)) {
          enqueue(
            {
              seq: ++announcementSeqRef.current,
              kind: data.severity === 'danger' ? 'danger' : 'milestone',
              name: data.name,
              nameKey: data.nameKey,
              nameParams: data.nameParams,
              color: data.color,
              icon: data.icon,
              sound: data.sound,
            },
            false
          );
          return;
        }

        if (HIDDEN_GAMEPLAY_MILESTONE_TYPES.has(data.type)) {
          return;
        }

        if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
        setAchievement({ name: data.name, icon: data.icon, color: data.color });
        achievementTimeoutRef.current = setTimeout(() => setAchievement(null), 3500);
      }
    );

    return () => {
      unsubMilestone();
      unsubLevelUp();
      unsubEnemyKilled();
      unsubReset();
      unsubAchievement();
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (clutchTimeoutRef.current) clearTimeout(clutchTimeoutRef.current);
      if (achievementTimeoutRef.current) clearTimeout(achievementTimeoutRef.current);
    };
  }, []); // Removed [player] dependency from this effect loop as it uses EventBus

  return {
    flash,
    announcement,
    clutchActive,
    achievement,
  };
}
