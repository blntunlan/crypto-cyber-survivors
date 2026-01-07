import React from 'react';
import { useThemeSize } from '../../hooks/useThemeSize';

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
  const duration = Date.now() - sessionStartTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-[2100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className={`text-center space-y-4 max-w-sm w-full px-6 my-auto ${sizes.gap}`}>
        <h2
          className={`${sizes.title} font-black text-white italic tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500`}
        >
          MARKET HALTED
        </h2>

        {/* Run Stats */}
        <div
          className={`bg-slate-900/50 border border-white/5 rounded-xl ${sizes.cardPadding} mb-6 grid grid-cols-2 ${sizes.gap}`}
        >
          <div className="text-left">
            <p className={`${sizes.tiny} text-slate-500 font-black uppercase tracking-wider`}>
              Run Duration
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {minutes}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <div className="text-left">
            <p className={`${sizes.tiny} text-slate-500 font-black uppercase tracking-wider`}>
              Total Kills
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>{runStats.totalKills}</p>
          </div>
          <div className="text-left">
            <p className={`${sizes.tiny} text-slate-500 font-black uppercase tracking-wider`}>
              Max Combo
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>{runStats.maxStreak}</p>
          </div>
          <div className="text-left">
            <p className={`${sizes.tiny} text-slate-500 font-black uppercase tracking-wider`}>
              Bonus XP
            </p>
            <p className={`${sizes.stat} font-bold text-white font-stats`}>
              {Math.floor(runStats.totalBonusXp)}
            </p>
          </div>
        </div>

        <button
          onClick={onResume}
          className={`w-full ${sizes.buttonLg} bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]`}
        >
          Resume Session
        </button>

        <div className={`grid grid-cols-2 ${sizes.gap}`}>
          <button
            onClick={onRestart}
            className={`${sizes.buttonMd} bg-slate-800 text-white font-black uppercase tracking-widest rounded-lg border border-white/10 hover:bg-red-600 transition-all`}
          >
            Restart
          </button>
          <button
            onClick={onMainMenu}
            className={`${sizes.buttonMd} bg-slate-800 text-white font-black uppercase tracking-widest rounded-lg border border-white/10 hover:bg-slate-700 transition-all`}
          >
            Main Menu
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className={`w-full py-2 text-slate-400 font-bold uppercase ${sizes.tiny} tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-white/10`}
        >
          Settings
        </button>

        <button
          onClick={onToggleMute}
          className={`w-full py-2 text-slate-400 font-bold uppercase ${sizes.tiny} tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-white/10`}
        >
          Quick Mute: {isMuted ? 'OFF' : 'ON'}
        </button>

        <p className={`pt-4 text-slate-500 ${sizes.tiny} font-black uppercase tracking-[0.3em]`}>
          SESSION ENCRYPTED // TRADING HALTED
        </p>
      </div>
    </div>
  );
};
