/**
 * ComboSystem - Kill Streak & Combo Multiplier
 *
 * Tracks consecutive kills and provides XP bonuses.
 * Resets after a timeout (no kills for 3 seconds).
 *
 * Now uses TimeService for frame-rate and pause-independent timing.
 */

import { EventBus } from './EventBus';
import { TimeService } from './TimeService';
import { COLORS } from '../constants';

export interface ComboState {
  killStreak: number;
  maxStreak: number;
  comboMultiplier: number;
  lastKillTime: number; // In Game Time (ms)
  totalKills: number;
  totalBonusXp: number;
}

export interface ComboMilestone {
  kills: number;
  name: string;
  multiplier: number;
  color: string;
  sound: 'combo1' | 'combo2' | 'combo3' | 'combo4' | 'combo5';
}

const COMBO_MILESTONES: ComboMilestone[] = [
  { kills: 5, name: 'COMBO!', multiplier: 1.2, color: COLORS.ELECTRIC_BLUE, sound: 'combo1' },
  { kills: 10, name: 'SUPER COMBO!', multiplier: 1.5, color: COLORS.NEON_ORANGE, sound: 'combo2' },
  {
    kills: 25,
    name: 'MEGA COMBO!',
    multiplier: 2.0,
    color: COLORS.BRILLIANT_ROSE,
    sound: 'combo3',
  },
  { kills: 50, name: 'ULTRA COMBO!', multiplier: 2.5, color: COLORS.ROYAL_PURPLE, sound: 'combo4' },
  { kills: 100, name: 'JACKPOT!', multiplier: 3.0, color: COLORS.JACKPOT_YELLOW, sound: 'combo5' },
];

const COMBO_TIMEOUT_MS = 3000; // 3 seconds without kill = combo reset

class ComboSystemClass {
  private static instance: ComboSystemClass | null = null;

  private state: ComboState = {
    killStreak: 0,
    maxStreak: 0,
    comboMultiplier: 1.0,
    lastKillTime: 0,
    totalKills: 0,
    totalBonusXp: 0,
  };

  private lastMilestoneIndex = -1;
  private lastMilestoneSoundTime = 0; // For sound cooldown
  private static readonly MILESTONE_SOUND_COOLDOWN = 300; // ms

  private constructor() {
    this.setupListeners();
  }

  static getInstance(): ComboSystemClass {
    return (ComboSystemClass.instance ??= new ComboSystemClass());
  }

  private setupListeners(): void {
    EventBus.on('enemyKilled', () => {
      this.recordKill();
    });

    EventBus.on('gemCollected', data => {
      if (this.state.killStreak > 0) {
        const bonus = Math.floor(data.value * this.state.comboMultiplier) - data.value;
        if (bonus > 0) {
          this.state.totalBonusXp += bonus;
          EventBus.emit('comboUpdate', {
            killStreak: this.state.killStreak,
            multiplier: this.state.comboMultiplier,
            totalBonusXp: this.state.totalBonusXp,
          });
        }
      }
    });
  }

  /**
   * Start a new game session
   */
  startGame(): void {
    this.state = {
      killStreak: 0,
      maxStreak: 0,
      comboMultiplier: 1.0,
      lastKillTime: 0,
      totalKills: 0,
      totalBonusXp: 0,
    };
    this.lastMilestoneIndex = -1;
    this.lastMilestoneSoundTime = 0;
  }

  /**
   * Record a kill and update combo state
   */
  recordKill(): void {
    const now = TimeService.getGameTime();

    // Check if combo should have reset (if it wasn't already reset by update())
    const elapsed = now - this.state.lastKillTime;
    if (this.state.lastKillTime > 0 && elapsed > COMBO_TIMEOUT_MS) {
      this.resetCombo();
    }

    this.state.killStreak++;
    this.state.totalKills++;
    this.state.lastKillTime = now;

    // Update max streak
    if (this.state.killStreak > this.state.maxStreak) {
      this.state.maxStreak = this.state.killStreak;
    }

    // Check for milestone
    this.checkMilestone();

    // Emit combo update
    EventBus.emit('comboUpdate', {
      killStreak: this.state.killStreak,
      multiplier: this.state.comboMultiplier,
      totalBonusXp: this.state.totalBonusXp,
    });
  }

