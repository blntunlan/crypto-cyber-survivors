/**
 * ReplayPlayerService — Plays back recorded replays
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import {
  type PlaybackData,
  type GhostEntity,
  type PlaybackEvent,
  type PlaybackTickResult,
  type ReplaySummary,
} from '../../types/replayPlayback';

class ReplayPlayerServiceClass {
  private replay: PlaybackData | null = null;
  private currentTimeMs = 0;
  private snapshotIndex = 0;
  private eventIndex = 0;
  private ghostPlayer: GhostEntity | null = null;
  private playbackSpeed = 1;

  async loadReplayFromServer(replayId: string): Promise<boolean> {
    try {
      const result = await railwayClient.get<{ replayData: string }>(
        `/api/v1/replays/${replayId}`
      );
      const decoded = JSON.parse(atob(result.replayData)) as PlaybackData;
      this.loadReplay(decoded);
      return true;
    } catch {
      Logger.error('[ReplayPlayer] Failed to load replay');
      return false;
    }
  }

  loadReplay(data: PlaybackData): void {
    this.replay = data;
    this.currentTimeMs = 0;
    this.snapshotIndex = 0;
    this.eventIndex = 0;
    this.ghostPlayer = { x: 0, y: 0, hp: 100, level: 1, alpha: 0.4, color: '#8888FF' };
    EventBus.emit('replayLoaded', {
      replayId: data.sessionId,
      duration: data.duration,
      totalKills: data.totalKills,
    });
  }

  tick(deltaTime: number): PlaybackTickResult {
    if (!this.replay || !this.ghostPlayer) return { done: true };

    this.currentTimeMs += deltaTime * this.playbackSpeed;

    while (this.snapshotIndex < this.replay.snapshots.length - 1) {
      const next = this.replay.snapshots[this.snapshotIndex + 1];
      if (!next || next.t > this.currentTimeMs) break;
      this.snapshotIndex++;
    }

    const snap = this.replay.snapshots[this.snapshotIndex];
    if (snap) {
      this.ghostPlayer.x = snap.px;
      this.ghostPlayer.y = snap.py;
      this.ghostPlayer.hp = snap.hp;
      this.ghostPlayer.level = snap.level;
    }

    const pendingEvents: PlaybackEvent[] = [];
    while (this.eventIndex < this.replay.events.length) {
      const evt = this.replay.events[this.eventIndex];
      if (!evt || evt.t > this.currentTimeMs) break;
      pendingEvents.push(evt);
      this.eventIndex++;
    }

    const progress = this.currentTimeMs / this.replay.duration;
    EventBus.emit('replayTick', { progress, currentTimeMs: this.currentTimeMs });

    return {
      done: this.currentTimeMs >= this.replay.duration,
      ghost: { ...this.ghostPlayer },
      events: pendingEvents,
      progress,
    };
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  getSpeed(): number {
    return this.playbackSpeed;
  }

  getReplay(): PlaybackData | null {
    return this.replay;
  }

  async fetchMyReplays(): Promise<ReplaySummary[]> {
    try {
      const result = await railwayClient.get<{ replays?: ReplaySummary[] }>(
        '/api/v1/replays/mine'
      );
      return result.replays ?? [];
    } catch {
      return [];
    }
  }

  reset(): void {
    this.replay = null;
    this.currentTimeMs = 0;
    this.snapshotIndex = 0;
    this.eventIndex = 0;
    this.ghostPlayer = null;
    this.playbackSpeed = 1;
  }
}

export const ReplayPlayerService = new ReplayPlayerServiceClass();
