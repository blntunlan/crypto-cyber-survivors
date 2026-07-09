/**
 * MilestoneService - In-Run Milestone Tracking
 *
 * Tracks player progress and emits events when milestones are reached.
 * Milestones fire once per run (no repeats); definitions live in
 * config/MilestoneConfig.ts. PnL/danger milestones are fed by the canonical
 * market stream and only fire while the game is actively PLAYING.
 */

import { EventBus } from '../core/EventBus';
import { GameStateMachine } from '../core/GameStateMachine';
import { GameStatus } from '../../types';
import {
  MILESTONE_DEFINITIONS,
  type MilestoneDefinition,
  type MilestoneType,
} from '../../config/MilestoneConfig';

// Exported for testing
export class MilestoneServiceClass {
  private static instance: MilestoneServiceClass | null = null;
  private achievedMilestones: Set<string> = new Set();
  private totalKills: number = 0;

  // FIXED: Store unsubscribe functions for proper cleanup
  private unsubscribeFns: (() => void)[] = [];

  public constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Subscribe to game events and store unsubscribe functions
    this.unsubscribeFns.push(
      EventBus.on('enemyKilled', () => this.recordKill(), { scope: 'gameplay' }),
      EventBus.on('levelUpComplete', data => this.recordLevelUp(data.newLevel), {
        scope: 'gameplay',
      }),
      EventBus.on(
        'secondElapsed',
        data => this.checkTimeMilestones(data.totalSeconds),
        { scope: 'gameplay' }
      ),
      // NOTE: the canonicalMarketUpdate payload is a shared object mutated in
      // place by MarketEventConsolidator — read pnlPercent immediately, never
      // retain the reference.
      EventBus.on(
        'canonicalMarketUpdate',
        data => this.checkPnLMilestones(data.pnlPercent),
        { scope: 'gameplay' }
      ),
      EventBus.on('gameReset', () => this.reset(), { scope: 'system' })
    );
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
   * Check PnL milestones (positive) and danger announcements (negative).
   * Market events keep flowing during PAUSED/LEVEL_UP/GAMEOVER, so gate on
   * the live PLAYING state.
   */
  checkPnLMilestones(pnlPercent: number): void {
    if (!Number.isFinite(pnlPercent)) return;
    if (GameStateMachine.getState() !== GameStatus.PLAYING) return;
    this.checkMilestones('pnl', pnlPercent);
    this.checkMilestones('danger', pnlPercent);
  }

  /**
   * Check and emit any newly achieved milestones
   */
  private checkMilestones(type: MilestoneType, value: number): void {
    for (const milestone of MILESTONE_DEFINITIONS) {
      if (milestone.type !== type) continue;
      if (this.achievedMilestones.has(milestone.id)) continue;
      if (!this.isThresholdMet(milestone, value)) continue;
      this.achievedMilestones.add(milestone.id);
      EventBus.emit('milestoneAchieved', {
        id: milestone.id,
        name: milestone.fallbackName,
        nameKey: milestone.nameKey,
        nameParams: milestone.nameParams,
        icon: milestone.icon,
        color: milestone.color,
        type: milestone.type,
        threshold: milestone.threshold,
        severity: milestone.severity,
        sound: milestone.sound,
      });
    }
  }

  /**
   * Danger thresholds are negative and trigger on the way down; everything
   * else triggers on the way up.
   */
  private isThresholdMet(milestone: MilestoneDefinition, value: number): boolean {
    return milestone.type === 'danger'
      ? value <= milestone.threshold
      : value >= milestone.threshold;
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

  /**
   * Reset for testing - cleanup EventBus listeners
   */
  static resetForTesting(): void {
    if (this.instance) {
      // Unsubscribe all listeners
      this.instance.unsubscribeFns.forEach(unsub => unsub());
      this.instance.unsubscribeFns = [];
      this.instance = null;
    }
  }
}

// Export singleton
export const MilestoneService = MilestoneServiceClass.getInstance();
