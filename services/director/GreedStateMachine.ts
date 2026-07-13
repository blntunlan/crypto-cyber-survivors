import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export type GreedSnapshot = { level: number; pressure: number; rewardFactor: number };

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
      pressure: Math.min(
        this.config.greed.maximumPressure,
        this.config.greed.pressurePerLevel * this.level
      ),
      rewardFactor: 1 + 0.18 * Math.sqrt(this.level),
    };
  }
}
