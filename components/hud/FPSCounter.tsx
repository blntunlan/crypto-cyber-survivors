import React from 'react';

/**
 * FPSCounter - Development-only FPS display
 * 
 * Note: The actual FPS value is updated via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'fps-counter'
 */
export const FPSCounter: React.FC = () => {
    // Only render in development mode
    if (!import.meta.env.DEV) return null;

    return (
        <div className="absolute top-2 left-2 z-[110]">
            <div
                id="fps-counter"
                className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-green-500/80 text-white shadow-lg"
            >
                -- FPS
            </div>
        </div>
    );
};
