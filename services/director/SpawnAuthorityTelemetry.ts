import { type SpawnPlan } from './contracts';
import { type SpawnAuthority } from './SpawnAuthorityRouter';

export type LegacySpawnTelemetry = {
  difficulty: number;
  spawnRateMultiplier: number;
};

export type SpawnAuthorityTelemetryInput = {
  tick: number;
  authority: SpawnAuthority;
  activeEnemies: number;
  plan: SpawnPlan | null;
  legacy: LegacySpawnTelemetry | null;
};

export type SpawnAuthorityTelemetryRecord = {
  tick: number;
  authority: SpawnAuthority;
  activeEnemies: number;
  intentCount: number;
  intentSignature: string;
  spendableThreat: number;
  legacy: LegacySpawnTelemetry | null;
};

/** Bounded replay/parity telemetry without a gameplay-side effect. */
export class SpawnAuthorityTelemetryRecorder {
  private readonly capacity: number;
  private readonly records: SpawnAuthorityTelemetryRecord[] = [];

  public constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Spawn telemetry capacity must be a positive integer');
    }
    this.capacity = capacity;
  }

  public record(input: SpawnAuthorityTelemetryInput): SpawnAuthorityTelemetryRecord {
    const plan = input.plan;
    const record: SpawnAuthorityTelemetryRecord = {
      tick: input.tick,
      authority: input.authority,
      activeEnemies: input.activeEnemies,
      intentCount: plan?.intents.length ?? 0,
      intentSignature:
        plan?.intents
          .map(intent => `${intent.enemyType}:${intent.x}:${intent.y}:${intent.tick}`)
          .join('|') ?? '',
      spendableThreat: plan?.spendableThreat ?? 0,
      legacy: input.legacy === null ? null : { ...input.legacy },
    };
    this.records.push(record);
    if (this.records.length > this.capacity) this.records.shift();
    return record;
  }

  public getRecords(): readonly SpawnAuthorityTelemetryRecord[] {
    return this.records;
  }

  public reset(): void {
    this.records.length = 0;
  }
}
