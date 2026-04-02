/**
 * ReplayRecorderService — Records game snapshots for playback
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import {
  type PlaybackSnapshot,
  type PlaybackEvent,
  type PlaybackData,
} from '../../types/replayPlayback';

class ReplayRecorderServiceClass {
  private snapshots: PlaybackSnapshot[] = [];
  private events: PlaybackEvent[] = [];
  private startTime = 0;
  private snapshotTimer = 0;
  private recording = false;
  private sessionId = '';
  private leverage = 1;
  private position = 'LONG';
  private pair = 'BTC';

  startRecording(
    sessionId: string,
    leverage: number,
    position: string,
    pair = 'BTC'
  ): void {
    this.snapshots = [];
    this.events = [];
    this.startTime = Date.now();
    this.snapshotTimer = 0;
    this.recording = true;
    this.sessionId = sessionId;
    this.leverage = leverage;
    this.position = position;
    this.pair = pair;
  }

  recordEvent(type: PlaybackEvent['type'], data: Record<string, unknown>): void {
    if (!this.recording) return;
    this.events.push({ t: Date.now() - this.startTime, type, data });
  }

  tick(
    deltaTime: number,
    playerX: number,
    playerY: number,
    hp: number,
    level: number
  ): void {
    if (!this.recording) return;
    this.snapshotTimer += deltaTime;
    if (this.snapshotTimer >= 500) {
      this.snapshotTimer -= 500;
      this.snapshots.push({
        t: Date.now() - this.startTime,
        px: Math.round(playerX),
        py: Math.round(playerY),
        hp: Math.round(hp),
        level,
      });
    }
  }

  stopRecording(): PlaybackData {
    this.recording = false;
    const duration = Date.now() - this.startTime;
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    return {
      version: 2,
      sessionId: this.sessionId,
      duration,
      finalLevel: lastSnapshot?.level ?? 1,
      totalKills: this.events.filter(e => e.type === 'kill').length,
      leverage: this.leverage,
      position: this.position,
      snapshots: this.snapshots,
      events: this.events,
    };
  }

  async saveReplay(score: number): Promise<void> {
    const replayData = this.stopRecording();
    const encoded = btoa(JSON.stringify(replayData));

    if (encoded.length > 500_000) {
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
    this.recording = false;
    this.snapshots = [];
    this.events = [];
    this.snapshotTimer = 0;
  }
}

export const ReplayRecorderService = new ReplayRecorderServiceClass();
