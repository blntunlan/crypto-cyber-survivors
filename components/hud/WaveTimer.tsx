import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * WaveTimer - Adaptive Survival Time Display
 *
 * This component is now responsible for content ONLY.
 * Positioning is handled by the parent container in GameUI.
 *
 * Note: The actual time value is updated via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'wave-timer-text'
 */

const DesktopWaveTimer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
        {t('hud.survival_time')}
      </div>

      <div
        id="wave-timer-text"
        className="text-4xl font-black italic tabular-nums tracking-tighter text-white drop-shadow-lg"
      >
        0:00
      </div>
    </div>
  );
};

const MobileWaveTimer: React.FC = () => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { rfs, isVeryNarrow } = useResponsiveUI();

  return (
    <div className="flex flex-col items-center">
      {/* Hide label on very narrow screens to save space */}
      {!isVeryNarrow && (
        <div
          className={`font-black uppercase tracking-[0.2em] text-slate-500/80 ${isRetro ? 'font-retro-text' : ''}`}
          style={{ fontSize: isRetro ? rfs(10) : rfs(11) }}
        >
          {t('hud.survival')}
        </div>
      )}
      <div
        id="wave-timer-text"
        className={`font-black italic tabular-nums leading-none tracking-tighter text-white drop-shadow-lg ${isRetro ? 'font-retro-pixel' : ''}`}
        style={{ fontSize: isRetro ? rfs(22) : rfs(26) }}
      >
        0:00
      </div>
    </div>
  );
};

export const WaveTimer: React.FC = memo(() => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileWaveTimer /> : <DesktopWaveTimer />;
});

export default WaveTimer;
