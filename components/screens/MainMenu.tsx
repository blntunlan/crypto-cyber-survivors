import React from 'react';
import { MarketPosition } from '../../types';

interface MainMenuProps {
    price: number;
    onStart: (choice: MarketPosition) => void;
    onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ price, onStart, onOpenSettings }) => {
    return (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
            <div className="max-w-xl w-full text-center space-y-12">
                <header className="space-y-4">
                    <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                        CRYPTO
                        <br />
                        <span className="text-yellow-500">SURVIVORS</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
                        Market Sentiment Engine
                    </p>
                </header>

                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl space-y-8">
                    <div className="text-5xl font-black text-white tracking-tighter">
                        {price > 0
                            ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                            : 'CONNECTING...'}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <button
                            onClick={() => onStart(MarketPosition.LONG)}
                            className="flex flex-col items-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500 transition-all hover:bg-green-500/20"
                        >
                            <div className="text-4xl mb-2">📈</div>
                            <span className="font-black text-green-500 text-lg uppercase">Long</span>
                        </button>
                        <button
                            onClick={() => onStart(MarketPosition.SHORT)}
                            className="flex flex-col items-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500 transition-all hover:bg-red-500/20"
                        >
                            <div className="text-4xl mb-2">📉</div>
                            <span className="font-black text-red-500 text-lg uppercase">Short</span>
                        </button>
                    </div>

                    <button
                        onClick={onOpenSettings}
                        className="w-full py-4 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-xl border border-white/10 hover:bg-slate-700 transition-all"
                    >
                        Settings
                    </button>
                    <div className="pt-2 text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                        WASD / Arrows to Move • SPACE to Dash
                    </div>
                </div>
            </div>
        </div>
    );
};
