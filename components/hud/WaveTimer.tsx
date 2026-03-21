import React, { memo, useEffect, useMemo, useReducer, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { EventBus } from '../../services/core/EventBus';
import { TimeService } from '../../services/core/TimeService';

const WAVE_TIMER_TEST_ID = 'wave-timer-text';

/**
 * WaveTimer - Adaptive Survival Time Display
 *
 * This component is now responsible for content ONLY.
 * Positioning is handled by the parent container in GameUI.
 *
 * Note: Time text is exposed via data-testid="wave-timer-text" for
 * Playwright assertions and optional DOM consumers.
 */

const DesktopWaveTimer: React.FC = () => {
  const { t } = useLanguage();
  const label = t('hud.survival_time');
  const displayTime = useWaveTimerDisplay();
  const accessibleLabel = `${label}: ${displayTime}`;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
        {label}
      </div>

      <div
        data-testid={WAVE_TIMER_TEST_ID}
        role="text"
        aria-label={accessibleLabel}
        aria-live="off"
        className="min-w-[5ch] text-center text-4xl font-black italic tabular-nums tracking-tighter text-white drop-shadow-lg"
      >
        {displayTime}
      </div>
    </div>
  );
};

const MobileWaveTimer: React.FC = () => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { rfs, isVeryNarrow } = useResponsiveUI();
  const displayTime = useWaveTimerDisplay();
  const label = t('hud.survival_time');
  const accessibleLabel = `${label}: ${displayTime}`;
  const labelStyle = useMemo(
    () => ({
      fontSize: isRetro ? rfs(10) : rfs(11),
    }),
    [isRetro, rfs]
  );
  const timerStyle = useMemo(
    () => ({
      fontSize: isRetro ? rfs(22) : rfs(26),
      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    }),
    [isRetro, rfs]
  );

  return (
    <div className="flex flex-col items-center">
      <div
        className={`font-black uppercase tracking-[0.2em] text-slate-500/80 transition-opacity duration-150 ${isRetro ? 'font-retro-text' : ''} ${
          isVeryNarrow ? 'invisible opacity-0' : 'opacity-100'
        }`}
        aria-hidden={isVeryNarrow}
        style={labelStyle}
      >
        {label}
      </div>
      <div
        data-testid={WAVE_TIMER_TEST_ID}
        role="text"
        aria-label={accessibleLabel}
        aria-live="off"
        className={`min-w-[5ch] text-center font-black italic tabular-nums leading-tight tracking-tighter text-white ${isRetro ? 'font-retro-pixel' : ''}`}
        style={timerStyle}
      >
        {displayTime}
      </div>
    </div>
  );
};

export const WaveTimer: React.FC = memo(() => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileWaveTimer /> : <DesktopWaveTimer />;
});

export default WaveTimer;

type WaveTimerAction = { type: 'reset' } | { type: 'sync'; totalSeconds: number };

function useWaveTimerDisplay(): string {
  const [displayTime, dispatch] = useReducer(
    waveTimerReducer,
    undefined,
    getInitialWaveTime
  );

  useEffect(() => {
    const unsubSecondElapsed = EventBus.on(
      'secondElapsed',
      data => dispatch({ type: 'sync', totalSeconds: data.totalSeconds }),
      { scope: 'ui' }
    );

    const unsubReset = EventBus.on('gameReset', () => dispatch({ type: 'reset' }), {
      scope: 'ui',
    });

    return () => {
      unsubSecondElapsed();
      unsubReset();
    };
  }, []);

  return displayTime;
}

function formatWaveTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getInitialWaveTime(): string {
  return formatWaveTime(Math.floor(TimeService.getGameTimeSeconds()));
}

function waveTimerReducer(_state: string, action: WaveTimerAction): string {
  switch (action.type) {
    case 'reset':
      return '0:00';
    case 'sync':
      return formatWaveTime(action.totalSeconds);
    default:
      return _state;
  }
}
