import React, { memo, useEffect, useRef, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { EventBus } from '../../services/core/EventBus';

/**
 * FPSCounter - Development-only FPS display
 *
 * Subscribes to 'fpsUpdated' EventBus events from FPSMonitor
 * and updates the displayed value via direct DOM manipulation (ref).
 */

const DesktopFPS: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = EventBus.on('fpsUpdated', (data: { avgFps: number }) => {
      if (ref.current) {
        ref.current.textContent = `${data.avgFps} FPS`;
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className="absolute left-2 z-[110]"
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        ref={ref}
        id="fps-counter"
        className="rounded bg-green-500/80 px-2 py-1 font-stats text-[10px] font-bold text-white shadow-lg"
      >
        -- FPS
      </div>
    </div>
  );
};

const MobileFPS: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = EventBus.on('fpsUpdated', (data: { avgFps: number }) => {
      if (ref.current) {
        ref.current.textContent = `${data.avgFps} FPS`;
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div
      className="absolute left-4 z-[110]"
      style={{ top: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div
        ref={ref}
        id="fps-counter"
        className="rounded bg-green-500/60 px-1.5 py-0.5 font-stats text-[8px] font-bold text-white"
      >
        -- FPS
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

FPSCounter.displayName = 'FPSCounter';
