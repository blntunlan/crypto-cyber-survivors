/**
 * DebugPanel - Mobile Debug Helper
 * Shows localStorage and benchmark state on screen for mobile debugging
 */

import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/useTheme';
import { Z_LAYERS } from '../constants/ZIndex';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { EventBus } from '../services/EventBus';

interface DebugInfo {
  manualProfile?: string | null;
  benchmarkCache?: string;
  isManualMode?: boolean;
  state?: {
    status?: string;
    profile?: string;
  };
  config?: {
    profile?: string;
  };
  timestamp?: string;
  error?: string;
}

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const { isRetro } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const manualProfile = localStorage.getItem('ccs_manual_perf_profile');
        const benchmarkCache = localStorage.getItem('ccs_device_benchmark');
        const state = DeviceBenchmarkService.getState();
        const config = DeviceBenchmarkService.getPerformanceConfig();
        const isManualMode = DeviceBenchmarkService.isInManualMode();

        setDebugInfo({
          manualProfile,
          benchmarkCache: benchmarkCache ? 'exists' : 'null',
          isManualMode,
          state: {
            status: state.status,
            profile: state.result?.profile ?? 'none',
          },
          config: {
            profile: config.profile,
          },
          timestamp: new Date().toISOString().split('T')[1]?.split('.')[0] ?? 'unknown',
        });
      } catch (err) {
        setDebugInfo({ error: String(err) });
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 text-xs font-bold shadow-lg ${isRetro ? 'rounded-none border-2 border-white font-display' : 'rounded-lg'}`}
        style={{ touchAction: 'manipulation', zIndex: Z_LAYERS.DEBUG_PANEL }}
      >
        🐛 DEBUG
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 p-4 overflow-auto"
      style={{ zIndex: Z_LAYERS.DEBUG_PANEL }}
    >
      <div
        className={`bg-slate-900 border-2 border-green-500 p-4 text-white font-mono text-xs ${isRetro ? 'rounded-none' : 'rounded-lg'}`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-green-400">🐛 Debug Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-red-600 px-3 py-1 rounded text-white font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="border border-green-500/30 rounded p-2">
            <div className="text-green-400 font-bold mb-1">
              Manual Profile (localStorage)
            </div>
            <div className="text-white">{debugInfo.manualProfile ?? '❌ NULL'}</div>
          </div>

          <div className="border border-cyan-500/30 rounded p-2">
            <div className="text-cyan-400 font-bold mb-1">
              🎯 Manual Mode Flag (Memory)
            </div>
            <div
              className={`text-lg font-black ${debugInfo.isManualMode ? 'text-orange-400' : 'text-green-400'}`}
            >
              {debugInfo.isManualMode ? '✅ MANUAL' : '🤖 AUTO'}
            </div>
          </div>

          <div className="border border-blue-500/30 rounded p-2">
            <div className="text-blue-400 font-bold mb-1">Benchmark Cache</div>
            <div className="text-white">{debugInfo.benchmarkCache}</div>
          </div>

          <div className="border border-yellow-500/30 rounded p-2">
            <div className="text-yellow-400 font-bold mb-1">Benchmark State</div>
            <div className="text-white">
              Status: {debugInfo.state?.status}
              <br />
              Profile: {debugInfo.state?.profile}
            </div>
          </div>

          <div className="border border-purple-500/30 rounded p-2">
            <div className="text-purple-400 font-bold mb-1">Active Config</div>
            <div className="text-white">Profile: {debugInfo.config?.profile}</div>
          </div>

          {/* localStorage Health Check */}
          {debugInfo.manualProfile &&
          !debugInfo.manualProfile.startsWith('ULTRA') &&
          !debugInfo.manualProfile.startsWith('HIGH') &&
          !debugInfo.manualProfile.startsWith('MEDIUM') &&
          !debugInfo.manualProfile.startsWith('LOW') ? null : debugInfo.manualProfile &&
            debugInfo.config?.profile !== debugInfo.manualProfile ? (
            <div className="border border-red-500 rounded p-2 bg-red-900/20">
              <div className="text-red-400 font-bold mb-1">
                ⚠️ localStorage MISMATCH!
              </div>
              <div className="text-red-300 text-[10px]">
                Stored: {debugInfo.manualProfile}
                <br />
                Active: {debugInfo.config?.profile}
              </div>
            </div>
          ) : null}

          <div className="text-slate-500 text-[10px]">
            Updated: {debugInfo.timestamp}
          </div>

          <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
            <button
              onClick={() => {
                localStorage.removeItem('ccs_manual_perf_profile');
                alert('Manual profile cleared!');
              }}
              className="w-full bg-orange-600 px-3 py-2 rounded text-white font-bold"
            >
              Clear Manual Profile
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                alert('All localStorage cleared! Reload page.');
              }}
              className="w-full bg-red-600 px-3 py-2 rounded text-white font-bold"
            >
              Clear ALL localStorage
            </button>

            <button
              onClick={() => {
                void DeviceBenchmarkService.runBenchmark(true);
                alert('Force benchmark running...');
              }}
              className="w-full bg-blue-600 px-3 py-2 rounded text-white font-bold"
            >
              Force Benchmark
            </button>

            <button
              onClick={() => {
                console.error('[DebugPanel] Force Cycle Complete Clicked');
                EventBus.emit('cycleComplete', {
                  cycleNumber: 1,
                  totalElapsedSeconds: 300,
                });
                setIsOpen(false);
              }}
              className="w-full bg-green-600 px-3 py-2 rounded text-white font-bold"
            >
              Force Cycle Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
