/**
 * AnalyticsDashboard.tsx - Admin Analytics Dashboard
 *
 * Displays key metrics from the beta user system.
 * This is a developer/admin-only component.
 */

import React, { useEffect, useCallback } from 'react';
import {
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  RefreshCw,
  BarChart3,
  Smartphone,
  Monitor,
  Gamepad2,
} from 'lucide-react';
import { Logger } from '../../services/system/Logger';

interface DashboardSummary {
  total_players: number;
  active_players_24h: number;
  active_players_7d: number;
  total_sessions: number;
  sessions_today: number;
  avg_session_time_seconds: number;
  total_errors_24h: number;
  error_rate: number;
}

interface SessionStats {
  date: string;
  total_sessions: number;
  avg_survival_seconds: number;
  avg_max_level: number;
  avg_fps: number;
}

interface TopError {
  error_type: string;
  error_message: string;
  occurrence_count: number;
  affected_players: number;
  last_seen: string;
}

interface DeviceStats {
  device_type: string;
  optimization_profile: string;
  session_count: number;
  avg_fps: number;
  avg_survival_seconds: number;
}

interface DashboardState {
  summary: DashboardSummary | null;
  sessions: SessionStats[];
  errors: TopError[];
  devices: DeviceStats[];
  loading: boolean;
  lastUpdate: Date | null;
}

const StatCard = React.memo(
  ({
    icon: Icon,
    label,
    value,
    subValue,
    color = 'cyan',
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
  }) => (
    <div
      className={`border- rounded-lg border${color}-500/30 bg-slate-800/50 p-4 transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`text-${color}-400`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`text- text-2xl font-bold${color}-300`}>{value}</p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  )
);
StatCard.displayName = 'StatCard';

export const AnalyticsDashboard: React.FC = () => {
  const [state, dispatch] = React.useReducer(
    (prev: DashboardState, next: Partial<DashboardState>) => ({ ...prev, ...next }),
    {
      summary: null,
      sessions: [],
      errors: [],
      devices: [],
      loading: true,
      lastUpdate: null,
    }
  );

  const fetchData = useCallback(async () => {
    dispatch({ loading: true });
    try {
      const { railwayClient } = await import('../../services/api/RailwayClient');

      // Fetch debug endpoint for analytics data
      const debugData = await railwayClient.get<{
        activity: {
          sessionStats: { verified_24h: number; unverified_24h: number };
          recentErrors_1h: number;
        };
        database: { tableCounts: Record<string, number> };
      }>('/debug');

      const updates: Partial<DashboardState> = {};

      updates.summary = {
        total_players: debugData.database?.tableCounts?.profiles ?? 0,
        active_players_24h: 0,
        active_players_7d: 0,
        total_sessions: debugData.database?.tableCounts?.sessions ?? 0,
        sessions_today:
          (debugData.activity?.sessionStats?.verified_24h ?? 0) +
          (debugData.activity?.sessionStats?.unverified_24h ?? 0),
        avg_session_time_seconds: 0,
        total_errors_24h: debugData.activity?.recentErrors_1h ?? 0,
        error_rate: 0,
      };

      updates.lastUpdate = new Date();
      updates.loading = false;
      dispatch(updates);
    } catch (error) {
      Logger.error('[AnalyticsDashboard] Failed to fetch data', error);
      dispatch({ loading: false });
    }
  }, []);

  useEffect(() => {
    void fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => void fetchData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (state.loading && !state.summary) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
        <div className="flex animate-pulse items-center gap-2 text-cyan-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading Analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-auto bg-slate-950 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-cyan-400">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h1>
          {state.lastUpdate && (
            <p className="text-xs text-slate-500">
              Last updated: {state.lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={state.loading}
          className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-600/20 px-4 py-2 text-cyan-400 transition-colors hover:bg-cyan-600/30 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {state.summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Players"
            value={state.summary.total_players}
            subValue={`${state.summary.active_players_24h} active today`}
          />
          <StatCard
            icon={Activity}
            label="Sessions Today"
            value={state.summary.sessions_today}
            subValue={`${state.summary.total_sessions} total`}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Avg Session"
            value={formatTime(state.summary.avg_session_time_seconds || 0)}
            color="yellow"
          />
          <StatCard
            icon={AlertTriangle}
            label="Errors (24h)"
            value={state.summary.total_errors_24h}
            subValue={`${state.summary.error_rate}% error rate`}
            color="red"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* Session Trends */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Session Trends (Last 7 Days)
          </h3>
          <div className="space-y-2">
            {state.sessions.map(day => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{day.date}</span>
                <div className="flex items-center gap-4">
                  <span className="text-green-400">{day.total_sessions} sessions</span>
                  <span className="text-cyan-400">
                    {formatTime(day.avg_survival_seconds)}
                  </span>
                  <span className="text-yellow-400">
                    Lvl {Math.round(day.avg_max_level)}
                  </span>
                </div>
              </div>
            ))}
            {state.sessions.length === 0 && (
              <p className="py-4 text-center text-slate-500">No session data yet</p>
            )}
          </div>
        </div>

        {/* Device Performance */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Gamepad2 className="h-4 w-4 text-purple-400" />
            Performance by Device
          </h3>
          <div className="space-y-2">
            {state.devices.map(device => (
              <div
                key={`${device.device_type}-${device.optimization_profile}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {device.device_type === 'mobile' ? (
                    <Smartphone className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Monitor className="h-4 w-4 text-slate-500" />
                  )}
                  <span className="capitalize text-slate-400">
                    {device.device_type}
                  </span>
                  <span className="text-xs text-slate-600">
                    {device.optimization_profile}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-green-400">{device.session_count}</span>
                  <span
                    className={`${device.avg_fps >= 50 ? 'text-cyan-400' : device.avg_fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}
                  >
                    {Math.round(device.avg_fps)} FPS
                  </span>
                </div>
              </div>
            ))}
            {state.devices.length === 0 && (
              <p className="py-4 text-center text-slate-500">No device data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Error Reports */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          Recent Errors
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-500">
                <th className="pb-2">Type</th>
                <th className="pb-2">Message</th>
                <th className="pb-2">Count</th>
                <th className="pb-2">Players</th>
                <th className="pb-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {state.errors.map(error => (
                <tr
                  key={`${error.error_type}-${error.last_seen}`}
                  className="border-b border-slate-800"
                >
                  <td className="py-2 text-yellow-400">{error.error_type}</td>
                  <td
                    className="max-w-xs truncate py-2 text-slate-300"
                    title={error.error_message}
                  >
                    {error.error_message.substring(0, 50)}...
                  </td>
                  <td className="py-2 text-red-400">{error.occurrence_count}</td>
                  <td className="py-2 text-slate-400">{error.affected_players}</td>
                  <td className="py-2 text-slate-500">
                    {new Date(error.last_seen).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {state.errors.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    No errors in the last 24 hours 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => (window.location.href = '/')}
          className="rounded-lg bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
        >
          ← Back to Game
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
