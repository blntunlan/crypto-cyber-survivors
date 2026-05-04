import type {
  GameLoopCoordinatorHooks,
  GameLoopPhase,
  GameLoopPhaseError,
} from './GameLoopCoordinator';
import type { PhaseName, TickContext } from '../contracts';

const DEFAULT_MAX_PHASES = 24;
const DEFAULT_MAX_RECENT_ERRORS = 16;
const DEFAULT_SLOW_PHASE_THRESHOLD_MS = 3;

export interface PhaseProfilerOptions {
  maxPhases?: number;
  maxRecentErrors?: number;
  slowPhaseThresholdMs?: number;
  now?: () => number;
}

export interface PhaseProfilerPhaseSnapshot {
  id: string;
  lastDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  samples: number;
  slowSamples: number;
  lastFrame: number;
  hadError: boolean;
}

export interface PhaseProfilerErrorSnapshot {
  phaseId: string;
  stage: string;
  frame: number;
  message: string;
}

export interface PhaseProfilerSnapshot {
  frame: number;
  tickDurationMs: number;
  phaseCount: number;
  errorCount: number;
  slowPhaseCount: number;
  phases: PhaseProfilerPhaseSnapshot[];
  recentErrors: PhaseProfilerErrorSnapshot[];
}

interface MutablePhaseRecord {
  id: string;
  lastDurationMs: number;
  totalDurationMs: number;
  maxDurationMs: number;
  samples: number;
  slowSamples: number;
  lastFrame: number;
  hadError: boolean;
}

interface MutableErrorRecord {
  phaseId: string;
  stage: string;
  frame: number;
  message: string;
}

