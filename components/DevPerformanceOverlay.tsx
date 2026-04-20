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

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { renderCounts, totalRenders, resetRenderCheck } from '../utils/trackRender';

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

// ── Long task observer ──
function setupLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') return null;

  try {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn(
            `[PERF] Long task detected: ${entry.duration.toFixed(1)}ms`,
            entry.name !== 'unknown' ? `(${entry.name})` : ''
          );
        }
      }
    });
    observer.observe({ type: 'longtask', buffered: false });
    return observer;
  } catch {
    // longtask not supported in all browsers
    return null;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'metrics' | 'renders' | 'errors'>('metrics');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateMetrics = useCallback(() => {
    if (!panelRef.current) return;

    const rendersPerSec = resetRenderCheck().toFixed(1);

    const motionCount = animationStats.activeAnimations;

    // Memory (Chrome only)
    let memoryStr = 'N/A';
    const perfWithMemory = performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };
    if (perfWithMemory.memory) {
      const used = (perfWithMemory.memory.usedJSHeapSize / 1048576).toFixed(1);
      const limit = (perfWithMemory.memory.jsHeapSizeLimit / 1048576).toFixed(0);
      memoryStr = `${used}/${limit} MB`;
    }

    // DOM node count
    const domNodes = document.querySelectorAll('*').length;

    if (tab === 'metrics') {
      panelRef.current.innerHTML = `
        <div style="font-size:10px;line-height:1.6">
          <div><b>Renders/sec:</b> <span style="color:${Number(rendersPerSec) > 60 ? '#ff4444' : '#4ade80'}">${rendersPerSec}</span></div>
          <div><b>Total renders:</b> ${totalRenders}</div>
          <div><b>Motion elements:</b> <span style="color:${motionCount > 20 ? '#ff4444' : motionCount > 10 ? '#fbbf24' : '#4ade80'}">${motionCount}</span></div>
          <div><b>DOM nodes:</b> <span style="color:${domNodes > 3000 ? '#ff4444' : domNodes > 1500 ? '#fbbf24' : '#4ade80'}">${domNodes}</span></div>
          <div><b>Memory:</b> ${memoryStr}</div>
          <div><b>Errors:</b> <span style="color:${errorLog.filter(e => e.type === 'error').length > 0 ? '#ff4444' : '#4ade80'}">${errorLog.filter(e => e.type === 'error').length}</span></div>
        </div>
      `;
    } else if (tab === 'renders') {
      const sorted = [...renderCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
      panelRef.current.innerHTML = `
        <div style="font-size:9px;line-height:1.5;max-height:200px;overflow-y:auto">
          ${sorted.length === 0 ? '<div style="color:#94a3b8">No tracked renders yet.<br/>Add trackRender() calls to components.</div>' : ''}
          ${sorted
            .map(
              ([name, count]) =>
                `<div><span style="color:${count > 100 ? '#ff4444' : count > 50 ? '#fbbf24' : '#4ade80'}">${count}x</span> ${name}</div>`
            )
            .join('')}
        </div>
      `;
    } else {
      const recent = errorLog.slice(-15).reverse();
      panelRef.current.innerHTML = `
        <div style="font-size:9px;line-height:1.4;max-height:200px;overflow-y:auto">
          ${recent.length === 0 ? '<div style="color:#94a3b8">No errors captured.</div>' : ''}
          ${recent
            .map(
              e =>
                `<div style="color:${e.type === 'error' ? '#ff4444' : '#fbbf24'};margin-bottom:4px;word-break:break-all">${new Date(e.time).toLocaleTimeString()}: ${e.message}</div>`
            )
            .join('')}
        </div>
      `;
    }
  }, [tab]);

  useEffect(() => {
    intervalRef.current = setInterval(updateMetrics, 500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateMetrics]);

  const tabStyle = (t: string) => ({
    padding: '2px 6px',
    fontSize: '9px',
    cursor: 'pointer' as const,
    border: 'none',
    borderRadius: '3px',
    backgroundColor: tab === t ? '#334155' : 'transparent',
    color: tab === t ? '#fff' : '#94a3b8',
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        width: 200,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(100, 116, 139, 0.3)',
        borderRadius: 6,
        padding: 8,
        zIndex: 99999,
        fontFamily: 'monospace',
        color: '#e2e8f0',
        pointerEvents: 'auto',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 6,
          borderBottom: '1px solid #334155',
          paddingBottom: 4,
        }}
      >
        <button onClick={() => setTab('metrics')} style={tabStyle('metrics')}>
          Metrics
        </button>
        <button onClick={() => setTab('renders')} style={tabStyle('renders')}>
          Renders
        </button>
        <button onClick={() => setTab('errors')} style={tabStyle('errors')}>
          Errors
        </button>
      </div>
      <div ref={panelRef} />
    </div>
  );
});

OverlayContent.displayName = 'OverlayContent';

export const DevPerformanceOverlay = memo(() => {
  const [visible, setVisible] = useState(false);
  const longTaskObserverRef = useRef<PerformanceObserver | null>(null);
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
    longTaskObserverRef.current = setupLongTaskObserver();
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
      longTaskObserverRef.current?.disconnect();
      longTaskObserverRef.current = null;
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
