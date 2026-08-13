import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export type GreedSnapshot = {
  level: number;
  pressure: number;
  rewardFactor: number;
  recoveryReduction: number;
};

/** Contract §13: `min(0.35, 0.07 * greedLevel)`, shared by pacing and telemetry. */
export const getGreedRecoveryReduction = (
  greedLevel: number,
  config: DirectorConfigV1 = DIRECTOR_CONFIG_V1
): number =>
  Math.min(
    config.greed.maximumRecoveryReduction,
    config.greed.recoveryReductionPerLevel * Math.max(0, greedLevel)
  );

/** Contract §13: `min(0.50, 0.10 * greedLevel)`. */
export const getGreedPressure = (
  greedLevel: number,
  config: DirectorConfigV1 = DIRECTOR_CONFIG_V1
): number =>
  Math.min(
    config.greed.maximumPressure,
    config.greed.pressurePerLevel * Math.max(0, greedLevel)
  );

export class GreedStateMachine {
  private readonly config: DirectorConfigV1;
  private level = 0;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public rejectOffer(): GreedSnapshot {
    this.level += 1;
    return this.getSnapshot();
  }

  public expireOffer(): GreedSnapshot {
    return this.rejectOffer();
  }

  public getSnapshot(): GreedSnapshot {
    return {
      level: this.level,
      pressure: getGreedPressure(this.level, this.config),
      rewardFactor: 1 + 0.18 * Math.sqrt(this.level),
      recoveryReduction: getGreedRecoveryReduction(this.level, this.config),
    };
  }
}
