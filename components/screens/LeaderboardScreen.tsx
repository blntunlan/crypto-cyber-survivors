/**
 * LeaderboardScreen - Full-Screen Leaderboard (Hub "RANKS" screen)
 *
 * Premium full-page leaderboard with:
 * - Sort tabs (High Score, Survival Time, Total Kills, Sessions)
 * - Animated podium for top 3 players
 * - Scrollable ranked list
 * - Current player highlight with sticky row
 * - Auto-refresh with 30s interval
 * - Cyberpunk / Retro theme support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { m } from 'framer-motion';
import { Trophy, Crown, Medal, Clock, Skull, RefreshCw, Gamepad2 } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeSize } from '../../hooks/useThemeSize';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedText } from '../themed/ThemedText';
import { UserAvatar } from '../ui/UserAvatar';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';
import {
  LeaderboardService,
  type LeaderboardEntry,
  type LeaderboardSortField,
} from '../../services/leaderboard/LeaderboardService';

// ============================================================================
// Sort Tab Config
// ============================================================================

interface SortTab {
  key: LeaderboardSortField;
  label: string;
  icon: React.ReactNode;
  color: string;
  valueExtractor: (entry: LeaderboardEntry) => string;
  unitLabel: string;
}

function useSortTabs(): SortTab[] {
  const { t } = useLanguage();
  return useMemo(
    () => [
      {
        key: 'high_score' as LeaderboardSortField,
        label: (t('leaderboard.sort_score') as string) || 'Score',
        icon: <Trophy className="h-3.5 w-3.5" />,
        color: COLORS.JACKPOT_YELLOW,
        valueExtractor: (e: LeaderboardEntry) => e.highScore.toLocaleString(),
        unitLabel: (t('hud.points') as string) || 'pts',
      },
      {
        key: 'max_survival_time' as LeaderboardSortField,
        label: (t('leaderboard.sort_time') as string) || 'Time',
        icon: <Clock className="h-3.5 w-3.5" />,
        color: COLORS.ELECTRIC_BLUE,
        valueExtractor: (e: LeaderboardEntry) => formatTime(e.maxSurvivalTime),
        unitLabel: (t('leaderboard.survived') as string) || 'survived',
      },
      {
        key: 'total_kills' as LeaderboardSortField,
        label: (t('leaderboard.sort_kills') as string) || 'Kills',
        icon: <Skull className="h-3.5 w-3.5" />,
        color: COLORS.DUMP_ORANGE,
        valueExtractor: (e: LeaderboardEntry) => e.totalKills.toLocaleString(),
        unitLabel: (t('leaderboard.total') as string) || 'total',
      },
      {
        key: 'total_sessions' as LeaderboardSortField,
        label: (t('leaderboard.sort_sessions') as string) || 'Runs',
        icon: <Gamepad2 className="h-3.5 w-3.5" />,
        color: COLORS.PUMP_GREEN,
        valueExtractor: (e: LeaderboardEntry) => e.totalSessions.toLocaleString(),
        unitLabel: (t('leaderboard.runs') as string) || 'runs',
      },
    ],
    [t]
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

// --- Podium Card (Top 3) ---

const PODIUM_CONFIGS = [
  {
    rank: 1,
    icon: Crown,
    gradient: 'from-yellow-400/20 via-amber-500/10 to-transparent',
    border: 'border-yellow-400/40',
    glow: 'shadow-[0_0_30px_rgba(250,204,21,0.15)]',
    textColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/15',
    size: 'lg' as const,
  },
  {
    rank: 2,
    icon: Medal,
    gradient: 'from-slate-300/15 via-slate-400/10 to-transparent',
    border: 'border-slate-300/30',
    glow: 'shadow-[0_0_20px_rgba(203,213,225,0.1)]',
    textColor: 'text-slate-300',
    badgeBg: 'bg-slate-300/15',
    size: 'md' as const,
  },
  {
    rank: 3,
    icon: Medal,
    gradient: 'from-amber-600/15 via-amber-700/10 to-transparent',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_20px_rgba(180,83,9,0.1)]',
    textColor: 'text-amber-500',
    badgeBg: 'bg-amber-500/15',
    size: 'md' as const,
  },
];

interface PodiumCardProps {
  entry: LeaderboardEntry;
  config: (typeof PODIUM_CONFIGS)[0];
  sortTab: SortTab;
  isRetro: boolean;
  animDelay: number;
}

const PodiumCard: React.FC<PodiumCardProps> = ({
  entry,
  config,
  sortTab,
  isRetro,
  animDelay,
}) => {
  const Icon = config.icon;

  return (
    <m.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: animDelay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative flex flex-col items-center gap-3 p-4 text-center',
        isRetro
          ? 'border-2 bg-[#0a0a12]/80'
          : `rounded-xl border bg-gradient-to-b ${config.gradient} ${config.border} ${config.glow} backdrop-blur-sm`
      )}
      style={isRetro ? { borderColor: sortTab.color + '60' } : undefined}
    >
      {/* Rank Badge */}
      <div className="relative">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isRetro ? 'border-2' : config.badgeBg
          )}
          style={isRetro ? { borderColor: sortTab.color } : undefined}
        >
          <Icon
            className={cn('h-4 w-4', isRetro ? '' : config.textColor)}
            style={isRetro ? { color: sortTab.color } : undefined}
          />
        </div>
        {config.rank === 1 && !isRetro && (
          <div className="absolute -inset-1 animate-pulse rounded-full bg-yellow-400/20 blur-sm" />
        )}
      </div>

      {/* Avatar */}
      <UserAvatar
        avatarUrl={entry.avatarUrl}
        displayName={entry.displayName}
        size={config.size}
        provider={entry.authProvider}
        showProviderBadge={!isRetro}
      />

      {/* Name */}
      <div className="w-full min-w-0">
        <ThemedText
          variant="h2"
          className={cn(
            'truncate font-semibold',
            config.rank === 1 ? 'text-sm' : 'text-xs',
            entry.isCurrentPlayer
              ? isRetro
                ? 'text-yellow-400'
                : 'text-cyan-300'
              : 'text-white'
          )}
        >
          {entry.displayName}
        </ThemedText>
        {entry.isCurrentPlayer && (
          <span
            className={cn(
              'mt-1 inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase',
              isRetro
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'rounded bg-cyan-500/20 text-cyan-400'
            )}
          >
            YOU
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <ThemedText
          variant="h1"
          className={cn(
            'font-black tracking-tight',
            config.rank === 1 ? 'text-xl' : 'text-lg'
          )}
          style={{ color: sortTab.color }}
        >
          {sortTab.valueExtractor(entry)}
        </ThemedText>
        <ThemedText
          variant="mono"
          className="text-[8px] font-bold uppercase tracking-wider text-slate-500"
        >
          {sortTab.unitLabel}
        </ThemedText>
      </div>
    </m.div>
  );
};

