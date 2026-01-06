import React, { memo } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';

interface ClutchAnnouncementProps {
  active: boolean;
}

const DesktopClutch: React.FC = () => (
  <div className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[130] pointer-events-none">
    <div className="animate-bounce-short">
      <div className="relative bg-gradient-to-r from-red-600 to-orange-600 text-white font-black italic text-6xl skew-x-[-15deg] shadow-[0_0_20px_rgba(255,0,0,0.6)] border-4 border-yellow-400 tracking-tighter px-10 py-4 outline outline-4 outline-black/30">
        <span className="drop-shadow-[4px_4px_0_#000]">CLUTCH!</span>
        {/* Decorative elements */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 border-2 border-black" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 border-2 border-black" />
      </div>
    </div>
  </div>
);

const MobileClutch: React.FC = () => {
  const { rs, rfs } = useResponsiveUI();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[130] pointer-events-none flex flex-col items-center gap-1"
      style={{ top: '25%' }} // Positioned slightly lower than top HUD elements
    >
      <div
        className="bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-black italic skew-x-[-12deg] shadow-[0_0_15px_rgba(255,100,0,0.5)] border-yellow-300 tracking-tight animate-pulse"
        style={{
          fontSize: rfs(32), // Larger, more impactful text
          padding: `${rs(8)}px ${rs(24)}px`,
          borderWidth: rs(3),
          boxShadow: `${rs(4)}px ${rs(4)}px 0 #000`,
        }}
      >
        CLUTCH!
      </div>
      <div
        className="bg-black/80 text-yellow-300 font-bold uppercase tracking-widest skew-x-[-12deg] px-2"
        style={{ fontSize: rfs(10) }}
      >
        RECOVERED
      </div>
    </div>
  );
};

export const ClutchAnnouncement: React.FC<ClutchAnnouncementProps> = memo(({ active }) => {
  // Use standard screenService pattern for consistency with simple UI overlays
  const isMobile = screenService.isMobile();

  // Force re-check on mount/resize via hook in other components usually, but here we can just use the prop or check.
  // Let's stick to the simplest valid implementation that matches the file structure.

  if (!active) return null;

  return isMobile ? <MobileClutch /> : <DesktopClutch />;
});
