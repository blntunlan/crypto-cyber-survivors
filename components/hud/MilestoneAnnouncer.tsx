import React from 'react';

interface MilestoneAnnouncerProps {
    show: boolean;
    text: string;
    color: string;
}

/**
 * MilestoneAnnouncer - Big centered announcement for combo milestones
 */
export const MilestoneAnnouncer: React.FC<MilestoneAnnouncerProps> = ({ show, text, color }) => {
    if (!show || !text) return null;

    return (
        <div
            key={text}
            className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[125] flex flex-col items-center pointer-events-none"
            style={{ animation: 'milestoneIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
            <div
                className="absolute inset-0 -m-20 blur-[100px] rounded-full"
                style={{
                    backgroundColor: color,
                    opacity: 0.5,
                    animation: 'milestonePulse 2s ease-in-out infinite'
                }}
            />
            <div
                className="relative text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-center"
                style={{
                    color: 'white',
                    textShadow: `0 0 20px ${color}, 0 0 40px ${color}, 4px 4px 0 #000`
                }}
            >
                {text}
            </div>
            <div
                className="mt-4 px-6 py-2 bg-black border-2 rounded-2xl text-2xl font-black italic"
                style={{
                    color: color,
                    borderColor: color,
                    boxShadow: `0 0 30px ${color}66`
                }}
            >
                XP MULTIPLIER UP!
            </div>
        </div>
    );
};
