import React from 'react';

interface LevelUpFlashProps {
    intensity: number;
}

/**
 * LevelUpFlash - White flash overlay on level up
 */
export const LevelUpFlash: React.FC<LevelUpFlashProps> = ({ intensity }) => {
    return (
        <div
            className="absolute inset-0 bg-white z-[120] pointer-events-none transition-opacity duration-500 ease-out"
            style={{ opacity: intensity > 0 ? 0.3 : 0 }}
        />
    );
};
