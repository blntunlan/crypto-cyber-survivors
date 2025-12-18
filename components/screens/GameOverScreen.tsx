import React from 'react';
import { COLORS } from '../../constants';

interface GameOverScreenProps {
    level: number;
    finalPnl: number;
    onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ level, finalPnl, onRestart }) => {
    return (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center text-center p-4 overflow-y-auto">
            <h2 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter mb-4 my-auto">
                LIQUIDATED
            </h2>
            <div className="bg-slate-900/50 border border-red-500/30 p-6 md:p-10 rounded-2xl space-y-6 max-w-md w-full mb-auto">
                <div className="grid grid-cols-2 gap-8 text-left">
                    <div>
                        <p className="text-slate-500 text-[10px] font-black uppercase">Level</p>
                        <p className="text-4xl font-black text-white">L{level}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-[10px] font-black uppercase">P&L</p>
                        <p
                            className={`text-4xl font-black ${finalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}
                            style={{ color: finalPnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE }}
                        >
                            {(finalPnl * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
                <button
                    onClick={onRestart}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-lg hover:bg-yellow-500 transition-all"
                >
                    Back to Terminal
                </button>
            </div>
        </div>
    );
};
