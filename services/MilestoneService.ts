/**
 * MilestoneService - Achievement & Milestone Tracking
 *
 * Tracks player progress and emits events when milestones are reached.
 * Milestones are shown once per session (no repeats).
 */

import { EventBus } from './EventBus';

interface MilestoneConfig {
  id: string;
  name: string;
  type: 'kills' | 'time' | 'level';
  threshold: number;
  icon: string;
  color: string;
}

const MILESTONES: MilestoneConfig[] = [
  // Kill Milestones
  {
    id: 'kills_100',
    name: 'CENTURION',
    type: 'kills',
    threshold: 100,
    icon: '⚔️',
    color: '#c0c0c0',
  },
  { id: 'kills_250', name: 'SLAYER', type: 'kills', threshold: 250, icon: '🗡️', color: '#ffd700' },
  {
    id: 'kills_500',
    name: 'DESTROYER',
    type: 'kills',
    threshold: 500,
    icon: '💀',
    color: '#ff6b00',
  },
  {
    id: 'kills_1000',
    name: 'ANNIHILATOR',
    type: 'kills',
    threshold: 1000,
    icon: '🔥',
    color: '#ff0000',
  },
  {
    id: 'kills_2500',
    name: 'LEGEND',
    type: 'kills',
    threshold: 2500,
    icon: '👑',
    color: '#a855f7',
  },

  // Time Milestones (seconds)
  { id: 'time_60', name: '1 MINUTE!', type: 'time', threshold: 60, icon: '⏱️', color: '#22c55e' },
  {
    id: 'time_180',
    name: '3 MINUTES!',
    type: 'time',
    threshold: 180,
    icon: '⏱️',
    color: '#3b82f6',
  },
  {
    id: 'time_300',
    name: '5 MINUTES!',
    type: 'time',
    threshold: 300,
    icon: '⏱️',
    color: '#f59e0b',
  },
  {
    id: 'time_600',
    name: '10 MINUTES!',
    type: 'time',
    threshold: 600,
    icon: '🏆',
    color: '#ef4444',
  },

  // Level Milestones
  { id: 'level_5', name: 'LEVEL 5', type: 'level', threshold: 5, icon: '⬆️', color: '#22c55e' },
  { id: 'level_10', name: 'LEVEL 10', type: 'level', threshold: 10, icon: '⬆️', color: '#3b82f6' },
  { id: 'level_15', name: 'LEVEL 15', type: 'level', threshold: 15, icon: '⬆️', color: '#f59e0b' },
  { id: 'level_20', name: 'LEVEL 20', type: 'level', threshold: 20, icon: '🌟', color: '#ef4444' },
];

class MilestoneServiceClass {
  private static instance: MilestoneServiceClass | null = null;
  private achievedMilestones: Set<string> = new Set();
  private totalKills: number = 0;

  private constructor() {
    // Subscribe to game events
    EventBus.on('enemyKilled', () => this.recordKill());
    EventBus.on('levelUpComplete', data => this.recordLevelUp(data.newLevel));
    EventBus.on('gameReset', () => this.reset());
  }

  static getInstance(): MilestoneServiceClass {
    return (MilestoneServiceClass.instance ??= new MilestoneServiceClass());
  }

  /**
   * Start tracking for a new session
   */
  startSession(): void {
    // No longer using sessionStartTime, but kept for method compatibility
  }

  /**
   * Reset all milestone tracking
   */
  reset(): void {
    this.achievedMilestones.clear();
    this.totalKills = 0;
  }

  /**
   * Record a kill and check for milestones
   */
  private recordKill(): void {
    this.totalKills++;
    this.checkMilestones('kills', this.totalKills);
  }

  /**
   * Record a level up and check for milestones
   */
  private recordLevelUp(newLevel: number): void {
    this.checkMilestones('level', newLevel);
  }

  /**
   * Check for time-based milestones (called from game loop)
   */
  checkTimeMilestones(elapsedSeconds: number): void {
    this.checkMilestones('time', elapsedSeconds);
  }

  /**
   * Check and emit any newly achieved milestones
   */
  private checkMilestones(type: 'kills' | 'time' | 'level', value: number): void {
    for (const milestone of MILESTONES) {
      if (milestone.type !== type) continue;
      if (this.achievedMilestones.has(milestone.id)) continue;
      if (value >= milestone.threshold) {
        this.achievedMilestones.add(milestone.id);
        EventBus.emit('milestoneAchieved', {
          id: milestone.id,
          name: milestone.name,
          icon: milestone.icon,
          color: milestone.color,
          type: milestone.type,
          threshold: milestone.threshold,
        });
      }
    }
  }

  /**
   * Get total kills this session
   */
  getTotalKills(): number {
    return this.totalKills;
  }

  /**
   * Get list of achieved milestone IDs
   */
  getAchievedMilestones(): string[] {
    return Array.from(this.achievedMilestones);
  }
}

// Export singleton
export const MilestoneService = MilestoneServiceClass.getInstance();
