/**
 * ReplayRecorderService — Records game snapshots for playback
 *
 * Captures:
 *  - Player position snapshots every 500ms (ghost trail)
 *  - Enemy position batches (EnemyFrame) every 1000ms
 *  - Spawn/kill events via EventBus subscriptions
 *
 * Version 3 output includes enemyFrames + typeTable for full enemy playback.
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { ENEMY_DEFINITIONS } from '../../config/EnemyRegistry';
import {
  type PlaybackSnapshot,
  type PlaybackEvent,
  type PlaybackData,
  type EnemyFrame,
  type EnemySnapshot,
} from '../../types/replayPlayback';
import { type Enemy } from '../../types';

/** Stable EnemyId → index map, built once at module load. Stored in PlaybackData.typeTable. */
const ENEMY_TYPE_TABLE = Object.keys(ENEMY_DEFINITIONS) as string[];
const ENEMY_TYPE_INDEX = new Map<string, number>(
  ENEMY_TYPE_TABLE.map((t, i) => [t, i] as const)
);

const MAX_ENEMIES_PER_FRAME = 200;
const ENEMY_FRAME_INTERVAL_MS = 1000;
const PLAYER_SNAPSHOT_INTERVAL_MS = 500;
const MAX_REPLAY_SIZE_BYTES = 500_000;
const MAX_ENEMY_SNAPSHOTS = 10_000;

/** Parses the numeric spawn id from an enemy.id string like "enemy-123" → 123. */
const parseSpawnId = (id: string | undefined): number =>
  Number(id?.replace(/^\D+/, '') ?? 0);

class ReplayRecorderServiceClass {
  private snapshots: PlaybackSnapshot[] = [];
  private events: PlaybackEvent[] = [];
  private enemyFrames: EnemyFrame[] = [];
  private startTime = 0;
  private snapshotTimer = 0;
  private enemyFrameTimer = 0;
  private elapsedMs = 0;
  private enemyFrameIntervalMs = ENEMY_FRAME_INTERVAL_MS;
  private enemySnapshotCount = 0;
  private recording = false;
  private sessionId = '';
  private leverage = 1;
  private position = 'LONG';
  private pair = 'BTC';
  private unsubscribers: Array<() => void> = [];

  startRecording(
    sessionId: string,
    leverage: number,
    position: string,
    pair = 'BTC'
  ): void {
    this.unsubscribeEvents();
    this.snapshots = [];
    this.events = [];
    this.enemyFrames = [];
    this.startTime = Date.now();
    this.snapshotTimer = 0;
    this.enemyFrameTimer = 0;
    this.elapsedMs = 0;
    this.enemyFrameIntervalMs = ENEMY_FRAME_INTERVAL_MS;
    this.enemySnapshotCount = 0;
    this.recording = true;
    this.sessionId = sessionId;
    this.leverage = leverage;
    this.position = position;
    this.pair = pair;
    this.subscribeToEvents();
  }

  /**
   * Subscribes to enemySpawned / enemyKilled EventBus events during recording.
   * Subscriptions are cleaned up on stop/reset.
   */
  private subscribeToEvents(): void {
    this.unsubscribers.push(
      EventBus.on('enemySpawned', data => {
        if (!this.recording) return;
        this.events.push({
          t: Date.now() - this.startTime,
          type: 'spawn',
          data: {
            id: data.spawnId,
            type: data.enemyType,
            x: Math.round(data.x),
            y: Math.round(data.y),
            isElite: data.isElite ?? false,
          },
        });
      }),
      EventBus.on('enemyKilled', data => {
        if (!this.recording) return;
        this.events.push({
          t: Date.now() - this.startTime,
          type: 'kill',
          data: {
            id: parseSpawnId(data.enemyId),
            type: data.type ?? data.enemyType ?? 'unknown',
          },
        });
      })
    );
  }

  private unsubscribeEvents(): void {
    for (let i = 0; i < this.unsubscribers.length; i++) {
      this.unsubscribers[i]?.();
    }
    this.unsubscribers = [];
  }

  /**
   * Manual event recording (rarely used — spawn/kill are auto-captured via EventBus).
   */
  recordEvent(type: PlaybackEvent['type'], data: Record<string, unknown>): void {
    if (!this.recording) return;
    this.events.push({ t: Date.now() - this.startTime, type, data });
  }

