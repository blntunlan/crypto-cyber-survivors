import React from 'react';

interface ComboPanelProps {
    containerRef: React.RefObject<HTMLDivElement | null>;
    maxStreak: number;
    totalBonusXp: number;
}

/**
 * ComboPanel - Kill streak counter with timer bar
 * 
 * Note: Streak count, multiplier, and timer bar are updated via Direct DOM
 * manipulation from the parent's RAF loop using element IDs.
 */
export const ComboPanel: React.FC<ComboPanelProps> = ({
    containerRef,
    maxStreak,
    totalBonusXp
}) => {
    return (
        <div
            ref={containerRef}
            className="absolute bottom-24 left-1/2 z-[115] bg-black/80 md:backdrop-blur-md rounded-xl p-3 border border-white/10 min-w-[150px] shadow-2xl transition-all duration-300 ease-out flex flex-col items-center"
            style={{ opacity: 0, transform: 'translateX(-50%) translateY(20px)', willChange: 'transform, opacity' }}
        >
            {/* Stats Row */}
            <div className="flex gap-3 mb-2 text-[9px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                    <span>BEST</span>
                    <span className="tabular-nums">{maxStreak}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                    <span>BONUS</span>
                    <span className="tabular-nums">+{Math.round(totalBonusXp)}</span>
                </div>
            </div>

            {/* Timer Bar & Counter */}
            <div className="w-full">
                <div className="w-full h-1.5 bg-white/10 mb-3 rounded-full overflow-hidden p-[1px]">
                    <div
                        id="combo-timer-bar"
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 shadow-[0_0_10px_orange]"
                        style={{ width: '100%' }}
                    />
                </div>

                <div className="flex items-baseline justify-center gap-2">
                    <span
                        id="combo-streak-count"
                        className="text-4xl font-black italic tracking-tighter text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    >
                        0
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        COMBO
                    </span>
                </div>

                <div
                    id="combo-multiplier-badge"
                    className="mt-2 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-black italic tracking-tighter text-center text-xs shadow-xl"
                >
                    1.0x XP
                </div>
            </div>
        </div>
    );
};
