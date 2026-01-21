import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
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
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-1">
        {t('hud.survival_time')}
      </div>

      <div
        id="wave-timer-text"
        className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg tabular-nums"
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
          className={`text-slate-500/80 font-black uppercase tracking-[0.2em] ${isRetro ? 'font-retro-text' : ''}`}
          style={{ fontSize: isRetro ? rfs(10) : rfs(11) }}
        >
          {t('hud.survival')}
        </div>
      )}
      <div
        id="wave-timer-text"
        className={`font-black italic tracking-tighter text-white drop-shadow-lg tabular-nums leading-none ${isRetro ? 'font-retro-pixel' : ''}`}
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
