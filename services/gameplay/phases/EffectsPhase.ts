import type { PhaseInput } from '../contracts';
import { GAME_ENGINE } from '../../../constants';
import { difficultyContext } from '../../difficulty/DifficultyContext';
import { VisualEffectService } from '../VisualEffectService';
import {
  createBaselinePhaseResult,
  type BaselinePhaseResult,
  type IGameplayPhase,
} from './IGameplayPhase';
import {
  type PresentationDirector,
  type PresentationInput,
  type PresentationSnapshot,
} from '../../presentation/PresentationDirector';
import { type DifficultyPhaseDecision } from '../../difficulty/runtime/DifficultyRuntime';
import { createNeutralRuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';
import { PriceMomentumEngine } from '../../market/PriceMomentumEngine';

type PresentationCueTarget = {
  apply: (snapshot: PresentationSnapshot) => void;
};

export class EffectsPhase implements IGameplayPhase<'effects'> {
  public readonly phase = 'effects' as const;
  private readonly result = createBaselinePhaseResult(this.phase);
  private readonly metadata = {
    volatilityShockIntensity: 0,
    reducedMotion: false,
  };
  private readonly presentationInput: PresentationInput = {
    deltaSeconds: 0,
    tick: 0,
    snapshot: createNeutralRuntimeDifficultySnapshot({
      tick: 0,
      inputRevision: 0,
    }),
    suggestedBpm: 0,
    accessibilityIntensity: 1,
    safeExitAvailable: false,
  };
  private lastPresentationRevision = 0;

  public constructor(
    private readonly presentationDirector: PresentationDirector | null = null,
    private readonly presentationCueTarget: PresentationCueTarget | null = null
  ) {}

  public execute(input: PhaseInput<'effects'>): BaselinePhaseResult<'effects'> {
    const { context, shared } = input;
    const state = context.world.gameState.current;
    const sharedState = shared as Record<string, unknown>;
    const screenShakeEnabled = sharedState.screenShakeEnabled === true;
    const reducedMotion = sharedState.reducedMotion === true;

    VisualEffectService.update(context.clock.deltaMs);

    const difficultyDecision = sharedState.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;
    const difficultySnapshot = difficultyDecision?.snapshot ?? null;
    if (
      this.presentationDirector !== null &&
      this.presentationCueTarget !== null &&
      difficultySnapshot !== null &&
      difficultySnapshot.meta.revision !== this.lastPresentationRevision
    ) {
      this.presentationInput.deltaSeconds = context.clock.deltaMs / 1_000;
      this.presentationInput.tick = context.clock.frame;
      this.presentationInput.snapshot = difficultySnapshot;
      this.presentationInput.suggestedBpm =
        PriceMomentumEngine.getLatest().suggestedBPM;
      this.presentationInput.accessibilityIntensity = reducedMotion ? 0 : 1;
      this.presentationInput.safeExitAvailable = false;
      const presentation = this.presentationDirector.update(this.presentationInput);
      this.presentationCueTarget.apply(presentation);
      if (screenShakeEnabled && !reducedMotion && presentation.sensory.shake > 0) {
        state.shake = Math.max(state.shake, presentation.sensory.shake);
      }
      this.lastPresentationRevision = difficultySnapshot.meta.revision;
    }

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
