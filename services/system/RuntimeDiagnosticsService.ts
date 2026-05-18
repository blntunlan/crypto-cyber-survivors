import {
  getRuntimeDiagnosticsConfig,
  RUNTIME_DIAGNOSTICS_PHASES,
} from '../../config/RuntimeDiagnosticsConfig';
import {
  getRuntimeDebugSnapshot,
  type RuntimeDebugSnapshot,
} from '../../config/RuntimeDebugFlags';
import { GameStatus } from '../../types';
import {
  getRenderDiagnosticsSnapshot,
  type RenderDiagnosticsSnapshot,
} from '../../utils/trackRender';
import { EventBus } from '../core/EventBus';
import type { PhaseName } from '../gameplay/contracts';
import { Logger } from './Logger';

export type RuntimeDiagnosticsIssueCode =
  | 'PHYSICS_OVER_BUDGET'
  | 'RENDER_OVER_BUDGET'
  | 'PHASE_OVER_BUDGET'
  | 'ENTITY_PRESSURE'
  | 'MAIN_THREAD_LONG_TASK'
  | 'MEMORY_SPIKE'
  | 'GC_OR_MEMORY_PRESSURE'
  | 'RAF_CADENCE_DROP'
  | 'COMPOSITOR_PRESSURE'
  | 'PHASE_ERROR'
  | 'RAF_STALL';

export type RuntimeDiagnosticsSeverity =
  | 'none'
  | 'slow'
  | 'stutter'
  | 'hitch'
  | 'error';

export type RuntimeDiagnosticsDebugSignalCode =
  | 'ANTI_CHEAT_WARNING'
  | 'ANTI_CHEAT_DETECTED'
  | 'NOTIFICATION_ADDED'
  | 'NOTIFICATION_DEDUPED'
  | 'NOTIFICATION_DROPPED'
  | 'DIAGNOSTICS_EXPORTED'
  | 'RENDER_HOT_COMPONENT';

export interface RuntimeDiagnosticsEntityCounts {
  enemies: number;
  bullets: number;
  particles: number;
  gems: number;
  floatingTexts: number;
  interactables: number;
}

export interface RuntimeDiagnosticsFrameFlags {
  hitStopActive: boolean;
  levelUpFreezeActive: boolean;
}

export interface RuntimeDiagnosticsFrameInput {
  frame: number;
  timestampMs: number;
  gameTimeMs: number;
  status: GameStatus;
  rafDeltaMs: number;
  updateMs: number;
  renderMs: number;
  physicsMs: number;
  phaseDurationsMs: Partial<Record<PhaseName, number>> | null;
  entityCounts: RuntimeDiagnosticsEntityCounts;
  flags: RuntimeDiagnosticsFrameFlags;
}

export interface RuntimeDiagnosticsCadenceEstimate {
  refreshQuantumMs: number;
  vsyncSlots: number;
  missedVsyncSlots: number;
  quantized: boolean;
}

export interface RuntimeDiagnosticsEnvironmentSample {
  timestampMs: number;
  devicePixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  documentHidden: boolean;
  documentFocused: boolean;
  domNodes: number;
  motionElements: number;
  backdropFilterElements: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasPixelWidth: number;
  canvasPixelHeight: number;
  canvasDpr: number;
  canvasMegapixels: number;
  runtimeDebug: RuntimeDebugSnapshot;
}

export interface RuntimeDiagnosticsFrameSample {
  frame: number;
  timestampMs: number;
  gameTimeMs: number;
  status: GameStatus;
  frameMs: number;
  fps: number;
  updateMs: number;
  renderMs: number;
  physicsMs: number;
  otherMs: number;
  slowestPhaseId: PhaseName | 'none';
  slowestPhaseMs: number;
  enemies: number;
  bullets: number;
  particles: number;
  gems: number;
  floatingTexts: number;
  interactables: number;
  totalEntities: number;
  memoryUsedMb: number;
  memoryDeltaMb: number;
  estimatedRefreshQuantumMs: number;
  estimatedVsyncSlots: number;
  missedVsyncSlots: number;
  motionElements: number;
  backdropFilterElements: number;
  domNodes: number;
  canvasMegapixels: number;
  canvasDpr: number;
  devicePixelRatio: number;
  severity: RuntimeDiagnosticsSeverity;
  issueCode: RuntimeDiagnosticsIssueCode | 'none';
}

export interface RuntimeDiagnosticsIssue {
  id: number;
  code: RuntimeDiagnosticsIssueCode;
  severity: Exclude<RuntimeDiagnosticsSeverity, 'none'>;
  frame: number;
  timestampMs: number;
  gameTimeMs: number;
  frameMs: number;
  updateMs: number;
  renderMs: number;
  physicsMs: number;
  slowestPhaseId: PhaseName | 'none';
  slowestPhaseMs: number;
  enemies: number;
  bullets: number;
  particles: number;
  totalEntities: number;
  memoryDeltaMb: number;
  otherMs: number;
  estimatedRefreshQuantumMs: number;
  missedVsyncSlots: number;
  motionElements: number;
  backdropFilterElements: number;
  domNodes: number;
  canvasMegapixels: number;
}