  /**
   * Check and trigger milestones
   */
  private checkMilestone(): void {
    const currentTime = TimeService.getGameTime();

    for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
      const milestone = COMBO_MILESTONES[i]!;
      if (this.state.killStreak >= milestone.kills && i > this.lastMilestoneIndex) {
        this.lastMilestoneIndex = i;
        this.state.comboMultiplier = milestone.multiplier;

        // Check sound cooldown to prevent audio spam from multi-kills
        const canPlaySound =
          currentTime - this.lastMilestoneSoundTime >= ComboSystemClass.MILESTONE_SOUND_COOLDOWN;

        EventBus.emit('comboMilestone', {
          name: milestone.name,
          kills: milestone.kills,
          multiplier: milestone.multiplier,
          color: milestone.color,
          sound: canPlaySound ? milestone.sound : undefined, // Only include sound if cooldown passed
        });

        if (canPlaySound) {
          this.lastMilestoneSoundTime = currentTime;
        }

        break;
      }
    }
  }

  /**
   * Reset combo (on timeout or death)
   */
  resetCombo(): void {
    if (this.state.killStreak > 0) {
      EventBus.emit('comboEnd', {
        finalStreak: this.state.killStreak,
        bonusXp: this.state.totalBonusXp,
      });
    }
    this.state.killStreak = 0;
    this.state.comboMultiplier = 1.0;
    this.lastMilestoneIndex = -1;
  }

  /**
   * Check if combo should timeout (call this in game loop)
   * Automatically ignores pause time because it uses TimeService.gameTime
   */
  update(): void {
    if (this.state.killStreak > 0 && this.state.lastKillTime > 0) {
      const now = TimeService.getGameTime();
      const elapsed = now - this.state.lastKillTime;
      if (elapsed > COMBO_TIMEOUT_MS) {
        this.resetCombo();
      }
    }
  }

  /**
   * Get XP multiplier for current combo
   */
  getXpMultiplier(): number {
    return this.state.comboMultiplier;
  }

  /**
   * Get current kill streak
   */
  getKillStreak(): number {
    return this.state.killStreak;
  }

  /**
   * Get total kills this session
   */
  getTotalKills(): number {
    return this.state.totalKills;
  }

  /**
   * Get max streak this session
   */
  getMaxStreak(): number {
    return this.state.maxStreak;
  }

  /**
   * Get time remaining before combo expires (0-1)
   * Automatically freezes while game is paused
   */
  getComboTimeRemaining(): number {
    if (this.state.killStreak === 0 || this.state.lastKillTime === 0) return 0;
    const now = TimeService.getGameTime();
    const elapsed = now - this.state.lastKillTime;
    return Math.max(0, 1 - elapsed / COMBO_TIMEOUT_MS);
  }

  /**
   * Get current combo state for UI
   */
  getState(): ComboState {
    return { ...this.state };
  }

  /**
   * Get current milestone info
   */
  getCurrentMilestone(): ComboMilestone | null {
    if (this.lastMilestoneIndex >= 0) {
      return COMBO_MILESTONES[this.lastMilestoneIndex] ?? null;
    }
    return null;
  }

  /**
   * Get next milestone info
   */
  getNextMilestone(): ComboMilestone | null {
    const nextIndex = this.lastMilestoneIndex + 1;
    if (nextIndex < COMBO_MILESTONES.length) {
      return COMBO_MILESTONES[nextIndex] ?? null;
    }
    return null;
  }
}

// Export singleton
export const ComboSystem = ComboSystemClass.getInstance();

// Export milestones for UI
export { COMBO_MILESTONES, COMBO_TIMEOUT_MS };
