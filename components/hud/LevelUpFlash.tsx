import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';

interface LevelUpFlashProps {
  intensity: number;
}

const DesktopFlash: React.FC<LevelUpFlashProps> = ({ intensity }) => (
  <div
    className="pointer-events-none absolute inset-0 z-[120] bg-white transition-opacity duration-500 ease-out"
    style={{ opacity: intensity > 0 ? 0.3 : 0 }}
  />
);

const MobileFlash: React.FC<LevelUpFlashProps> = ({ intensity }) => (
  <div
    className="pointer-events-none absolute inset-0 z-[120] bg-white transition-opacity duration-300 ease-out"
    style={{ opacity: intensity > 0 ? 0.25 : 0 }}
  />
);

export const LevelUpFlash: React.FC<LevelUpFlashProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileFlash {...props} /> : <DesktopFlash {...props} />;
});
