import type { PhaseInput } from '../contracts';
import { type SpawnExecutorWorld } from '../../combat/SpawnExecutor';
import { type SpawnPlan } from '../../director/contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

type SpawnPhaseExecutor = {
  execute: (plan: SpawnPlan, world: SpawnExecutorWorld) => unknown;
};

type SpawnPhaseShared = Record<string, unknown> & {
  spawnPlan?: SpawnPlan;
  spawnExecutor?: SpawnPhaseExecutor;
  spawnWorld?: SpawnExecutorWorld;
  spawnExecution?: unknown;
};

export class SpawnPhase implements IGameplayPhase<'spawn'> {
  public readonly phase = 'spawn' as const;
  private readonly result = createBaselinePhaseResult(this.phase);

  public execute(input: PhaseInput<'spawn'>): BaselinePhaseResult<'spawn'> {
    const shared = input.shared as SpawnPhaseShared;
    if (
      shared.spawnPlan !== undefined &&
      shared.spawnExecutor !== undefined &&
      shared.spawnWorld !== undefined
    ) {
      shared.spawnExecution = shared.spawnExecutor.execute(
        shared.spawnPlan,
        shared.spawnWorld
      );
    }
    return this.result;
  }
}
