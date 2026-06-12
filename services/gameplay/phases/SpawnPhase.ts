import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

export class SpawnPhase implements IGameplayPhase<'spawn'> {
  public readonly phase = 'spawn' as const;
  private readonly result = createBaselinePhaseResult(this.phase);

  public execute(_input: PhaseInput<'spawn'>): BaselinePhaseResult<'spawn'> {
    return this.result;
  }
}
