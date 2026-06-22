/**
 * ComboSystem - Kill Streak & XP Multiplier Orchestrator
 *
 * Tracks consecutive kills and provides dynamic XP bonuses.
 * Resets after a predetermined timeout of inactivity.
 * Integrates with TimeService to ensure pause-independent mechanics.
 */

import { EventBus } from '../core/EventBus';
import { TimeService } from '../core/TimeService';
import { COLORS, COMBO } from '../../constants';
import { type ComboDebugState, getDebugTimestamp } from '../../types/DebugState';

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

/**
 * Predefined milestones for kill streaks.
 * As the streak increases, the name becomes more intense and rewards higher multipliers.
 */
export const COMBO_MILESTONES: ComboMilestone[] = [
  {
    kills: 5,
    name: 'COMBO!',
    multiplier: 1.2,
    color: COLORS.ELECTRIC_BLUE,
    sound: 'combo1',
  },
  {
    kills: 10,
    name: 'SUPER COMBO!',
    multiplier: 1.5,
    color: COLORS.NEON_ORANGE,
    sound: 'combo2',
  },
  {
    kills: 25,
    name: 'MEGA COMBO!',
    multiplier: 2.0,
    color: COLORS.BRILLIANT_ROSE,
    sound: 'combo3',
  },
  {
    kills: 50,
    name: 'ULTRA COMBO!',
    multiplier: 2.5,
    color: COLORS.ROYAL_PURPLE,
    sound: 'combo4',
  },
  {
    kills: 100,
    name: 'JACKPOT!',
    multiplier: 3.0,
    color: COLORS.JACKPOT_YELLOW,
    sound: 'combo5',
  },
];

