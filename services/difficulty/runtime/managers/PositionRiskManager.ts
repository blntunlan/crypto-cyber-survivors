import { PositionRiskModel } from '../../../director/position/PositionRiskModel';
import { type PositionRiskDecision, type PositionRiskManagerInput } from '../contracts';
import {
  type DecisionQuality,
  type DifficultyReasonCode,
  type PositionRiskSummary,
} from '../../../../types/runtimeDifficulty';

type MutablePositionDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: DecisionQuality;
  value: Omit<PositionRiskSummary, 'reasonCodes'> & {
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const createNeutralDecision = (): MutablePositionDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    alignment: 0,
    advantage: 0,
    headwind: 0,
    leverageRisk: 0,
    liquidationProximity: 0,
    isLiquidated: false,
    reasonCodes: ['POSITION_NEUTRAL'],
  },
  reasonCodes: ['POSITION_NEUTRAL'],
  clampCodes: [],
});

export class PositionRiskManager {
  private readonly decisions: [MutablePositionDecision, MutablePositionDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly model = new PositionRiskModel();
  private activeDecisionIndex = 0;

  public update(input: PositionRiskManagerInput): PositionRiskDecision {
    const current =
      this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick;
    target.inputRevision = input.inputRevision;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;

    const constants = input.constants;
    if (
      constants === null ||
      !Number.isFinite(input.currentPrice) ||
      input.currentPrice <= 0 ||
      !Number.isFinite(input.deltaSeconds)
    ) {
      this.writeNeutral(target);
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const result = this.model.update({
      sequence: input.sourceSequence,
      deltaSeconds: input.deltaSeconds,
      currentPrice: input.currentPrice,
      entryPrice: constants.entryPrice,
      side: constants.side,
      leverage: constants.leverage,
      liquidationPrice: constants.liquidationPrice,
    });
    const reasonCode: DifficultyReasonCode = result.isLiquidated
      ? 'POSITION_LIQUIDATION_RISK'
      : result.headwind > result.advantage
        ? 'POSITION_HEADWIND'
        : result.advantage > 0
          ? 'POSITION_FAVORABLE'
          : 'POSITION_NEUTRAL';

    target.quality = 'LIVE';
    target.value.alignment = result.alignment;
    target.value.advantage = result.advantage;
    target.value.headwind = result.headwind;
    target.value.leverageRisk = result.leverageRisk;
    target.value.liquidationProximity = result.liquidationProximity;
    target.value.isLiquidated = result.isLiquidated;
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): PositionRiskDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  public reset(): void {
    this.model.reset();
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
  }

  private writeNeutral(target: MutablePositionDecision): void {
    target.quality = 'NEUTRAL';
    target.value.alignment = 0;
    target.value.advantage = 0;
    target.value.headwind = 0;
    target.value.leverageRisk = 0;
    target.value.liquidationProximity = 0;
    target.value.isLiquidated = false;
    target.reasonCodes.push('POSITION_NEUTRAL');
    target.value.reasonCodes.push('POSITION_NEUTRAL');
  }
}
