import type { PhaseInput } from '../contracts';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import { DifficultyManager } from '../DifficultyManager';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { TimeService } from '../../core/TimeService';

/**
 * DifficultyPhase — updates difficulty calculation and shock detection.
 *
 * Extracted from GameEngine.tsx update loop:
 *   - DifficultyManager.updateWaveTimer(deltaTime)
 *   - difficultyContext.updateTime(...)
 */
export class DifficultyPhase implements IGameplayPhase<'difficulty'> {
  public readonly phase = 'difficulty' as const;

  public execute(input: PhaseInput<'difficulty'>): BaselinePhaseResult<'difficulty'> {
    const deltaTime = input.context.clock.deltaMs;

    DifficultyManager.updateWaveTimer(deltaTime);
    difficultyContext.updateTime(TimeService.getGameTimeSeconds());

    return createBaselinePhaseResult(this.phase);
  }
}
