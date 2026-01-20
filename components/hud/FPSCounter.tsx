import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * FPSCounter - Development-only FPS display
 *
 * Note: The actual FPS value is updated via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'fps-counter'
 */

const DesktopFPS: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div
      className="absolute left-2 z-[110]"
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        id="fps-counter"
        className="px-2 py-1 rounded text-[10px] font-stats font-bold bg-green-500/80 text-white shadow-lg"
      >
        {t('hud.fps_formatted', { val: '--' })}
      </div>
    </div>
  );
};

const MobileFPS: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div
      className="absolute left-4 z-[110]"
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        id="fps-counter"
        className="px-1.5 py-0.5 rounded text-[8px] font-stats font-bold bg-green-500/60 text-white"
      >
        {t('hud.fps_formatted', { val: '--' })}
      </div>
    </div>
  );
};

export const FPSCounter: React.FC = memo(() => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  return isMobile ? <MobileFPS /> : <DesktopFPS />;
});
