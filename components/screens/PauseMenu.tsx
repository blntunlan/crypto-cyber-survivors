import React from 'react';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { IconSettings, IconVolume, IconVolumeMuted } from '../icons/CardIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { TimeService } from '../../services/core/TimeService';

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

  const containerClasses = isRetro
    ? `fixed inset-0 z-[${Z_LAYERS.PAUSE_MENU}] bg-black/90 flex items-center justify-center p-4 overflow-y-auto allow-scroll`
    : `fixed inset-0 z-[${Z_LAYERS.PAUSE_MENU}] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 pb-[env(safe-area-inset-bottom,16px)] overflow-y-auto allow-scroll animate-fade-in`;

  return (
    <div className={containerClasses}>
      <div
        className={`text-center space-y-4 max-w-sm w-full p-6 md:p-8 my-auto transition-all ${sizes.gap} ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] md:shadow-[0_0_60px_rgba(0,255,255,0.15),0_0_100px_rgba(0,0,0,0.6)] md:border md:border-cyan-500/20'
        }`}
      >
        <h2
          className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.heading} font-black text-white italic tracking-tighter mb-6 ${isRetro ? '' : 'bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500'}`}
          style={{
            textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : 'none',
          }}
        >
          {t('common.paused')}
        </h2>

        {/* Pause Budget Timer - Competitive Mode Only */}
        {isLimited && (
          <div
            className={`p-4 mb-4 transition-all ${
              isRetro
                ? `rounded-none border-4 ${isLowBudget ? 'border-red-600 bg-red-900/40' : 'border-yellow-500 bg-yellow-900/30'}`
                : `rounded-xl ${isLowBudget ? 'bg-red-500/20 border-2 border-red-500/50 animate-pulse' : 'bg-yellow-500/10 border border-yellow-500/30'}`
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`${sizes.tiny} font-black uppercase tracking-widest ${isRetro ? 'font-retro-text' : ''}`}
                style={{
                  color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW,
                }}
              >
                ⏱ {t('common.auto_resume')}
              </span>

              <span
                className={`${sizes.heading} font-black font-stats tabular-nums ${isRetro ? 'font-retro-pixel' : ''}`}
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
                  ? 'bg-zinc-800 rounded-none border border-zinc-600'
                  : 'bg-slate-800/50 rounded-full'
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
          className={`grid grid-cols-2 gap-3 md:${sizes.gap} p-3 md:${sizes.cardPadding} mb-4 md:mb-6 transition-all ${
            isRetro
              ? `bg-[#0a0a0a] border-2 border-[var(--color-primary)]/20 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]`
              : 'bg-slate-900/60 border border-[var(--color-primary)]/10 rounded-xl md:bg-gradient-to-br md:from-slate-900/70 md:to-slate-950/80 md:border-cyan-500/15 md:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
          }`}
        >
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold md:font-black uppercase tracking-wide md:tracking-wider opacity-60 md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.duration')}
            </p>
            <p
              className={`${sizes.stat} font-bold text-white font-stats leading-tight ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {minutes}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold md:font-black uppercase tracking-wide md:tracking-wider opacity-60 md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.game_over_screen.kills')}
            </p>
            <p
              className={`${sizes.stat} font-bold text-white font-stats leading-tight ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {runStats.totalKills}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold md:font-black uppercase tracking-wide md:tracking-wider opacity-60 md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.combo')}
            </p>
            <p
              className={`${sizes.stat} font-bold text-white font-stats leading-tight ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {runStats.maxStreak}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.small} md:${sizes.tiny} font-semibold md:font-black uppercase tracking-wide md:tracking-wider opacity-60 md:opacity-50 ${isRetro ? 'font-retro-text' : ''}`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              {t('common.bonus')}
            </p>
            <p
              className={`${sizes.stat} font-bold text-white font-stats leading-tight ${isRetro ? 'font-retro-pixel' : ''}`}
            >
              {Math.floor(runStats.totalBonusXp)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className={`w-full ${sizes.buttonLg} min-h-[52px] font-black uppercase tracking-widest transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
              isRetro
                ? 'font-retro-pixel text-white rounded-none border-4 border-emerald-400 border-b-[6px] border-b-emerald-900 active:translate-y-1 active:border-b-4'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] active:shadow-[0_0_30px_rgba(16,185,129,0.4)] md:hover:shadow-[0_0_30px_rgba(16,185,129,0.4),0_0_60px_rgba(16,185,129,0.2)] md:hover:scale-[1.02]'
            }`}
            style={{ backgroundColor: isRetro ? COLORS.CASINO_GREEN : undefined }}
          >
            {t('common.resume')}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onRestart}
              className={`${sizes.buttonMd} min-h-[48px] font-black uppercase tracking-widest transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRetro
                  ? 'font-retro-pixel text-white rounded-none border-4 border-red-400 border-b-[6px] border-b-red-900 active:translate-y-1 active:border-b-4'
                  : 'bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 hover:bg-red-600 hover:text-white md:hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] md:hover:scale-[1.02]'
              }`}
              style={{ backgroundColor: isRetro ? COLORS.CASINO_RED : undefined }}
            >
              {t('common.restart')}
            </button>

            <button
              onClick={onMainMenu}
              className={`${sizes.buttonMd} min-h-[48px] font-black uppercase tracking-widest transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRetro
                  ? 'font-retro-pixel bg-zinc-800 text-white rounded-none border-4 border-zinc-600 border-b-[6px] border-b-zinc-900 active:translate-y-1 active:border-b-4'
                  : 'bg-slate-800 text-white rounded-xl border border-white/10 hover:bg-slate-700 md:hover:border-white/20 md:hover:scale-[1.02]'
              }`}
            >
              {t('common.back')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenSettings}
              className={`w-full min-h-[48px] py-3 font-black uppercase ${sizes.small} tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRetro
                  ? 'font-retro-text bg-zinc-800 text-white rounded-none border-2 border-zinc-600 border-b-4 border-b-zinc-900 active:translate-y-1 active:border-b-2'
                  : 'bg-slate-800/50 text-slate-400 rounded-xl border border-white/5 hover:bg-slate-700 hover:text-white md:hover:border-cyan-500/20 md:hover:scale-[1.02]'
              }`}
            >
              <IconSettings
                className="w-5 h-5"
                color={isRetro ? '#ffd600' : 'currentColor'}
              />
              <span>{t('common.settings')}</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`w-full min-h-[48px] py-3 font-black uppercase ${sizes.small} tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRetro
                  ? 'font-retro-text bg-zinc-800 text-white rounded-none border-2 border-zinc-600 border-b-4 border-b-zinc-900 active:translate-y-1 active:border-b-2'
                  : 'bg-slate-800/50 text-slate-400 rounded-xl border border-white/5 hover:bg-slate-700 hover:text-white md:hover:border-cyan-500/20 md:hover:scale-[1.02]'
              }`}
            >
              {isMuted ? (
                <>
                  <IconVolumeMuted
                    className="w-5 h-5"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>{t('settings.muted')}</span>
                </>
              ) : (
                <>
                  <IconVolume
                    className="w-5 h-5"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>{t('settings.audio')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p
          className={`pt-4 ${isRetro ? 'text-zinc-500 font-retro-text' : 'text-slate-500'} ${sizes.tiny} font-black uppercase tracking-[0.3em]`}
        >
          {isRetro ? t('common.game_stopped') : t('common.session_halted')}
        </p>
      </div>
    </div>
  );
};
