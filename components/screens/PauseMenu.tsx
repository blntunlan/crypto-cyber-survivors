import React from 'react';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { IconSettings, IconVolume, IconVolumeMuted } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { TimeService } from '../../services/core/TimeService';
import { cn } from '../../utils/classnames';
import {
  MODERN_PANEL_FRAME,
  MODERN_PANEL_INNER_BORDER,
  MODERN_PANEL_OUTER_BORDER,
  MODERN_PANEL_TOP_ACCENT,
  MODERN_SCREEN_OVERLAY,
} from '../../config/modernSurface';

interface PauseMenuProps {
  runStats: {
    totalKills: number;
    maxStreak: number;
    totalBonusXp: number;
  };
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  /** Remaining pause seconds (null = unlimited) */
  pauseSecondsRemaining?: number | null;
  /** Maximum pause seconds */
  pauseSecondsMax?: number;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  runStats,
  onResume,
  onRestart,
  onMainMenu,
  onOpenSettings,
  isMuted,
  onToggleMute,
  pauseSecondsRemaining,
  pauseSecondsMax = 10,
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  const totalSeconds = TimeService.getGameTimeSeconds();
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Calculate pause budget percentage
  const pausePercentage =
    pauseSecondsRemaining !== null && pauseSecondsRemaining !== undefined
      ? (pauseSecondsRemaining / pauseSecondsMax) * 100
      : 100;
  const isLimited =
    pauseSecondsRemaining !== null && pauseSecondsRemaining !== undefined;
  const isLowBudget = isLimited && pauseSecondsRemaining <= 3;

  const containerClasses = cn(
    'fixed inset-0 flex items-center justify-center overflow-y-auto p-4 pb-[env(safe-area-inset-bottom,16px)] allow-scroll',
    isRetro ? 'bg-black/90' : `${MODERN_SCREEN_OVERLAY} animate-fade-in`
  );

  return (
    <div className={containerClasses} style={{ zIndex: Z_LAYERS.PAUSE_MENU }}>
      <div
        className={`my-auto w-full max-w-sm space-y-4 p-6 text-center transition-all md:p-8 ${sizes.gap} ${
          isRetro
            ? 'rounded-none border-4 border-[var(--color-primary)] bg-zinc-900'
            : MODERN_PANEL_FRAME
        }`}
      >
        {!isRetro && (
          <>
            <div className={MODERN_PANEL_OUTER_BORDER} />
            <div className={MODERN_PANEL_INNER_BORDER} />
            <div className={MODERN_PANEL_TOP_ACCENT} />
          </>
        )}
        <h2
          className={`${isRetro ? 'font-retro-pixel' : 'cyber-glitch-text font-cyber'} ${sizes.heading} mb-6 font-black italic tracking-tighter text-white ${isRetro ? '' : 'bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent'}`}
          style={{
            textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : 'none',
          }}
        >
          {t('common.paused')}
        </h2>

        {/* Pause Budget Timer - Competitive Mode Only */}
        {isLimited && (
          <div
            className={`mb-4 p-4 transition-all ${
              isRetro
                ? `rounded-none border-4 ${isLowBudget ? 'border-red-600 bg-red-900/40' : 'border-yellow-500 bg-yellow-900/30'}`
                : `rounded-sm ${isLowBudget ? 'animate-pulse border-2 border-red-500/50 bg-red-500/20' : 'border border-yellow-500/30 bg-yellow-500/10'}`
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`${sizes.tiny} font-black uppercase tracking-widest ${isRetro ? 'font-retro-text' : ''}`}
                style={{
                  color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW,
                }}
              >
                ⏱ {t('common.auto_resume')}
              </span>

              <span
                className={`${sizes.heading} font-stats font-black tabular-nums ${isRetro ? 'font-retro-pixel' : ''}`}
                style={{
                  color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW,
                }}
              >
                {Math.ceil(pauseSecondsRemaining)}s
              </span>
            </div>
            {/* Progress bar */}
            <div
              className={`h-2 w-full overflow-hidden ${
                isRetro
                  ? 'rounded-none border border-zinc-600 bg-zinc-800'
                  : 'rounded-full bg-slate-800/50'
              }`}
            >
              <div
                className={`h-full transition-all duration-100 ${
                  isRetro
                    ? `rounded-none ${isLowBudget ? 'bg-red-500' : 'bg-yellow-400'}`
                    : `${isLowBudget ? 'bg-red-500' : 'bg-yellow-500'}`
                }`}
                style={{ width: `${pausePercentage}%` }}
              />
            </div>
            <p
              className={`${sizes.tiny} mt-2 opacity-60 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW }}
            >
              {t('common.limited_pause')}
            </p>
          </div>
        )}

