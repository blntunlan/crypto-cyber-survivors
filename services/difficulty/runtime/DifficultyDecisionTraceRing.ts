import { type DifficultyDecisionTrace } from '../../../types/runtimeDifficulty';

export type DifficultyTraceRecord = Readonly<{
  revision: number;
  decisionId: string;
  trace: DifficultyDecisionTrace;
}>;

export class DifficultyDecisionTraceRing {
  private readonly records: Array<DifficultyTraceRecord | null>;
  private writeIndex = 0;

  public constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity <= 0) {
      throw new Error('Difficulty trace capacity must be a positive integer');
    }
    this.records = Array.from({ length: capacity }, () => null);
  }

  public record(
    revision: number,
    decisionId: string,
    trace: DifficultyDecisionTrace
  ): DifficultyTraceRecord {
    const record = Object.freeze({ revision, decisionId, trace });
    this.records[this.writeIndex] = record;
    this.writeIndex = (this.writeIndex + 1) % this.records.length;
    return record;
  }

  public getByRevision(revision: number): DifficultyTraceRecord | null {
    for (const record of this.records) {
      if (record?.revision === revision) return record;
    }
    return null;
  }

  public getByDecisionId(decisionId: string): DifficultyTraceRecord | null {
    for (const record of this.records) {
      if (record?.decisionId === decisionId) return record;
    }
    return null;
  }

  public clear(): void {
    this.records.fill(null);
    this.writeIndex = 0;
  }
}
