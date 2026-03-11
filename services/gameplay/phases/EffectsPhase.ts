import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

export class EffectsPhase implements IGameplayPhase<'effects'> {
  public readonly phase = 'effects' as const;

  public execute(_input: PhaseInput<'effects'>): BaselinePhaseResult<'effects'> {
    return createBaselinePhaseResult(this.phase);
  }
}
