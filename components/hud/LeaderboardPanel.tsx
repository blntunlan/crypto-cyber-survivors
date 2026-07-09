/**
 * LeaderboardPanel - Desktop Sidebar Leaderboard
 *
 * Displays top players on the right side of the screen (desktop only).
 * Features real-time updates, animated entries, and current player highlight.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedText } from '../themed/ThemedText';
import { UserAvatar } from '../ui/UserAvatar';
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
import { LeaderboardService } from '../../services/leaderboard/LeaderboardService';
import { UserSessionService } from '../../services/auth/UserSessionService';
import { Logger } from '../../services/system/Logger';
import { COLORS } from '../../config/Colors';
import type { AuthProvider } from '../../services/auth/RailwayAuthService';

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  survival_time_ms: number;
  created_at: string;
  crypto_pair?: string;
  rank?: number;
  avatar_url?: string | null;
  auth_provider?: AuthProvider | 'email' | 'nickname' | null;
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
    try {
      const result = await LeaderboardService.getLeaderboard('high_score', 10);

      const rankedEntries: LeaderboardEntry[] = result.entries.map(entry => ({
        id: entry.profileId,
        player_name: entry.displayName,
        score: entry.highScore,
        survival_time_ms: entry.maxSurvivalTime * 1000,
        created_at: new Date().toISOString(),
        rank: entry.rank,
        avatar_url: entry.avatarUrl,
        auth_provider: entry.authProvider,
      }));

      setEntries(rankedEntries);
      setLastUpdated(result.lastUpdated);
      Logger.debug('[Leaderboard] Fetched', { count: rankedEntries.length });
    } catch (err) {
      Logger.error('[Leaderboard] Fetch failed', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and interval
  useEffect(() => {
    if (!isVisible || isCollapsed) return;

    void fetchLeaderboard();
    const interval = setInterval(() => {
      void fetchLeaderboard();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchLeaderboard, isVisible, isCollapsed]);

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
          className="flex h-6 w-6 items-center justify-center border-2"
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
          <div className="group relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-400 opacity-30 blur-[4px]" />
            <div
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-yellow-200/50 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 shadow-[0_0_10px_rgba(250,204,21,0.5)]`}
            >
              <Crown className="h-4 w-4 text-yellow-900 drop-shadow-sm" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-slate-300 opacity-20 blur-[3px]" />
            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-100/30 bg-gradient-to-br from-slate-200 to-slate-400 shadow-[0_0_8px_rgba(203,213,225,0.3)]">
              <Medal className="h-4 w-4 text-slate-700" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-600 opacity-20 blur-[3px]" />
            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-500 to-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.3)]">
              <Medal className="h-4 w-4 text-amber-100" />
            </div>
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/5 transition-colors group-hover:border-cyan-500/30">
            <ThemedText variant="mono" className="text-[10px] font-bold text-slate-400">
              {rank}
            </ThemedText>
          </div>
        );
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed right-4 top-20 z-[100] hidden w-72 lg:block"
      data-testid="leaderboard-panel"
      data-overlay-priority="utility"
    >
      {/* Header - Glassmorphism */}
      <ThemedPanel
        className="group relative flex cursor-pointer items-center justify-between overflow-hidden !rounded-none !border-x-0 !border-t-0 border-b border-[#D6B85C]/40 !bg-transparent px-4 py-3 transition-all hover:bg-white/[0.02]"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {!isRetro && <div className="absolute left-0 top-0 h-full w-px bg-[#D6B85C]" />}
        <div className="relative z-10 flex items-center gap-2">
          <Trophy
            className={`h-4 w-4 ${isRetro ? 'text-yellow-400' : 'text-[#D6B85C]'}`}
          />
          <ThemedText
            variant="h2"
            className="text-[11px] font-black uppercase tracking-[0.2em] text-white"
          >
            {t('hud.leaderboard_title')}
          </ThemedText>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <button
            onClick={e => {
              e.stopPropagation();
              LeaderboardService.invalidateCache();
              void fetchLeaderboard();
            }}
            className="group/refresh rounded p-1 transition-colors hover:bg-white/10"
            title={t('hud.refresh_pool') as string}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-slate-400 transition-colors group-hover/refresh:text-cyan-400 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </ThemedPanel>

      {/* Content */}
      {!isCollapsed && (
        <div>
          {/* ThemedPanel wrapper for correct styling of the list container */}
          <ThemedPanel className="relative !rounded-none !border-x-0 !border-y-0 !bg-transparent !shadow-none">
            {loading && entries.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
              </div>
            ) : entries.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <TrendingUp className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                <ThemedText className="text-sm text-slate-500">
                  {t('hud.no_scores')}
                </ThemedText>
                <ThemedText className="mt-1 text-xs text-slate-600">
                  {t('hud.claim_top')}
                </ThemedText>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {entries.map(entry => {
                  const isCurrentPlayer = entry.player_name === currentNickname;

                  return (
                    <div
                      key={entry.id}
                      className={`group/item relative flex items-center gap-3 px-4 py-3 transition-all ${
                        isCurrentPlayer
                          ? isRetro
                            ? 'retro-player-highlight border-l-4'
                            : 'border-l-2 border-[#D6B85C] bg-transparent'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Rank */}
                      {getRankDisplay(entry.rank!)}

                      {/* Avatar */}
                      <UserAvatar
                        avatarUrl={entry.avatar_url}
                        displayName={entry.player_name}
                        size="sm"
                        provider={entry.auth_provider}
                        showProviderBadge={!isRetro}
                      />

                      {/* Player Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <ThemedText
                            variant={isRetro ? 'body' : 'h2'}
                            className={`truncate text-sm font-semibold ${
                              isCurrentPlayer
                                ? isRetro
                                  ? 'text-yellow-400'
                                  : 'text-[#D6B85C]'
                                : 'text-white'
                            }`}
                          >
                            {entry.player_name}
                          </ThemedText>
                          {isCurrentPlayer && (
                            <span
                              className={`px-1.5 py-0.5 text-[9px] ${isRetro ? 'bg-yellow-500/20 font-display text-yellow-500' : 'rounded bg-cyan-500/20 font-bold uppercase text-cyan-400'}`}
                            >
                              {t('hud.you')}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          {entry.crypto_pair && (
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-black uppercase ${isRetro ? 'border border-current' : 'rounded-sm tracking-wider'}`}
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
                                border: isRetro ? undefined : `1px solid currentColor`,
                              }}
                            >
                              {entry.crypto_pair}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3" />
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
                          className="text-[9px] font-bold uppercase tracking-tighter text-slate-500"
                        >
                          {t('hud.points')}
                        </ThemedText>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {lastUpdated && (
              <div className="border-t border-slate-800/50 px-4 py-2 text-center font-mono text-[8px] uppercase tracking-widest text-slate-600">
                &lt; {t('hud.sync_complete')}: {lastUpdated.toLocaleTimeString()} &gt;
              </div>
            )}
          </ThemedPanel>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPanel;
