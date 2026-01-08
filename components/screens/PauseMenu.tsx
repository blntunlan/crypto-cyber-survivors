import React from 'react';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useIsRetro } from '../../contexts/useTheme';
import { COLORS } from '../../constants';

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
}) => {
  const sizes = useThemeSize();
  const isRetro = useIsRetro();
  const duration = Date.now() - sessionStartTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  const containerClasses = isRetro
    ? 'fixed inset-0 z-[2100] bg-black/90 flex items-center justify-center p-4 overflow-y-auto'
    : 'fixed inset-0 z-[2100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto';

  return (
    <div className={containerClasses}>
      <div className={`text-center space-y-4 max-w-sm w-full px-6 my-auto ${sizes.gap}`}>
        <h2
          className={`${sizes.title} font-black text-white italic tracking-tighter mb-4 ${isRetro ? '' : 'bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500'}`}
          style={{
            textShadow: isRetro ? `4px 4px 0px #000000, 8px 8px 0px rgba(255,255,255,0.1)` : 'none',
          }}
        >
          PAUSED
        </h2>

        {/* Run Stats */}
        <div
          className={`${isRetro ? 'bg-zinc-900 border-4 border-white rounded-none' : 'bg-slate-900/50 border border-white/5 rounded-xl'} ${sizes.cardPadding} mb-6 grid grid-cols-2 ${sizes.gap}`}
        >
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider`}
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
              className={`${sizes.tiny} font-black uppercase tracking-wider`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Kills
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>{runStats.totalKills}</p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Combo
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>{runStats.maxStreak}</p>
          </div>
          <div className="text-left">
            <p
              className={`${sizes.tiny} font-black uppercase tracking-wider`}
              style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
            >
              Bonus
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {Math.floor(runStats.totalBonusXp)}
            </p>
          </div>
        </div>

        <button
          onClick={onResume}
          className={`w-full ${sizes.buttonLg} font-black uppercase tracking-widest transition-all ${isRetro ? 'text-black rounded-none border-b-4 border-yellow-700 active:translate-y-1 active:border-b-0' : 'bg-white text-black rounded-lg hover:bg-yellow-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
          style={{ backgroundColor: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
        >
          Resume
        </button>

        <div className={`grid grid-cols-2 ${sizes.gap}`}>
          <button
            onClick={onRestart}
            className={`${sizes.buttonMd} font-black uppercase tracking-widest transition-all ${isRetro ? 'text-white rounded-none border-b-4 border-red-900 active:translate-y-1 active:border-b-0' : 'bg-slate-800 text-white rounded-lg border border-white/10 hover:bg-red-600'}`}
            style={{ backgroundColor: isRetro ? COLORS.CASINO_RED : undefined }}
          >
            Restart
          </button>
          <button
            onClick={onMainMenu}
            className={`${sizes.buttonMd} font-black uppercase tracking-widest transition-all ${isRetro ? 'bg-zinc-700 text-white rounded-none border-b-4 border-zinc-900 active:translate-y-1 active:border-b-0' : 'bg-slate-800 text-white rounded-lg border border-white/10 hover:bg-slate-700'}`}
          >
            Menu
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className={`w-full py-2 font-bold uppercase ${sizes.tiny} tracking-widest hover:text-white transition-all underline underline-offset-4 ${isRetro ? 'decoration-yellow-400/30' : 'text-slate-400 decoration-white/10'}`}
          style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
        >
          Settings
        </button>

        <button
          onClick={onToggleMute}
          className={`w-full py-2 font-bold uppercase ${sizes.tiny} tracking-widest hover:text-white transition-all underline underline-offset-4 ${isRetro ? 'decoration-yellow-400/30' : 'text-slate-400 decoration-white/10'}`}
          style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : undefined }}
        >
          Mute: {isMuted ? 'OFF' : 'ON'}
        </button>

        <p
          className={`pt-4 ${isRetro ? 'text-zinc-500' : 'text-slate-500'} ${sizes.tiny} font-black uppercase tracking-[0.3em]`}
        >
          {isRetro ? '::: GAME STOPPED :::' : 'SESSION ENCRYPTED // TRADING HALTED'}
        </p>
      </div>
    </div>
  );
};