// --- Rank Row (4th+) ---

interface RankRowProps {
  entry: LeaderboardEntry;
  sortTab: SortTab;
  isRetro: boolean;
  animDelay: number;
}

const RankRow: React.FC<RankRowProps> = ({ entry, sortTab, isRetro, animDelay }) => (
  <m.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: animDelay, duration: 0.3 }}
    className={cn(
      'group relative flex items-center gap-3 px-4 py-3 transition-all',
      entry.isCurrentPlayer
        ? isRetro
          ? 'border-l-4 border-yellow-400/60 bg-yellow-500/5'
          : 'border-l-2 border-cyan-400 bg-cyan-500/10 shadow-[inset_10px_0_20px_rgba(34,211,238,0.03)]'
        : 'hover:bg-white/[0.03]'
    )}
  >
    {/* Rank Number */}
    <div
      className={cn(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center',
        isRetro
          ? 'border-2 border-white/20'
          : 'rounded-md border border-white/10 bg-white/5 transition-colors group-hover:border-cyan-500/30'
      )}
    >
      <ThemedText variant="mono" className="text-[10px] font-bold text-slate-400">
        {entry.rank}
      </ThemedText>
    </div>

    {/* Avatar */}
    <UserAvatar
      avatarUrl={entry.avatarUrl}
      displayName={entry.displayName}
      size="sm"
      provider={entry.authProvider}
      showProviderBadge={!isRetro}
    />

    {/* Player Info */}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <ThemedText
          variant={isRetro ? 'body' : 'h2'}
          className={cn(
            'truncate text-sm font-semibold',
            entry.isCurrentPlayer
              ? isRetro
                ? 'text-yellow-400'
                : 'text-cyan-300'
              : 'text-white'
          )}
        >
          {entry.displayName}
        </ThemedText>
        {entry.isCurrentPlayer && (
          <span
            className={cn(
              'px-1.5 py-0.5 text-[9px]',
              isRetro
                ? 'bg-yellow-500/20 font-display text-yellow-500'
                : 'rounded bg-cyan-500/20 font-bold uppercase text-cyan-400'
            )}
          >
            YOU
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Clock className="h-3 w-3" />
          {formatTime(entry.maxSurvivalTime)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Skull className="h-3 w-3" />
          {entry.totalKills.toLocaleString()}
        </span>
      </div>
    </div>

    {/* Score */}
    <div className="flex-shrink-0 text-right">
      <ThemedText
        variant={isRetro ? 'h1' : 'h2'}
        className="text-sm font-black tracking-tight"
        style={{ color: sortTab.color }}
      >
        {sortTab.valueExtractor(entry)}
      </ThemedText>
      <ThemedText
        variant="mono"
        className="text-[8px] font-bold uppercase tracking-tighter text-slate-500"
      >
        {sortTab.unitLabel}
      </ThemedText>
    </div>
  </m.div>
);

// --- Empty State ---

const EmptyState: React.FC<{ isRetro: boolean }> = ({ isRetro }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="relative">
        <Trophy
          className={cn('h-12 w-12', isRetro ? 'text-yellow-400' : 'text-slate-600')}
        />
        {!isRetro && (
          <div className="absolute inset-0 animate-pulse blur-lg">
            <Trophy className="h-12 w-12 text-yellow-400/20" />
          </div>
        )}
      </div>
      <ThemedText className="text-sm text-slate-400">
        {(t('hud.no_scores') as string) || 'No scores yet'}
      </ThemedText>
      <ThemedText className="text-xs text-slate-600">
        {(t('hud.claim_top') as string) || 'Be the first to claim the top!'}
      </ThemedText>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const LeaderboardScreen: React.FC = () => {
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const sizes = useThemeSize();
  const sortTabs = useSortTabs();

  const [activeSort, setActiveSort] = useState<LeaderboardSortField>('high_score');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const activeTab = sortTabs.find(tab => tab.key === activeSort) ?? sortTabs[0]!;

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
        LeaderboardService.invalidateCache();
      } else {
        setLoading(true);
      }

      try {
        const result = await LeaderboardService.getLeaderboard(activeSort, 50);
        setEntries(result.entries);
        setLastUpdated(result.lastUpdated);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeSort]
  );

  // Initial fetch + auto-refresh
  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived data
  const podiumEntries = entries.slice(0, 3);
  const listEntries = entries.slice(3);
  const currentPlayerEntry = entries.find(e => e.isCurrentPlayer);
  const stickyCurrentPlayerEntry =
    currentPlayerEntry && currentPlayerEntry.rank > 10 ? currentPlayerEntry : null;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'allow-scroll absolute inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto p-3 pb-[calc(1rem+var(--sab))] sm:p-5',
        isRetro ? 'bg-[#0a0a12]/95' : 'bg-slate-950/95'
      )}
    >
      <div className="w-full max-w-2xl space-y-4 py-2 sm:space-y-5 sm:py-4">
        {/* Header */}
        <m.header
          className="space-y-2 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-center gap-3">
            <Trophy
              className={cn(
                'h-5 w-5',
                isRetro ? 'text-yellow-400' : 'animate-pulse text-yellow-400'
              )}
            />
            <h1
              className={cn(
                isRetro
                  ? 'font-retro-pixel text-[#FFD600]'
                  : 'cyber-sway-text font-cyber text-white',
                sizes.heading,
                'font-black uppercase tracking-tight'
              )}
            >
              {(t('hud.leaderboard_title') as string) || 'Leaderboard'}
            </h1>
            <Trophy
              className={cn(
                'h-5 w-5',
                isRetro ? 'text-yellow-400' : 'animate-pulse text-yellow-400'
              )}
            />
          </div>
          <p
            className={cn(
              isRetro ? 'font-retro-pixel text-[10px]' : 'font-cyber text-xs',
              'uppercase tracking-[0.25em] text-slate-500'
            )}
          >
            {(t('leaderboard.global_rankings') as string) || 'Global Rankings'}
          </p>
        </m.header>

        {/* Sort Tabs */}
        <m.div
          className={cn(
            'flex gap-1.5 overflow-x-auto p-1',
            isRetro
              ? 'border-2 border-[#39FF14]/30 bg-[#0a0a12]/80'
              : 'rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm'
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {sortTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSort(tab.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all duration-200',
                isRetro
                  ? activeSort === tab.key
                    ? 'border-2 bg-[#0a0a12]'
                    : 'border-2 border-transparent text-slate-500 hover:text-slate-300'
                  : activeSort === tab.key
                    ? 'rounded-lg shadow-lg'
                    : 'rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300'
              )}
              style={
                activeSort === tab.key
                  ? {
                      color: tab.color,
                      borderColor: isRetro ? tab.color : 'transparent',
                      backgroundColor: isRetro ? 'transparent' : `${tab.color}15`,
                      boxShadow: isRetro ? undefined : `0 0 15px ${tab.color}20`,
                    }
                  : undefined
              }
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </m.div>

        {/* Content Panel */}
        <ThemedPanel
          className={cn(
            'relative overflow-hidden',
            !isRetro &&
              'bg-slate-900/95 !rounded-[1.5rem] border border-white/20 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)]'
          )}
        >
          {/* Top accent line */}
          {!isRetro && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div
                className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{ boxShadow: `0 0 20px ${activeTab.color}40` }}
              />
            </>
          )}

          {/* Loading State */}
          {loading && entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: `${activeTab.color}30`,
                  borderTopColor: activeTab.color,
                }}
              />
              <ThemedText className="text-xs text-slate-500">
                Loading rankings...
              </ThemedText>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState isRetro={isRetro} />
          ) : (
            <div className="relative z-10">
              {/* Podium Section (Top 3) */}
              {podiumEntries.length > 0 && (
                <div className="p-4 sm:p-5">
                  <div
                    className={cn(
                      'grid gap-3',
                      podiumEntries.length >= 3
                        ? 'grid-cols-3'
                        : podiumEntries.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                    )}
                  >
                    {podiumEntries.map((entry, idx) => {
                      const config = PODIUM_CONFIGS[idx];
                      if (!config) return null;
                      return (
                        <PodiumCard
                          key={entry.profileId}
                          entry={entry}
                          config={config}
                          sortTab={activeTab}
                          isRetro={isRetro}
                          animDelay={0.2 + idx * 0.1}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              {listEntries.length > 0 && (
                <div className="mx-4 flex items-center gap-2">
                  <div
                    className={cn(
                      'h-px flex-1',
                      isRetro
                        ? 'bg-white/10'
                        : 'bg-gradient-to-r from-transparent to-white/10'
                    )}
                  />
                  <span
                    className={cn(
                      isRetro ? 'font-retro-pixel' : 'font-cyber',
                      'text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600'
                    )}
                  >
                    {(t('leaderboard.all_players') as string) || 'All Players'}
                  </span>
                  <div
                    className={cn(
                      'h-px flex-1',
                      isRetro
                        ? 'bg-white/10'
                        : 'bg-gradient-to-l from-transparent to-white/10'
                    )}
                  />
                </div>
              )}

              {/* List */}
              <div className="divide-y divide-white/[0.04]">
                {listEntries.map((entry, idx) => (
                  <RankRow
                    key={entry.profileId}
                    entry={entry}
                    sortTab={activeTab}
                    isRetro={isRetro}
                    animDelay={0.4 + idx * 0.03}
                  />
                ))}
              </div>

              {/* Current Player Sticky (if not visible in top entries) */}
              {stickyCurrentPlayerEntry && (
                <div
                  className={cn(
                    'sticky bottom-0 border-t',
                    isRetro
                      ? 'border-yellow-400/30 bg-[#0a0a12]/95'
                      : 'border-cyan-500/20 bg-slate-900/95 backdrop-blur-xl'
                  )}
                >
                  <RankRow
                    entry={stickyCurrentPlayerEntry}
                    sortTab={activeTab}
                    isRetro={isRetro}
                    animDelay={0}
                  />
                </div>
              )}

              {/* Footer */}
              <div
                className={cn(
                  'flex items-center justify-between border-t px-4 py-2.5',
                  isRetro ? 'border-white/10' : 'border-slate-800/50'
                )}
              >
                {lastUpdated && (
                  <span className="font-mono text-[8px] uppercase tracking-widest text-slate-600">
                    &lt; {(t('hud.sync_complete') as string) || 'SYNC COMPLETE'}:{' '}
                    {lastUpdated.toLocaleTimeString()} &gt;
                  </span>
                )}
                <button
                  onClick={() => void fetchData(true)}
                  disabled={refreshing}
                  className={cn(
                    'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all',
                    isRetro
                      ? 'border border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/10'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                  {refreshing
                    ? (t('leaderboard.refreshing') as string) || 'Refreshing...'
                    : (t('leaderboard.refresh') as string) || 'Refresh'}
                </button>
              </div>
            </div>
          )}

          {/* Scanline effect (retro) */}
          {isRetro && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 2px)',
                backgroundSize: '100% 2px',
              }}
            />
          )}
        </ThemedPanel>
      </div>
    </m.div>
  );
};
