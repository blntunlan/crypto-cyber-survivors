import React, { memo, useEffect, useState } from 'react';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';

/**
 * WaveTimer - Adaptive Survival Time Display
 *
 * Note: The actual time value is updated via Direct DOM manipulation
 * from the parent's RAF loop using the ID 'wave-timer-text'
 */

const DesktopWaveTimer: React.FC = () => (
  <div
    className="absolute left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center"
    style={{ top: 'calc(1.5rem + env(safe-area-inset-top, 0px))' }}
  >
    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mb-1">
      Survival Time
    </div>
    <div
      id="wave-timer-text"
      className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg tabular-nums"
    >
      0:00
    </div>
  </div>
);

const MobileWaveTimer: React.FC = () => {
  const isRetro = useIsRetro();
  const { rs, rfs, isSmallDevice, isVeryNarrow } = useResponsiveUI();

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[110] flex flex-col items-center"
      style={{
        top: `calc(${isSmallDevice ? rs(8) : rs(16)}px + env(safe-area-inset-top, 0px))`,
      }}
    >
      {/* Hide label on very narrow screens to save space */}
      {!isVeryNarrow && (
        <div
          className={`text-slate-500/80 font-bold uppercase tracking-widest ${isRetro ? 'font-retro-text' : ''}`}
          style={{ fontSize: isRetro ? rfs(6) : rfs(isSmallDevice ? 5 : 6) }}
        >
          {isSmallDevice ? 'TIME' : 'SURVIVAL'}
        </div>
      )}
      <div
        id="wave-timer-text"
        className={`font-black italic tracking-tighter text-white drop-shadow-md tabular-nums ${isRetro ? 'font-retro-pixel' : ''}`}
        style={{ fontSize: isRetro ? rfs(16) : rfs(isSmallDevice ? 14 : 16) }}
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