  /**
   * Called every frame from GameEngine RAF loop.
   * Player snapshots are captured every 500ms, enemy frames every 1000ms.
   */
  tick(
    deltaTime: number,
    playerX: number,
    playerY: number,
    hp: number,
    level: number,
    activeEnemies: readonly Enemy[] = []
  ): void {
    if (!this.recording) return;

    this.elapsedMs += deltaTime;

    this.snapshotTimer += deltaTime;
    if (this.snapshotTimer >= PLAYER_SNAPSHOT_INTERVAL_MS) {
      this.snapshotTimer -= PLAYER_SNAPSHOT_INTERVAL_MS;
      this.snapshots.push({
        t: this.elapsedMs,
        px: Math.round(playerX),
        py: Math.round(playerY),
        hp: Math.round(hp),
        level,
      });
    }

    this.enemyFrameTimer += deltaTime;
    if (this.enemyFrameTimer >= this.enemyFrameIntervalMs) {
      this.enemyFrameTimer -= this.enemyFrameIntervalMs;
      this.captureEnemyFrame(playerX, playerY, activeEnemies);
    }
  }

  /**
   * Captures a compact batch of enemy positions.
   * Capped at MAX_ENEMIES_PER_FRAME to bound replay size.
   */
  private captureEnemyFrame(
    _playerX: number,
    _playerY: number,
    enemies: readonly Enemy[]
  ): void {
    const count = Math.min(enemies.length, MAX_ENEMIES_PER_FRAME);
    if (this.enemySnapshotCount + count > MAX_ENEMY_SNAPSHOTS) {
      this.compactEnemyFrames();
    }
    const batch: EnemySnapshot[] = [];

    for (let i = 0; i < count; i++) {
      const e = enemies[i];
      if (!e) continue;
      const typeId = ENEMY_TYPE_INDEX.get(e.type) ?? 0;
      batch.push({
        i: parseSpawnId(e.id),
        t: typeId,
        x: Math.round(e.x),
        y: Math.round(e.y),
      });
    }

    this.enemyFrames.push({
      t: this.elapsedMs,
      e: batch,
    });
    this.enemySnapshotCount += batch.length;
  }

  private compactEnemyFrames(): void {
    let writeIndex = 0;
    let snapshotCount = 0;
    const lastIndex = this.enemyFrames.length - 1;

    for (let readIndex = 0; readIndex < this.enemyFrames.length; readIndex += 2) {
      const frame = this.enemyFrames[readIndex];
      if (!frame) continue;
      this.enemyFrames[writeIndex] = frame;
      snapshotCount += frame.e.length;
      writeIndex++;
    }

    if (lastIndex > 0 && lastIndex % 2 !== 0) {
      const lastFrame = this.enemyFrames[lastIndex];
      if (lastFrame) {
        this.enemyFrames[writeIndex] = lastFrame;
        snapshotCount += lastFrame.e.length;
        writeIndex++;
      }
    }

    this.enemyFrames.length = writeIndex;
    this.enemySnapshotCount = snapshotCount;
    this.enemyFrameIntervalMs *= 2;
  }

  stopRecording(): PlaybackData {
    this.recording = false;
    this.unsubscribeEvents();
    const duration = this.elapsedMs;
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    return {
      version: 3,
      sessionId: this.sessionId,
      duration,
      finalLevel: lastSnapshot?.level ?? 1,
      totalKills: this.events.filter(e => e.type === 'kill').length,
      leverage: this.leverage,
      position: this.position,
      snapshots: this.snapshots,
      events: this.events,
      enemyFrames: this.enemyFrames,
      typeTable: ENEMY_TYPE_TABLE,
    };
  }

  async saveReplay(score: number): Promise<void> {
    const replayData = this.stopRecording();
    const encoded = btoa(JSON.stringify(replayData));

    if (encoded.length > MAX_REPLAY_SIZE_BYTES) {
      Logger.warn('[ReplayRecorder] Replay too large, skipping save');
      return;
    }

    try {
      const result = await railwayClient.post<{ replayId?: string; size?: number }>(
        '/api/v1/replays/save',
        {
          sessionId: replayData.sessionId,
          replayData: encoded,
          score,
          pair: this.pair,
          position: replayData.position,
          leverage: replayData.leverage,
          durationMs: replayData.duration,
          finalLevel: replayData.finalLevel,
          totalKills: replayData.totalKills,
        }
      );
      if (result.replayId) {
        EventBus.emit('replaySaved', {
          replayId: result.replayId,
          sessionId: replayData.sessionId,
          size: encoded.length,
        });
      }
    } catch {
      Logger.warn('[ReplayRecorder] Failed to save replay');
    }
  }

  isRecording(): boolean {
    return this.recording;
  }

  reset(): void {
    this.unsubscribeEvents();
    this.recording = false;
    this.snapshots = [];
    this.events = [];
    this.enemyFrames = [];
    this.snapshotTimer = 0;
    this.enemyFrameTimer = 0;
    this.elapsedMs = 0;
    this.enemyFrameIntervalMs = ENEMY_FRAME_INTERVAL_MS;
    this.enemySnapshotCount = 0;
  }

  /** Exposed for tests — returns the stable type table. */
  getTypeTable(): string[] {
    return ENEMY_TYPE_TABLE;
  }
}

export const ReplayRecorderService = new ReplayRecorderServiceClass();
