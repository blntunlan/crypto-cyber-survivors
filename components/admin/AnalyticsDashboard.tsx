/**
 * AnalyticsDashboard.tsx - Admin Analytics Dashboard
 *
 * Displays key metrics from the beta user system.
 * This is a developer/admin-only component.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { Logger } from '../../services/Logger';

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

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [errors, setErrors] = useState<TopError[]>([]);
  const [devices, setDevices] = useState<DeviceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { supabase, isSupabaseConfigured } = await import('../../services/Supabase');

      if (!isSupabaseConfigured() || !supabase) {
        Logger.warn('[AnalyticsDashboard] Supabase not configured');
        setLoading(false);
        return;
      }

      // Fetch dashboard summary
      const { data: summaryData } = await supabase.rpc('get_dashboard_summary');
      if (summaryData?.[0]) {
        setSummary(summaryData[0] as DashboardSummary);
      }

      // Fetch session stats
      const { data: sessionData } = await supabase.from('analytics_sessions').select('*').limit(7);
      if (sessionData) {
        setSessions(sessionData as SessionStats[]);
      }

      // Fetch top errors
      const { data: errorData } = await supabase.from('analytics_top_errors').select('*').limit(10);
      if (errorData) {
        setErrors(errorData as TopError[]);
      }

      // Fetch device stats
      const { data: deviceData } = await supabase
        .from('analytics_performance_by_device')
        .select('*')
        .limit(10);
      if (deviceData) {
        setDevices(deviceData as DeviceStats[]);
      }

      setLastUpdate(new Date());
    } catch (error) {
      Logger.error('[AnalyticsDashboard] Failed to fetch data', error);
    }
    setLoading(false);
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

  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
  }> = React.memo(({ icon, label, value, subValue, color = 'cyan' }) => (
    <div
      className={`bg-slate-800/50 border border-${color}-500/30 rounded-lg p-4 transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`text-${color}-400`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold text-${color}-300`}>{value}</p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  ));

  if (loading && !summary) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[100]">
        <div className="text-cyan-400 animate-pulse flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading Analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-auto z-[100] p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics Dashboard
          </h1>
          {lastUpdate && (
            <p className="text-xs text-slate-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={() => void fetchData()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Players"
            value={summary.total_players}
            subValue={`${summary.active_players_24h} active today`}
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Sessions Today"
            value={summary.sessions_today}
            subValue={`${summary.total_sessions} total`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Session"
            value={formatTime(summary.avg_session_time_seconds || 0)}
            color="yellow"
          />
          <StatCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Errors (24h)"
            value={summary.total_errors_24h}
            subValue={`${summary.error_rate}% error rate`}
            color="red"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Session Trends */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Session Trends (Last 7 Days)
          </h3>
          <div className="space-y-2">
            {sessions.map((day, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{day.date}</span>
                <div className="flex items-center gap-4">
                  <span className="text-green-400">{day.total_sessions} sessions</span>
                  <span className="text-cyan-400">{formatTime(day.avg_survival_seconds)}</span>
                  <span className="text-yellow-400">Lvl {Math.round(day.avg_max_level)}</span>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-slate-500 text-center py-4">No session data yet</p>
            )}
          </div>
        </div>

        {/* Device Performance */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            Performance by Device
          </h3>
          <div className="space-y-2">
            {devices.map((device, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {device.device_type === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Monitor className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-slate-400 capitalize">{device.device_type}</span>
                  <span className="text-xs text-slate-600">{device.optimization_profile}</span>
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
            {devices.length === 0 && (
              <p className="text-slate-500 text-center py-4">No device data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Error Reports */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Recent Errors
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-700">
                <th className="pb-2">Type</th>
                <th className="pb-2">Message</th>
                <th className="pb-2">Count</th>
                <th className="pb-2">Players</th>
                <th className="pb-2">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="py-2 text-yellow-400">{error.error_type}</td>
                  <td className="py-2 text-slate-300 max-w-xs truncate" title={error.error_message}>
                    {error.error_message.substring(0, 50)}...
                  </td>
                  <td className="py-2 text-red-400">{error.occurrence_count}</td>
                  <td className="py-2 text-slate-400">{error.affected_players}</td>
                  <td className="py-2 text-slate-500">
                    {new Date(error.last_seen).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {errors.length === 0 && (
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
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
        >
          ← Back to Game
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
