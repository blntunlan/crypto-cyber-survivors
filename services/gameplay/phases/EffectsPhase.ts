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
  type CurrentPresentationInput,
  type PresentationInput,
  type PresentationSnapshot,
} from '../../presentation/PresentationDirector';
import { type DifficultyPhaseDecision } from '../../difficulty/runtime/DifficultyRuntime';
import { createNeutralRuntimeDifficultySnapshot } from '../../../types/runtimeDifficulty';
import { PriceMomentumEngine } from '../../market/PriceMomentumEngine';
import { type GameplaySnapshot } from '../../director/contracts';

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
    elapsedSeconds: 0,
    tick: 0,
    snapshot: createNeutralRuntimeDifficultySnapshot({
      tick: 0,
      inputRevision: 0,
    }),
    suggestedBpm: 0,
    accessibilityIntensity: 1,
    safeExitAvailable: false,
  };
  private readonly currentPresentationInput: CurrentPresentationInput = {
    deltaSeconds: 0,
    elapsedSeconds: 0,
    tick: 0,
    snapshot: null as unknown as GameplaySnapshot,
    marketStale: false,
    suggestedBpm: 0,
    accessibilityIntensity: 1,
    safeExitAvailable: false,
  };
  private lastPresentationRevision = 0;
  private lastPresentationAuthority: DifficultyPhaseDecision['authority'] | null = null;
  private presentationDeltaSeconds = 0;

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
    if (this.presentationDirector !== null && this.presentationCueTarget !== null) {
      this.presentationDeltaSeconds += Math.max(0, context.clock.deltaMs) / 1_000;
    }

    const difficultyDecision = sharedState.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;
    const difficultySnapshot = difficultyDecision?.snapshot ?? null;
    const currentSnapshot = difficultyDecision?.currentSnapshot ?? null;
    if (
      this.presentationDirector !== null &&
      this.presentationCueTarget !== null &&
      difficultySnapshot !== null &&
      (this.lastPresentationAuthority !== 'modular' ||
        difficultySnapshot.meta.revision !== this.lastPresentationRevision)
    ) {
      this.presentationInput.deltaSeconds = this.presentationDeltaSeconds;
      this.presentationInput.elapsedSeconds = context.clock.elapsedMs / 1_000;
      this.presentationInput.tick = context.clock.frame;
      this.presentationInput.snapshot = difficultySnapshot;
      this.presentationInput.suggestedBpm =
        PriceMomentumEngine.getLatest().suggestedBPM;
      this.presentationInput.accessibilityIntensity = reducedMotion ? 0 : 1;
      this.presentationInput.safeExitAvailable = false;
      const presentation = this.presentationDirector.update(this.presentationInput);
      this.presentationDeltaSeconds = 0;
      this.presentationCueTarget.apply(presentation);
      if (screenShakeEnabled && !reducedMotion && presentation.sensory.shake > 0) {
        state.shake = Math.max(state.shake, presentation.sensory.shake);
      }
      this.lastPresentationRevision = difficultySnapshot.meta.revision;
      this.lastPresentationAuthority = 'modular';
    } else if (
      this.presentationDirector !== null &&
      this.presentationCueTarget !== null &&
      currentSnapshot !== null &&
      (this.lastPresentationAuthority !== 'current' ||
        currentSnapshot.revision !== this.lastPresentationRevision)
    ) {
      this.currentPresentationInput.deltaSeconds = this.presentationDeltaSeconds;
      this.currentPresentationInput.elapsedSeconds = context.clock.elapsedMs / 1_000;
      this.currentPresentationInput.tick = context.clock.frame;
      this.currentPresentationInput.snapshot = currentSnapshot;
      this.currentPresentationInput.marketStale =
        (sharedState.canonicalMarketFrame as { quality?: string } | undefined)
          ?.quality === 'STALE';
      this.currentPresentationInput.suggestedBpm =
        PriceMomentumEngine.getLatest().suggestedBPM;
      this.currentPresentationInput.accessibilityIntensity = reducedMotion ? 0 : 1;
      this.currentPresentationInput.safeExitAvailable = false;
      const presentation = this.presentationDirector.updateCurrent(
        this.currentPresentationInput
      );
      this.presentationDeltaSeconds = 0;
      this.presentationCueTarget.apply(presentation);
      if (screenShakeEnabled && !reducedMotion && presentation.sensory.shake > 0) {
        state.shake = Math.max(state.shake, presentation.sensory.shake);
      }
      this.lastPresentationRevision = currentSnapshot.revision;
      this.lastPresentationAuthority = 'current';
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
