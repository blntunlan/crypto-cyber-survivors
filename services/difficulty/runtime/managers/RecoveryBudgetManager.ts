import { DIFFICULTY_RUNTIME_CONFIG } from '../../../../config/difficulty/DifficultyRuntimeConfig';
import { AdvantageAllocator } from '../../../director/AdvantageAllocator';
import {
  type DifficultyReasonCode,
  type RecoveryDecisionSummary,
} from '../../../../types/runtimeDifficulty';
import { type RecoveryBudgetDecision, type RecoveryBudgetInput } from '../contracts';

type MutableRecoveryDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: 'LIVE' | 'NEUTRAL';
  value: Omit<RecoveryDecisionSummary, 'reasonCodes'> & {
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const createNeutralDecision = (): MutableRecoveryDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    mercy: 0,
    recoveryNeed: 0,
    advantageCreditRate: 0,
    availableAdvantageCredits: 0,
    activeMechanic: null,
    reasonCodes: ['RECOVERY_NEUTRAL'],
  },
  reasonCodes: ['RECOVERY_NEUTRAL'],
  clampCodes: [],
});

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export class RecoveryBudgetManager {
  private readonly decisions: [MutableRecoveryDecision, MutableRecoveryDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly allocator = new AdvantageAllocator();
  private activeDecisionIndex = 0;

  public update(input: RecoveryBudgetInput): RecoveryBudgetDecision {
    const current = this.getActiveDecision();
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick;
    target.inputRevision = input.inputRevision;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;

    if (!this.isValid(input)) {
      this.writeNeutral(target);
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const recoveryNeed = clampUnit(input.recoveryNeed);
    const mercy = recoveryNeed * DIFFICULTY_RUNTIME_CONFIG.recovery.maximumMercy;
    const allocation = this.allocator.update({
      deltaSeconds: input.deltaSeconds,
      advantage: clampUnit(input.advantage),
      regime: input.regime,
      regimeConfidence: clampUnit(input.regimeConfidence),
      elapsedSeconds: input.elapsedSeconds,
      seed: input.seed,
    });
    const reasonCode: DifficultyReasonCode =
      mercy > 0 ? 'RECOVERY_MERCY' : 'RECOVERY_NEUTRAL';

    target.quality = 'LIVE';
    target.value.mercy = mercy;
    target.value.recoveryNeed = recoveryNeed;
    target.value.advantageCreditRate = allocation.creditRate;
    target.value.availableAdvantageCredits = allocation.availableCredits;
    target.value.activeMechanic = allocation.activeMechanic;
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): RecoveryBudgetDecision {
    return this.getActiveDecision();
  }

  public reset(): void {
    this.allocator.reset();
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
  }

  private getActiveDecision(): MutableRecoveryDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  private isValid(input: RecoveryBudgetInput): boolean {
    return (
      Number.isFinite(input.recoveryNeed) &&
      Number.isFinite(input.advantage) &&
      Number.isFinite(input.regimeConfidence) &&
      Number.isFinite(input.deltaSeconds) &&
      Number.isFinite(input.elapsedSeconds) &&
      Number.isSafeInteger(input.seed)
    );
  }

  private writeNeutral(target: MutableRecoveryDecision): void {
    target.quality = 'NEUTRAL';
    target.value.mercy = 0;
    target.value.recoveryNeed = 0;
    target.value.advantageCreditRate = 0;
    target.value.availableAdvantageCredits = 0;
    target.value.activeMechanic = null;
    target.reasonCodes.push('RECOVERY_NEUTRAL');
    target.value.reasonCodes.push('RECOVERY_NEUTRAL');
  }
}
