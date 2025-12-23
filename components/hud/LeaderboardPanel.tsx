/**
 * LeaderboardPanel - Desktop Sidebar Leaderboard
 *
 * Displays top players on the right side of the screen (desktop only).
 * Features real-time updates, animated entries, and current player highlight.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Crown,
  Medal,
  Clock,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { Logger } from '../../services/Logger';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  survival_time_ms: number;
  created_at: string;
  rank?: number;
}

interface LeaderboardPanelProps {
  isVisible?: boolean;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ isVisible = true }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const currentNickname = UserSessionService.getNickname();

  const fetchLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Add rank to entries
      const rankedEntries = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setEntries(rankedEntries);
      setLastUpdated(new Date());
      Logger.debug('[Leaderboard] Fetched', { count: rankedEntries.length });
    } catch (err) {
      Logger.error('[Leaderboard] Fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    void fetchLeaderboard();
    const interval = setInterval(() => {
      void fetchLeaderboard();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Format survival time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get rank icon/style
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30">
            <Crown className="w-3.5 h-3.5 text-yellow-900" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 shadow-lg shadow-slate-400/30">
            <Medal className="w-3.5 h-3.5 text-slate-700" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 shadow-lg shadow-amber-600/30">
            <Medal className="w-3.5 h-3.5 text-amber-200" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700">
            <span className="text-xs font-bold text-slate-400">{rank}</span>
          </div>
        );
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed right-4 top-20 z-[100] w-72 font-feed hidden lg:block"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      {/* Header - Glassmorphism */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-t-xl cursor-pointer hover:border-cyan-500/30 hover:bg-slate-900/50 transition-all"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Leaderboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              void fetchLeaderboard();
            }}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900/40 backdrop-blur-md border border-t-0 border-white/10 rounded-b-xl overflow-hidden"
          >
            {loading && entries.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 px-4">
                <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No scores yet</p>
                <p className="text-xs text-slate-600 mt-1">Be the first to claim the top!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {entries.map((entry, index) => {
                  const isCurrentPlayer = entry.player_name === currentNickname;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isCurrentPlayer
                          ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Rank */}
                      {getRankDisplay(entry.rank || index + 1)}

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isCurrentPlayer ? 'text-cyan-300' : 'text-white'
                            }`}
                          >
                            {entry.player_name}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded uppercase font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(entry.survival_time_ms)}
                          </span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            entry.rank === 1
                              ? 'text-yellow-400'
                              : entry.rank === 2
                                ? 'text-slate-300'
                                : entry.rank === 3
                                  ? 'text-amber-500'
                                  : 'text-cyan-400'
                          }`}
                        >
                          {entry.score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-600 uppercase">pts</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {lastUpdated && (
              <div className="px-4 py-2 border-t border-slate-800/50 text-[9px] text-slate-600 text-center">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeaderboardPanel;
