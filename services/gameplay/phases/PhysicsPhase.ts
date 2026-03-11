import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

export class PhysicsPhase implements IGameplayPhase<'physics'> {
  public readonly phase = 'physics' as const;

  public execute(_input: PhaseInput<'physics'>): BaselinePhaseResult<'physics'> {
    return createBaselinePhaseResult(this.phase);
  }
}
