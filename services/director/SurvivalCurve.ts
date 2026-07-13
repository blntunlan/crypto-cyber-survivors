import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';

export class SurvivalCurve {
  private readonly config: DirectorConfigV1;

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.config = config;
  }

  public getPressure(elapsedSeconds: number): number {
    const points = this.config.survival.pressurePoints;
    const safeElapsed = Math.max(0, elapsedSeconds);
    const first = points[0]!;
    if (safeElapsed <= first.elapsedSeconds) return first.pressure;

    for (let index = 1; index < points.length; index += 1) {
      const next = points[index]!;
      const previous = points[index - 1]!;
      if (safeElapsed <= next.elapsedSeconds) {
        const progress =
          (safeElapsed - previous.elapsedSeconds) /
          (next.elapsedSeconds - previous.elapsedSeconds);
        return previous.pressure + (next.pressure - previous.pressure) * progress;
      }
    }

    return this.config.survival.pressureCap;
  }

  public getDoomStacks(elapsedSeconds: number): number {
    if (elapsedSeconds <= this.config.survival.doomStartsAtSeconds) return 0;
    return Math.floor(
      (elapsedSeconds - this.config.survival.doomStartsAtSeconds) /
        this.config.survival.doomStackIntervalSeconds
    );
  }

  public getRecoveryDuration(baseSeconds: number, doomStacks: number): number {
    return Math.max(
      this.config.survival.minimumRecoverySeconds,
      baseSeconds -
        doomStacks * this.config.survival.recoveryReductionPerDoomStackSeconds
    );
  }
}
