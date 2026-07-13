import { type GameplayRunMode, type IntensitySnapshot } from '../director/contracts';

export type IntensityInput = {
  deltaSeconds: number;
  hpRatio: number;
  damageTakenPerSecond: number;
  nearbyThreatPressure: number;
  escapeResourcePressure: number;
  killsPerMinute: number;
  combatMastery: number;
  buildPower: number;
  mobilityUsage: number;
};

export type PracticeAssistPolicy = {
  getRecoveryAssist: (recoveryNeed: number) => number;
};

const DAMAGE_SMOOTHING_SECONDS = 3;

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Allocation-free player/world telemetry. This model intentionally has no
 * EventBus, entity, spawn, stat, reward, or UI dependency.
 */
export class IntensityModel {
  private recentDamagePressure = 0;
  private readonly output: IntensitySnapshot = {
    healthRatio: 1,
    combatMastery: 0,
    buildPower: 0,
    recentDamagePerSecond: 0,
    killsPerMinute: 0,
    mobilityUsage: 0,
    recentDamagePressure: 0,
    nearbyThreatPressure: 0,
    escapeResourcePressure: 0,
    recoveryNeed: 0,
  };

  public update(input: IntensityInput): IntensitySnapshot {
    const alpha =
      1 - Math.exp(-Math.max(0, input.deltaSeconds) / DAMAGE_SMOOTHING_SECONDS);
    const targetDamagePressure = clampUnit(input.damageTakenPerSecond / 50);
    this.recentDamagePressure +=
      (targetDamagePressure - this.recentDamagePressure) * alpha;

    const healthRatio = clampUnit(input.hpRatio);
    const nearbyThreatPressure = clampUnit(input.nearbyThreatPressure);
    const escapeResourcePressure = clampUnit(input.escapeResourcePressure);
    const recoveryNeed = clampUnit(
      (1 - healthRatio) * 0.4 +
        this.recentDamagePressure * 0.3 +
        nearbyThreatPressure * 0.2 +
        escapeResourcePressure * 0.1
    );

    this.output.healthRatio = healthRatio;
    this.output.combatMastery = clampUnit(input.combatMastery);
    this.output.buildPower = clampUnit(input.buildPower);
    this.output.recentDamagePerSecond = Math.max(0, input.damageTakenPerSecond);
    this.output.killsPerMinute = Math.max(0, input.killsPerMinute);
    this.output.mobilityUsage = clampUnit(input.mobilityUsage);
    this.output.recentDamagePressure = this.recentDamagePressure;
    this.output.nearbyThreatPressure = nearbyThreatPressure;
    this.output.escapeResourcePressure = escapeResourcePressure;
    this.output.recoveryNeed = recoveryNeed;

    return this.output;
  }

  public reset(): void {
    this.recentDamagePressure = 0;
    this.output.healthRatio = 1;
    this.output.combatMastery = 0;
    this.output.buildPower = 0;
    this.output.recentDamagePerSecond = 0;
    this.output.killsPerMinute = 0;
    this.output.mobilityUsage = 0;
    this.output.recentDamagePressure = 0;
    this.output.nearbyThreatPressure = 0;
    this.output.escapeResourcePressure = 0;
    this.output.recoveryNeed = 0;
  }
}

export const createPracticeAssistPolicy = (
  mode: GameplayRunMode
): PracticeAssistPolicy => {
  if (mode !== 'PRACTICE') {
    throw new Error(`Practice Assist is unavailable for ${mode}`);
  }

  return {
    getRecoveryAssist: recoveryNeed => clampUnit(recoveryNeed) * 0.25,
  };
};
