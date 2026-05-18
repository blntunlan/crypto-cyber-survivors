import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStatus } from '../../../types';
import {
  RuntimeDiagnosticsService,
  type RuntimeDiagnosticsFrameInput,
} from '../../../services/system/RuntimeDiagnosticsService';

const createFrame = (
  frame: number,
  overrides: Partial<RuntimeDiagnosticsFrameInput> = {}
): RuntimeDiagnosticsFrameInput => ({
  frame,
  timestampMs: frame * 16.67,
  gameTimeMs: frame * 16.67,
  status: GameStatus.PLAYING,
  rafDeltaMs: 16.67,
  updateMs: 5,
  renderMs: 4,
  physicsMs: 1,
  phaseDurationsMs: {
    physics: 1,
  },
  entityCounts: {
    enemies: 10,
    bullets: 20,
    particles: 30,
    gems: 5,
    floatingTexts: 0,
    interactables: 0,
  },
  flags: {
    hitStopActive: false,
    levelUpFreezeActive: false,
  },
  ...overrides,
});

describe('RuntimeDiagnosticsService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    RuntimeDiagnosticsService.stop();
    RuntimeDiagnosticsService.reset();
  });

  afterEach(() => {
    RuntimeDiagnosticsService.stop();
    RuntimeDiagnosticsService.reset();
    window.history.pushState({}, '', '/');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('records stable gameplay frames without creating issues', () => {
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(createFrame(1));
    RuntimeDiagnosticsService.recordFrame(createFrame(2));
    RuntimeDiagnosticsService.recordFrame(createFrame(3));

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.totalFrames).toBe(3);
    expect(snapshot.summary.issueCount).toBe(0);
    expect(snapshot.summary.avgFps).toBeGreaterThan(55);
    expect(snapshot.recentIssues).toEqual([]);
  });

  it('classifies slow physics frames as stutter causes', () => {
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(
      createFrame(1, {
        rafDeltaMs: 42,
        updateMs: 18,
        physicsMs: 6,
        phaseDurationsMs: {
          physics: 6,
        },
      })
    );

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.stutterFrames).toBe(1);
    expect(snapshot.summary.lastIssueCode).toBe('PHYSICS_OVER_BUDGET');
    expect(snapshot.summary.issueCountsByCode.PHYSICS_OVER_BUDGET).toBe(1);
    expect(snapshot.recentIssues[0]).toMatchObject({
      severity: 'stutter',
      code: 'PHYSICS_OVER_BUDGET',
      slowestPhaseId: 'physics',
    });
  });

  it('classifies low-work vsync slot misses as RAF cadence drops', () => {
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(
      createFrame(1, {
        rafDeltaMs: 27.8,
        updateMs: 0.2,
        renderMs: 0.5,
        physicsMs: 0.1,
        phaseDurationsMs: null,
      })
    );

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.lastIssueCode).toBe('RAF_CADENCE_DROP');
    expect(snapshot.summary.cadenceDropFrames).toBe(1);
    expect(snapshot.summary.maxMissedVsyncSlots).toBeGreaterThanOrEqual(3);
    expect(snapshot.recentIssues[0]).toMatchObject({
      code: 'RAF_CADENCE_DROP',
      otherMs: 27.1,
      missedVsyncSlots: 3,
      estimatedRefreshQuantumMs: 6.94,
    });
  });

  it('classifies cadence drops with animated DOM pressure separately', () => {
    for (let i = 0; i < 31; i += 1) {
      const element = document.createElement('div');
      element.setAttribute('style', 'transform: translateX(0px)');
      document.body.appendChild(element);
    }
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(
      createFrame(1, {
        rafDeltaMs: 27.8,
        updateMs: 0.2,
        renderMs: 0.5,
        physicsMs: 0.1,
        phaseDurationsMs: null,
      })
    );

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.lastIssueCode).toBe('COMPOSITOR_PRESSURE');
    expect(snapshot.summary.compositorPressureFrames).toBe(1);
    expect(snapshot.environment.motionElements).toBeGreaterThanOrEqual(31);
    expect(snapshot.recentIssues[0]).toMatchObject({
      code: 'COMPOSITOR_PRESSURE',
      motionElements: expect.any(Number),
    });
  });

  it('includes active runtime debug flags in environment samples', () => {
    window.history.pushState({}, '', '/?noMotion=1&runtimeDpr=1.25');
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(createFrame(1));

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.environment.runtimeDebug.activeFlags).toEqual([
      'noMotion',
      'runtimeDpr:1.25',
    ]);
    expect(snapshot.environment.runtimeDebug.resolvedCanvasDpr).toBe(1.25);
  });

  it('does not flag intentional hit-stop frames as gameplay stutter', () => {
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordFrame(
      createFrame(1, {
        rafDeltaMs: 60,
        updateMs: 20,
        flags: {
          hitStopActive: true,
          levelUpFreezeActive: false,
        },
      })
    );

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.issueCount).toBe(0);
    expect(snapshot.summary.stutterFrames).toBe(0);
    expect(snapshot.latest?.severity).toBe('none');
  });

  it('captures phase errors as diagnostics issues', () => {
    RuntimeDiagnosticsService.start();

    RuntimeDiagnosticsService.recordPhaseError({
      phaseId: 'combat',
      stage: 'phase',
      frame: 9,
      timestampMs: 144,
      gameTimeMs: 144,
    });

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.summary.phaseErrorCount).toBe(1);
    expect(snapshot.recentIssues[0]).toMatchObject({
      severity: 'error',
      code: 'PHASE_ERROR',
      frame: 9,
    });
  });

  it('records debug signals for telemetry exports', () => {
    RuntimeDiagnosticsService.recordDebugSignal({
      source: 'NotificationSystem',
      code: 'NOTIFICATION_DEDUPED',
      message: 'AntiCheat: Abnormal game speed detected',
      count: 4,
      metadata: {
        type: 'warning',
      },
    });

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.debugSignals[0]).toMatchObject({
      source: 'NotificationSystem',
      code: 'NOTIFICATION_DEDUPED',
      count: 4,
    });
    expect(snapshot.debugSignalSummary.totalSignals).toBe(1);
    expect(snapshot.debugSignalSummary.countsByCode.NOTIFICATION_DEDUPED).toBe(1);
    expect(snapshot.debugSignalSummary.countsBySource.NotificationSystem).toBe(1);

    const context = RuntimeDiagnosticsService.getTelemetryContext();
    expect(context.recentDebugSignals[0]?.code).toBe('NOTIFICATION_DEDUPED');
  });

  it('blocks report export until enough runtime samples are collected', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');

    expect(
      RuntimeDiagnosticsService.exportReport({
        source: 'dev-performance-overlay',
      })
    ).toBe(false);

    const readiness = RuntimeDiagnosticsService.getExportReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.collectedFrameSamples).toBe(0);
    expect(createElementSpy).not.toHaveBeenCalled();
  });

  it('tracks successful report exports from the dev performance overlay', () => {
    RuntimeDiagnosticsService.start();
    for (let frame = 1; frame <= 180; frame += 1) {
      RuntimeDiagnosticsService.recordFrame(createFrame(frame));
    }

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    expect(
      RuntimeDiagnosticsService.exportReport({
        source: 'dev-performance-overlay',
      })
    ).toBe(true);

    const status = RuntimeDiagnosticsService.getExportStatus();
    expect(status.downloaded).toBe(true);
    expect(status.downloadCount).toBe(1);
    expect(status.lastDownloadSource).toBe('dev-performance-overlay');
    expect(mockAnchor.download).toContain('runtime-diagnostics');
    expect(mockAnchor.click).toHaveBeenCalled();

    const snapshot = RuntimeDiagnosticsService.getSnapshot();
    expect(snapshot.exportReadiness.ready).toBe(true);
    expect(snapshot.debugSignals[0]).toMatchObject({
      code: 'DIAGNOSTICS_EXPORTED',
      source: 'RuntimeDiagnosticsService',
    });
  });
});
