import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { TimeService } from '../../core/TimeService';

/**
 * DifficultyPhase — synchronizes the runtime clock into DifficultyContext.
 */
export class DifficultyPhase implements IGameplayPhase<'difficulty'> {
  public readonly phase = 'difficulty' as const;
  private readonly result = createBaselinePhaseResult(this.phase);

  public execute(_input: PhaseInput<'difficulty'>): BaselinePhaseResult<'difficulty'> {
    difficultyContext.updateTime(TimeService.getGameTimeSeconds());

    return this.result;
  }
}
