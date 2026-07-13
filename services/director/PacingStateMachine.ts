import { type MarketEventFamily } from './contracts';
import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export type PacingSnapshot = { queuedEventFamily: MarketEventFamily | null };

export class PacingStateMachine {
  private readonly config: DirectorConfigV1;
  private queuedEventFamily: MarketEventFamily | null = null;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public requestMarketSurge(
    eventFamily: MarketEventFamily,
    elapsedSeconds: number
  ): boolean {
    if (elapsedSeconds < this.config.marketEvents.initialSurgeLockoutSeconds)
      return false;
    if (this.queuedEventFamily !== null) return false;
    this.queuedEventFamily = eventFamily;
    return true;
  }

  public getSnapshot(): PacingSnapshot {
    return { queuedEventFamily: this.queuedEventFamily };
  }
}