export interface RuntimeDiagnosticsDebugSignal {
  id: number;
  source: string;
  code: RuntimeDiagnosticsDebugSignalCode;
  timestampMs: number;
  message: string;
  count: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface RuntimeDiagnosticsDebugSignalSummary {
  totalSignals: number;
  countsByCode: Partial<Record<RuntimeDiagnosticsDebugSignalCode, number>>;
  countsBySource: Record<string, number>;
  topRenderComponents: RenderDiagnosticsSnapshot['topComponents'];
  totalRenders: number;
  rendersSinceLastCheck: number;
}

export interface RuntimeDiagnosticsExportStatus {
  downloaded: boolean;
  downloadCount: number;
  lastDownloadedAtIso: string | null;
  lastDownloadSource: string | null;
}

export interface RuntimeDiagnosticsExportReadiness {
  ready: boolean;
  reason: string;
  requiredFrameSamples: number;
  collectedFrameSamples: number;
  issueCount: number;
  debugSignalCount: number;
  exportStatus: RuntimeDiagnosticsExportStatus;
}

export interface RuntimeDiagnosticsPhasePressure {
  phaseId: PhaseName;
  maxMs: number;
  avgMs: number;
  samples: number;
  slowSamples: number;
}

export interface RuntimeDiagnosticsSummary {
  active: boolean;
  totalFrames: number;
  slowFrames: number;
  stutterFrames: number;
  hitchFrames: number;
  cadenceDropFrames: number;
  compositorPressureFrames: number;
  issueCount: number;
  phaseErrorCount: number;
  longTaskCount: number;
  avgFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  avgFps: number;
  onePercentLowFps: number;
  worstFrameMs: number;
  worstUpdateMs: number;
  worstRenderMs: number;
  worstPhysicsMs: number;
  worstPhaseMs: number;
  slowestPhaseId: PhaseName | 'none';
  maxLongTaskMs: number;
  maxMemoryDeltaMb: number;
  maxMissedVsyncSlots: number;
  lastIssueCode: RuntimeDiagnosticsIssueCode | 'none';
  issueCountsByCode: Partial<Record<RuntimeDiagnosticsIssueCode, number>>;
}

export interface RuntimeDiagnosticsSnapshot {
  summary: RuntimeDiagnosticsSummary;
  latest: RuntimeDiagnosticsFrameSample | null;
  recentIssues: RuntimeDiagnosticsIssue[];
  recentFrames: RuntimeDiagnosticsFrameSample[];
  phasePressure: RuntimeDiagnosticsPhasePressure[];
  debugSignals: RuntimeDiagnosticsDebugSignal[];
  debugSignalSummary: RuntimeDiagnosticsDebugSignalSummary;
  exportReadiness: RuntimeDiagnosticsExportReadiness;
  environment: RuntimeDiagnosticsEnvironmentSample;
}

export interface RuntimeDiagnosticsTelemetryContext {
  summary: RuntimeDiagnosticsSummary;
  phasePressure: RuntimeDiagnosticsPhasePressure[];
  recentIssues: RuntimeDiagnosticsIssue[];
  debugSignalSummary: RuntimeDiagnosticsDebugSignalSummary;
  recentDebugSignals: RuntimeDiagnosticsDebugSignal[];
}

interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
  };
}

const EMPTY_ISSUE_COUNTS: Partial<Record<RuntimeDiagnosticsIssueCode, number>> = {};
const REFRESH_QUANTUM_CANDIDATES_MS = [
  16.67, 13.33, 10, 8.33, 6.94, 6.06, 4.17,
] as const;

const createEnvironmentSample = (): RuntimeDiagnosticsEnvironmentSample => ({
  timestampMs: 0,
  devicePixelRatio: 1,
  viewportWidth: 0,
  viewportHeight: 0,
  documentHidden: false,
  documentFocused: true,
  domNodes: 0,
  motionElements: 0,
  backdropFilterElements: 0,
  canvasCssWidth: 0,
  canvasCssHeight: 0,
  canvasPixelWidth: 0,
  canvasPixelHeight: 0,
  canvasDpr: 1,
  canvasMegapixels: 0,
  runtimeDebug: getRuntimeDebugSnapshot('', 1),
});

const createFrameSample = (): RuntimeDiagnosticsFrameSample => ({
  frame: -1,
  timestampMs: 0,
  gameTimeMs: 0,
  status: GameStatus.MENU,
  frameMs: 0,
  fps: 0,
  updateMs: 0,
  renderMs: 0,
  physicsMs: 0,
  otherMs: 0,
  slowestPhaseId: 'none',
  slowestPhaseMs: 0,
  enemies: 0,
  bullets: 0,
  particles: 0,
  gems: 0,
  floatingTexts: 0,
  interactables: 0,
  totalEntities: 0,
  memoryUsedMb: 0,
  memoryDeltaMb: 0,
  estimatedRefreshQuantumMs: 0,
  estimatedVsyncSlots: 0,
  missedVsyncSlots: 0,
  motionElements: 0,
  backdropFilterElements: 0,
  domNodes: 0,
  canvasMegapixels: 0,
  canvasDpr: 1,
  devicePixelRatio: 1,
  severity: 'none',
  issueCode: 'none',
});

const createIssue = (): RuntimeDiagnosticsIssue => ({
  id: 0,
  code: 'RAF_STALL',
  severity: 'slow',
  frame: -1,
  timestampMs: 0,
  gameTimeMs: 0,
  frameMs: 0,
  updateMs: 0,
  renderMs: 0,
  physicsMs: 0,
  slowestPhaseId: 'none',
  slowestPhaseMs: 0,
  enemies: 0,
  bullets: 0,
  particles: 0,
  totalEntities: 0,
  memoryDeltaMb: 0,
  otherMs: 0,
  estimatedRefreshQuantumMs: 0,
  missedVsyncSlots: 0,
  motionElements: 0,
  backdropFilterElements: 0,
  domNodes: 0,
  canvasMegapixels: 0,
});

const createDebugSignal = (): RuntimeDiagnosticsDebugSignal => ({
  id: 0,
  source: '',
  code: 'NOTIFICATION_ADDED',
  timestampMs: 0,
  message: '',
  count: 0,
});

const round = (value: number, digits: number = 2): number =>
  Number(value.toFixed(digits));

const cloneIssueCounts = (
  counts: Partial<Record<RuntimeDiagnosticsIssueCode, number>>
): Partial<Record<RuntimeDiagnosticsIssueCode, number>> => ({ ...counts });

const countActiveBackdropFilters = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const candidates = document.querySelectorAll<HTMLElement>(
    [
      '[style*="backdrop-filter"]',
      '[style*="-webkit-backdrop-filter"]',
      '[class*="backdrop-blur"]',
      '.cyber-glass',
      '.theme-blur',
    ].join(',')
  );
  let count = 0;

  for (let i = 0; i < candidates.length; i += 1) {
    const element = candidates[i];
    if (!element) continue;

    const computed = window.getComputedStyle(element);
    const backdropFilter =
      computed.getPropertyValue('backdrop-filter') ||
      computed.getPropertyValue('-webkit-backdrop-filter');
    if (backdropFilter && backdropFilter.trim() !== 'none') {
      count += 1;
    }
  }

  return count;
};

