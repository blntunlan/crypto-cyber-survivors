import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';

interface ClutchAnnouncementProps {
    active: boolean;
}

const DesktopClutch: React.FC = () => (
    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[130] animate-bounce pointer-events-none">
        <div className="px-6 py-2 bg-red-600 text-white font-black italic text-4xl skew-x-[-12deg] shadow-[8px_8px_0_#000] border-4 border-black tracking-tighter">
            CLUTCH!
        </div>
    </div>
);

const MobileClutch: React.FC = () => (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-[130] animate-pulse pointer-events-none">
        <div className="px-4 py-1.5 bg-red-500 text-white font-black italic text-2xl skew-x-[-10deg] shadow-[4px_4px_0_#000] border-2 border-white/50 tracking-tight">
            CLUTCH!
        </div>
    </div>
);

export const ClutchAnnouncement: React.FC<ClutchAnnouncementProps> = memo(({ active }) => {
    const [isMobile, setIsMobile] = useState(screenService.isMobile());

    useEffect(() => {
        const unsubscribe = screenService.onChange(() => {
            setIsMobile(screenService.isMobile());
        });
        return unsubscribe;
    }, []);

    if (!active) return null;

    return isMobile ? <MobileClutch /> : <DesktopClutch />;
});
