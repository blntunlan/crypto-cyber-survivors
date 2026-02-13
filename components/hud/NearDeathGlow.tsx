import React, { memo, useEffect, useRef, useState } from 'react';
import { screenService } from '../../services/system/ScreenService';
import { EventBus } from '../../services/core/EventBus';

/**
 * NearDeathGlow - Red screen edge glow when HP is low
 *
 * Subscribes to 'hudValuesUpdated' EventBus event to read the lerped HP value
 * and controls opacity via direct DOM manipulation for maximum performance.
 *
 * Opacity curve:
 *   HP > 40%  → 0 (invisible)
 *   HP 20-40% → 0 → 0.5 (warning zone)
 *   HP 0-20%  → 0.5 → 1.0 (critical zone, more intense)
 */

interface NearDeathGlowProps {
  maxHp: number;
}

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

export const NearDeathGlow: React.FC<NearDeathGlowProps> = memo(({ maxHp }) => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());
  const maxHpRef = useRef(maxHp);

  // Keep maxHp ref in sync without re-subscribing
  useEffect(() => {
    maxHpRef.current = maxHp;
  }, [maxHp]);

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  // Subscribe to lerped HP values and drive glow opacity
  useEffect(() => {
    const unsubscribeHud = EventBus.on(
      'hudValuesUpdated',
      (data: Record<string, number>) => {
        const hp = data.hp;
        if (hp === undefined || maxHpRef.current <= 0) return;

        const el = document.getElementById('near-death-glow');
        if (!el) return;

        const hpPercent = (hp / maxHpRef.current) * 100;

        let opacity = 0;
        if (hpPercent <= 20) {
          // Critical zone: 0.5 → 1.0
          opacity = 0.5 + ((20 - hpPercent) / 20) * 0.5;
        } else if (hpPercent <= 40) {
          // Warning zone: 0 → 0.5
          opacity = ((40 - hpPercent) / 20) * 0.5;
        }

        el.style.opacity = opacity.toFixed(3);
      }
    );

    // Reset glow on game reset
    const unsubscribeReset = EventBus.on('gameReset', () => {
      const el = document.getElementById('near-death-glow');
      if (el) el.style.opacity = '0';
    });

    return () => {
      unsubscribeHud();
      unsubscribeReset();
    };
  }, []);

  return isMobile ? <MobileGlow /> : <DesktopGlow />;
});

NearDeathGlow.displayName = 'NearDeathGlow';