class RuntimeDiagnosticsServiceClass {
  private static instance: RuntimeDiagnosticsServiceClass | null = null;

  private readonly config = getRuntimeDiagnosticsConfig();
  private readonly frameBuffer: RuntimeDiagnosticsFrameSample[];
  private readonly issueBuffer: RuntimeDiagnosticsIssue[];
  private readonly debugSignalBuffer: RuntimeDiagnosticsDebugSignal[];

  private active = false;
  private frameWriteIndex = 0;
  private frameRecordCount = 0;
  private issueWriteIndex = 0;
  private issueRecordCount = 0;
  private issueSequence = 0;
  private debugSignalWriteIndex = 0;
  private debugSignalRecordCount = 0;
  private debugSignalSequence = 0;
  private totalFramesSeen = 0;
  private slowFrames = 0;
  private stutterFrames = 0;
  private hitchFrames = 0;
  private cadenceDropFrames = 0;
  private compositorPressureFrames = 0;
  private phaseErrorCount = 0;
  private longTaskCount = 0;
  private maxLongTaskMs = 0;
  private lastLongTaskEndMs = -1;
  private lastLongTaskDurationMs = 0;
  private lastEnvironmentSampleAtMs = -1;
  private lastEnvironmentSample = createEnvironmentSample();
  private lastMemorySampleAtMs = -1;
  private lastMemoryUsedMb = 0;
  private maxMemoryDeltaMb = 0;
  private maxMissedVsyncSlots = 0;
  private issueCountsByCode: Partial<Record<RuntimeDiagnosticsIssueCode, number>> = {};
  private debugSignalCountsByCode: Partial<
    Record<RuntimeDiagnosticsDebugSignalCode, number>
  > = {};
  private debugSignalCountsBySource: Record<string, number> = {};
  private exportDownloadCount = 0;
  private lastExportAtIso: string | null = null;
  private lastExportSource: string | null = null;
  private longTaskObserver: PerformanceObserver | null = null;

  private constructor() {
    this.frameBuffer = Array.from(
      { length: this.config.frameBufferSize },
      createFrameSample
    );
    this.issueBuffer = Array.from({ length: this.config.issueBufferSize }, createIssue);
    this.debugSignalBuffer = Array.from(
      { length: this.config.debugSignalBufferSize },
      createDebugSignal
    );

    EventBus.on('gameStart', () => this.start(), { scope: 'debug' });
    EventBus.on('gameReset', () => this.reset(), { scope: 'debug' });
  }

  static getInstance(): RuntimeDiagnosticsServiceClass {
    return (RuntimeDiagnosticsServiceClass.instance ??=
      new RuntimeDiagnosticsServiceClass());
  }

  public start(): void {
    if (!this.config.enabled) return;

    this.reset();
    this.active = true;
    this.startLongTaskObserver();
    Logger.info('[RuntimeDiagnostics] Started');
  }

  public stop(): void {
    this.active = false;
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
  }

  public isRunning(): boolean {
    return this.active;
  }

  public reset(): void {
    this.frameWriteIndex = 0;
    this.frameRecordCount = 0;
    this.issueWriteIndex = 0;
    this.issueRecordCount = 0;
    this.issueSequence = 0;
    this.debugSignalWriteIndex = 0;
    this.debugSignalRecordCount = 0;
    this.debugSignalSequence = 0;
    this.totalFramesSeen = 0;
    this.slowFrames = 0;
    this.stutterFrames = 0;
    this.hitchFrames = 0;
    this.cadenceDropFrames = 0;
    this.compositorPressureFrames = 0;
    this.phaseErrorCount = 0;
    this.longTaskCount = 0;
    this.maxLongTaskMs = 0;
    this.lastLongTaskEndMs = -1;
    this.lastLongTaskDurationMs = 0;
    this.lastEnvironmentSampleAtMs = -1;
    this.lastEnvironmentSample = createEnvironmentSample();
    this.lastMemorySampleAtMs = -1;
    this.lastMemoryUsedMb = 0;
    this.maxMemoryDeltaMb = 0;
    this.maxMissedVsyncSlots = 0;
    this.issueCountsByCode = {};
    this.debugSignalCountsByCode = {};
    this.debugSignalCountsBySource = {};
    this.exportDownloadCount = 0;
    this.lastExportAtIso = null;
    this.lastExportSource = null;

    for (let i = 0; i < this.frameBuffer.length; i += 1) {
      const frame = this.frameBuffer[i];
      if (!frame) continue;
      frame.frame = -1;
      frame.severity = 'none';
      frame.issueCode = 'none';
    }

    for (let i = 0; i < this.issueBuffer.length; i += 1) {
      const issue = this.issueBuffer[i];
      if (!issue) continue;
      issue.id = 0;
      issue.frame = -1;
    }

    for (let i = 0; i < this.debugSignalBuffer.length; i += 1) {
      const signal = this.debugSignalBuffer[i];
      if (!signal) continue;
      signal.id = 0;
      signal.source = '';
      signal.message = '';
      signal.metadata = undefined;
    }
  }