const defaultNow = (): number => {
  if (typeof performance !== 'undefined') {
    return performance.now();
  }

  return Date.now();
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export class PhaseProfiler {
  private readonly maxPhases: number;
  private readonly maxRecentErrors: number;
  private readonly slowPhaseThresholdMs: number;
  private readonly now: () => number;

  private readonly records: MutablePhaseRecord[] = [];
  private readonly phaseStartTimes: number[];
  private readonly phaseOrder: number[];
  private readonly recentErrors: MutableErrorRecord[];

  private frame = 0;
  private tickStartMs = 0;
  private tickEndMs = 0;
  private activePhaseCount = 0;
  private tickErrorCount = 0;
  private errorWriteIndex = 0;
  private errorRecordCount = 0;

  public constructor(options: PhaseProfilerOptions = {}) {
    this.maxPhases = options.maxPhases ?? DEFAULT_MAX_PHASES;
    this.maxRecentErrors = options.maxRecentErrors ?? DEFAULT_MAX_RECENT_ERRORS;
    this.slowPhaseThresholdMs =
      options.slowPhaseThresholdMs ?? DEFAULT_SLOW_PHASE_THRESHOLD_MS;
    this.now = options.now ?? defaultNow;

    this.phaseStartTimes = new Array(this.maxPhases).fill(0);
    this.phaseOrder = new Array(this.maxPhases).fill(-1);
    this.recentErrors = Array.from({ length: this.maxRecentErrors }, () => ({
      phaseId: '',
      stage: '',
      frame: 0,
      message: '',
    }));
  }

  public createHooks(): GameLoopCoordinatorHooks<TickContext> {
    return {
      beforePhase: (phase, context) => this.beforePhase(phase, context),
      afterPhase: (phase, context, phaseHadError) =>
        this.afterPhase(phase, context, phaseHadError),
      onError: phaseError => this.recordError(phaseError),
    };
  }

  public beforePhase(phase: GameLoopPhase<TickContext>, context: TickContext): void {
    if (context.clock.frame !== this.frame) {
      this.beginTick(context);
    }

    const index = this.getOrCreatePhaseIndex(phase.id);
    if (index < 0) {
      return;
    }

    if (this.activePhaseCount < this.phaseOrder.length) {
      this.phaseOrder[this.activePhaseCount] = index;
      this.activePhaseCount += 1;
    }

    this.phaseStartTimes[index] = this.now();
    const record = this.records[index];
    if (record) {
      record.lastFrame = context.clock.frame;
      record.hadError = false;
    }
  }

  public afterPhase(
    phase: GameLoopPhase<TickContext>,
    context: TickContext,
    phaseHadError: boolean
  ): void {
    const index = this.getPhaseIndex(phase.id);
    if (index < 0) {
      return;
    }

    const endMs = this.now();
    const startMs = this.phaseStartTimes[index] ?? endMs;
    const durationMs = Math.max(0, endMs - startMs);
    const record = this.records[index];
    if (!record) {
      return;
    }

    record.lastDurationMs = durationMs;
    record.totalDurationMs += durationMs;
    record.maxDurationMs = Math.max(record.maxDurationMs, durationMs);
    record.samples += 1;
    record.lastFrame = context.clock.frame;
    record.hadError = phaseHadError;
    if (durationMs > this.slowPhaseThresholdMs) {
      record.slowSamples += 1;
    }

    if (context.telemetry.phaseDurationsMs) {
      context.telemetry.phaseDurationsMs[phase.id as PhaseName] = durationMs;
    }

    this.tickEndMs = endMs;
  }

  public recordError(phaseError: GameLoopPhaseError<TickContext>): void {
    this.tickErrorCount += 1;

    const record = this.recentErrors[this.errorWriteIndex];
    if (record) {
      record.phaseId = phaseError.phaseId;
      record.stage = phaseError.stage;
      record.frame = phaseError.context.clock.frame;
      record.message = getErrorMessage(phaseError.error);
    }

    this.errorWriteIndex = (this.errorWriteIndex + 1) % this.maxRecentErrors;
    this.errorRecordCount = Math.min(this.errorRecordCount + 1, this.maxRecentErrors);
  }

  public getSnapshot(): PhaseProfilerSnapshot {
    const phases: PhaseProfilerPhaseSnapshot[] = [];
    let slowPhaseCount = 0;

    for (let i = 0; i < this.activePhaseCount; i += 1) {
      const recordIndex = this.phaseOrder[i];
      if (recordIndex === undefined || recordIndex < 0) {
        continue;
      }

      const record = this.records[recordIndex];
      if (!record) {
        continue;
      }

      if (record.lastDurationMs > this.slowPhaseThresholdMs) {
        slowPhaseCount += 1;
      }

      phases.push({
        id: record.id,
        lastDurationMs: Number(record.lastDurationMs.toFixed(3)),
        avgDurationMs:
          record.samples > 0
            ? Number((record.totalDurationMs / record.samples).toFixed(3))
            : 0,
        maxDurationMs: Number(record.maxDurationMs.toFixed(3)),
        samples: record.samples,
        slowSamples: record.slowSamples,
        lastFrame: record.lastFrame,
        hadError: record.hadError,
      });
    }

    return {
      frame: this.frame,
      tickDurationMs: Number(Math.max(0, this.tickEndMs - this.tickStartMs).toFixed(3)),
      phaseCount: phases.length,
      errorCount: this.tickErrorCount,
      slowPhaseCount,
      phases,
      recentErrors: this.getRecentErrors(),
    };
  }

  public reset(): void {
    this.frame = 0;
    this.tickStartMs = 0;
    this.tickEndMs = 0;
    this.activePhaseCount = 0;
    this.tickErrorCount = 0;
    this.errorWriteIndex = 0;
    this.errorRecordCount = 0;

    for (let i = 0; i < this.records.length; i += 1) {
      const record = this.records[i];
      if (!record) {
        continue;
      }
      record.lastDurationMs = 0;
      record.totalDurationMs = 0;
      record.maxDurationMs = 0;
      record.samples = 0;
      record.slowSamples = 0;
      record.lastFrame = 0;
      record.hadError = false;
    }
  }

  private beginTick(context: TickContext): void {
    this.frame = context.clock.frame;
    this.tickStartMs = this.now();
    this.tickEndMs = this.tickStartMs;
    this.activePhaseCount = 0;
    this.tickErrorCount = 0;
  }

  private getOrCreatePhaseIndex(id: string): number {
    const existing = this.getPhaseIndex(id);
    if (existing >= 0) {
      return existing;
    }

    if (this.records.length >= this.maxPhases) {
      return -1;
    }

    this.records.push({
      id,
      lastDurationMs: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      samples: 0,
      slowSamples: 0,
      lastFrame: 0,
      hadError: false,
    });

    return this.records.length - 1;
  }

  private getPhaseIndex(id: string): number {
    for (let i = 0; i < this.records.length; i += 1) {
      if (this.records[i]?.id === id) {
        return i;
      }
    }

    return -1;
  }

  private getRecentErrors(): PhaseProfilerErrorSnapshot[] {
    const errors: PhaseProfilerErrorSnapshot[] = [];
    for (let i = 0; i < this.errorRecordCount; i += 1) {
      const sourceIndex =
        (this.errorWriteIndex - this.errorRecordCount + i + this.maxRecentErrors) %
        this.maxRecentErrors;
      const record = this.recentErrors[sourceIndex];
      if (!record || record.phaseId.length === 0) {
        continue;
      }

      errors.push({
        phaseId: record.phaseId,
        stage: record.stage,
        frame: record.frame,
        message: record.message,
      });
    }

    return errors;
  }
}
