import {
  SHADOW_COMPARISON_CONFIG,
  type ShadowApprovedDrift,
  type ShadowComparisonConfig,
  type ShadowContinuousDimension,
} from '../../../config/difficulty/ShadowComparisonConfig';
import {
  type DecisionQuality,
  type DifficultyReasonCode,
  type RuntimeDifficultySnapshot,
} from '../../../types/runtimeDifficulty';

export type CurrentDirectorSnapshot = {
  revision: number;
  threatTarget: number;
  creditRate: number;
  spawnWindowSeconds: number;
  spawnCount: number;
  composition: readonly string[];
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  mercy: number;
  recoveryNeed: number;
  encounterPhase: RuntimeDifficultySnapshot['encounter']['phase'];
  presentationIntensity: number;
  quality: DecisionQuality;
  fallbackCodes: readonly DifficultyReasonCode[];
};

export type ShadowComparisonDimension = {
  dimension: string;
  currentValue: number | string | readonly string[];
  modularValue: number | string | readonly string[];
  drift: number | null;
  tolerance: number;
  exact: boolean;
  approvedDriftId: string | null;
  passed: boolean;
};

export type ShadowComparisonRecord = {
  scenarioId: string;
  currentRevision: number;
  modularRevision: number;
  configVersion: string;
  manifestVersion: string;
  passed: boolean;
  dimensions: readonly ShadowComparisonDimension[];
  failures: readonly ShadowComparisonDimension[];
};

export class ShadowComparisonRecorder {
  private readonly records: Array<ShadowComparisonRecord | null>;
  private writeIndex = 0;
  private recordCount = 0;

  public constructor(
    private readonly config: ShadowComparisonConfig = SHADOW_COMPARISON_CONFIG
  ) {
    if (!Number.isSafeInteger(config.capacity) || config.capacity <= 0) {
      throw new Error('Shadow comparison capacity must be a positive integer');
    }
    this.records = Array.from({ length: config.capacity }, () => null);
  }

  public record(
    scenarioId: string,
    current: CurrentDirectorSnapshot,
    modular: RuntimeDifficultySnapshot
  ): ShadowComparisonRecord {
    const dimensions: ShadowComparisonDimension[] = [];
    this.compareContinuous(
      dimensions,
      scenarioId,
      'threatTarget',
      current.threatTarget,
      modular.pressure.threatTarget
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'creditRate',
      current.creditRate,
      modular.pressure.creditRate
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'spawnWindowSeconds',
      current.spawnWindowSeconds,
      modular.spawn.spawnWindowSeconds
    );
    this.compareExact(
      dimensions,
      'spawnCount',
      current.spawnCount,
      Math.floor(modular.spawn.reservedCredits)
    );
    this.compareExact(
      dimensions,
      'composition',
      current.composition,
      modular.spawn.directives.map(directive => directive.archetype)
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'enemyHealthMultiplier',
      current.enemyHealthMultiplier,
      modular.enemy.healthMultiplier
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'enemyDamageMultiplier',
      current.enemyDamageMultiplier,
      modular.enemy.damageMultiplier
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'enemySpeedMultiplier',
      current.enemySpeedMultiplier,
      modular.enemy.speedMultiplier
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'mercy',
      current.mercy,
      modular.recovery.mercy
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'recoveryNeed',
      current.recoveryNeed,
      modular.recovery.recoveryNeed
    );
    this.compareExact(
      dimensions,
      'encounterPhase',
      current.encounterPhase,
      modular.encounter.phase
    );
    this.compareContinuous(
      dimensions,
      scenarioId,
      'presentationIntensity',
      current.presentationIntensity,
      modular.presentation.intensity
    );
    this.compareExact(dimensions, 'quality', current.quality, modular.meta.quality);
    this.compareExact(
      dimensions,
      'fallbackCodes',
      current.fallbackCodes,
      modular.trace.fallbackCodes
    );

    const failures = dimensions.filter(dimension => !dimension.passed);
    const record: ShadowComparisonRecord = {
      scenarioId,
      currentRevision: current.revision,
      modularRevision: modular.meta.revision,
      configVersion: this.config.version,
      manifestVersion: this.config.manifestVersion,
      passed: failures.length === 0,
      dimensions,
      failures,
    };
    this.records[this.writeIndex] = record;
    this.writeIndex = (this.writeIndex + 1) % this.records.length;
    this.recordCount = Math.min(this.records.length, this.recordCount + 1);
    return record;
  }

  public getRecords(): readonly ShadowComparisonRecord[] {
    const result: ShadowComparisonRecord[] = [];
    const startIndex = this.recordCount < this.records.length ? 0 : this.writeIndex;
    for (let offset = 0; offset < this.recordCount; offset += 1) {
      const index = (startIndex + offset) % this.records.length;
      const record = this.records[index] ?? null;
      if (record !== null) result.push(record);
    }
    return result;
  }

  public reset(): void {
    this.records.fill(null);
    this.writeIndex = 0;
    this.recordCount = 0;
  }

  private compareContinuous(
    dimensions: ShadowComparisonDimension[],
    scenarioId: string,
    dimension: ShadowContinuousDimension,
    currentValue: number,
    modularValue: number
  ): void {
    const drift = Math.abs(currentValue - modularValue);
    const tolerance = this.config.continuousTolerances[dimension];
    const approval = drift === 0 ? null : this.findApproval(scenarioId, dimension);
    const passed =
      drift === 0 ||
      (approval !== null && drift <= tolerance && drift <= approval.maximumDrift);
    dimensions.push({
      dimension,
      currentValue,
      modularValue,
      drift,
      tolerance,
      exact: false,
      approvedDriftId: approval?.id ?? null,
      passed,
    });
  }

  private compareExact(
    dimensions: ShadowComparisonDimension[],
    dimension: string,
    currentValue: number | string | readonly string[],
    modularValue: number | string | readonly string[]
  ): void {
    const passed =
      Array.isArray(currentValue) && Array.isArray(modularValue)
        ? currentValue.length === modularValue.length &&
          currentValue.every((value, index) => value === modularValue[index])
        : currentValue === modularValue;
    dimensions.push({
      dimension,
      currentValue,
      modularValue,
      drift: null,
      tolerance: 0,
      exact: true,
      approvedDriftId: null,
      passed,
    });
  }

  private findApproval(
    scenarioId: string,
    dimension: ShadowContinuousDimension
  ): ShadowApprovedDrift | null {
    return (
      this.config.approvedDrifts.find(
        approval =>
          approval.scenarioId === scenarioId && approval.dimension === dimension
      ) ?? null
    );
  }
}