  public recordFrame(input: RuntimeDiagnosticsFrameInput): void {
    if (!this.config.enabled || !this.active) return;

    const frameMs = input.rafDeltaMs > 0 ? input.rafDeltaMs : input.updateMs;
    const fps = frameMs > 0 ? 1000 / frameMs : 0;
    const totalEntities =
      input.entityCounts.enemies +
      input.entityCounts.bullets +
      input.entityCounts.particles +
      input.entityCounts.gems +
      input.entityCounts.floatingTexts +
      input.entityCounts.interactables;
    const phase = this.findSlowestPhase(input.phaseDurationsMs);
    const memory = this.sampleMemory(input.timestampMs);
    const otherMs = Math.max(0, frameMs - input.updateMs - input.renderMs);
    const cadence = this.estimateCadence(frameMs);
    const environment = this.sampleEnvironment(input.timestampMs);
    const classification = this.classifyFrame(
      input,
      frameMs,
      phase.id,
      phase.ms,
      totalEntities,
      memory.deltaMb,
      otherMs,
      cadence,
      environment
    );

    const sample = this.frameBuffer[this.frameWriteIndex];
    if (!sample) return;

    sample.frame = input.frame;
    sample.timestampMs = round(input.timestampMs, 3);
    sample.gameTimeMs = round(input.gameTimeMs, 3);
    sample.status = input.status;
    sample.frameMs = round(frameMs);
    sample.fps = round(fps, 1);
    sample.updateMs = round(input.updateMs);
    sample.renderMs = round(input.renderMs);
    sample.physicsMs = round(input.physicsMs);
    sample.otherMs = round(otherMs);
    sample.slowestPhaseId = phase.id;
    sample.slowestPhaseMs = round(phase.ms);
    sample.enemies = input.entityCounts.enemies;
    sample.bullets = input.entityCounts.bullets;
    sample.particles = input.entityCounts.particles;
    sample.gems = input.entityCounts.gems;
    sample.floatingTexts = input.entityCounts.floatingTexts;
    sample.interactables = input.entityCounts.interactables;
    sample.totalEntities = totalEntities;
    sample.memoryUsedMb = round(memory.usedMb, 1);
    sample.memoryDeltaMb = round(memory.deltaMb, 1);
    sample.estimatedRefreshQuantumMs = cadence.refreshQuantumMs;
    sample.estimatedVsyncSlots = cadence.vsyncSlots;
    sample.missedVsyncSlots = cadence.missedVsyncSlots;
    sample.motionElements = environment.motionElements;
    sample.backdropFilterElements = environment.backdropFilterElements;
    sample.domNodes = environment.domNodes;
    sample.canvasMegapixels = environment.canvasMegapixels;
    sample.canvasDpr = environment.canvasDpr;
    sample.devicePixelRatio = environment.devicePixelRatio;
    sample.severity = classification.severity;
    sample.issueCode = classification.code;

    this.frameWriteIndex = (this.frameWriteIndex + 1) % this.frameBuffer.length;
    this.frameRecordCount = Math.min(
      this.frameRecordCount + 1,
      this.frameBuffer.length
    );
    this.totalFramesSeen += 1;

    if (classification.severity !== 'none') {
      this.slowFrames += 1;
    }
    if (classification.severity === 'stutter' || classification.severity === 'hitch') {
      this.stutterFrames += 1;
    }
    if (classification.severity === 'hitch') {
      this.hitchFrames += 1;
    }
    if (classification.code === 'RAF_CADENCE_DROP') {
      this.cadenceDropFrames += 1;
    }
    if (classification.code === 'COMPOSITOR_PRESSURE') {
      this.compositorPressureFrames += 1;
    }
    if (cadence.missedVsyncSlots > this.maxMissedVsyncSlots) {
      this.maxMissedVsyncSlots = cadence.missedVsyncSlots;
    }

    if (memory.deltaMb > this.maxMemoryDeltaMb) {
      this.maxMemoryDeltaMb = memory.deltaMb;
    }

    if (classification.severity !== 'none' && classification.code !== 'none') {
      this.writeIssue({
        code: classification.code,
        severity: classification.severity,
        frame: input.frame,
        timestampMs: input.timestampMs,
        gameTimeMs: input.gameTimeMs,
        frameMs,
        updateMs: input.updateMs,
        renderMs: input.renderMs,
        physicsMs: input.physicsMs,
        slowestPhaseId: phase.id,
        slowestPhaseMs: phase.ms,
        enemies: input.entityCounts.enemies,
        bullets: input.entityCounts.bullets,
        particles: input.entityCounts.particles,
        totalEntities,
        memoryDeltaMb: memory.deltaMb,
        otherMs,
        estimatedRefreshQuantumMs: cadence.refreshQuantumMs,
        missedVsyncSlots: cadence.missedVsyncSlots,
        motionElements: environment.motionElements,
        backdropFilterElements: environment.backdropFilterElements,
        domNodes: environment.domNodes,
        canvasMegapixels: environment.canvasMegapixels,
      });
    }
  }

  public recordPhaseError(input: {
    phaseId: string;
    stage: string;
    frame: number;
    timestampMs: number;
    gameTimeMs: number;
  }): void {
    if (!this.config.enabled || !this.active) return;

    this.phaseErrorCount += 1;
    this.writeIssue({
      code: 'PHASE_ERROR',
      severity: 'error',
      frame: input.frame,
      timestampMs: input.timestampMs,
      gameTimeMs: input.gameTimeMs,
      frameMs: 0,
      updateMs: 0,
      renderMs: 0,
      physicsMs: 0,
      slowestPhaseId: 'none',
      slowestPhaseMs: 0,
      enemies: 0,
      bullets: 0,
      particles: 0,
      totalEntities: 0,
      memoryDeltaMb: 0,
      otherMs: 0,
      estimatedRefreshQuantumMs: 0,
      missedVsyncSlots: 0,
      motionElements: 0,
      backdropFilterElements: 0,
      domNodes: 0,
      canvasMegapixels: 0,
    });
  }

  public recordDebugSignal(input: {
    source: string;
    code: RuntimeDiagnosticsDebugSignalCode;
    message: string;
    count?: number;
    metadata?: RuntimeDiagnosticsDebugSignal['metadata'];
  }): void {
    if (!this.config.enabled) return;

    this.writeDebugSignal({
      source: input.source,
      code: input.code,
      timestampMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      message: input.message,
      count: input.count ?? 1,
      metadata: input.metadata,
    });
  }

