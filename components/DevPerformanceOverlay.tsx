/**
 * DevPerformanceOverlay - DEV-only performance debugging overlay
 *
 * Shows real-time metrics:
 * - FPS + frame time
 * - React render counts per component
 * - Framer-motion animation tracking
 * - Memory usage (Chrome)
 * - Console warnings for performance issues
 *
 * Toggle with Alt+P
 */

import { memo, useEffect, useRef, useState } from 'react';
import { renderCounts, totalRenders, resetRenderCheck } from '../utils/trackRender';
import { RuntimeDiagnosticsService } from '../services/system/RuntimeDiagnosticsService';

type OverlayTab = 'metrics' | 'game' | 'stutters' | 'renders' | 'errors';

// ── Framer-motion animation tracker ──
const animationStats = {
  activeAnimations: 0,
  totalStarted: 0,
  totalCompleted: 0,
  lastWarningTime: 0,
};

function countMotionElements(): number {
  return document.querySelectorAll('[style*="transform"], [style*="opacity"]').length;
}

let motionPollInterval: ReturnType<typeof setInterval> | null = null;

function startMotionTracking() {
  if (motionPollInterval) return;

  // Poll every 2s instead of MutationObserver (which fires on EVERY style change and tanks FPS)
  motionPollInterval = setInterval(() => {
    const count = countMotionElements();
    animationStats.activeAnimations = count;

    const now = Date.now();
    if (count > 30 && now - animationStats.lastWarningTime > 5000) {
      animationStats.lastWarningTime = now;
      console.warn(
        `[PERF] ${count} elements with inline transform/opacity detected. ` +
          `This may indicate excessive framer-motion animations.`
      );
    }
  }, 2000);
}

function stopMotionTracking() {
  if (motionPollInterval) {
    clearInterval(motionPollInterval);
    motionPollInterval = null;
  }
}

// ── Layout shift observer ──
function setupLayoutShiftObserver() {
  if (typeof PerformanceObserver === 'undefined') return null;

  try {
    let clsValue = 0;
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          if (layoutShift.value > 0.05) {
            console.warn(
              `[PERF] Layout shift: ${layoutShift.value.toFixed(4)} (cumulative: ${clsValue.toFixed(4)})`
            );
          }
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: false });
    return observer;
  } catch {
    return null;
  }
}

// ── Console error interceptor ──
const errorLog: Array<{ time: number; message: string; type: 'error' | 'warn' }> = [];
const MAX_ERROR_LOG = 50;

const severityColor = (severity: string): string => {
  if (severity === 'hitch' || severity === 'error') return '#ff4444';
  if (severity === 'stutter') return '#f97316';
  if (severity === 'slow') return '#fbbf24';
  return '#4ade80';
};

function setupConsoleInterceptor() {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
    errorLog.push({ time: Date.now(), message: message.slice(0, 200), type: 'error' });
    if (errorLog.length > MAX_ERROR_LOG) errorLog.shift();
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
    if (message.includes('[PERF]')) {
      errorLog.push({ time: Date.now(), message: message.slice(0, 200), type: 'warn' });
      if (errorLog.length > MAX_ERROR_LOG) errorLog.shift();
    }
    originalWarn.apply(console, args);
  };

  return () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
}

