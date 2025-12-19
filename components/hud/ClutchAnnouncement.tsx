import React from 'react';

interface ClutchAnnouncementProps {
    active: boolean;
}

/**
 * ClutchAnnouncement - Shows "CLUTCH!" text when player kills enemy at low HP
 */
export const ClutchAnnouncement: React.FC<ClutchAnnouncementProps> = ({ active }) => {
    if (!active) return null;

    return (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[130] animate-bounce">
            <div className="px-6 py-2 bg-red-600 text-white font-black italic text-4xl skew-x-[-12deg] shadow-[8px_8px_0_#000] border-4 border-black tracking-tighter">
                CLUTCH!
            </div>
        </div>
    );
};
