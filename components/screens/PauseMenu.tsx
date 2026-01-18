import React from 'react';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';
import { Z_LAYERS } from '../../constants/ZIndex';
import { IconSettings, IconVolume, IconVolumeMuted } from '../icons/CardIcons';

interface PauseMenuProps {
  sessionStartTime: number;
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
  sessionStartTime,
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
  const duration = Date.now() - sessionStartTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  // Calculate pause budget percentage
  const pausePercentage =
    pauseSecondsRemaining !== null && pauseSecondsRemaining !== undefined
      ? (pauseSecondsRemaining / pauseSecondsMax) * 100
      : 100;
  const isLimited =
    pauseSecondsRemaining !== null && pauseSecondsRemaining !== undefined;
  const isLowBudget = isLimited && pauseSecondsRemaining <= 3;

  const containerClasses = isRetro
    ? `fixed inset-0 z-[${Z_LAYERS.PAUSE_MENU}] bg-black/90 flex items-center justify-center p-4 overflow-y-auto`
    : `fixed inset-0 z-[${Z_LAYERS.PAUSE_MENU}] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto`;

  return (
    <div className={containerClasses}>
      <div
        className={`text-center space-y-4 max-w-sm w-full p-6 md:p-8 my-auto transition-all ${sizes.gap} ${
          isRetro
            ? 'bg-zinc-900 border-4 border-[var(--color-primary)] rounded-none'
            : 'cyber-glass rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
        }`}
      >
        <h2
          className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.heading} font-black text-white italic tracking-tighter mb-6 ${isRetro ? '' : 'bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500'}`}
          style={{
            textShadow: isRetro ? `4px 4px 0px ${COLORS.SLOT_BLACK}` : 'none',
          }}
        >
          PAUSED
        </h2>

        {/* Pause Budget Timer - Competitive Mode Only */}
        {isLimited && (
          <div
            className={`p-4 mb-4 rounded-xl transition-all ${
              isLowBudget
                ? 'bg-red-500/20 border-2 border-red-500/50 animate-pulse'
                : 'bg-yellow-500/10 border border-yellow-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`${sizes.tiny} font-black uppercase tracking-widest`}
                style={{
                  color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW,
                }}
              >
                ⏱ Auto-Resume In
              </span>
              <span
                className={`${sizes.heading} font-black font-stats tabular-nums`}
                style={{
                  color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW,
                }}
              >
                {Math.ceil(pauseSecondsRemaining)}s
              </span>
            </div>
            {/* Progress bar */}
            <div
              className={`h-2 w-full rounded-full overflow-hidden ${
                isRetro ? 'bg-zinc-800' : 'bg-slate-800/50'
              }`}
            >
              <div
                className={`h-full transition-all duration-100 ${
                  isLowBudget ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${pausePercentage}%` }}
              />
            </div>
            <p
              className={`${sizes.tiny} mt-2 opacity-60`}
              style={{ color: isLowBudget ? COLORS.CASINO_RED : COLORS.JACKPOT_YELLOW }}
            >
              COMPETITIVE MODE - Limited Pause
            </p>
          </div>
        )}

        {/* Run Stats */}
        <div
          className={`grid grid-cols-2 ${sizes.gap} ${sizes.cardPadding} mb-6 transition-all ${
            isRetro
              ? `bg-[#0a0a0a] border-2 border-[var(--color-primary)]/20 rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)]`
              : 'bg-slate-900/60 border border-[var(--color-primary)]/10 rounded-xl'
          }`}
        >
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider opacity-50`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Duration
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {minutes}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider opacity-50`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Kills
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {runStats.totalKills}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider opacity-50`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Combo
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {runStats.maxStreak}
            </p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider opacity-50`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Bonus
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {Math.floor(runStats.totalBonusXp)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={onResume}
            className={`w-full ${sizes.buttonLg} font-black uppercase tracking-widest transition-all ${
              isRetro
                ? 'text-white rounded-none border-b-4 border-emerald-900 active:translate-y-1 active:border-b-0'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
            }`}
            style={{ backgroundColor: isRetro ? COLORS.CASINO_GREEN : undefined }}
          >
            Resume
          </button>

          <div className={`grid grid-cols-2 ${sizes.gap}`}>
            <button
              onClick={onRestart}
              className={`${sizes.buttonMd} font-black uppercase tracking-widest transition-all ${
                isRetro
                  ? 'text-white rounded-none border-b-4 border-red-900 active:translate-y-1 active:border-b-0'
                  : 'bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white'
              }`}
              style={{ backgroundColor: isRetro ? COLORS.CASINO_RED : undefined }}
            >
              Restart
            </button>
            <button
              onClick={onMainMenu}
              className={`${sizes.buttonMd} font-black uppercase tracking-widest transition-all ${
                isRetro
                  ? 'bg-zinc-800 text-white rounded-none border-b-4 border-black active:translate-y-1 active:border-b-0'
                  : 'bg-slate-800 text-white rounded-lg border border-white/10 hover:bg-slate-700'
              }`}
            >
              Menu
            </button>
          </div>

          <div className={`grid grid-cols-2 ${sizes.gap}`}>
            <button
              onClick={onOpenSettings}
              className={`w-full py-3 font-black uppercase ${sizes.tiny} tracking-widest transition-all flex items-center justify-center gap-2 ${
                isRetro
                  ? 'bg-zinc-800 text-white rounded-none border-b-4 border-black active:translate-y-1 active:border-b-0'
                  : 'bg-slate-800/50 text-slate-400 rounded-lg border border-white/5 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <IconSettings
                className="w-4 h-4"
                color={isRetro ? '#ffd600' : 'currentColor'}
              />
              <span>Settings</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`w-full py-3 font-black uppercase ${sizes.tiny} tracking-widest transition-all flex items-center justify-center gap-2 ${
                isRetro
                  ? 'bg-zinc-800 text-white rounded-none border-b-4 border-black active:translate-y-1 active:border-b-0'
                  : 'bg-slate-800/50 text-slate-400 rounded-lg border border-white/5 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isMuted ? (
                <>
                  <IconVolumeMuted
                    className="w-4 h-4"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>Muted</span>
                </>
              ) : (
                <>
                  <IconVolume
                    className="w-4 h-4"
                    color={isRetro ? '#ffd600' : 'currentColor'}
                  />
                  <span>Audio</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p
          className={`pt-4 ${isRetro ? 'text-zinc-500' : 'text-slate-500'} ${sizes.tiny} font-black uppercase tracking-[0.3em]`}
        >
          {isRetro ? '::: GAME STOPPED :::' : 'SESSION ENCRYPTED // TRADING HALTED'}
        </p>
      </div>
    </div>
  );
};