// ── Overlay Component ──
const OverlayContent = memo(() => {
  const [tab, setTab] = useState<OverlayTab>('metrics');
  const [rendersPerSec, setRendersPerSec] = useState('0.0');
  const [, forceRefresh] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRendersPerSec(resetRenderCheck().toFixed(1));
      forceRefresh(value => value + 1);
    }, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const diagnostics = RuntimeDiagnosticsService.getSnapshot();
  const exportReadiness = diagnostics.exportReadiness;
  const summary = diagnostics.summary;
  const latest = diagnostics.latest;
  const environment = diagnostics.environment;
  const runtimeDebug = environment.runtimeDebug;
  const motionCount = animationStats.activeAnimations;
  const errorCount = errorLog.filter(e => e.type === 'error').length;
  const domNodes = document.querySelectorAll('*').length;
  const perfWithMemory = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  const memoryStr = perfWithMemory.memory
    ? `${(perfWithMemory.memory.usedJSHeapSize / 1048576).toFixed(1)}/${(
        perfWithMemory.memory.jsHeapSizeLimit / 1048576
      ).toFixed(0)} MB`
    : 'N/A';

  const tabStyle = (t: OverlayTab) => ({
    padding: '2px 6px',
    fontSize: '9px',
    cursor: 'pointer' as const,
    border: 'none',
    borderRadius: '3px',
    backgroundColor: tab === t ? '#334155' : 'transparent',
    color: tab === t ? '#fff' : '#94a3b8',
  });

  const metricLine = (label: string, value: string | number, color = '#e2e8f0') => (
    <div>
      <b>{label}:</b> <span style={{ color }}>{value}</span>
    </div>
  );
  const handleExportDiagnostics = () => {
    const exported = RuntimeDiagnosticsService.exportReport({
      source: 'dev-performance-overlay',
    });
    if (exported) {
      forceRefresh(value => value + 1);
    }
  };

  const renderBody = () => {
    if (tab === 'metrics') {
      return (
        <div style={{ fontSize: 10, lineHeight: 1.6 }}>
          {metricLine(
            'Renders/sec',
            rendersPerSec,
            Number(rendersPerSec) > 60 ? '#ff4444' : '#4ade80'
          )}
          {metricLine('Total renders', totalRenders)}
          {metricLine(
            'Motion elements',
            motionCount,
            motionCount > 20 ? '#ff4444' : motionCount > 10 ? '#fbbf24' : '#4ade80'
          )}
          {metricLine(
            'DOM nodes',
            domNodes,
            domNodes > 3000 ? '#ff4444' : domNodes > 1500 ? '#fbbf24' : '#4ade80'
          )}
          {metricLine('Memory', memoryStr)}
          {metricLine(
            'Game FPS',
            summary.avgFps || 'N/A',
            summary.avgFps < 45 && summary.avgFps > 0
              ? '#ff4444'
              : summary.avgFps < 55 && summary.avgFps > 0
                ? '#fbbf24'
                : '#4ade80'
          )}
          {metricLine(
            'Stutters',
            summary.stutterFrames,
            summary.stutterFrames > 0 ? '#f97316' : '#4ade80'
          )}
          {metricLine(
            'Cadence / Comp',
            `${summary.cadenceDropFrames} / ${summary.compositorPressureFrames}`,
            summary.compositorPressureFrames > 0
              ? '#ff4444'
              : summary.cadenceDropFrames > 0
                ? '#fbbf24'
                : '#4ade80'
          )}
          {metricLine('Errors', errorCount, errorCount > 0 ? '#ff4444' : '#4ade80')}
        </div>
      );
    }

    if (tab === 'game') {
      return (
        <div style={{ fontSize: 10, lineHeight: 1.55 }}>
          {metricLine('Active', summary.active ? 'yes' : 'no')}
          {metricLine(
            'FPS avg / 1%',
            `${summary.avgFps} / ${summary.onePercentLowFps}`
          )}
          {metricLine(
            'Frame avg / p95 / p99',
            `${summary.avgFrameMs} / ${summary.p95FrameMs} / ${summary.p99FrameMs}ms`
          )}
          {metricLine(
            'Update / Render',
            `${summary.worstUpdateMs} / ${summary.worstRenderMs}ms`
          )}
          {metricLine(
            'Physics / Phase',
            `${summary.worstPhysicsMs} / ${summary.worstPhaseMs}ms`
          )}
          {metricLine(
            'Entities',
            latest
              ? `${latest.totalEntities} total (${latest.enemies}e ${latest.bullets}b ${latest.particles}p)`
              : 'N/A'
          )}
          {metricLine(
            'Last issue',
            summary.lastIssueCode,
            severityColor(latest?.severity ?? 'none')
          )}
          {metricLine(
            'Missed vsync max',
            summary.maxMissedVsyncSlots,
            summary.maxMissedVsyncSlots > 3 ? '#ff4444' : '#fbbf24'
          )}
          {metricLine(
            'Canvas MP / DPR',
            `${environment.canvasMegapixels} / ${environment.canvasDpr}`,
            environment.canvasMegapixels > 4 ? '#ff4444' : '#4ade80'
          )}
          {metricLine(
            'Debug flags',
            runtimeDebug.activeFlags.length > 0
              ? runtimeDebug.activeFlags.join(', ')
              : 'none',
            runtimeDebug.activeFlags.length > 0 ? '#fbbf24' : '#94a3b8'
          )}
          {metricLine(
            'DOM / motion / blur',
            `${environment.domNodes} / ${environment.motionElements} / ${environment.backdropFilterElements}`,
            environment.motionElements > 30 || environment.backdropFilterElements > 0
              ? '#fbbf24'
              : '#4ade80'
          )}
          <div
            style={{
              borderTop: '1px solid #334155',
              color: '#cbd5e1',
              marginTop: 5,
              paddingTop: 5,
            }}
          >
            {diagnostics.phasePressure.length === 0
              ? 'No phase pressure yet.'
              : diagnostics.phasePressure.map(phase => (
                  <div key={phase.phaseId}>
                    <span
                      style={{
                        color:
                          phase.maxMs > 5
                            ? '#ff4444'
                            : phase.maxMs > 3
                              ? '#fbbf24'
                              : '#4ade80',
                      }}
                    >
                      {phase.phaseId}
                    </span>{' '}
                    max {phase.maxMs}ms avg {phase.avgMs}ms slow {phase.slowSamples}
                  </div>
                ))}
          </div>
        </div>
      );
    }

    if (tab === 'stutters') {
      return (
        <div
          style={{ fontSize: 9, lineHeight: 1.45, maxHeight: 260, overflowY: 'auto' }}
        >
          {diagnostics.recentIssues.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No gameplay stutter captured.</div>
          ) : (
            diagnostics.recentIssues.slice(0, 12).map(issue => (
              <div
                key={issue.id}
                style={{
                  color: severityColor(issue.severity),
                  marginBottom: 6,
                  wordBreak: 'break-word',
                }}
              >
                <b>
                  #{issue.id} {issue.severity}
                </b>{' '}
                {issue.code}
                <br />
                <span style={{ color: '#cbd5e1' }}>
                  frame {issue.frameMs}ms | update {issue.updateMs}ms | render{' '}
                  {issue.renderMs}ms | physics {issue.physicsMs}ms | phase{' '}
                  {issue.slowestPhaseId}:{issue.slowestPhaseMs}ms | entities{' '}
                  {issue.totalEntities}
                </span>
              </div>
            ))
          )}
        </div>
      );
    }

    if (tab === 'renders') {
      const sorted = [...renderCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      return (
        <div
          style={{ fontSize: 9, lineHeight: 1.5, maxHeight: 200, overflowY: 'auto' }}
        >
          {sorted.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>
              No tracked renders yet.
              <br />
              Add trackRender() calls to components.
            </div>
          ) : (
            sorted.map(([name, count]) => (
              <div key={name}>
                <span
                  style={{
                    color: count > 100 ? '#ff4444' : count > 50 ? '#fbbf24' : '#4ade80',
                  }}
                >
                  {count}x
                </span>{' '}
                {name}
              </div>
            ))
          )}
        </div>
      );
    }

    return (
      <div style={{ fontSize: 9, lineHeight: 1.4, maxHeight: 200, overflowY: 'auto' }}>
        {errorLog.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No errors captured.</div>
        ) : (
          errorLog
            .slice(-15)
            .reverse()
            .map(error => (
              <div
                key={`${error.time}-${error.message}`}
                style={{
                  color: error.type === 'error' ? '#ff4444' : '#fbbf24',
                  marginBottom: 4,
                  wordBreak: 'break-all',
                }}
              >
                {new Date(error.time).toLocaleTimeString()}: {error.message}
              </div>
            ))
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        width: 280,
        backgroundColor: 'rgba(15, 23, 42, 0.97)',
        border: '1px solid rgba(100, 116, 139, 0.3)',
        borderRadius: 6,
        padding: 8,
        zIndex: 99999,
        fontFamily: 'monospace',
        color: '#e2e8f0',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 6,
          borderBottom: '1px solid #334155',
          paddingBottom: 4,
        }}
      >
        <button onClick={() => setTab('metrics')} style={tabStyle('metrics')}>
          Metrics
        </button>
        <button onClick={() => setTab('game')} style={tabStyle('game')}>
          Game
        </button>
        <button onClick={() => setTab('stutters')} style={tabStyle('stutters')}>
          Stutter
        </button>
        <button onClick={() => setTab('renders')} style={tabStyle('renders')}>
          Renders
        </button>
        <button onClick={() => setTab('errors')} style={tabStyle('errors')}>
          Errors
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '92px 1fr',
          gap: 6,
          alignItems: 'center',
          borderBottom: '1px solid #334155',
          marginBottom: 6,
          paddingBottom: 6,
        }}
      >
        <button
          disabled={!exportReadiness.ready}
          onClick={handleExportDiagnostics}
          title={
            exportReadiness.ready
              ? 'Download runtime diagnostics JSON'
              : exportReadiness.reason
          }
          style={{
            border: '1px solid #475569',
            borderRadius: 4,
            backgroundColor: exportReadiness.ready ? '#14532d' : '#1e293b',
            color: exportReadiness.ready ? '#dcfce7' : '#64748b',
            cursor: exportReadiness.ready ? 'pointer' : 'not-allowed',
            fontSize: 9,
            padding: '4px 6px',
          }}
        >
          Export JSON
        </button>
        <div style={{ color: exportReadiness.ready ? '#4ade80' : '#fbbf24' }}>
          {exportReadiness.ready
            ? exportReadiness.exportStatus.downloaded
              ? `downloaded ${exportReadiness.exportStatus.downloadCount}x`
              : 'ready'
            : `${exportReadiness.collectedFrameSamples}/${exportReadiness.requiredFrameSamples} frames`}
          {exportReadiness.exportStatus.lastDownloadedAtIso && (
            <span style={{ color: '#94a3b8' }}>
              {' '}
              {new Date(
                exportReadiness.exportStatus.lastDownloadedAtIso
              ).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      {renderBody()}
    </div>
  );
});