  public getSnapshot(): RuntimeDiagnosticsSnapshot {
    const recentFrames = this.getRecentFrames(this.config.recentFrameExportLimit);
    const recentIssues = this.getRecentIssues(this.config.recentIssueExportLimit);
    const debugSignals = this.getRecentDebugSignals(
      this.config.recentDebugSignalExportLimit
    );
    const summary = this.buildSummary(recentFrames, recentIssues);

    return {
      summary,
      latest: recentFrames[recentFrames.length - 1] ?? null,
      recentIssues,
      recentFrames,
      phasePressure: this.buildPhasePressure(recentFrames),
      debugSignals,
      debugSignalSummary: this.buildDebugSignalSummary(),
      exportReadiness: this.getExportReadiness(),
      environment: { ...this.lastEnvironmentSample },
    };
  }

  public getTelemetryContext(): RuntimeDiagnosticsTelemetryContext {
    const snapshot = this.getSnapshot();
    return {
      summary: snapshot.summary,
      phasePressure: snapshot.phasePressure,
      recentIssues: snapshot.recentIssues.slice(0, 5),
      debugSignalSummary: snapshot.debugSignalSummary,
      recentDebugSignals: snapshot.debugSignals.slice(0, 10),
    };
  }

  public getExportReadiness(): RuntimeDiagnosticsExportReadiness {
    const collectedFrameSamples = this.totalFramesSeen;
    const ready = collectedFrameSamples >= this.config.exportMinFrameSamples;
    const remainingFrames = Math.max(
      0,
      this.config.exportMinFrameSamples - collectedFrameSamples
    );

    return {
      ready,
      reason: ready
        ? 'Ready to export'
        : `Collecting runtime samples (${remainingFrames} more frames)`,
      requiredFrameSamples: this.config.exportMinFrameSamples,
      collectedFrameSamples,
      issueCount: this.issueSequence,
      debugSignalCount: this.debugSignalSequence,
      exportStatus: this.getExportStatus(),
    };
  }

  public getExportStatus(): RuntimeDiagnosticsExportStatus {
    return {
      downloaded: this.exportDownloadCount > 0,
      downloadCount: this.exportDownloadCount,
      lastDownloadedAtIso: this.lastExportAtIso,
      lastDownloadSource: this.lastExportSource,
    };
  }

