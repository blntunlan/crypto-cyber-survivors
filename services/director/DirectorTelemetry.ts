import { DIRECTOR_CONFIG_V1, type DirectorConfigV1 } from './config/DirectorConfigV1';
import { type GameplaySnapshot } from './contracts';
import {
  createGameplaySnapshotHash,
  type DirectorDecisionTrace,
  type DirectorGuardrailCode,
  type DirectorReasonCode,
} from './ExperienceDirector';
import { type DifficultyOutputV2 } from '../difficulty/types';

export type LegacyDifficultyTelemetry = Pick<
  DifficultyOutputV2,
  | 'total'
  | 'spawnRate'
  | 'enemySpeed'
  | 'enemyHP'
  | 'enemyDamage'
  | 'xpMultiplier'
  | 'gemDropRate'
>;

export type DirectorTelemetryRecord = {
  tick: number;
  revision: number;
  snapshotHash: string;
  /** Contract §19: every decision carries its config and content identity. */
  directorVersion: string;
  configVersion: string;
  contentManifestHash: string;
  legacy: LegacyDifficultyTelemetry | null;
  director: {
    threatTarget: number;
    threatCreditRate: number;
    advantageCreditRate: number;
    pacingState: GameplaySnapshot['pacing']['state'];
    encounterPhase: GameplaySnapshot['encounter']['phase'];
  };
  reasonCodes: readonly DirectorReasonCode[];
  guardrailCodes: readonly DirectorGuardrailCode[];
};

/**
 * Temporary boundary around the legacy difficulty output. It deliberately
 * exposes only telemetry data and never lets legacy multipliers mutate a new
 * Director snapshot.
 */
export const LegacyDifficultyAdapter = {
  fromOutput(output: DifficultyOutputV2): LegacyDifficultyTelemetry {
    return {
      total: output.total,
      spawnRate: output.spawnRate,
      enemySpeed: output.enemySpeed,
      enemyHP: output.enemyHP,
      enemyDamage: output.enemyDamage,
      xpMultiplier: output.xpMultiplier,
      gemDropRate: output.gemDropRate,
    };
  },
};

/** Bounded, in-memory shadow telemetry; transport remains outside Director. */
export class DirectorTelemetryRecorder {
  private readonly capacity: number;
  private readonly versions: DirectorConfigV1['versions'];
  private readonly records: DirectorTelemetryRecord[] = [];

  public constructor(config: DirectorConfigV1 = DIRECTOR_CONFIG_V1) {
    this.capacity = config.runtime.telemetryCapacity;
    this.versions = config.versions;
  }

  public record(
    snapshot: GameplaySnapshot,
    trace: DirectorDecisionTrace,
    legacy: LegacyDifficultyTelemetry | null
  ): DirectorTelemetryRecord {
    const record: DirectorTelemetryRecord = {
      tick: snapshot.validFromTick,
      revision: snapshot.revision,
      snapshotHash: createGameplaySnapshotHash(snapshot),
      directorVersion: this.versions.directorVersion,
      configVersion: this.versions.configVersion,
      contentManifestHash: this.versions.contentManifestHash,
      legacy,
      director: {
        threatTarget: snapshot.threat.target,
        threatCreditRate: snapshot.threat.creditRate,
        advantageCreditRate: snapshot.advantage.creditRate,
        pacingState: snapshot.pacing.state,
        encounterPhase: snapshot.encounter.phase,
      },
      reasonCodes: [...trace.reasonCodes],
      guardrailCodes: [...trace.guardrailCodes],
    };

    this.records.push(record);
    if (this.records.length > this.capacity) this.records.shift();
    return record;
  }

  public getRecords(): readonly DirectorTelemetryRecord[] {
    return this.records;
  }

  public reset(): void {
    this.records.length = 0;
  }
}
