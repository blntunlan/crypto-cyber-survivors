import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { DifficultyManager } from '../../services/DifficultyManager';
import { ComboSystem } from '../../services/ComboSystem';
import { COLORS } from '../../constants';

interface AccountHealthProps {
    hpPercent: number;
}

const DesktopHealth: React.FC<AccountHealthProps> = ({ hpPercent }) => (
    <div
        className="fixed left-1/2 -translate-x-1/2 w-96 text-center"
        style={{ bottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Wave</span>
                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${getWaveColor(DifficultyManager.getWavePhase())}`}>
                    {DifficultyManager.getWavePhase()}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Streak</span>
                <span
                    className="text-xs font-black px-2 py-0.5 rounded tabular-nums"
                    style={{
                        backgroundColor: (ComboSystem.getKillStreak() >= 5 ? ComboSystem.getCurrentMilestone()?.color : '#334155') + '33',
                        color: ComboSystem.getKillStreak() >= 5 ? ComboSystem.getCurrentMilestone()?.color : '#cbd5e1'
                    }}
                >
                    🔥 {ComboSystem.getKillStreak()}
                </span>
            </div>
        </div>

        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1 tracking-[0.2em]">
            <span>Margin integrity</span>
            <span className={`tabular-nums ${hpPercent < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                {Math.ceil(hpPercent)}%
            </span>
        </div>
        <div className="h-2 w-full bg-slate-950/80 rounded-full border border-white/5 overflow-hidden p-0.5">
            <div
                className="h-full transition-all duration-150 rounded-full"
                style={{
                    width: `${hpPercent}%`,
                    backgroundColor: hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN,
                    boxShadow: `0 0 10px ${hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN}44`
                }}
            />
        </div>
    </div>
);

const MobileHealth: React.FC<AccountHealthProps> = ({ hpPercent }) => (
    <div
        className="fixed left-1/2 -translate-x-1/2 w-[85%] max-w-sm text-center"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
        {/* Compact Wave Indicator */}
        <div className="flex justify-center mb-2">
            <div className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md ${getWaveColor(DifficultyManager.getWavePhase())}`}>
                {DifficultyManager.getWavePhase()} PHASE
            </div>
        </div>

        <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest px-1">
            <span>MARGIN INTEGRITY</span>
            <span className={hpPercent < 30 ? 'text-red-400 animate-pulse' : 'text-white'}>
                {Math.ceil(hpPercent)}%
            </span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
            <div
                className="h-full transition-all duration-300"
                style={{
                    width: `${hpPercent}%`,
                    backgroundColor: hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN,
                    boxShadow: `0 0 8px ${hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN}66`
                }}
            />
        </div>
    </div>
);

const getWaveColor = (phase: string) => {
    switch (phase) {
        case 'calm': return 'bg-blue-500/20 text-blue-400';
        case 'building': return 'bg-yellow-500/20 text-yellow-400';
        case 'intense': return 'bg-orange-500/20 text-orange-400';
        default: return 'bg-red-500/20 text-red-400';
    }
};

export const AccountHealth: React.FC<AccountHealthProps> = memo((props) => {
    const [isMobile, setIsMobile] = useState(screenService.isMobile());

    useEffect(() => {
        const unsubscribe = screenService.onChange(() => {
            setIsMobile(screenService.isMobile());
        });
        return unsubscribe;
    }, []);

    return isMobile ? <MobileHealth {...props} /> : <DesktopHealth {...props} />;
});
