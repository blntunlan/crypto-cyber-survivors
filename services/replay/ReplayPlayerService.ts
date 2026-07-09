/**
 * ReplayPlayerService — Plays back recorded replays
 *
 * Reconstructs player ghost + enemy positions from recorded data:
 *  - Player: interpolated between PlaybackSnapshots (every 500ms)
 *  - Enemies: interpolated between EnemyFrames (every 1000ms)
 *  - Events: spawn/kill/levelup emitted at their recorded timestamps
 *
 * v2 replays (no enemyFrames) still work — enemies will be empty.
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { ENEMY_DEFINITIONS, type EnemyId } from '../../config/EnemyRegistry';
import {
  type PlaybackData,
  type GhostEntity,
  type PlaybackEvent,
  type PlaybackTickResult,
  type ReplaySummary,
  type EnemyFrame,
  type EnemySnapshot,
  type ReplayedEnemy,
} from '../../types/replayPlayback';

class ReplayPlayerServiceClass {
  private replay: PlaybackData | null = null;
  private currentTimeMs = 0;
  private snapshotIndex = 0;
  private eventIndex = 0;
  private enemyFrameIndex = 0;
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
    this.enemyFrameIndex = 0;
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

    this.advanceSnapshotIndex();
    this.updateGhost();

    const pendingEvents = this.collectPendingEvents();
    const enemies = this.reconstructEnemies();

    const progress = this.currentTimeMs / this.replay.duration;
    EventBus.emit('replayTick', { progress, currentTimeMs: this.currentTimeMs });

    return {
      done: this.currentTimeMs >= this.replay.duration,
      ghost: { ...this.ghostPlayer },
      enemies,
      events: pendingEvents,
      progress,
    };
  }

  // ---------------------------------------------------------------------------
  // Player ghost
  // ---------------------------------------------------------------------------

  private advanceSnapshotIndex(): void {
    if (!this.replay) return;
    while (this.snapshotIndex < this.replay.snapshots.length - 1) {
      const next = this.replay.snapshots[this.snapshotIndex + 1];
      if (!next || next.t > this.currentTimeMs) break;
      this.snapshotIndex++;
    }
  }

  private updateGhost(): void {
    if (!this.replay || !this.ghostPlayer) return;
    const snap = this.replay.snapshots[this.snapshotIndex];
    if (!snap) return;

    // Linear interpolation toward next snapshot for smoother movement
    const next = this.replay.snapshots[this.snapshotIndex + 1];
    if (next && next.t > snap.t) {
      const alpha = Math.min(1, (this.currentTimeMs - snap.t) / (next.t - snap.t));
      this.ghostPlayer.x = snap.px + (next.px - snap.px) * alpha;
      this.ghostPlayer.y = snap.py + (next.py - snap.py) * alpha;
    } else {
      this.ghostPlayer.x = snap.px;
      this.ghostPlayer.y = snap.py;
    }
    this.ghostPlayer.hp = snap.hp;
    this.ghostPlayer.level = snap.level;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private collectPendingEvents(): PlaybackEvent[] {
    if (!this.replay) return [];
    const pending: PlaybackEvent[] = [];
    while (this.eventIndex < this.replay.events.length) {
      const evt = this.replay.events[this.eventIndex];
      if (!evt || evt.t > this.currentTimeMs) break;
      pending.push(evt);
      this.eventIndex++;
    }
    return pending;
  }

  // ---------------------------------------------------------------------------
  // Enemy reconstruction + interpolation
  // ---------------------------------------------------------------------------

  private reconstructEnemies(): ReplayedEnemy[] {
    if (!this.replay) return [];
    const frames = this.replay.enemyFrames;
    if (!frames || frames.length === 0) return [];

    // Advance frame index to the last frame at or before currentTimeMs
    while (
      this.enemyFrameIndex < frames.length - 1 &&
      frames[this.enemyFrameIndex + 1]!.t <= this.currentTimeMs
    ) {
      this.enemyFrameIndex++;
    }

    const frameA = frames[this.enemyFrameIndex];
    if (!frameA) return [];

    const frameB =
      this.enemyFrameIndex < frames.length - 1
        ? (frames[this.enemyFrameIndex + 1] ?? null)
        : null;

    let alpha = 0;
    if (frameB && frameB.t > frameA.t) {
      alpha = Math.min(1, (this.currentTimeMs - frameA.t) / (frameB.t - frameA.t));
    }

    return this.resolveEnemies(frameA, frameB, alpha);
  }

  private resolveEnemies(
    frameA: EnemyFrame,
    frameB: EnemyFrame | null,
    alpha: number
  ): ReplayedEnemy[] {
    if (!this.replay) return [];
    const typeTable = this.replay.typeTable ?? [];

    // Build lookup map for frame B enemies (by instance id)
    const mapB = new Map<number, EnemySnapshot>();
    if (frameB) {
      const snapsB = frameB.e;
      for (let i = 0; i < snapsB.length; i++) {
        mapB.set(snapsB[i]!.i, snapsB[i]!);
      }
    }

    const snapsA = frameA.e;
    const result: ReplayedEnemy[] = [];

    // Interpolate enemies present in frame A
    for (let i = 0; i < snapsA.length; i++) {
      const snapA = snapsA[i]!;
      const typeStr = typeTable[snapA.t] ?? 'bear';
      const def = ENEMY_DEFINITIONS[typeStr as EnemyId];
      const snapB = frameB ? (mapB.get(snapA.i) ?? null) : null;

      const x = snapB ? snapA.x + (snapB.x - snapA.x) * alpha : snapA.x;
      const y = snapB ? snapA.y + (snapB.y - snapA.y) * alpha : snapA.y;

      result.push({
        id: snapA.i,
        type: typeStr,
        x,
        y,
        color: def?.color ?? '#888888',
        radius: def?.radius ?? 12,
      });
    }

    // Include enemies that appeared in frame B but not in A (newly spawned)
    if (frameB && alpha > 0) {
      const snapsAIds = new Set<number>();
      for (let i = 0; i < snapsA.length; i++) {
        snapsAIds.add(snapsA[i]!.i);
      }
      const snapsB = frameB.e;
      for (let i = 0; i < snapsB.length; i++) {
        const snapB = snapsB[i]!;
        if (!snapsAIds.has(snapB.i)) {
          const typeStr = typeTable[snapB.t] ?? 'bear';
          const def = ENEMY_DEFINITIONS[typeStr as EnemyId];
          result.push({
            id: snapB.i,
            type: typeStr,
            x: snapB.x,
            y: snapB.y,
            color: def?.color ?? '#888888',
            radius: def?.radius ?? 12,
          });
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

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
    this.enemyFrameIndex = 0;
    this.ghostPlayer = null;
    this.playbackSpeed = 1;
  }
}

export const ReplayPlayerService = new ReplayPlayerServiceClass();
