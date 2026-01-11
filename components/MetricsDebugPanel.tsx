/**
 * MetricsDebugPanel - Development-only metrics visualization
 *
 * Displays real-time metrics and insights during gameplay.
 * Only visible in development mode.
 */

import React, { useState, useEffect } from 'react';
import { MetricsService } from '../services/MetricsService';
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

  // Check if panel should be shown (must be before any hooks that depend on it)
  const shouldShow = import.meta.env.DEV && shouldShowDebugPanel();

  // Update session count periodically - hook must be called unconditionally
  useEffect(() => {
    if (!shouldShow) return;

    const interval = setInterval(() => {
      setSessionCount(MetricsService.getSessionCount());

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
      className="fixed bottom-4 right-4 z-[9999] font-debug text-xs"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-0 right-0 bg-purple-900/90 text-white px-3 py-2 rounded-lg
                   border border-purple-500/50 hover:bg-purple-800 transition-colors
                   flex items-center gap-2 shadow-lg"
      >
        📊 {sessionCount} Sessions
        <span className="text-[10px]">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          className="absolute bottom-12 right-0 w-80 bg-slate-900/95 rounded-lg border border-purple-500/30
                     shadow-2xl backdrop-blur-sm overflow-hidden"
        >
          {/* Header */}
          <div className="bg-purple-900/50 px-4 py-2 border-b border-purple-500/30">
            <h3 className="text-purple-300 font-bold">📊 Metrics Debug Panel</h3>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {/* Current Session */}
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-400 text-[10px] mb-1">CURRENT SESSION</div>
              <div className="text-green-400">{currentState}</div>
            </div>

            {/* Session Count */}
            <div className="bg-slate-800/50 rounded p-2">
              <div className="text-slate-400 text-[10px] mb-1">STORED SESSIONS</div>
              <div className="text-cyan-400 text-lg font-bold">{sessionCount}</div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 bg-blue-600/80 hover:bg-blue-500 text-white px-3 py-2 rounded
                         text-[10px] transition-colors"
              >
                📥 Export JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 bg-green-600/80 hover:bg-green-500 text-white px-3 py-2 rounded
                         text-[10px] transition-colors"
              >
                📥 Export CSV
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleShowInsights}
                className="flex-1 bg-purple-600/80 hover:bg-purple-500 text-white px-3 py-2 rounded
                         text-[10px] transition-colors"
              >
                💡 Show Insights
              </button>
              <button
                onClick={handleClearSessions}
                className="flex-1 bg-red-600/80 hover:bg-red-500 text-white px-3 py-2 rounded
                         text-[10px] transition-colors"
              >
                🗑️ Clear All
              </button>
            </div>

            {/* Insights Display */}
            {insights && (
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-slate-400 text-[10px] mb-1 flex justify-between">
                  <span>INSIGHTS</span>
                  <button
                    onClick={() => setInsights(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
                <pre className="text-[9px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {insights}
                </pre>
              </div>
            )}

            {/* Quick Stats from Last Session */}
            {sessionCount > 0 && (
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-slate-400 text-[10px] mb-1">LAST SESSION</div>
                <div className="text-[10px] space-y-1">
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
