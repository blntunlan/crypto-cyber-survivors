import { DIFFICULTY_RUNTIME_CONFIG } from '../../../../config/difficulty/DifficultyRuntimeConfig';
import { PlayerPowerAnalyzer } from '../../PlayerPowerAnalyzer';
import { IntensityModel } from '../../../engagement/IntensityModel';
import {
  type DifficultyReasonCode,
  type PlayerDecisionSummary,
} from '../../../../types/runtimeDifficulty';
import {
  type PlayerAdaptationDecision,
  type PlayerAdaptationInput,
} from '../contracts';

type MutablePlayerDecision = {
  revision: number;
  validFromTick: number;
  inputRevision: number;
  quality: 'LIVE' | 'NEUTRAL';
  value: Omit<PlayerDecisionSummary, 'reasonCodes'> & {
    reasonCodes: DifficultyReasonCode[];
  };
  reasonCodes: DifficultyReasonCode[];
  clampCodes: [];
};

const SECONDS_PER_MINUTE = 60;

const createNeutralDecision = (): MutablePlayerDecision => ({
  revision: 0,
  validFromTick: 0,
  inputRevision: 0,
  quality: 'NEUTRAL',
  value: {
    flowState: 'FLOW',
    engagement: 0,
    frustration: 0,
    combatMastery: 0,
    buildPower: 0,
    recentDamagePressure: 0,
    killsPerMinute: 0,
    mobilityUsage: 0,
    screenPressure: 0,
    recoveryNeed: 0,
    challengeAdjustment: 0,
    reasonCodes: ['PLAYER_TELEMETRY_MISSING'],
  },
  reasonCodes: ['PLAYER_TELEMETRY_MISSING'],
  clampCodes: [],
});

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

export class PlayerAdaptationManager {
  private readonly decisions: [MutablePlayerDecision, MutablePlayerDecision] = [
    createNeutralDecision(),
    createNeutralDecision(),
  ];
  private readonly intensityModel = new IntensityModel();
  private readonly powerAnalyzer = new PlayerPowerAnalyzer();
  private activeDecisionIndex = 0;

  public update(input: PlayerAdaptationInput): PlayerAdaptationDecision {
    const current = this.getActiveDecision();
    const nextIndex = this.activeDecisionIndex === 0 ? 1 : 0;
    const target = nextIndex === 0 ? this.decisions[0] : this.decisions[1];
    target.revision = current.revision + 1;
    target.validFromTick = input.validFromTick;
    target.inputRevision = input.inputRevision;
    target.reasonCodes.length = 0;
    target.value.reasonCodes.length = 0;

    if (input.telemetry === null) {
      this.writeNeutral(target, 'PLAYER_TELEMETRY_MISSING');
      this.activeDecisionIndex = nextIndex;
      return target;
    }
    if (!this.isValid(input)) {
      this.writeNeutral(target, 'PLAYER_TELEMETRY_INVALID');
      this.activeDecisionIndex = nextIndex;
      return target;
    }

    const telemetry = input.telemetry;
    const windowMinutes = telemetry.windowSeconds / SECONDS_PER_MINUTE;
    const killsPerMinute = telemetry.killsInWindow / windowMinutes;
    const dashesPerMinute = telemetry.dashesInWindow / windowMinutes;
    const shotsPerMinute = telemetry.shotsInWindow / windowMinutes;
    const healthRatio = clampUnit(
      telemetry.remainingHp / Math.max(1, telemetry.remainingHp + telemetry.damageTaken)
    );
    const screenPressure = clampUnit(
      input.world.activeEnemies / Math.max(1, input.world.maximumEnemies)
    );
    const mobilityUsage = clampUnit(
      dashesPerMinute / DIFFICULTY_RUNTIME_CONFIG.player.dashesPerMinuteReference
    );
    const power = this.powerAnalyzer.updateFromTelemetry(
      telemetry.level,
      killsPerMinute,
      shotsPerMinute,
      healthRatio,
      screenPressure
    );
    const intensity = this.intensityModel.update({
      deltaSeconds: input.deltaSeconds,
      hpRatio: healthRatio,
      damageTakenPerSecond: telemetry.damageTaken / telemetry.windowSeconds,
      nearbyThreatPressure: screenPressure,
      escapeResourcePressure: 1 - mobilityUsage,
      killsPerMinute,
      combatMastery: power.playerPower,
      buildPower: power.offensePower,
      mobilityUsage,
    });
    const engagement = Math.max(
      clampUnit(
        killsPerMinute / DIFFICULTY_RUNTIME_CONFIG.player.killsPerMinuteReference
      ),
      mobilityUsage,
      clampUnit(
        shotsPerMinute / DIFFICULTY_RUNTIME_CONFIG.player.shotsPerMinuteReference
      )
    );
    const flowState =
      intensity.recoveryNeed >=
      DIFFICULTY_RUNTIME_CONFIG.player.stressedRecoveryThreshold
        ? 'STRESSED'
        : engagement <= DIFFICULTY_RUNTIME_CONFIG.player.boredEngagementThreshold
          ? 'BORED'
          : 'FLOW';
    const challengeAdjustment =
      flowState === 'STRESSED'
        ? -intensity.recoveryNeed
        : flowState === 'BORED'
          ? 1 - engagement
          : 0;

    target.quality = 'LIVE';
    target.value.flowState = flowState;
    target.value.engagement = engagement;
    target.value.frustration = intensity.recoveryNeed;
    target.value.combatMastery = power.playerPower;
    target.value.buildPower = power.offensePower;
    target.value.recentDamagePressure = intensity.recentDamagePressure;
    target.value.killsPerMinute = killsPerMinute;
    target.value.mobilityUsage = mobilityUsage;
    target.value.screenPressure = screenPressure;
    target.value.recoveryNeed = intensity.recoveryNeed;
    target.value.challengeAdjustment = challengeAdjustment;
    target.reasonCodes.push('PLAYER_LIVE');
    target.value.reasonCodes.push('PLAYER_LIVE');
    this.activeDecisionIndex = nextIndex;
    return target;
  }

