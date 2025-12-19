import React from 'react';

interface WaveTimerProps {
    className?: string;
}

/**
 * WaveTimer - Displays survival time counter
 * 
 * Note: The actual time value is updated via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'wave-timer-text'
 */
export const WaveTimer: React.FC<WaveTimerProps> = ({ className = '' }) => {
    return (
        <div
            className={`absolute left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center ${className}`}
            style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-1">
                Survival Time
            </div>
            <div
                id="wave-timer-text"
                className="text-3xl font-black italic tracking-tighter text-white drop-shadow-lg tabular-nums"
            >
                0:00
            </div>
        </div>
    );
};