/**
 * ComboSystemClass - Management class for kill streak state.
 */
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
  private lastMilestoneSoundTime = 0; // Throttling for audio feedback
  private unsubscribeFns: (() => void)[] = [];

  private constructor() {
    this.setupListeners();
  }

  /**
   * Singleton accessor.
   */
  public static getInstance(): ComboSystemClass {
    return (ComboSystemClass.instance ??= new ComboSystemClass());
  }

  /**
   * Subscribes to game events to drive combo state.
   */
  private setupListeners(): void {
    this.unsubscribeFns.push(
      EventBus.on('enemyKilled', () => {
        this.recordKill();
      }),
      EventBus.on('gemCollected', data => {
        if (this.state.killStreak > 0) {
          // Calculate bonus XP based on active multiplier
          const bonus =
            Math.floor(data.value * this.state.comboMultiplier) - data.value;

          if (bonus > 0) {
            this.state.totalBonusXp += bonus;
            this.emitUpdate();
          }
        }
      }),
      EventBus.on('gameReset', () => {
        this.startGame();
      })
    );
  }

  /**
   * Initializes state for a new session.
   */
  public startGame(): void {
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
   * Updates state on every enemy elimination.
   * Handles timeout checks and milestone threshold crossings.
   */
  public recordKill(): void {
    const now = TimeService.getGameTime();

    // 1. Validation: If a manual update() hasn't run, check timeout here
    const elapsed = now - this.state.lastKillTime;
    if (this.state.lastKillTime > 0 && elapsed > COMBO.TIMEOUT_MS) {
      this.resetCombo();
    }

    // 2. State Increment
    this.state.killStreak++;
    this.state.totalKills++;
    this.state.lastKillTime = now;

    // 3. Peak Performance tracking
    if (this.state.killStreak > this.state.maxStreak) {
      this.state.maxStreak = this.state.killStreak;
    }

    // 4. Milestone Check
    this.checkMilestone();

    // 5. Broadcast change
    this.emitUpdate();
  }

  /**
   * Iterates through milestones to find the highest reached by current streak.
   */
  private checkMilestone(): void {
    const currentTime = TimeService.getGameTime();

    for (let i = COMBO_MILESTONES.length - 1; i >= 0; i--) {
      const milestone = COMBO_MILESTONES[i]!;

      // Found the highest milestone reached since the last check
      if (this.state.killStreak >= milestone.kills && i > this.lastMilestoneIndex) {
        this.lastMilestoneIndex = i;
        this.state.comboMultiplier = milestone.multiplier;

        // Sound Throttling: Prevents audio phasing during high-density multi-kills
        const canPlaySound =
          currentTime - this.lastMilestoneSoundTime >= COMBO.MILESTONE_SOUND_COOLDOWN;

        EventBus.emit('comboMilestone', {
          name: milestone.name,
          kills: milestone.kills,
          multiplier: milestone.multiplier,
          color: milestone.color,
          sound: canPlaySound ? milestone.sound : undefined,
        });

        if (canPlaySound) {
          this.lastMilestoneSoundTime = currentTime;
        }

        break;
      }
    }
  }

  /**
   * Finalizes combo metrics and resets to base state.
   */
  public resetCombo(): void {
    if (this.state.killStreak > 0) {
      EventBus.emit('comboEnd', {
        finalStreak: this.state.killStreak,
        bonusXp: this.state.totalBonusXp,
      });
    }

    this.state.killStreak = 0;
    this.state.comboMultiplier = 1.0;
    this.lastMilestoneIndex = -1;

    this.emitUpdate();
  }

  /**
   * Periodic maintenance (should be called in Game Loop).
   * Ensures combo expires even if no entities are being interacted with.
   */
  public update(): void {
    if (this.state.killStreak > 0 && this.state.lastKillTime > 0) {
      const now = TimeService.getGameTime();
      const elapsed = now - this.state.lastKillTime;

      if (elapsed > COMBO.TIMEOUT_MS) {
        this.resetCombo();
      }
    }
  }

  /**
   * Current XP leverage factor.
   */
  public getXpMultiplier(): number {
    return this.state.comboMultiplier;
  }

  /**
   * Current active kill streak.
   */
  public getKillStreak(): number {
    return this.state.killStreak;
  }

  /**
   * Total enemies dispatched this session.
   */
  public getTotalKills(): number {
    return this.state.totalKills;
  }

  /**
   * Highest streak achieved this session.
   */
  public getMaxStreak(): number {
    return this.state.maxStreak;
  }

  /**
   * Normalised percentage (0.0 to 1.0) of time remaining before combo drops.
   */
  public getComboTimeRemaining(): number {
    if (this.state.killStreak === 0 || this.state.lastKillTime === 0) {
      return 0;
    }
    const now = TimeService.getGameTime();
    const elapsed = now - this.state.lastKillTime;
    return Math.max(0, 1 - elapsed / COMBO.TIMEOUT_MS);
  }

  /**
   * Direct snapshot of internal state.
   */
  public getState(): ComboState {
    return { ...this.state };
  }

  /**
   * Current active tier information.
   */
  public getCurrentMilestone(): ComboMilestone | null {
    if (this.lastMilestoneIndex >= 0) {
      return COMBO_MILESTONES[this.lastMilestoneIndex] ?? null;
    }
    return null;
  }

  /**
   * Next target tier information.
   */
  public getNextMilestone(): ComboMilestone | null {
    const nextIndex = this.lastMilestoneIndex + 1;
    if (nextIndex < COMBO_MILESTONES.length) {
      return COMBO_MILESTONES[nextIndex] ?? null;
    }
    return null;
  }

  /**
   * Broadcaster for the comboUpdate event.
   */
  private emitUpdate(): void {
    EventBus.emit('comboUpdate', {
      killStreak: this.state.killStreak,
      multiplier: this.state.comboMultiplier,
      totalBonusXp: this.state.totalBonusXp,
    });
  }

  /**
   * Debugging utility for runtime inspection panels.
   */
  public getDebugState(): ComboDebugState {
    const currentMilestone = this.getCurrentMilestone();
    const nextMilestone = this.getNextMilestone();

    return {
      systemName: 'ComboSystem',
      timestamp: getDebugTimestamp(),
      killStreak: this.state.killStreak,
      maxStreak: this.state.maxStreak,
      comboMultiplier: this.state.comboMultiplier,
      totalKills: this.state.totalKills,
      totalBonusXp: this.state.totalBonusXp,
      timeToExpire: this.getComboTimeRemaining(),
      currentMilestone: currentMilestone?.name ?? null,
      nextMilestone: nextMilestone?.name ?? null,
    };
  }

  /**
   * Cleanly terminates the singleton instance for testing environments.
   */
  public static resetForTesting(): void {
    if (this.instance) {
      this.instance.unsubscribeFns.forEach(unsub => unsub());
      this.instance.unsubscribeFns = [];
      this.instance = null;
    }
  }
}

// Export singleton
export const ComboSystem = ComboSystemClass.getInstance();

export const COMBO_TIMEOUT_MS = COMBO.TIMEOUT_MS;