  public getSnapshot(): PlayerAdaptationDecision {
    return this.getActiveDecision();
  }

  public reset(): void {
    this.intensityModel.reset();
    this.powerAnalyzer.reset();
    this.decisions[0] = createNeutralDecision();
    this.decisions[1] = createNeutralDecision();
    this.activeDecisionIndex = 0;
  }

  private getActiveDecision(): MutablePlayerDecision {
    return this.activeDecisionIndex === 0 ? this.decisions[0] : this.decisions[1];
  }

  private isValid(input: PlayerAdaptationInput): boolean {
    const telemetry = input.telemetry;
    if (telemetry === null) return false;
    return (
      Number.isFinite(input.deltaSeconds) &&
      input.deltaSeconds >= 0 &&
      Number.isFinite(telemetry.damageTaken) &&
      telemetry.damageTaken >= 0 &&
      Number.isFinite(telemetry.remainingHp) &&
      telemetry.remainingHp >= 0 &&
      Number.isSafeInteger(telemetry.killsInWindow) &&
      telemetry.killsInWindow >= 0 &&
      Number.isSafeInteger(telemetry.dashesInWindow) &&
      telemetry.dashesInWindow >= 0 &&
      Number.isSafeInteger(telemetry.shotsInWindow) &&
      telemetry.shotsInWindow >= 0 &&
      Number.isSafeInteger(telemetry.level) &&
      telemetry.level >= 1 &&
      Number.isFinite(telemetry.windowSeconds) &&
      telemetry.windowSeconds > 0 &&
      Number.isSafeInteger(input.world.activeEnemies) &&
      input.world.activeEnemies >= 0 &&
      Number.isSafeInteger(input.world.maximumEnemies) &&
      input.world.maximumEnemies >= 0
    );
  }

  private writeNeutral(
    target: MutablePlayerDecision,
    reasonCode: DifficultyReasonCode
  ): void {
    target.quality = 'NEUTRAL';
    target.value.flowState = 'FLOW';
    target.value.engagement = 0;
    target.value.frustration = 0;
    target.value.combatMastery = 0;
    target.value.buildPower = 0;
    target.value.recentDamagePressure = 0;
    target.value.killsPerMinute = 0;
    target.value.mobilityUsage = 0;
    target.value.screenPressure = 0;
    target.value.recoveryNeed = 0;
    target.value.challengeAdjustment = 0;
    target.reasonCodes.push(reasonCode);
    target.value.reasonCodes.push(reasonCode);
  }
}