OverlayContent.displayName = 'OverlayContent';

export const DevPerformanceOverlay = memo(() => {
  const [visible, setVisible] = useState(false);
  const layoutShiftObserverRef = useRef<PerformanceObserver | null>(null);
  const cleanupConsoleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || !visible) return;

    cleanupConsoleRef.current = setupConsoleInterceptor();
    layoutShiftObserverRef.current = setupLayoutShiftObserver();
    startMotionTracking();

    // eslint-disable-next-line no-console
    console.info(
      '%c[DEV PERF] Performance overlay ready. Press Alt+P to toggle.',
      'color: #4ade80; font-weight: bold'
    );
    // eslint-disable-next-line no-console
    console.info(
      `%c[DEV PERF] React.StrictMode: ENABLED (double renders expected in dev)`,
      'color: #fbbf24'
    );

    const warningTimeout = setTimeout(() => {
      const motionEls = countMotionElements();
      if (motionEls > 15) {
        console.warn(
          `[PERF] ${motionEls} elements with inline transform/opacity on initial load. ` +
            `Consider reducing framer-motion animations on this screen.`
        );
      }

      const domCount = document.querySelectorAll('*').length;
      if (domCount > 2000) {
        console.warn(
          `[PERF] High DOM node count: ${domCount}. May impact rendering performance.`
        );
      }
    }, 2000);

    return () => {
      clearTimeout(warningTimeout);
      cleanupConsoleRef.current?.();
      cleanupConsoleRef.current = null;
      layoutShiftObserverRef.current?.disconnect();
      layoutShiftObserverRef.current = null;
      stopMotionTracking();
    };
  }, [visible]);

  if (!import.meta.env.DEV) return null;
  if (!visible) return null;

  return <OverlayContent />;
});

DevPerformanceOverlay.displayName = 'DevPerformanceOverlay';
