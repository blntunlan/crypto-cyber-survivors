import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from '../config/DirectorConfigV1';
import { type PositionRiskSnapshot } from '../contracts';

export type PositionRiskInput = {
  sequence: number;
  deltaSeconds: number;
  currentPrice: number;
  entryPrice: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  liquidationPrice: number;
};

export type PositionRiskResult = PositionRiskSnapshot & {
  directionalReturn: number;
  leveragedPnl: number;
  rawAlignment: number;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const normalized = clampUnit((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
};

export class PositionRiskModel {
  private readonly config: DirectorConfigV1;
  private alignment = 0;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public update(input: PositionRiskInput): PositionRiskResult {
    if (!this.config.position.publicLeverageTiers.includes(input.leverage)) {
      throw new Error(`Unsupported public leverage tier: ${input.leverage}`);
    }
    if (input.entryPrice <= 0 || input.currentPrice <= 0) {
      throw new Error('Position prices must be positive');
    }

    const sideSign = input.side === 'LONG' ? 1 : -1;
    const directionalReturn =
      ((input.currentPrice - input.entryPrice) / input.entryPrice) * sideSign;
    const leveragedPnl = directionalReturn * input.leverage;
    const rawAlignment = Math.tanh(leveragedPnl / this.config.position.alignmentScale);
    const alpha =
      1 -
      Math.exp(
        -Math.max(0, input.deltaSeconds) / this.config.position.alignmentEmaSeconds
      );
    this.alignment += (rawAlignment - this.alignment) * alpha;

    const liquidationDistanceRatio =
      input.liquidationPrice <= 0
        ? 1
        : Math.abs(input.currentPrice - input.liquidationPrice) /
          input.liquidationPrice;
    const liquidationProximity = 1 - smoothstep(0.05, 0.3, liquidationDistanceRatio);
    const advantage = Math.max(0, this.alignment);
    const pnlHeadwind = Math.max(0, -this.alignment);
    const headwind = Math.max(pnlHeadwind, liquidationProximity);
    const leverageRisk =
      Math.log(1 + input.leverage) /
      Math.log(1 + this.config.position.maximumPublicLeverage);

    return {
      sourceSequence: input.sequence,
      directionalReturn,
      leveragedPnl,
      rawAlignment,
      alignment: this.alignment,
      advantage,
      headwind,
      liquidationProximity,
      leverageRisk,
      isLiquidated:
        input.side === 'LONG'
          ? input.currentPrice <= input.liquidationPrice
          : input.currentPrice >= input.liquidationPrice,
    };
  }

  public reset(): void {
    this.alignment = 0;
  }
}
