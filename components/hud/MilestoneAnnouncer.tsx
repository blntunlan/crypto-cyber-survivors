import React, { memo } from 'react';

interface MilestoneAnnouncerProps {
    show: boolean;
    text: string;
    color: string;
}

/**
 * MilestoneAnnouncer - Combo milestone announcement popup.
 * Displays below the WaveTimer with a pulsing glow effect.
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = memo(({ show, text, color }) => {
    if (!show || !text) return null;

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 z-[125] flex flex-col items-center pointer-events-none"
            style={{
                top: 'calc(6rem + env(safe-area-inset-top, 0px))',
                animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
        >
            {/* Main Milestone Text */}
            <div
                className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-center whitespace-nowrap"
                style={{
                    color: 'white',
                    textShadow: `2px 2px 0 #000, 0 0 12px ${color}`,
                }}
            >
                {text}
            </div>

            {/* XP Multiplier Badge Container */}
            <div className="relative mt-3 flex items-center justify-center">
                <div
                    className="relative px-8 py-2 bg-black/90 border-2 rounded-xl text-lg md:text-xl font-black italic flex items-center justify-center overflow-visible"
                    style={{
                        color: color,
                        borderColor: color,
                        boxShadow: `0 0 20px ${color}40`,
                    }}
                >
                    <span className="relative z-10">XP MULTIPLIER UP!</span>

                    {/* Glow Effect - Inside the badge, forced to center */}
                    <div
                        className="absolute top-1/2 left-1/2 -z-10 bg-current"
                        style={{
                            width: '140%',
                            height: '250%',
                            transform: 'translate(-50%, -50%)',
                            filter: 'blur(30px)',
                            opacity: 0.6,
                            backgroundColor: color, // Ensure it uses the prop color
                        }}
                    />
                </div>
            </div>
        </div>
    );
});
