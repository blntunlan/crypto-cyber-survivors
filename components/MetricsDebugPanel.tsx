/**
 * MetricsDebugPanel - Development-only metrics visualization
 *
 * Displays real-time metrics and insights during gameplay.
 * Only visible in development mode.
 */

import React, { useState, useEffect } from 'react';
import { MetricsService } from '../services/core/MetricsService';
import {
  DifficultyManager,
  type DifficultyOutput,
} from '../services/gameplay/DifficultyManager';
import { shouldShowDebugPanel } from '../config/MetricsConfig';

interface MetricsDebugPanelProps {
  isExpanded?: boolean;
}

export const MetricsDebugPanel: React.FC<MetricsDebugPanelProps> = ({
  isExpanded: initialExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentState, setCurrentState] = useState<string>('No active session');
  const [insights, setInsights] = useState<string | null>(null);
  const [difficultyData, setDifficultyData] = useState<DifficultyOutput | null>(null);

  // Check if panel should be shown (must be before any hooks that depend on it)
  const shouldShow = import.meta.env.DEV && shouldShowDebugPanel();

  // Update session count periodically - hook must be called unconditionally
  useEffect(() => {
    if (!shouldShow) return;

    const interval = setInterval(() => {
      setSessionCount(MetricsService.getSessionCount());
      setDifficultyData(DifficultyManager.getLatestOutput());

      const state = MetricsService.getCurrentState();
      if (state?.isActive) {
        const duration = Math.round((Date.now() - state.sessionStartTime) / 1000);
        setCurrentState(
          `Active | ${duration}s | Kills: ${Object.values(state.killsByType).reduce((a, b) => a + b, 0)} | Max Streak: ${state.maxStreak}`
        );
      } else {
        setCurrentState('No active session');
      }
    }, 500);

    return () => clearInterval(interval);
  }, [shouldShow]);

  // Early return AFTER all hooks
  if (!shouldShow) {
    return null;
  }

  const handleExportJSON = () => {
    const json = MetricsService.exportAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto_survivors_metrics_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = MetricsService.exportAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto_survivors_metrics_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShowInsights = () => {
    const gameInsights = MetricsService.getInsights();
    setInsights(JSON.stringify(gameInsights, null, 2));
  };

  const handleClearSessions = () => {
    if (confirm('Clear all stored sessions?')) {
      MetricsService.clearSessions();
      setSessionCount(0);
      setInsights(null);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-40 z-[9999] font-debug text-xs"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-0 right-0 flex items-center gap-2 rounded-lg border
                   border-purple-500/50 bg-purple-900/90 px-3 py-2
                   text-white shadow-lg transition-colors hover:bg-purple-800"
      >
        📊 {sessionCount} Sessions
        <span className="text-[10px]">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          className="absolute bottom-12 right-0 w-80 overflow-hidden rounded-lg border border-purple-500/30
                     bg-slate-900/95 shadow-2xl backdrop-blur-sm"
        >
          {/* Header */}
          <div className="border-b border-purple-500/30 bg-purple-900/50 px-4 py-2">
            <h3 className="font-bold text-purple-300">📊 Metrics Debug Panel</h3>
          </div>

          {/* Content */}
          <div className="max-h-96 space-y-3 overflow-y-auto p-4">
            {/* Current Session */}
            <div className="rounded bg-slate-800/50 p-2">
              <div className="mb-1 text-[10px] text-slate-400">CURRENT SESSION</div>
              <div className="text-green-400">{currentState}</div>
            </div>

            {/* Real-time Difficulty Factors */}
            {difficultyData && (
              <div className="rounded border border-orange-500/20 bg-slate-800/50 p-2">
                <div className="mb-2 flex justify-between text-[10px] font-bold text-orange-400">
                  <span>LIVE DIFFICULTY FACTORS</span>
                  <span>v{difficultyData.total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Spawn:</span>
                    <span className="text-white">
                      x{difficultyData.spawnRate.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Speed:</span>
                    <span className="text-white">
                      x{difficultyData.enemySpeed.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Health:</span>
                    <span className="text-white">
                      x{difficultyData.enemyHealth.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Damage:</span>
                    <span className="text-white">
                      x{difficultyData.enemyDamage.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gem Value:</span>
                    <span className="font-bold text-green-400">
                      x{difficultyData.gemValueMultiplier.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-2 space-y-1 border-t border-slate-700/50 pt-2 text-[8px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">PnL Effect:</span>
                    <span
                      className={
                        difficultyData.factors.pnlEffect > 1
                          ? 'text-red-400'
                          : 'text-green-400'
                      }
                    >
                      {difficultyData.factors.pnlEffect.toFixed(3)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volat. (ATR):</span>
                    <span className="text-blue-400">
                      {difficultyData.factors.volatility.toFixed(3)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Level Factor:</span>
                    <span className="text-yellow-400">
                      {difficultyData.factors.levelFactor.toFixed(3)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Wave Mult:</span>
                    <span className="text-purple-400">
                      {difficultyData.factors.waveMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cycle Mult:</span>
                    <span className="text-cyan-400">
                      {difficultyData.factors.cycleFactor.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time Factor:</span>
                    <span className="text-white">
                      {difficultyData.factors.baseTime.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Session Count */}
            <div className="rounded bg-slate-800/50 p-2">
              <div className="mb-1 text-[10px] text-slate-400">STORED SESSIONS</div>
              <div className="text-lg font-bold text-cyan-400">{sessionCount}</div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 rounded bg-blue-600/80 px-3 py-2 text-[10px] text-white
                         transition-colors hover:bg-blue-500"
              >
                📥 Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 rounded bg-green-600/80 px-3 py-2 text-[10px] text-white
                         transition-colors hover:bg-green-500"
              >
                📥 Export CSV
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleShowInsights}
                className="flex-1 rounded bg-purple-600/80 px-3 py-2 text-[10px] text-white
                         transition-colors hover:bg-purple-500"
              >
                💡 Show Insights
              </button>
              <button
                onClick={handleClearSessions}
                className="flex-1 rounded bg-red-600/80 px-3 py-2 text-[10px] text-white
                         transition-colors hover:bg-red-500"
              >
                🗑️ Clear All
              </button>
            </div>

            {/* Insights Display */}
            {insights && (
              <div className="rounded bg-slate-800/50 p-2">
                <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                  <span>INSIGHTS</span>
                  <button
                    onClick={() => setInsights(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
                <pre className="max-h-48 overflow-x-auto whitespace-pre-wrap text-[9px] text-slate-300">
                  {insights}
                </pre>
              </div>
            )}

            {/* Quick Stats from Last Session */}
            {sessionCount > 0 && (
              <div className="rounded bg-slate-800/50 p-2">
                <div className="mb-1 text-[10px] text-slate-400">LAST SESSION</div>
                <div className="space-y-1 text-[10px]">
                  {(() => {
                    const sessions = MetricsService.getSessions();
                    const last = sessions[sessions.length - 1];
                    if (!last) return null;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Survival:</span>
                          <span className="text-yellow-400">
                            {Math.round(last.player.survivalTimeMs / 1000)}s
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Level:</span>
                          <span className="text-cyan-400">{last.player.maxLevel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Kills:</span>
                          <span className="text-red-400">{last.player.totalKills}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">PnL at Death:</span>
                          <span
                            className={
                              last.bitcoin.pnlAtDeath >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {(last.bitcoin.pnlAtDeath * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Avg Difficulty:</span>
                          <span className="text-orange-400">
                            {last.difficulty.averageDifficulty.toFixed(2)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
