/**
 * Replay Playback Types — For recording/playing back game replays
 *
 * Version history:
 *  - v2: Player-only ghost trail (snapshots + empty events)
 *  - v3: Enemy support — enemyFrames (periodic position batches) + spawn/kill events + typeTable
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
  type:
    | 'kill'
    | 'damage_taken'
    | 'levelup'
    | 'dash'
    | 'portal_open'
    | 'weapon_fire'
    | 'spawn';
  data: Record<string, unknown>;
}

/**
 * Compact single-enemy snapshot inside an EnemyFrame.
 * - i: per-spawn instance id (monotonic counter assigned by SpawnSystem)
 * - t: type index into PlaybackData.typeTable (maps to EnemyId)
 * - x/y: quantized int16 world coordinates
 */
export interface EnemySnapshot {
  i: number;
  t: number;
  x: number;
  y: number;
}

/**
 * A batch of enemy positions sampled at a single timestamp.
 * Captured every ~1000ms during recording.
 */
export interface EnemyFrame {
  t: number;
  e: EnemySnapshot[];
}

export interface PlaybackData {
  version: 2 | 3;
  sessionId: string;
  duration: number;
  finalLevel: number;
  totalKills: number;
  leverage: number;
  position: string;
  snapshots: PlaybackSnapshot[];
  events: PlaybackEvent[];
  /** v3+: periodic enemy position batches. Absent in v2 replays. */
  enemyFrames?: EnemyFrame[];
  /** v3+: EnemyId strings indexed by EnemySnapshot.t. Absent in v2 replays. */
  typeTable?: string[];
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

/**
 * A reconstructed enemy at a given playback instant.
 * Positions are linearly interpolated between adjacent EnemyFrames.
 * type/color/radius are resolved from the typeTable + EnemyRegistry at playback.
 */
export interface ReplayedEnemy {
  id: number;
  type: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  isElite?: boolean;
}

export interface PlaybackTickResult {
  done: boolean;
  ghost?: GhostEntity;
  /** v3+: reconstructed + interpolated enemy positions. Empty for v2 replays. */
  enemies?: ReplayedEnemy[];
  events?: PlaybackEvent[];
  progress?: number;
}
