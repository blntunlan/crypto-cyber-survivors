import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type RunIdentity } from '@/game-v2/contracts/RunIdentity';

export const RUN_RECORDING_SCHEMA_VERSION = 1 as const;

export type RecordedInputFrame = Readonly<{
  tick: number;
  moveX: number;
  moveY: number;
  dashPressed: boolean;
}>;

/**
 * Everything needed to reproduce a run: who ran it, the exact per-tick input,
 * and the commands issued while the simulation was paused.
 *
 * `initialHash` is the canonical state hash taken immediately after `start()`
 * and before the first tick. Replaying with a different seed, run id, or config
 * version produces a different initial checkpoint, so a mismatch there rejects
 * the recording before a single tick runs instead of surfacing as a confusing
 * final-hash difference.
 */
export type RunRecording = Readonly<{
  schemaVersion: typeof RUN_RECORDING_SCHEMA_VERSION;
  configVersion: number;
  runIdentity: RunIdentity;
  initialHash: string;
  frames: readonly RecordedInputFrame[];
  commands: readonly RunCommand[];
}>;
