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
  LayoutDashboard,
  Medal,
  Settings,
  Crosshair,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProfileStatsService } from '../../services/auth/ProfileStatsService';
import { type FullProfileData } from '../../types/profile';
import { type AuthProvider } from '../../services/auth/SupabaseAuthService';
import { UserAvatar } from '../ui/UserAvatar';
import { COLORS } from '../../config/Colors';
import { PANEL_VARIANTS, TEXT_VARIANTS } from '../../config/themeVariants';
import { cn } from '../../utils/classnames';
import { ProfileSettingsContent } from '../settings/ProfileSettings';
import { Z_LAYERS } from '../../constants/ZIndex';
import {
  MODERN_PANEL_FRAME,
  MODERN_PANEL_INNER_BORDER,
  MODERN_PANEL_OUTER_BORDER,
  MODERN_PANEL_TOP_ACCENT,
  MODERN_SCREEN_OVERLAY,
} from '../../config/modernSurface';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const tabs: Array<{ id: TabId; icon: LucideIcon }> = [
    { id: 'overview', icon: LayoutDashboard },
    { id: 'stats', icon: BarChart3 },
    { id: 'achievements', icon: Medal },
    { id: 'settings', icon: Settings },
  ];

  const accentColor = isRetro ? COLORS.NEON_GREEN : COLORS.PUMP_GREEN;
  const secondaryAccent = isRetro ? COLORS.JACKPOT_YELLOW : COLORS.WHALE;
  const panelHeaderClass = isRetro
    ? 'border-b-2 border-[#39FF14]/40 bg-[#050505]'
    : 'border-b border-white/5 bg-white/5';
  const tabsContainerClass = isRetro
    ? 'border-b-2 border-[#39FF14]/30 bg-[#050505]'
    : 'border-b border-white/5 bg-transparent';
  const bodyClass = isRetro ? TEXT_VARIANTS.body.retro : TEXT_VARIANTS.body.modern;
  const cardSurface = isRetro
    ? 'rounded-none border-2 border-[#39FF14]/40 bg-[#050505]/95 shadow-[4px_4px_0px_rgba(0,0,0,0.45)]'
    : 'rounded-xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(2,6,23,0.45)]';
  const subtleCardSurface = isRetro
    ? 'rounded-none border border-[#39FF14]/25 bg-[#0f0f18]'
    : 'rounded-lg border border-white/10 bg-white/5';

  useEffect(() => {
    if (isOpen) {
      void loadProfileData();
    }
  }, [isOpen]);

  const loadProfileData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await ProfileStatsService.getInstance().getFullProfile();
      setProfile(data);
      if (!data) {
        setLoadError('Failed to load profile');
      }
    } catch {
      setProfile(null);
      setLoadError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 flex items-end justify-center p-2 md:items-center md:p-6 lg:p-8',
          isRetro ? 'bg-black/80 backdrop-blur-md' : MODERN_SCREEN_OVERLAY
        )}
        style={
          {
            zIndex: Z_LAYERS.TOAST + 1,
            '--hub-accent': accentColor,
          } as React.CSSProperties
        }
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={cn(
            'relative h-[92dvh] w-full max-w-[980px] flex flex-col overflow-hidden rounded-t-2xl md:h-[88vh] md:rounded-2xl lg:h-[84vh] lg:max-w-5xl',
            isRetro ? PANEL_VARIANTS.retro : MODERN_PANEL_FRAME
          )}
        >
          {!isRetro && (
            <>
              <div className={MODERN_PANEL_OUTER_BORDER} />
              <div className={MODERN_PANEL_INNER_BORDER} />
              <div className={MODERN_PANEL_TOP_ACCENT} />
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-2 top-2 z-50 p-2.5 text-slate-400 transition-colors hover:text-white md:right-4 md:top-4 md:p-2"
          >
            <X size={isRetro ? 32 : 24} />
          </button>

          {/* Header Section */}
          <div
            className={cn(
              'flex flex-col items-center gap-3 p-4 md:flex-row md:gap-6 md:p-6 lg:p-7',
              panelHeaderClass,
              bodyClass
            )}
          >
            <div className="relative">
              <UserAvatar
                avatarUrl={profile?.avatarUrl ?? undefined}
                displayName={profile?.displayName ?? 'Player'}
                size="xl"
                provider={profile?.primaryAuthProvider as AuthProvider | undefined}
                showProviderBadge
              />
              {profile?.isTester && (
                <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-black">
                  <ShieldCheck size={10} /> Tester
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h2
                className={cn(
                  'mb-1 text-2xl md:text-3xl lg:text-4xl',
                  isRetro ? TEXT_VARIANTS.h1.retro : TEXT_VARIANTS.h1.modern
                )}
              >
                {profile?.displayName}
              </h2>
              <div
                className={cn(
                  'flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] md:justify-start md:text-sm lg:text-[15px]',
                  isRetro ? 'text-[#A1FFE1]' : 'text-slate-400'
                )}
              >
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
          <div
            className={cn(
              'custom-scrollbar flex gap-1 overflow-x-auto px-2 py-2 md:grid md:grid-cols-4 md:gap-0 md:overflow-visible md:px-0 md:py-0',
              tabsContainerClass
            )}
          >
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative min-w-[112px] shrink-0 overflow-hidden rounded-md px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all md:min-w-0 md:flex-1 md:rounded-none md:py-4 md:text-sm md:tracking-widest lg:text-[13px]',
                    activeTab === tab.id
                      ? 'text-[var(--hub-accent)]'
                      : isRetro
                        ? 'text-[#DCDCDC]/70 hover:text-[#39FF14] hover:bg-[#39FF14]/10'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
                    isRetro ? 'font-retro-pixel tracking-[0.2em]' : 'font-cyber',
                    bodyClass
                  )}
                  style={
                    {
                      '--hub-accent': accentColor,
                    } as React.CSSProperties
                  }
                >
                  <span className="inline-flex items-center gap-1.5 md:gap-2">
                    <TabIcon size={14} />
                    {t(`profile.tabs.${tab.id}`)}
                  </span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--hub-accent)]"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable Content */}
          <div className="scrollbar-thin scrollbar-thumb-white/10 flex-1 overflow-y-auto p-3 md:p-6 lg:p-7">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div
                  className="h-12 w-12 animate-spin rounded-full border-4 border-solid"
                  style={{
                    borderColor: `${accentColor}33`,
                    borderTopColor: accentColor,
                  }}
                />
              </div>
            ) : !profile ? (
              <div className="flex h-full items-center justify-center">
                <div
                  className={cn(
                    'w-full max-w-md p-6 text-center',
                    cardSurface,
                    bodyClass
                  )}
                >
                  <h3
                    className={cn(
                      'mb-2 text-base font-bold uppercase tracking-wide',
                      isRetro ? 'text-[#FF3D00]' : 'text-red-400'
                    )}
                  >
                    {loadError ?? 'Failed to load profile'}
                  </h3>
                  <p className="mb-4 text-sm text-slate-400">
                    Please try again. If the issue continues, check your session or
                    network connection.
                  </p>
                  <button
                    onClick={() => {
                      void loadProfileData();
                    }}
                    className={cn(
                      'rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors',
                      isRetro
                        ? 'border border-[#39FF14]/50 text-[#39FF14] hover:bg-[#39FF14]/10'
                        : 'border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10'
                    )}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-7 lg:space-y-8">
                {activeTab === 'overview' && (
                  <OverviewTab
                    profile={profile}
                    isRetro={isRetro}
                    accentColor={accentColor}
                    bodyClass={bodyClass}
                    cardSurface={cardSurface}
                    subtleCardSurface={subtleCardSurface}
                    secondaryAccent={secondaryAccent}
                  />
                )}
                {activeTab === 'stats' && (
                  <StatsTab
                    profile={profile}
                    isRetro={isRetro}
                    accentColor={accentColor}
                    bodyClass={bodyClass}
                    cardSurface={cardSurface}
                    subtleCardSurface={subtleCardSurface}
                    secondaryAccent={secondaryAccent}
                  />
                )}
                {activeTab === 'achievements' && (
                  <AchievementsTab
                    profile={profile}
                    isRetro={isRetro}
                    bodyClass={bodyClass}
                    cardSurface={cardSurface}
                    subtleCardSurface={subtleCardSurface}
                    accentColor={accentColor}
                  />
                )}
                {activeTab === 'settings' && (
                  <div
                    className={cn(
                      'mx-auto max-w-2xl p-4 sm:p-6',
                      cardSurface,
                      bodyClass
                    )}
                  >
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

const OverviewTab: React.FC<{
  profile: FullProfileData;
  isRetro: boolean;
  accentColor: string;
  secondaryAccent: string;
  cardSurface: string;
  subtleCardSurface: string;
  bodyClass: string;
}> = ({
  profile,
  isRetro,
  accentColor,
  secondaryAccent,
  cardSurface,
  subtleCardSurface,
  bodyClass,
}) => {
  const levelProgress = Math.min(100, ((profile.xp % 1000) / 1000) * 100);

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2', bodyClass)}>
      <div className={cn('p-4 sm:p-6', cardSurface)}>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3
              className={cn(
                'mb-1 text-[10px] uppercase tracking-[0.3em] sm:text-xs',
                isRetro ? 'text-[#39FF14]' : 'text-slate-400'
              )}
            >
              Total Experience
            </h3>
            <div className="text-xl font-bold text-white sm:text-2xl">
              {profile.xp.toLocaleString()} XP
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[10px] font-bold italic sm:text-xs"
              style={{ color: secondaryAccent }}
            >
              REACH LVL {profile.level + 1}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'relative h-3 overflow-hidden sm:h-4',
            isRetro
              ? 'rounded-none border-2 border-[#39FF14]/40 bg-black/60'
              : 'rounded-full border border-white/10 bg-black/40'
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress}%` }}
            className="h-full"
            style={{
              background: isRetro
                ? accentColor
                : 'linear-gradient(90deg, rgba(34,211,238,1) 0%, rgba(14,165,233,1) 100%)',
              boxShadow: `0 0 18px ${accentColor}40`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-white/80 sm:text-[10px]">
            {profile.xp % 1000} / 1000
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <SummaryCard
          icon={<Trophy size={18} color={secondaryAccent} />}
          label="Achievements"
          value={`${profile.achievements.unlocked.length}/${profile.achievements.all.length}`}
          isRetro={isRetro}
          bodyClass={bodyClass}
          cardSurface={subtleCardSurface}
          accentColor={accentColor}
        />
        <SummaryCard
          icon={<Coins size={18} color={secondaryAccent} />}
          label="Gold Balance"
          value={profile.stats.goldBalance.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          cardSurface={subtleCardSurface}
          accentColor={secondaryAccent}
        />
        <SummaryCard
          icon={<Target size={18} color={accentColor} />}
          label="Total Kills"
          value={profile.stats.totalKills.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          cardSurface={subtleCardSurface}
          accentColor={accentColor}
        />
        <SummaryCard
          icon={<Clock size={18} color={accentColor} />}
          label="Games Played"
          value={profile.stats.totalGames.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          cardSurface={subtleCardSurface}
          accentColor={secondaryAccent}
        />
      </div>

      <div className="col-span-1 md:col-span-2">
        <h3
          className={cn(
            'mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] sm:mb-4 sm:text-xs',
            isRetro ? 'text-[#39FF14]' : 'text-slate-400'
          )}
        >
          <ShieldCheck size={16} /> Latest Unlocks
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {profile.achievements.unlocked.slice(0, 3).map(unlock => {
            const def = profile.achievements.all.find(
              a => a.id === unlock.achievementId
            );
            return (
              <div
                key={unlock.id}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3',
                  subtleCardSurface,
                  bodyClass
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded sm:h-10 sm:w-10',
                    isRetro
                      ? 'bg-[#39FF14]/10 text-[#39FF14]'
                      : 'bg-yellow-500/10 text-yellow-400'
                  )}
                >
                  <Trophy size={16} />
                </div>
                <div className="min-w-0">
                  <div className="max-w-[140px] truncate text-[11px] font-bold text-white sm:text-xs">
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
            <div
              className={cn(
                'py-4 text-center text-sm italic sm:col-span-3',
                isRetro ? 'text-[#DCDCDC]' : 'text-slate-500'
              )}
            >
              No achievements unlocked yet. Get out there, survivor!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatsTab: React.FC<{
  profile: FullProfileData;
  isRetro: boolean;
  accentColor: string;
  secondaryAccent: string;
  cardSurface: string;
  subtleCardSurface: string;
  bodyClass: string;
}> = ({
  profile,
  isRetro,
  accentColor,
  secondaryAccent,
  cardSurface,
  subtleCardSurface,
  bodyClass,
}) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <div className={cn('space-y-4 sm:space-y-6', bodyClass)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatItem
          icon={<Target size={16} color={secondaryAccent} />}
          label="Total Kills"
          value={profile.stats.totalKills.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={secondaryAccent}
        />
        <StatItem
          icon={<Crosshair size={16} color={accentColor} />}
          label="Max Kills (Match)"
          value={profile.stats.maxKills.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={accentColor}
        />
        <StatItem
          icon={<Timer size={16} color={secondaryAccent} />}
          label="Survival Time"
          value={formatTime(profile.stats.totalSurvivalTime)}
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={secondaryAccent}
        />
        <StatItem
          icon={<Clock size={16} color={accentColor} />}
          label="Best Survival"
          value={formatTime(profile.stats.maxSurvivalTime)}
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={accentColor}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatItem
          icon={<Coins size={16} color={secondaryAccent} />}
          label="Gold Earned (Total)"
          value={profile.stats.totalGoldEarned.toLocaleString()}
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={secondaryAccent}
        />
        <StatItem
          icon={<BarChart3 size={16} color={accentColor} />}
          label="Average Kills/Match"
          value={
            profile.stats.totalGames > 0
              ? (profile.stats.totalKills / profile.stats.totalGames).toFixed(1)
              : '0'
          }
          isRetro={isRetro}
          bodyClass={bodyClass}
          subtleCardSurface={subtleCardSurface}
          accentColor={accentColor}
        />
      </div>

      <div className={cn('p-4 text-center sm:p-6', cardSurface)}>
        <BarChart3
          className="mx-auto mb-2"
          size={32}
          style={{
            color: accentColor,
            filter: 'drop-shadow(0 0 8px rgba(57,255,20,0.35))',
          }}
        />
        <h3 className="mb-1 font-bold uppercase tracking-wider text-white">
          Combat Analytics
        </h3>
        <p className="mx-auto max-w-sm text-xs text-slate-400 sm:text-sm">
          Your killing efficiency is in the top 15% of all survivors. Maintain your
          momentum for better rewards.
        </p>
      </div>
    </div>
  );
};

const AchievementsTab: React.FC<{
  profile: FullProfileData;
  isRetro: boolean;
  bodyClass: string;
  cardSurface: string;
  subtleCardSurface: string;
  accentColor: string;
}> = ({ profile, isRetro, bodyClass, cardSurface, subtleCardSurface, accentColor }) => {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 pb-6 sm:grid-cols-2 sm:gap-4 sm:pb-8 lg:grid-cols-3',
        bodyClass
      )}
    >
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
              'relative flex flex-col p-3 transition-all sm:p-4',
              isUnlocked ? cardSurface : cn(subtleCardSurface, 'opacity-60 grayscale'),
              bodyClass
            )}
          >
            <div className="mb-3 flex items-start justify-between">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg sm:h-12 sm:w-12',
                  isUnlocked
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-800 text-slate-500'
                )}
              >
                <Trophy size={20} />
              </div>
              {isUnlocked && (
                <div
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter',
                    isRetro ? 'bg-[#39FF14] text-black' : 'bg-yellow-500 text-black'
                  )}
                >
                  Unlocked
                </div>
              )}
            </div>

            <h4 className="mb-1 text-sm font-bold text-white">{ach.name}</h4>
            <p className="mb-4 flex-1 text-[10px] leading-tight text-slate-400 sm:text-[11px]">
              {ach.description}
            </p>

            <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
              <span className="font-mono" style={{ color: accentColor }}>
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

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  isRetro: boolean;
  bodyClass: string;
  cardSurface: string;
  accentColor: string;
}> = ({ icon, label, value, isRetro, bodyClass, cardSurface, accentColor }) => (
  <div
    className={cn('flex flex-col justify-center p-3 sm:p-4', cardSurface, bodyClass)}
  >
    <div
      className={cn(
        'mb-1 flex items-center gap-2 text-[9px] uppercase tracking-wide sm:text-[10px] sm:tracking-wider',
        isRetro ? 'text-[#39FF14]' : 'text-slate-400'
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </div>
    <div
      className="font-mono text-base font-black leading-none sm:text-lg"
      style={{ color: accentColor }}
    >
      {value}
    </div>
  </div>
);

const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  isRetro: boolean;
  bodyClass: string;
  subtleCardSurface: string;
  accentColor: string;
}> = ({ icon, label, value, isRetro, bodyClass, subtleCardSurface, accentColor }) => (
  <div className={cn('p-3 sm:p-4', subtleCardSurface, bodyClass)}>
    <div
      className={cn(
        'mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wide sm:text-[10px] sm:tracking-[0.3em]',
        isRetro ? 'text-[#39FF14]' : 'text-slate-400'
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
    </div>
    <div
      className="font-mono text-lg font-bold sm:text-xl"
      style={{ color: accentColor }}
    >
      {value}
    </div>
  </div>
);
