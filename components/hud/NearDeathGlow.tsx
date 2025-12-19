import React from 'react';

/**
 * NearDeathGlow - Red screen edge glow when HP is low
 * 
 * Note: Opacity is controlled via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'near-death-glow'
 */
export const NearDeathGlow: React.FC = () => {
    return (
        <div
            id="near-death-glow"
            className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(239,68,68,0.8)] z-[101]"
            style={{ opacity: 0, transition: 'opacity 0.2s ease-out' }}
        />
    );
};
