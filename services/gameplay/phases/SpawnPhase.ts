import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

export class SpawnPhase implements IGameplayPhase<'spawn'> {
  public readonly phase = 'spawn' as const;

  public execute(_input: PhaseInput<'spawn'>): BaselinePhaseResult<'spawn'> {
    return createBaselinePhaseResult(this.phase);
  }
}
