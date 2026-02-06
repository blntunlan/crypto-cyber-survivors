import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  BarChart3,
  Calendar,
  User,
  Target,
  Clock,
  Coins,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProfileStatsService } from '../../services/auth/ProfileStatsService';
import { type FullProfileData } from '../../types/profile';
import { type AuthProvider } from '../../services/auth/SupabaseAuthService';
import { UserAvatar } from '../ui/UserAvatar';
import { PANEL_VARIANTS, TEXT_VARIANTS } from '../../config/themeVariants';
import { cn } from '../../utils/classnames';
import { ProfileSettingsContent } from '../settings/ProfileSettings';

interface PlayerProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'overview' | 'stats' | 'achievements' | 'settings';

export const PlayerProfile: React.FC<PlayerProfileProps> = ({ isOpen, onClose }) => {
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<FullProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      void loadProfileData();
    }
  }, [isOpen]);

  const loadProfileData = async () => {
    setIsLoading(true);
    const data = await ProfileStatsService.getInstance().getFullProfile();
    setProfile(data);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={cn(
            'relative w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden',
            isRetro ? PANEL_VARIANTS.retro : PANEL_VARIANTS.modern
          )}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-50 p-2 text-slate-400 transition-colors hover:text-white"
          >
            <X size={isRetro ? 32 : 24} />
          </button>

          {/* Header Section */}
          <div className="flex flex-col items-center gap-6 border-b border-white/5 bg-white/5 p-6 sm:flex-row">
            <div className="relative">
              <UserAvatar
                avatarUrl={profile?.avatarUrl ?? undefined}
                displayName={profile?.displayName ?? 'Player'}
                size="xl"
                provider={profile?.primaryAuthProvider as AuthProvider | undefined}
                showProviderBadge
              />
              {profile?.isTester && (
                <div className="absolute -bottom-2 -right-2 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-black">
                  Tester
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2
                className={cn(
                  'text-2xl sm:text-3xl mb-1',
                  isRetro ? TEXT_VARIANTS.h1.retro : TEXT_VARIANTS.h1.modern
                )}
              >
                {profile?.displayName}
              </h2>
              <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-400 sm:justify-start">
                <span className="flex items-center gap-1">
                  <User size={14} /> @{profile?.username ?? 'user'}
                </span>
                <span className="flex items-center gap-1">
                  <Zap size={14} className="text-yellow-400" /> LVL {profile?.level}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> Joined{' '}
                  {profile ? new Date(profile.createdAt).toLocaleDateString() : '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-white/5">
            {(['overview', 'stats', 'achievements', 'settings'] as TabId[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all relative overflow-hidden',
                  activeTab === tab
                    ? 'text-[var(--hub-accent)]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                  isRetro && 'font-retro-pixel'
                )}
                style={
                  {
                    '--hub-accent': isRetro ? '#39FF14' : '#00f2ff',
                  } as React.CSSProperties
                }
              >
                {t(`profile.tabs.${tab}`)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--hub-accent)]"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Scrollable Content */}
          <div className="scrollbar-thin scrollbar-thumb-white/10 flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[var(--hub-accent)]"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {activeTab === 'overview' && (
                  <OverviewTab profile={profile!} isRetro={isRetro} />
                )}
                {activeTab === 'stats' && (
                  <StatsTab profile={profile!} isRetro={isRetro} />
                )}
                {activeTab === 'achievements' && (
                  <AchievementsTab profile={profile!} isRetro={isRetro} />
                )}
                {activeTab === 'settings' && (
                  <div className="mx-auto max-w-2xl">
                    <ProfileSettingsContent
                      onProfileUpdate={() => {
                        void loadProfileData();
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Sub-components for Tabs ---

const OverviewTab: React.FC<{ profile: FullProfileData; isRetro: boolean }> = ({
  profile,
  isRetro,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Experience Section */}
      <div
        className={cn(
          'p-6',
          isRetro
            ? 'bg-zinc-900 border-2 border-zinc-700'
            : 'bg-white/5 rounded-xl border border-white/10'
        )}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="mb-1 text-xs uppercase tracking-widest text-slate-400">
              Total Experience
            </h3>
            <div className="text-2xl font-bold text-white">
              {profile.xp.toLocaleString()} XP
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold italic text-[var(--hub-accent)]">
              REACH LVL {profile.level + 1}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 overflow-hidden rounded-full border border-white/5 bg-black/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(profile.xp % 1000) / 10}%` }}
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase text-white/80">
            {profile.xp % 1000} / 1000
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          icon={<Trophy size={20} className="text-yellow-400" />}
          label="Achievements"
          value={`${profile.achievements.unlocked.length}/${profile.achievements.all.length}`}
          isRetro={isRetro}
        />
        <SummaryCard
          icon={<Coins size={20} className="text-yellow-400" />}
          label="Gold Balance"
          value={profile.stats.goldBalance.toLocaleString()}
          isRetro={isRetro}
        />
        <SummaryCard
          icon={<Target size={20} className="text-red-400" />}
          label="Total Kills"
          value={profile.stats.totalKills.toLocaleString()}
          isRetro={isRetro}
        />
        <SummaryCard
          icon={<Clock size={20} className="text-blue-400" />}
          label="Games Played"
          value={profile.stats.totalGames.toLocaleString()}
          isRetro={isRetro}
        />
      </div>

      {/* Recent Successes? Maybe Recent Achievements */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
          <ShieldCheck size={16} /> Latest Unlocks
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {profile.achievements.unlocked.slice(0, 3).map(unlock => {
            const def = profile.achievements.all.find(
              a => a.id === unlock.achievementId
            );
            return (
              <div
                key={unlock.id}
                className={cn(
                  'p-3 flex items-center gap-3',
                  isRetro
                    ? 'bg-zinc-950 border border-zinc-800'
                    : 'bg-white/5 rounded-lg border border-white/5'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded bg-yellow-500/10 text-yellow-500">
                  <Trophy size={18} />
                </div>
                <div>
                  <div className="max-w-[120px] truncate text-xs font-bold text-white">
                    {def?.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {unlock.formattedDate}
                  </div>
                </div>
              </div>
            );
          })}
          {profile.achievements.unlocked.length === 0 && (
            <div className="col-span-3 py-4 text-center text-sm italic text-slate-600">
              No achievements unlocked yet. Get out there, survivor!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsTab: React.FC<{ profile: FullProfileData; isRetro: boolean }> = ({
  profile,
  isRetro,
}) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatItem
          label="Total Kills"
          value={profile.stats.totalKills.toLocaleString()}
          isRetro={isRetro}
        />
        <StatItem
          label="Max Kills (Match)"
          value={profile.stats.maxKills.toLocaleString()}
          isRetro={isRetro}
        />
        <StatItem
          label="Survival Time"
          value={formatTime(profile.stats.totalSurvivalTime)}
          isRetro={isRetro}
        />
        <StatItem
          label="Best Survival"
          value={formatTime(profile.stats.maxSurvivalTime)}
          isRetro={isRetro}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatItem
          label="Gold Earned (Total)"
          value={profile.stats.totalGoldEarned.toLocaleString()}
          isRetro={isRetro}
        />
        <StatItem
          label="Average Kills/Match"
          value={
            profile.stats.totalGames > 0
              ? (profile.stats.totalKills / profile.stats.totalGames).toFixed(1)
              : '0'
          }
          isRetro={isRetro}
        />
      </div>

      <div
        className={cn(
          'p-6 text-center',
          isRetro
            ? 'bg-zinc-900 border-2 border-zinc-700'
            : 'bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl border border-white/10'
        )}
      >
        <BarChart3 className="mx-auto mb-2 text-[var(--hub-accent)]" size={32} />
        <h3 className="mb-1 font-bold uppercase tracking-wider text-white">
          Combat Analytics
        </h3>
        <p className="mx-auto max-w-sm text-sm text-slate-400">
          Your killing efficiency is in the top 15% of all survivors. Maintain your
          momentum for better rewards.
        </p>
      </div>
    </div>
  );
};

const AchievementsTab: React.FC<{ profile: FullProfileData; isRetro: boolean }> = ({
  profile,
  isRetro,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-3">
      {profile.achievements.all.map(ach => {
        const isUnlocked = profile.achievements.unlocked.some(
          u => u.achievementId === ach.id
        );
        const unlockInfo = profile.achievements.unlocked.find(
          u => u.achievementId === ach.id
        );

        return (
          <div
            key={ach.id}
            className={cn(
              'p-4 transition-all flex flex-col relative',
              isRetro
                ? cn(
                    'border-2',
                    isUnlocked
                      ? 'bg-zinc-900 border-[#39FF14]/40'
                      : 'bg-black/50 border-zinc-800 opacity-60 grayscale'
                  )
                : cn(
                    'rounded-xl border',
                    isUnlocked
                      ? 'bg-white/10 border-cyan-500/30'
                      : 'bg-white/5 border-white/5 opacity-50 grayscale hover:opacity-100 transition-opacity'
                  )
            )}
          >
            <div className="mb-3 flex items-start justify-between">
              <div
                className={cn(
                  'w-12 h-12 flex items-center justify-center rounded-lg',
                  isUnlocked
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-800 text-slate-500'
                )}
              >
                <Trophy size={24} />
              </div>
              {isUnlocked && (
                <div className="rounded bg-yellow-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-black">
                  Unlocked
                </div>
              )}
            </div>

            <h4 className="mb-1 font-bold text-white">{ach.name}</h4>
            <p className="mb-4 flex-1 text-[11px] leading-tight text-slate-400">
              {ach.description}
            </p>

            <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
              <span className="font-mono text-[10px] text-yellow-500/80">
                +{ach.rewardGold} GOLD
              </span>
              {unlockInfo && (
                <span className="text-[9px] italic text-slate-500">
                  {unlockInfo.formattedDate}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Helper UI components ---

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  isRetro: boolean;
}> = ({ icon, label, value, isRetro }) => (
  <div
    className={cn(
      'p-3 flex flex-col justify-center',
      isRetro
        ? 'bg-zinc-900 border border-zinc-700'
        : 'bg-white/5 rounded-lg border border-white/5'
    )}
  >
    <div className="mb-1 flex items-center gap-2">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
    <div className="font-mono text-lg font-bold leading-none text-white">{value}</div>
  </div>
);

const StatItem: React.FC<{ label: string; value: string; isRetro: boolean }> = ({
  label,
  value,
  isRetro,
}) => (
  <div
    className={cn(
      'p-4',
      isRetro
        ? 'bg-zinc-950 border border-zinc-800'
        : 'bg-white/5 rounded-lg border border-white/5'
    )}
  >
    <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">
      {label}
    </div>
    <div className="font-mono text-xl font-bold text-white">{value}</div>
  </div>
);
