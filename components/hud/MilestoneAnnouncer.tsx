import React, { memo } from 'react';

interface MilestoneAnnouncerProps {
    show: boolean;
    text: string;
    color: string;
}

/**
 * MilestoneAnnouncer - Big centered announcement for combo milestones.
 * Optimized for performance by avoiding expensive filters and redundant paints.
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = memo(({ show, text, color }) => {
    if (!show || !text) return null;

    return (
        <div
            key={text}
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[125] flex flex-col items-center pointer-events-none"
            style={{
                animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                willChange: 'transform, opacity'
            }}
        >
            {/* Optimized Glow: Using radial-gradient instead of expensive blur-[100px] */}
            <div
                className="absolute inset-0 -m-32 rounded-full opacity-40"
                style={{
                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                    animation: 'milestonePulse 2s ease-in-out infinite',
                    willChange: 'transform, opacity'
                }}
            />

            <div
                className="relative text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-center"
                style={{
                    color: 'white',
                    // Minimal shadow for common mobile GPUs
                    textShadow: `2px 2px 0 #000, 0 0 10px ${color}`
                }}
            >
                {text}
            </div>

            <div
                className="mt-4 px-6 py-2 bg-black/80 border rounded-2xl text-2xl font-black italic shadow-lg"
                style={{
                    color: color,
                    borderColor: color,
                    willChange: 'transform'
                }}
            >
                XP MULTIPLIER UP!
            </div>
        </div>
    );
});
