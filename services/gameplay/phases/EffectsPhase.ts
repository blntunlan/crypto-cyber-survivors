import type { PhaseInput } from '../contracts';
import { GAME_ENGINE } from '../../../constants';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { VisualEffectService } from '../VisualEffectService';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';

export class EffectsPhase implements IGameplayPhase<'effects'> {
  public readonly phase = 'effects' as const;
  private readonly result = createBaselinePhaseResult(this.phase);
  private readonly metadata = {
    volatilityShockIntensity: 0,
    reducedMotion: false,
  };

  public execute(input: PhaseInput<'effects'>): BaselinePhaseResult<'effects'> {
    const { context, shared } = input;
    const state = context.world.gameState.current;
    const sharedState = shared as Record<string, unknown>;
    const screenShakeEnabled = sharedState.screenShakeEnabled === true;
    const reducedMotion = sharedState.reducedMotion === true;

    VisualEffectService.update(context.clock.deltaMs);

    if (context.status === 'PLAYING' && screenShakeEnabled && !reducedMotion) {
      const shockIntensity = VisualEffectService.getIntensity();
      if (shockIntensity > 0) {
        const leverage = difficultyContext.inputs.leverage;
        const scaledShock = VisualEffectService.calculateLeverageScaledIntensity(
          shockIntensity,
          leverage
        );
        state.shake = Math.max(
          state.shake,
          scaledShock * GAME_ENGINE.VOLATILITY_SHOCK_SHAKE_MULT
        );
      }
    }

    this.metadata.volatilityShockIntensity = VisualEffectService.getIntensity();
    this.metadata.reducedMotion = reducedMotion;
    this.result.metadata = this.metadata;
    return this.result;
  }
}
