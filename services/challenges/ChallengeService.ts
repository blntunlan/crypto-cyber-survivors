/**
 * ChallengeService — Daily/Weekly challenge tracking
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { GameSessionService } from '../auth/GameSessionService';
import {
  type ChallengeDefinition,
  type ChallengeObjective,
  type ChallengeStatus,
} from '../../types/challenge';

class ChallengeServiceClass {
  private activeChallenge: ChallengeDefinition | null = null;
  private objectives: Map<string, ChallengeObjective> = new Map();
  private tracking = false;
  private unsubscribers: (() => void)[] = [];
  private survivalTimer = 0;
  private liquidationZoneTimer = 0;
  private inLiquidationZone = false;

  async fetchTodayChallenge(): Promise<ChallengeDefinition | null> {
    try {
      return await railwayClient.get<ChallengeDefinition>('/api/v1/challenges/today');
    } catch {
      Logger.warn('[ChallengeService] Failed to fetch daily challenge');
      return null;
    }
  }

  async fetchWeeklyChallenge(): Promise<ChallengeDefinition | null> {
    try {
      return await railwayClient.get<ChallengeDefinition>('/api/v1/challenges/weekly');
    } catch {
      Logger.warn('[ChallengeService] Failed to fetch weekly challenge');
      return null;
    }
  }

  async fetchStatus(): Promise<ChallengeStatus> {
    try {
      return await railwayClient.get<ChallengeStatus>('/api/v1/challenges/status');
    } catch {
      return { dailyCompleted: false, weeklyCompleted: false };
    }
  }

  setActiveChallenge(challenge: ChallengeDefinition): void {
    this.activeChallenge = challenge;
    this.objectives.clear();
    for (const obj of challenge.objectives) {
      this.objectives.set(obj.type, { ...obj, current: 0, completed: false });
    }
  }

  getActiveChallenge(): ChallengeDefinition | null {
    return this.activeChallenge;
  }

  getObjectives(): ChallengeObjective[] {
    return [...this.objectives.values()];
  }

  validateConstraints(position: string, leverage: number): string | null {
    if (!this.activeChallenge) return null;
    for (const c of this.activeChallenge.constraints) {
      if (c.type === 'position' && position !== c.value) {
        return `This challenge requires ${String(c.value)} position`;
      }
      if (c.type === 'leverage_min' && leverage < (c.value as number)) {
        return `This challenge requires minimum ${String(c.value)}x leverage`;
      }
      if (c.type === 'leverage_max' && leverage > (c.value as number)) {
        return `This challenge requires maximum ${String(c.value)}x leverage`;
      }
    }
    return null;
  }

  startTracking(): void {
    if (!this.activeChallenge) return;
    // Clean up any previous tracking before starting new one
    if (this.tracking) this.stopTracking();
    this.tracking = true;
    this.survivalTimer = 0;
    this.liquidationZoneTimer = 0;

    const unsub1 = EventBus.on('enemyKilled', data => {
      this.updateObjective('kill_count', 1, 'add');
      if (data.type === 'whale' || data.enemyType === 'whale') {
        this.updateObjective('whale_kill_count', 1, 'add');
      }
    });

    const unsub2 = EventBus.on('levelUpComplete', data => {
      this.updateObjective('reach_level', data.newLevel, 'max');
    });

    const unsub3 = EventBus.on('secondElapsed', () => {
      this.survivalTimer++;
      this.updateObjective('survive_seconds', this.survivalTimer, 'max');
      if (this.inLiquidationZone) {
        this.liquidationZoneTimer++;
        this.updateObjective(
          'survive_liquidation_zone',
          this.liquidationZoneTimer,
          'max'
        );
      }
    });

    const unsub4 = EventBus.on('liquidationWarning', data => {
      this.inLiquidationZone = data.level === 'DANGER' || data.level === 'CRITICAL';
    });

    this.unsubscribers = [unsub1, unsub2, unsub3, unsub4];
    EventBus.emit('challengeStarted', {
      challengeId: this.activeChallenge.id,
      type: this.activeChallenge.type,
    });
  }

  private updateObjective(type: string, value: number, mode: 'add' | 'max'): void {
    const obj = this.objectives.get(type);
    if (!obj || obj.completed) return;
    obj.current = mode === 'add' ? obj.current + value : Math.max(obj.current, value);
    if (obj.current >= obj.target) {
      obj.completed = true;
    }
    EventBus.emit('challengeObjectiveUpdate', {
      type,
      current: obj.current,
      target: obj.target,
      completed: obj.completed,
    });
    this.checkAllObjectives();
  }

  private checkAllObjectives(): void {
    const allDone = [...this.objectives.values()].every(o => o.completed);
    if (allDone && this.activeChallenge) {
      void this.submitCompletion();
    }
  }

  private async submitCompletion(): Promise<void> {
    if (!this.activeChallenge) return;
    const challengeId = this.activeChallenge.id;
    const objectives = [...this.objectives.values()];
    const score =
      this.survivalTimer * objectives.reduce((sum, o) => sum + o.current, 0);
    const sessionId = GameSessionService.getCurrentSessionId();

    const killObj = this.objectives.get('kill_count');
    const levelObj = this.objectives.get('reach_level');

    if (!sessionId) {
      Logger.warn(
        '[ChallengeService] Skipping challenge completion without active session'
      );
      return;
    }

    try {
      const result = await railwayClient.post<{
        success: boolean;
        alreadyCompleted?: boolean;
        reward: { metaCoins: number; bonusXp: number };
      }>('/api/v1/challenges/complete', {
        challengeId,
        sessionId,
        score,
        survivalSeconds: this.survivalTimer,
        kills: killObj?.current ?? 0,
        levelReached: levelObj?.current ?? 1,
        objectivesCompleted: objectives
          .filter(o => o.completed)
          .map(o => ({ type: o.type, current: o.current, target: o.target })),
      });

      if (result.success) {
        if (result.alreadyCompleted) return;
        EventBus.emit('challengeCompleted', { challengeId, reward: result.reward });
        EventBus.emit('gameNotification', {
          title: 'Challenge Complete!',
          message: `+${result.reward.metaCoins} Meta Coins`,
          type: 'success',
        });
      }
    } catch {
      Logger.error('[ChallengeService] Failed to submit challenge completion');
    }
  }

  onRunEnd(): void {
    this.stopTracking();
  }

  stopTracking(): void {
    this.tracking = false;
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.survivalTimer = 0;
    this.liquidationZoneTimer = 0;
    this.inLiquidationZone = false;
  }

  reset(): void {
    this.stopTracking();
    this.activeChallenge = null;
    this.objectives.clear();
  }
}

export const ChallengeService = new ChallengeServiceClass();