  public exportReport(options: { source?: string; force?: boolean } = {}): boolean {
    const readiness = this.getExportReadiness();
    if (!readiness.ready && !options.force) {
      return false;
    }

    const source = options.source ?? 'manual';
    this.exportDownloadCount += 1;
    this.lastExportAtIso = new Date().toISOString();
    this.lastExportSource = source;
    this.recordDebugSignal({
      source: 'RuntimeDiagnosticsService',
      code: 'DIAGNOSTICS_EXPORTED',
      message: `Runtime diagnostics exported from ${source}`,
      count: this.exportDownloadCount,
      metadata: {
        source,
        fromDevPerformanceOverlay: source === 'dev-performance-overlay',
      },
    });

    const renderDiagnostics = getRenderDiagnosticsSnapshot(30);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            exportMeta: {
              source,
              fromDevPerformanceOverlay: source === 'dev-performance-overlay',
              readiness: this.getExportReadiness(),
            },
            config: this.config,
            diagnostics: this.getSnapshot(),
            renderDiagnostics,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `runtime-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  }

  private classifyFrame(
    input: RuntimeDiagnosticsFrameInput,
    frameMs: number,
    slowestPhaseId: PhaseName | 'none',
    slowestPhaseMs: number,
    totalEntities: number,
    memoryDeltaMb: number,
    otherMs: number,
    cadence: RuntimeDiagnosticsCadenceEstimate,
    environment: RuntimeDiagnosticsEnvironmentSample
  ): {
    severity: RuntimeDiagnosticsSeverity;
    code: RuntimeDiagnosticsIssueCode | 'none';
  } {
    const isGameplayFrame =
      input.status === GameStatus.PLAYING &&
      !input.flags.hitStopActive &&
      !input.flags.levelUpFreezeActive;

    if (!isGameplayFrame) {
      return { severity: 'none', code: 'none' };
    }

    let severity: RuntimeDiagnosticsSeverity = 'none';
    if (frameMs >= this.config.hitchFrameMs) {
      severity = 'hitch';
    } else if (frameMs >= this.config.stutterFrameMs) {
      severity = 'stutter';
    } else if (
      frameMs >= this.config.slowFrameMs ||
      input.updateMs > this.config.updateBudgetMs ||
      input.renderMs > this.config.renderBudgetMs ||
      input.physicsMs > this.config.physicsBudgetMs ||
      slowestPhaseMs > this.config.phaseBudgetMs
    ) {
      severity = 'slow';
    }

    if (severity === 'none') {
      return { severity, code: 'none' };
    }

    const longTaskNearFrame =
      this.lastLongTaskEndMs >= 0 &&
      Math.abs(input.timestampMs - this.lastLongTaskEndMs) < frameMs + 20;
    const pressure = this.config.highEntityPressure;
    const hasEntityPressure =
      input.entityCounts.enemies >= pressure.enemies ||
      input.entityCounts.bullets >= pressure.bullets ||
      input.entityCounts.particles >= pressure.particles ||
      totalEntities >= pressure.total;
    const gameWorkMs =
      input.updateMs + input.renderMs + input.physicsMs + slowestPhaseMs;
    const hasLowMeasuredGameWork = gameWorkMs <= this.config.lowGameWorkMs;
    const hasHighOtherTime =
      frameMs > 0 && otherMs / frameMs >= this.config.highOtherFrameRatio;
    const hasCadenceDrop =
      hasLowMeasuredGameWork &&
      hasHighOtherTime &&
      cadence.quantized &&
      cadence.missedVsyncSlots > 0;
    const hasCompositorPressure =
      hasCadenceDrop && this.hasCompositorPressure(environment);

    if (longTaskNearFrame && this.lastLongTaskDurationMs >= this.config.longTaskMs) {
      return { severity, code: 'MAIN_THREAD_LONG_TASK' };
    }
    if (input.physicsMs > this.config.physicsBudgetMs) {
      return { severity, code: 'PHYSICS_OVER_BUDGET' };
    }
    if (slowestPhaseId !== 'none' && slowestPhaseMs > this.config.phaseBudgetMs) {
      return { severity, code: 'PHASE_OVER_BUDGET' };
    }
    if (input.renderMs > this.config.renderBudgetMs) {
      return { severity, code: 'RENDER_OVER_BUDGET' };
    }
    if (hasEntityPressure) {
      return { severity, code: 'ENTITY_PRESSURE' };
    }
    if (memoryDeltaMb > this.config.memorySpikeMb) {
      return { severity, code: 'GC_OR_MEMORY_PRESSURE' };
    }
    if (hasCompositorPressure) {
      return { severity, code: 'COMPOSITOR_PRESSURE' };
    }
    if (hasCadenceDrop) {
      return { severity, code: 'RAF_CADENCE_DROP' };
    }

    return { severity, code: 'RAF_STALL' };
  }

  private findSlowestPhase(
    phaseDurationsMs: Partial<Record<PhaseName, number>> | null
  ): { id: PhaseName | 'none'; ms: number } {
    if (!phaseDurationsMs) {
      return { id: 'none', ms: 0 };
    }

    let slowestId: PhaseName | 'none' = 'none';
    let slowestMs = 0;
    for (let i = 0; i < RUNTIME_DIAGNOSTICS_PHASES.length; i += 1) {
      const phase = RUNTIME_DIAGNOSTICS_PHASES[i];
      if (!phase) continue;
      const duration = phaseDurationsMs[phase] ?? 0;
      if (duration > slowestMs) {
        slowestMs = duration;
        slowestId = phase;
      }
    }

    return { id: slowestId, ms: slowestMs };
  }

  private sampleMemory(timestampMs: number): { usedMb: number; deltaMb: number } {
    if (timestampMs - this.lastMemorySampleAtMs < this.config.memorySampleIntervalMs) {
      return { usedMb: this.lastMemoryUsedMb, deltaMb: 0 };
    }

    this.lastMemorySampleAtMs = timestampMs;
    const memory = (performance as PerformanceWithMemory).memory;
    if (!memory?.usedJSHeapSize) {
      return { usedMb: 0, deltaMb: 0 };
    }

    const usedMb = memory.usedJSHeapSize / 1048576;
    const deltaMb = this.lastMemoryUsedMb > 0 ? usedMb - this.lastMemoryUsedMb : 0;
    this.lastMemoryUsedMb = usedMb;
    return { usedMb, deltaMb };
  }

  private sampleEnvironment(timestampMs: number): RuntimeDiagnosticsEnvironmentSample {
    if (
      this.lastEnvironmentSampleAtMs >= 0 &&
      timestampMs - this.lastEnvironmentSampleAtMs <
        this.config.environmentSampleIntervalMs
    ) {
      return this.lastEnvironmentSample;
    }

    this.lastEnvironmentSampleAtMs = timestampMs;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.lastEnvironmentSample = {
        ...createEnvironmentSample(),
        timestampMs: round(timestampMs, 3),
      };
      return this.lastEnvironmentSample;
    }

    const canvas = document.querySelector(
      'canvas[data-runtime-diagnostics-canvas="game"], canvas'
    ) as HTMLCanvasElement | null;
    const rect = canvas?.getBoundingClientRect();
    const canvasCssWidth = rect?.width ?? canvas?.clientWidth ?? 0;
    const canvasCssHeight = rect?.height ?? canvas?.clientHeight ?? 0;
    const canvasPixelWidth = canvas?.width ?? 0;
    const canvasPixelHeight = canvas?.height ?? 0;
    const canvasDpr =
      canvasCssWidth > 0 ? canvasPixelWidth / canvasCssWidth : window.devicePixelRatio;

    this.lastEnvironmentSample = {
      timestampMs: round(timestampMs, 3),
      devicePixelRatio: round(window.devicePixelRatio || 1, 2),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentHidden: document.hidden,
      documentFocused: document.hasFocus(),
      domNodes: document.querySelectorAll('*').length,
      motionElements: document.querySelectorAll(
        '[style*="transform"], [style*="opacity"]'
      ).length,
      backdropFilterElements: countActiveBackdropFilters(),
      canvasCssWidth: round(canvasCssWidth, 1),
      canvasCssHeight: round(canvasCssHeight, 1),
      canvasPixelWidth,
      canvasPixelHeight,
      canvasDpr: round(canvasDpr || 1, 2),
      canvasMegapixels: round((canvasPixelWidth * canvasPixelHeight) / 1000000, 2),
      runtimeDebug: getRuntimeDebugSnapshot(undefined, window.devicePixelRatio || 1),
    };
    return this.lastEnvironmentSample;
  }

  private estimateCadence(frameMs: number): RuntimeDiagnosticsCadenceEstimate {
    let bestQuantumMs = 0;
    let bestSlots = 0;
    let bestError = Number.POSITIVE_INFINITY;

    for (let i = 0; i < REFRESH_QUANTUM_CANDIDATES_MS.length; i += 1) {
      const quantum = REFRESH_QUANTUM_CANDIDATES_MS[i] ?? 0;
      if (quantum <= 0) continue;
      const slots = Math.max(1, Math.round(frameMs / quantum));
      const expectedFrameMs = slots * quantum;
      const error = Math.abs(frameMs - expectedFrameMs);
      if (
        error < bestError - 0.001 ||
        (Math.abs(error - bestError) <= 0.001 && quantum > bestQuantumMs)
      ) {
        bestQuantumMs = quantum;
        bestSlots = slots;
        bestError = error;
      }
    }

    const quantized = bestError <= this.config.cadenceQuantizationToleranceMs;
    return {
      refreshQuantumMs: quantized ? round(bestQuantumMs) : 0,
      vsyncSlots: quantized ? bestSlots : 0,
      missedVsyncSlots: quantized ? Math.max(0, bestSlots - 1) : 0,
      quantized,
    };
  }

  private hasCompositorPressure(
    environment: RuntimeDiagnosticsEnvironmentSample
  ): boolean {
    const pressure = this.config.compositorPressure;
    return (
      environment.motionElements >= pressure.motionElements ||
      environment.backdropFilterElements >= pressure.backdropFilterElements ||
      environment.domNodes >= pressure.domNodes ||
      environment.canvasMegapixels >= pressure.canvasMegapixels
    );
  }

  private writeIssue(input: Omit<RuntimeDiagnosticsIssue, 'id'>): void {
    const issue = this.issueBuffer[this.issueWriteIndex];
    if (!issue) return;

    this.issueSequence += 1;
    issue.id = this.issueSequence;
    issue.code = input.code;
    issue.severity = input.severity;
    issue.frame = input.frame;
    issue.timestampMs = round(input.timestampMs, 3);
    issue.gameTimeMs = round(input.gameTimeMs, 3);
    issue.frameMs = round(input.frameMs);
    issue.updateMs = round(input.updateMs);
    issue.renderMs = round(input.renderMs);
    issue.physicsMs = round(input.physicsMs);
    issue.slowestPhaseId = input.slowestPhaseId;
    issue.slowestPhaseMs = round(input.slowestPhaseMs);
    issue.enemies = input.enemies;
    issue.bullets = input.bullets;
    issue.particles = input.particles;
    issue.totalEntities = input.totalEntities;
    issue.memoryDeltaMb = round(input.memoryDeltaMb, 1);
    issue.otherMs = round(input.otherMs);
    issue.estimatedRefreshQuantumMs = round(input.estimatedRefreshQuantumMs);
    issue.missedVsyncSlots = input.missedVsyncSlots;
    issue.motionElements = input.motionElements;
    issue.backdropFilterElements = input.backdropFilterElements;
    issue.domNodes = input.domNodes;
    issue.canvasMegapixels = round(input.canvasMegapixels, 2);

    this.issueCountsByCode[input.code] = (this.issueCountsByCode[input.code] ?? 0) + 1;
    this.issueWriteIndex = (this.issueWriteIndex + 1) % this.issueBuffer.length;
    this.issueRecordCount = Math.min(
      this.issueRecordCount + 1,
      this.issueBuffer.length
    );
  }

  private writeDebugSignal(input: Omit<RuntimeDiagnosticsDebugSignal, 'id'>): void {
    const signal = this.debugSignalBuffer[this.debugSignalWriteIndex];
    if (!signal) return;

    this.debugSignalSequence += 1;
    signal.id = this.debugSignalSequence;
    signal.source = input.source;
    signal.code = input.code;
    signal.timestampMs = round(input.timestampMs, 3);
    signal.message = input.message.slice(0, 220);
    signal.count = input.count;
    signal.metadata = input.metadata ? { ...input.metadata } : undefined;

    this.debugSignalCountsByCode[input.code] =
      (this.debugSignalCountsByCode[input.code] ?? 0) + 1;
    this.debugSignalCountsBySource[input.source] =
      (this.debugSignalCountsBySource[input.source] ?? 0) + 1;
    this.debugSignalWriteIndex =
      (this.debugSignalWriteIndex + 1) % this.debugSignalBuffer.length;
    this.debugSignalRecordCount = Math.min(
      this.debugSignalRecordCount + 1,
      this.debugSignalBuffer.length
    );
  }

  private getRecentFrames(limit: number): RuntimeDiagnosticsFrameSample[] {
    const count = Math.min(this.frameRecordCount, limit);
    const frames: RuntimeDiagnosticsFrameSample[] = [];
    const startOffset = this.frameRecordCount - count;
    for (let i = 0; i < count; i += 1) {
      const source = this.getFrameByOffset(startOffset + i);
      if (!source || source.frame < 0) continue;
      frames.push({ ...source });
    }
    return frames;
  }

  private getRecentIssues(limit: number): RuntimeDiagnosticsIssue[] {
    const count = Math.min(this.issueRecordCount, limit);
    const issues: RuntimeDiagnosticsIssue[] = [];
    const start =
      (this.issueWriteIndex - count + this.issueBuffer.length) %
      this.issueBuffer.length;

    for (let i = count - 1; i >= 0; i -= 1) {
      const index = (start + i) % this.issueBuffer.length;
      const source = this.issueBuffer[index];
      if (!source || source.frame < 0 || source.id === 0) continue;
      issues.push({ ...source });
    }
    return issues;
  }

  private getRecentDebugSignals(limit: number): RuntimeDiagnosticsDebugSignal[] {
    const count = Math.min(this.debugSignalRecordCount, limit);
    const signals: RuntimeDiagnosticsDebugSignal[] = [];
    const start =
      (this.debugSignalWriteIndex - count + this.debugSignalBuffer.length) %
      this.debugSignalBuffer.length;

    for (let i = count - 1; i >= 0; i -= 1) {
      const index = (start + i) % this.debugSignalBuffer.length;
      const source = this.debugSignalBuffer[index];
      if (!source || source.id === 0) continue;
      signals.push({
        ...source,
        metadata: source.metadata ? { ...source.metadata } : undefined,
      });
    }
    return signals;
  }

  private getFrameByOffset(offset: number): RuntimeDiagnosticsFrameSample | null {
    if (offset < 0 || offset >= this.frameRecordCount) {
      return null;
    }

    const start =
      this.frameRecordCount < this.frameBuffer.length ? 0 : this.frameWriteIndex;
    return this.frameBuffer[(start + offset) % this.frameBuffer.length] ?? null;
  }

  private buildSummary(
    frames: RuntimeDiagnosticsFrameSample[],
    issues: RuntimeDiagnosticsIssue[]
  ): RuntimeDiagnosticsSummary {
    if (frames.length === 0) {
      return {
        active: this.active,
        totalFrames: this.totalFramesSeen,
        slowFrames: this.slowFrames,
        stutterFrames: this.stutterFrames,
        hitchFrames: this.hitchFrames,
        cadenceDropFrames: this.cadenceDropFrames,
        compositorPressureFrames: this.compositorPressureFrames,
        issueCount: this.issueSequence,
        phaseErrorCount: this.phaseErrorCount,
        longTaskCount: this.longTaskCount,
        avgFrameMs: 0,
        p95FrameMs: 0,
        p99FrameMs: 0,
        avgFps: 0,
        onePercentLowFps: 0,
        worstFrameMs: 0,
        worstUpdateMs: 0,
        worstRenderMs: 0,
        worstPhysicsMs: 0,
        worstPhaseMs: 0,
        slowestPhaseId: 'none',
        maxLongTaskMs: round(this.maxLongTaskMs),
        maxMemoryDeltaMb: round(this.maxMemoryDeltaMb, 1),
        maxMissedVsyncSlots: this.maxMissedVsyncSlots,
        lastIssueCode: issues[0]?.code ?? 'none',
        issueCountsByCode: EMPTY_ISSUE_COUNTS,
      };
    }

    let totalFrameMs = 0;
    let worstFrameMs = 0;
    let worstUpdateMs = 0;
    let worstRenderMs = 0;
    let worstPhysicsMs = 0;
    let worstPhaseMs = 0;
    let slowestPhaseId: PhaseName | 'none' = 'none';
    const frameTimes: number[] = [];

    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];
      if (!frame) continue;

      totalFrameMs += frame.frameMs;
      frameTimes.push(frame.frameMs);
      worstFrameMs = Math.max(worstFrameMs, frame.frameMs);
      worstUpdateMs = Math.max(worstUpdateMs, frame.updateMs);
      worstRenderMs = Math.max(worstRenderMs, frame.renderMs);
      worstPhysicsMs = Math.max(worstPhysicsMs, frame.physicsMs);
      if (frame.slowestPhaseMs > worstPhaseMs) {
        worstPhaseMs = frame.slowestPhaseMs;
        slowestPhaseId = frame.slowestPhaseId;
      }
    }

    frameTimes.sort((a, b) => a - b);
    const p95FrameMs = this.percentile(frameTimes, 0.95);
    const p99FrameMs = this.percentile(frameTimes, 0.99);
    const avgFrameMs = totalFrameMs / frames.length;

    return {
      active: this.active,
      totalFrames: this.totalFramesSeen,
      slowFrames: this.slowFrames,
      stutterFrames: this.stutterFrames,
      hitchFrames: this.hitchFrames,
      cadenceDropFrames: this.cadenceDropFrames,
      compositorPressureFrames: this.compositorPressureFrames,
      issueCount: this.issueSequence,
      phaseErrorCount: this.phaseErrorCount,
      longTaskCount: this.longTaskCount,
      avgFrameMs: round(avgFrameMs),
      p95FrameMs: round(p95FrameMs),
      p99FrameMs: round(p99FrameMs),
      avgFps: avgFrameMs > 0 ? round(1000 / avgFrameMs, 1) : 0,
      onePercentLowFps: p99FrameMs > 0 ? round(1000 / p99FrameMs, 1) : 0,
      worstFrameMs: round(worstFrameMs),
      worstUpdateMs: round(worstUpdateMs),
      worstRenderMs: round(worstRenderMs),
      worstPhysicsMs: round(worstPhysicsMs),
      worstPhaseMs: round(worstPhaseMs),
      slowestPhaseId,
      maxLongTaskMs: round(this.maxLongTaskMs),
      maxMemoryDeltaMb: round(this.maxMemoryDeltaMb, 1),
      maxMissedVsyncSlots: this.maxMissedVsyncSlots,
      lastIssueCode: issues[0]?.code ?? 'none',
      issueCountsByCode: cloneIssueCounts(this.issueCountsByCode),
    };
  }

  private buildPhasePressure(
    frames: RuntimeDiagnosticsFrameSample[]
  ): RuntimeDiagnosticsPhasePressure[] {
    const pressure = new Map<PhaseName, RuntimeDiagnosticsPhasePressure>();

    for (let i = 0; i < frames.length; i += 1) {
      const frame = frames[i];
      if (!frame || frame.slowestPhaseId === 'none') continue;

      let record = pressure.get(frame.slowestPhaseId);
      if (!record) {
        record = {
          phaseId: frame.slowestPhaseId,
          maxMs: 0,
          avgMs: 0,
          samples: 0,
          slowSamples: 0,
        };
        pressure.set(frame.slowestPhaseId, record);
      }

      record.maxMs = Math.max(record.maxMs, frame.slowestPhaseMs);
      record.avgMs += frame.slowestPhaseMs;
      record.samples += 1;
      if (frame.slowestPhaseMs > this.config.phaseBudgetMs) {
        record.slowSamples += 1;
      }
    }

    return [...pressure.values()]
      .map(record => ({
        ...record,
        maxMs: round(record.maxMs),
        avgMs: record.samples > 0 ? round(record.avgMs / record.samples) : 0,
      }))
      .sort((a, b) => b.maxMs - a.maxMs)
      .slice(0, 5);
  }

  private buildDebugSignalSummary(): RuntimeDiagnosticsDebugSignalSummary {
    const renderDiagnostics = getRenderDiagnosticsSnapshot(20);
    return {
      totalSignals: this.debugSignalSequence,
      countsByCode: { ...this.debugSignalCountsByCode },
      countsBySource: { ...this.debugSignalCountsBySource },
      topRenderComponents: renderDiagnostics.topComponents,
      totalRenders: renderDiagnostics.totalRenders,
      rendersSinceLastCheck: renderDiagnostics.rendersSinceLastCheck,
    };
  }

  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = Math.min(
      sortedValues.length - 1,
      Math.max(0, Math.ceil(sortedValues.length * percentile) - 1)
    );
    return sortedValues[index] ?? 0;
  }

  private startLongTaskObserver(): void {
    if (this.longTaskObserver || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        for (let i = 0; i < entries.length; i += 1) {
          const entry = entries[i];
          if (!entry || entry.duration < this.config.longTaskMs) continue;
          this.longTaskCount += 1;
          this.lastLongTaskDurationMs = entry.duration;
          this.lastLongTaskEndMs = entry.startTime + entry.duration;
          this.maxLongTaskMs = Math.max(this.maxLongTaskMs, entry.duration);
        }
      });
      this.longTaskObserver.observe({ type: 'longtask', buffered: false });
    } catch {
      this.longTaskObserver = null;
    }
  }
}

export const RuntimeDiagnosticsService = RuntimeDiagnosticsServiceClass.getInstance();
