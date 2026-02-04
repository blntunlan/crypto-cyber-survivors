import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';

/**
 * NearDeathGlow - Red screen edge glow when HP is low
 *
 * Note: Opacity is controlled via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'near-death-glow'
 */

const DesktopGlow: React.FC = () => (
  <div
    id="near-death-glow"
    className="pointer-events-none absolute inset-0 z-[101] shadow-[inset_0_0_150px_rgba(239,68,68,0.8)]"
    style={{ opacity: 0, transition: 'opacity 0.2s ease-out' }}
  />
);

const MobileGlow: React.FC = () => (
  <div
    id="near-death-glow"
    className="pointer-events-none absolute inset-0 z-[101] shadow-[inset_0_0_80px_rgba(239,68,68,1.0)]"
    style={{ opacity: 0, transition: 'opacity 0.2s ease-out' }}
  />
);

export const NearDeathGlow: React.FC = memo(() => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileGlow /> : <DesktopGlow />;
});
