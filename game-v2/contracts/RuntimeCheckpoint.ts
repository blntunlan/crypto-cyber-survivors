import { type GameV2Phase } from '@/game-v2/contracts/GameV2Phase';
import { type RunIdentity } from '@/game-v2/contracts/RunIdentity';
import { type RngSnapshot } from '@/game-v2/runtime/DeterministicRng';
import { type WorldSnapshot } from '@/game-v2/contracts/WorldSnapshot';

export const RUNTIME_CHECKPOINT_SCHEMA_VERSION = 1 as const;

export type LifecycleSnapshot = Readonly<{
  phase: GameV2Phase;
  sessionEpoch: number;
}>;

export type RuntimeCheckpoint = Readonly<{
  schemaVersion: typeof RUNTIME_CHECKPOINT_SCHEMA_VERSION;
  configVersion: number;
  tick: number;
  runIdentity: RunIdentity;
  rngSnapshot: RngSnapshot;
  lifecycle: LifecycleSnapshot;
  world: WorldSnapshot;
}>;
