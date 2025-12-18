import React from 'react';

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
    const duration = Date.now() - sessionStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="text-center space-y-4 max-w-sm w-full px-6 my-auto">
                <h2 className="text-6xl font-black text-white italic tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                    MARKET HALTED
                </h2>

                {/* Run Stats */}
                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Run Duration</p>
                        <p className="text-lg font-bold text-white font-mono">
                            {minutes}:{String(seconds).padStart(2, '0')}
                        </p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Total Kills</p>
                        <p className="text-lg font-bold text-white font-mono">{runStats.totalKills}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Max Combo</p>
                        <p className="text-lg font-bold text-white font-mono">{runStats.maxStreak}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Bonus XP</p>
                        <p className="text-lg font-bold text-white font-mono">{Math.floor(runStats.totalBonusXp)}</p>
                    </div>
                </div>

                <button
                    onClick={onResume}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-lg hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    Resume Session
                </button>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onRestart}
                        className="py-3 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-lg border border-white/10 hover:bg-red-600 transition-all"
                    >
                        Restart
                    </button>
                    <button
                        onClick={onMainMenu}
                        className="py-3 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-lg border border-white/10 hover:bg-slate-700 transition-all"
                    >
                        Main Menu
                    </button>
                </div>

                <button
                    onClick={onOpenSettings}
                    className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-white/10"
                >
                    Settings
                </button>

                <button
                    onClick={onToggleMute}
                    className="w-full py-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all underline underline-offset-4 decoration-white/10"
                >
                    Quick Mute: {isMuted ? 'OFF' : 'ON'}
                </button>

                <p className="pt-4 text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">
                    SESSION ENCRYPTED // TRADING HALTED
                </p>
            </div>
        </div>
    );
};
