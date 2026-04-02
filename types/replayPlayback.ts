/**
 * Replay Playback Types — For recording/playing back game replays
 */

export interface PlaybackSnapshot {
  t: number;
  px: number;
  py: number;
  hp: number;
  level: number;
}

export interface PlaybackEvent {
  t: number;
  type: 'kill' | 'damage_taken' | 'levelup' | 'dash' | 'portal_open' | 'weapon_fire';
  data: Record<string, unknown>;
}

export interface PlaybackData {
  version: 2;
  sessionId: string;
  duration: number;
  finalLevel: number;
  totalKills: number;
  leverage: number;
  position: string;
  snapshots: PlaybackSnapshot[];
  events: PlaybackEvent[];
}

export interface ReplaySummary {
  id: string;
  sessionId: string;
  score: number;
  durationMs: number;
  createdAt: string;
  finalLevel?: number;
  totalKills?: number;
}

export interface GhostEntity {
  x: number;
  y: number;
  hp: number;
  level: number;
  alpha: number;
  color: string;
}

export interface PlaybackTickResult {
  done: boolean;
  ghost?: GhostEntity;
  events?: PlaybackEvent[];
  progress?: number;
}
