/**
 * LeaderboardPanel - Desktop Sidebar Leaderboard
 *
 * Displays top players on the right side of the screen (desktop only).
 * Features real-time updates, animated entries, and current player highlight.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedText } from '../themed/ThemedText';
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
import { supabase, isSupabaseConfigured } from '../../services/Supabase';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { Logger } from '../../services/Logger';
import { COLORS } from '../../config/Colors';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  survival_time_ms: number;
  created_at: string;
  crypto_pair?: string;
  rank?: number;
}

interface LeaderboardPanelProps {
  isVisible?: boolean;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  isVisible = true,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const currentNickname = UserSessionService.getNickname();

  const fetchLeaderboard = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      // Fallback for dev/unconfigured state
      return;
    }

    try {
      const { data, error } = await supabase
        .from('v_leaderboard')
        .select('*')
        .limit(10);

      if (error) {
        // Fallback to empty if table doesn't exist yet
        Logger.warn('[Leaderboard] Fetch failed', error);
        setEntries([]);
        setLastUpdated(new Date());
      } else {
        // Map data using fallbacks for both OLD and NEW view schemas
        const rankedEntries = data
          .map((entry, index) => {
            const name = (
              entry.display_name ??
              entry.player_name ??
              'Anonymous'
            ).trim();
            return {
              ...entry,
              id: entry.id ?? entry.player_id ?? `entry-${index}`,
              player_name: name,
              score: entry.score ?? entry.high_score ?? 0,
              survival_time_ms: entry.survival_time_ms ?? entry.total_playtime_ms ?? 0,
              rank: entry.rank ?? index + 1,
            };
          })
          // Filter out anonymous/empty names
          .filter(entry => entry.player_name !== '');

        setEntries(rankedEntries);
        setLastUpdated(new Date());
        Logger.debug('[Leaderboard] Fetched', {
          count: rankedEntries.length,
          source:
            data.length > 0 && 'display_name' in data[0] ? 'new_view' : 'old_view',
        });
      }
    } catch (err) {
      Logger.error('[Leaderboard] Fetch failed', err);
      // Fallback on crash
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    if (!isVisible) return;

    void fetchLeaderboard();
    const interval = setInterval(() => {
      void fetchLeaderboard();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchLeaderboard, isVisible]);

  // Format survival time
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get rank icon/style
  const getRankDisplay = (rank: number) => {
    if (isRetro) {
      const getRetroRankStyle = () => {
        switch (rank) {
          case 1:
            return { color: COLORS.JACKPOT_YELLOW, borderColor: COLORS.JACKPOT_YELLOW };
          case 2:
            return { color: COLORS.SLOT_SILVER, borderColor: COLORS.SLOT_SILVER };
          case 3:
            return { color: COLORS.NEON_ORANGE, borderColor: COLORS.NEON_ORANGE };
          default:
            return { color: '#94a3b8', borderColor: '#334155' };
        }
      };
      const style = getRetroRankStyle();
      return (
        <div
          className="flex items-center justify-center w-6 h-6 border-2"
          style={{ borderColor: style.borderColor }}
        >
          <ThemedText
            variant="mono"
            className="text-[10px] font-bold"
            style={{ color: style.color }}
          >
            {rank}
          </ThemedText>
        </div>
      );
    }

    switch (rank) {
      case 1:
        return (
          <div className="relative group">
            <div className="absolute inset-0 bg-yellow-400 blur-[4px] opacity-30 animate-pulse rounded-full" />
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 shadow-[0_0_10px_rgba(250,204,21,0.5)] border border-yellow-200/50 relative z-10`}
            >
              <Crown className="w-4 h-4 text-yellow-900 drop-shadow-sm" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-slate-300 blur-[3px] opacity-20 rounded-full" />
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_8px_rgba(203,213,225,0.3)] border border-slate-100/30 relative z-10">
              <Medal className="w-4 h-4 text-slate-700" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-amber-600 blur-[3px] opacity-20 rounded-full" />
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.3)] border border-amber-400/30 relative z-10">
              <Medal className="w-4 h-4 text-amber-100" />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
            <ThemedText variant="mono" className="text-[10px] font-bold text-slate-400">
              {rank}
            </ThemedText>
          </div>
        );
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={`fixed right-4 top-20 z-[100] w-72 hidden lg:block`}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      {/* Header - Glassmorphism */}
      <ThemedPanel
        className="flex items-center justify-between px-4 py-3 cursor-pointer rounded-b-none border-b-0 hover:bg-slate-900/50 transition-all relative overflow-hidden group"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {!isRetro && (
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-400 to-transparent opacity-50" />
        )}
        <div className="flex items-center gap-2 relative z-10">
          <Trophy
            className={`w-4 h-4 ${isRetro ? 'text-yellow-400' : 'text-yellow-400 animate-pulse'}`}
          />
          <ThemedText
            variant="h2"
            className="text-[11px] font-black text-white uppercase tracking-[0.2em]"
          >
            {t('hud.leaderboard_title')}
          </ThemedText>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={e => {
              e.stopPropagation();
              void fetchLeaderboard();
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors group/refresh"
            title={t('hud.refresh_pool')}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 group-hover/refresh:text-cyan-400 transition-colors ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </ThemedPanel>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ThemedPanel wrapper for correct styling of the list container */}
            <ThemedPanel className="rounded-t-none border-t-0 overflow-hidden !shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
              {!isRetro && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 2px)`,
                    backgroundSize: '100% 2px',
                  }}
                />
              )}
              {loading && entries.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <ThemedText className="text-sm text-slate-500">
                    {t('hud.no_scores')}
                  </ThemedText>
                  <ThemedText className="text-xs text-slate-600 mt-1">
                    {t('hud.claim_top')}
                  </ThemedText>
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
                        className={`flex items-center gap-3 px-4 py-3 transition-all relative group/item ${
                          isCurrentPlayer
                            ? isRetro
                              ? 'retro-player-highlight border-l-4'
                              : 'bg-cyan-500/10 border-l-2 border-cyan-400 shadow-[inset_10px_0_20px_rgba(34,211,238,0.05)]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        {!isRetro && isCurrentPlayer && (
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.05] to-transparent pointer-events-none" />
                        )}
                        {/* Rank */}
                        {getRankDisplay(entry.rank!)}

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <ThemedText
                              variant={isRetro ? 'body' : 'h2'}
                              className={`text-sm font-semibold truncate ${
                                isCurrentPlayer
                                  ? isRetro
                                    ? 'text-yellow-400'
                                    : 'text-cyan-300'
                                  : 'text-white'
                              }`}
                            >
                              {entry.player_name}
                            </ThemedText>
                            {isCurrentPlayer && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 ${isRetro ? 'bg-yellow-500/20 text-yellow-500 font-display' : 'bg-cyan-500/20 text-cyan-400 rounded uppercase font-bold'}`}
                              >
                                {t('hud.you')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {entry.crypto_pair && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 font-black uppercase ${isRetro ? 'border border-current' : 'rounded-sm tracking-wider'}`}
                                style={{
                                  backgroundColor: isRetro
                                    ? 'transparent'
                                    : entry.crypto_pair === 'BTC'
                                      ? '#F7931A30'
                                      : entry.crypto_pair === 'ETH'
                                        ? '#627EEA30'
                                        : entry.crypto_pair === 'SOL'
                                          ? '#9945FF30'
                                          : '#64748b30',
                                  color:
                                    entry.crypto_pair === 'BTC'
                                      ? '#F7931A'
                                      : entry.crypto_pair === 'ETH'
                                        ? '#627EEA'
                                        : entry.crypto_pair === 'SOL'
                                          ? '#9945FF'
                                          : '#94a3b8',
                                  border: isRetro
                                    ? undefined
                                    : `1px solid currentColor`,
                                }}
                              >
                                {entry.crypto_pair}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(entry.survival_time_ms)}
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <ThemedText
                            variant={isRetro ? 'h1' : 'h2'}
                            className={`text-sm font-black tracking-tight ${
                              entry.rank === 1
                                ? 'text-yellow-400'
                                : entry.rank === 2
                                  ? 'text-slate-300'
                                  : entry.rank === 3
                                    ? 'text-amber-500'
                                    : isRetro
                                      ? 'text-white'
                                      : 'text-cyan-400'
                            }`}
                          >
                            {entry.score.toLocaleString()}
                          </ThemedText>
                          <ThemedText
                            variant="mono"
                            className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter"
                          >
                            {t('hud.points')}
                          </ThemedText>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              {lastUpdated && (
                <div className="px-4 py-2 border-t border-slate-800/50 text-[8px] text-slate-600 text-center uppercase tracking-widest font-mono">
                  &lt; {t('hud.sync_complete')}: {lastUpdated.toLocaleTimeString()} &gt;
                </div>
              )}
            </ThemedPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeaderboardPanel;
