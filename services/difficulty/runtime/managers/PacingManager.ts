import { DIFFICULTY_RUNTIME_CONFIG } from '../../../../config/difficulty/DifficultyRuntimeConfig';
import { SurvivalCurve } from '../../../director/SurvivalCurve';
import { DIRECTOR_CONFIG_V1 } from '../../../director/config/DirectorConfigV1';
import { type PacingDecision, type PacingManagerInput } from '../contracts';
import {
  type DecisionQuality,
  type DifficultyReasonCode,
  type PacingDecisionSummary,
} from '../../../../types/runtimeDifficulty';

type MutablePacingDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: DecisionQuality;
  value: Omit<PacingDecisionSummary, 'reasonCodes'> & {
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const createNeutralDecision = (): MutablePacingDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    phase: 'BUILD_UP',
    baselinePressure: 0,
    minimumPressure: 0,
    maximumPressure: 0,
    remainingSeconds: 0,
    reasonCodes: ['NEUTRAL_INPUT'],
  },
  reasonCodes: ['NEUTRAL_INPUT'],
  clampCodes: [],
});

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export class PacingManager {
  private readonly decisions: [MutablePacingDecision, MutablePacingDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly curve = new SurvivalCurve();
  private activeDecisionIndex = 0;

  public update(input: PacingManagerInput): PacingDecision {
    const current =
      this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick ?? 0;
    target.inputRevision = input.inputRevision ?? 0;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;

    if (!Number.isFinite(input.elapsedSeconds)) {
      this.writeNeutral(target);
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const elapsedSeconds = Math.max(0, input.elapsedSeconds);
    const phaseResult = this.resolvePhase(elapsedSeconds);
    const baselinePressure = clampUnit(this.curve.getPressure(elapsedSeconds));
    const bandWidth = DIFFICULTY_RUNTIME_CONFIG.pacing.pressureBandWidth;

    target.quality = 'LIVE';
    target.value.phase = phaseResult.phase;
    target.value.baselinePressure = baselinePressure;
    target.value.minimumPressure = clampUnit(baselinePressure - bandWidth);
    target.value.maximumPressure = clampUnit(baselinePressure + bandWidth);
    target.value.remainingSeconds = phaseResult.remainingSeconds;
    target.reasonCodes.push(phaseResult.reasonCode);
    target.value.reasonCodes.push(phaseResult.reasonCode);
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): PacingDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  public reset(): void {
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
  }

  private resolvePhase(elapsedSeconds: number): {
    phase: PacingDecisionSummary['phase'];
    remainingSeconds: number;
    reasonCode: DifficultyReasonCode;
  } {
    if (elapsedSeconds >= DIRECTOR_CONFIG_V1.survival.doomStartsAtSeconds) {
      return { phase: 'DOOM', remainingSeconds: 0, reasonCode: 'PACING_DOOM' };
    }

    const phases = DIRECTOR_CONFIG_V1.pacing;
    const buildUpEnd = phases.buildUp.maxSeconds;
    const peakEnd = buildUpEnd + phases.peak.maxSeconds;
    const fadeEnd = peakEnd + phases.peakFade.maxSeconds;
    const recoveryEnd = fadeEnd + phases.recovery.maxSeconds;
    const cycleElapsed = elapsedSeconds % recoveryEnd;

    if (cycleElapsed < buildUpEnd) {
      return {
        phase: 'BUILD_UP',
        remainingSeconds: buildUpEnd - cycleElapsed,
        reasonCode: 'PACING_BUILD_UP',
      };
    }
    if (cycleElapsed < peakEnd) {
      return {
        phase: 'PEAK',
        remainingSeconds: peakEnd - cycleElapsed,
        reasonCode: 'PACING_PEAK',
      };
    }
    if (cycleElapsed < fadeEnd) {
      return {
        phase: 'PEAK_FADE',
        remainingSeconds: fadeEnd - cycleElapsed,
        reasonCode: 'PACING_PEAK_FADE',
      };
    }
    return {
      phase: 'RECOVERY',
      remainingSeconds: recoveryEnd - cycleElapsed,
      reasonCode: 'PACING_RECOVERY',
    };
  }

  private writeNeutral(target: MutablePacingDecision): void {
    target.quality = 'NEUTRAL';
    target.value.phase = 'BUILD_UP';
    target.value.baselinePressure = 0;
    target.value.minimumPressure = 0;
    target.value.maximumPressure = 0;
    target.value.remainingSeconds = 0;
    target.reasonCodes.push('NEUTRAL_INPUT');
    target.value.reasonCodes.push('NEUTRAL_INPUT');
  }
}