        {/* Run Stats - Compact 2x2 grid */}
        <div
          className={cn(
            'grid grid-cols-2 gap-3 p-3 mb-4 transition-all md:mb-6',
            isRetro
              ? 'border-[var(--color-primary)]/20 rounded-none border-2 bg-[#0a0a0a] shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
              : 'border-[var(--color-primary)]/10 rounded-sm border bg-slate-900/60 md:border-cyan-500/15 md:bg-gradient-to-br md:from-slate-900/70 md:to-slate-950/80 md:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          )}
        >
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold uppercase tracking-wide opacity-60 md:font-black md:tracking-wider md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.duration')}
            </p>
            <p
              className={`${sizes.stat} font-stats font-bold leading-tight text-white ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {minutes}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold uppercase tracking-wide opacity-60 md:font-black md:tracking-wider md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.game_over_screen.kills')}
            </p>
            <p
              className={`${sizes.stat} font-stats font-bold leading-tight text-white ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {runStats.totalKills}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold uppercase tracking-wide opacity-60 md:font-black md:tracking-wider md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.combo')}
            </p>
            <p
              className={`${sizes.stat} font-stats font-bold leading-tight text-white ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {runStats.maxStreak}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold uppercase tracking-wide opacity-60 md:font-black md:tracking-wider md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.bonus')}
            </p>
            <p
              className={`${sizes.stat} font-stats font-bold leading-tight text-white ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {Math.floor(runStats.totalBonusXp)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className={`w-full ${sizes.buttonLg} min-h-[52px] font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] ${
              isRetro
                ? 'rounded-none border-4 border-b-[6px] border-emerald-400 border-b-emerald-900 font-retro-pixel text-white active:translate-y-1 active:border-b-4'
                : 'rounded-sm border border-emerald-500/30 bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500 hover:text-white active:shadow-[0_0_30px_rgba(16,185,129,0.4)] md:hover:scale-[1.02] md:hover:shadow-[0_0_30px_rgba(16,185,129,0.4),0_0_60px_rgba(16,185,129,0.2)]'
            }`}
            style={{ backgroundColor: isRetro ? COLORS.CASINO_GREEN : undefined }}
          >
            {t('common.resume')}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className={`${sizes.buttonMd} min-h-[48px] font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] ${
                isRetro
                  ? 'rounded-none border-4 border-b-[6px] border-red-400 border-b-red-900 font-retro-pixel text-white active:translate-y-1 active:border-b-4'
                  : 'rounded-sm border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white md:hover:scale-[1.02] md:hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }`}
              style={{ backgroundColor: isRetro ? COLORS.CASINO_RED : undefined }}
            >
              {t('common.restart')}
            </button>

            <button
              onClick={onMainMenu}
              className={`${sizes.buttonMd} min-h-[48px] font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] ${
                isRetro
                  ? 'rounded-none border-4 border-b-[6px] border-zinc-600 border-b-zinc-900 bg-zinc-800 font-retro-pixel text-white active:translate-y-1 active:border-b-4'
                  : 'rounded-sm border border-white/10 bg-slate-800 text-white hover:bg-slate-700 md:hover:scale-[1.02] md:hover:border-white/20'
              }`}
            >
              {t('common.back')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenSettings}
              className={`min-h-[48px] w-full py-3 font-black uppercase ${sizes.small} flex items-center justify-center gap-2 tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] ${
                isRetro
                  ? 'rounded-none border-2 border-b-4 border-zinc-600 border-b-zinc-900 bg-zinc-800 font-retro-text text-white active:translate-y-1 active:border-b-2'
                  : 'rounded-sm border border-white/5 bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white md:hover:scale-[1.02] md:hover:border-cyan-500/20'
              }`}
            >
              <IconSettings
                className="h-5 w-5"
                color={isRetro ? '#ffd600' : 'currentColor'}
              />
              <span>{t('common.settings')}</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`min-h-[48px] w-full py-3 font-black uppercase ${sizes.small} flex items-center justify-center gap-2 tracking-widest transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] ${
                isRetro
                  ? 'rounded-none border-2 border-b-4 border-zinc-600 border-b-zinc-900 bg-zinc-800 font-retro-text text-white active:translate-y-1 active:border-b-2'
                  : 'rounded-sm border border-white/5 bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white md:hover:scale-[1.02] md:hover:border-cyan-500/20'
              }`}
            >
              {isMuted ? (
                <>
                  <IconVolumeMuted
                    className="h-5 w-5"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>{t('settings.muted')}</span>
                </>
              ) : (
                <>
                  <IconVolume
                    className="h-5 w-5"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>{t('settings.audio')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p
          className={`pt-4 ${isRetro ? 'font-retro-text text-zinc-500' : 'text-slate-500'} ${sizes.tiny} font-black uppercase tracking-[0.3em]`}
        >
          {isRetro ? t('common.game_stopped') : t('common.session_halted')}
        </p>
      </div>
    </div>
  );
};
