import { type PositionContext } from '@/game-v2/contracts/PositionContext';
import { type RunCommand } from '@/game-v2/contracts/RunCommand';
import { type RunIdentity } from '@/game-v2/contracts/RunIdentity';

export const RUN_RECORDING_SCHEMA_VERSION = 2 as const;

export type RecordedInputFrame = Readonly<{
  tick: number;
  moveX: number;
  moveY: number;
  dashPressed: boolean;
}>;

/**
 * Everything needed to reproduce a run: who ran it, the locked position it
 * was played under, the exact per-tick input, and the commands issued while
 * the simulation was paused.
 *
 * `positionContext` was added in schema version 2 (`V2-202`): it is
 * runtime-construction input reconstructed by the replay factory, exactly
 * like `runIdentity`'s seed already is, not `World` state — leverage now
 * changes `playerMaxHealth` (`V2-202`), so a replay that reconstructed the
 * default leverage-`1` profile regardless of what the live run actually
 * locked would silently desync from tick one (closes V2-ADR-089).
 *
 * `initialHash` is the canonical state hash taken immediately after `start()`
 * and before the first tick. Replaying with a different seed, run id, config
 * version, or position produces a different initial checkpoint, so a
 * mismatch there rejects the recording before a single tick runs instead of
 * surfacing as a confusing final-hash difference.
 */
export type RunRecording = Readonly<{
  schemaVersion: typeof RUN_RECORDING_SCHEMA_VERSION;
  configVersion: number;
  runIdentity: RunIdentity;
  positionContext: PositionContext;
  initialHash: string;
  frames: readonly RecordedInputFrame[];
  commands: readonly RunCommand[];
}>;
