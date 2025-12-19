import React, { memo } from 'react';
import { Player } from '../../types';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';

interface KernelStatusProps {
    player: Player;
    smoothValues: {
        exp: number;
        damage: number;
        luck: number;
        crit: number;
        magnet: number;
        armor: number;
        area: number;
    };
}

export const KernelStatus: React.FC<KernelStatusProps> = memo(({ player, smoothValues }) => {
    const isMobile = screenService.isMobile();
    const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;

    return (
        <div className={`bg-slate-950/40 backdrop-blur-sm border border-white/5 p-3 rounded-xl flex flex-col gap-2 ${isMobile ? 'min-w-[120px]' : 'min-w-[220px]'} text-right`}>
            <div className="text-[9px] uppercase font-black tracking-[0.2em] mb-1" style={{ color: COLORS.ELECTRIC_BLUE }}>
                Kernel Status
            </div>

            <div className="flex flex-col gap-0.5">
                <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-black italic text-white leading-none tracking-tighter`}>
                    LVL {player.level}
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                        className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-100"
                        style={{ width: `${Math.min(100, expPercent)}%` }}
                    />
                </div>
            </div>

            <div className={`grid grid-cols-2 ${isMobile ? 'gap-y-0.5 gap-x-2' : 'gap-y-1 gap-x-4'} pt-2`}>
                <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-500 uppercase font-bold">DMG</span>
                    <span className="text-slate-100 font-black tabular-nums">{Math.round(smoothValues.damage)}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-500 uppercase font-bold">Luck</span>
                    <span className="text-green-400 font-black tabular-nums">+{smoothValues.luck.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-500 uppercase font-bold">Crit</span>
                    <span className="text-yellow-400 font-black tabular-nums">
                        {smoothValues.crit.toFixed(0)}%
                    </span>
                </div>
                {!isMobile && (
                    <>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 uppercase font-bold">Magnet</span>
                            <span className="text-purple-400 font-black tabular-nums">+{smoothValues.magnet}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 uppercase font-bold">Armor</span>
                            <span className="text-slate-300 font-black tabular-nums">{smoothValues.armor}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 uppercase font-bold">Area</span>
                            <span className="text-cyan-400 font-black tabular-nums">x{smoothValues.area.toFixed(1)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});
