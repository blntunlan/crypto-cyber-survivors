import React, { memo, useEffect, useState } from 'react';
import { HUD_WAR_ROOM } from '../../config/HUDWarRoom';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { screenService } from '../../services/system/ScreenService';
import { HudGhostRail } from './HudGhostRail';

interface AccountHealthProps {
  hpPercent: number;
  hp: number;
  maxHp: number;
}

const HP_SCALE_MARKERS = [0, 25, 50, 75, 100] as const;

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const PremiumHealthInner: React.FC<AccountHealthProps & { isMobile: boolean }> = ({
  hpPercent,
  hp,
  maxHp,
  isMobile,
}) => {
  const { bottomSafeZone } = useResponsiveUI();
  const clampedPercent = clampPercent(hpPercent);
  const currentHp = Math.ceil(Math.max(0, hp));
  const maximumHp = Math.ceil(Math.max(0, maxHp));
  const isCritical = clampedPercent <= HUD_WAR_ROOM.hp.criticalThreshold;
  const tone = isCritical ? 'danger' : 'gold';
  const fillColor = isCritical ? HUD_WAR_ROOM.colors.crimson : HUD_WAR_ROOM.colors.gold;

  return (
    <div
      className="hud-bottom-safe pointer-events-none fixed bottom-5 left-1/2 z-[100] w-full -translate-x-1/2"
      style={{
        maxWidth: HUD_WAR_ROOM.hp.maxWidth,
        bottom: isMobile ? bottomSafeZone + 12 : undefined,
      }}
    >
      <HudGhostRail
        testId="war-room-hp-rail"
        side="center"
        tone={tone}
        className="!border-x-0 px-0 text-left"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#D6B85C]">
            HP
          </span>
          <span className="text-xs font-black tabular-nums text-white">
            {currentHp}{' '}
            <span className="text-[8px] font-bold text-slate-300">/ {maximumHp}</span>
          </span>
        </div>

        <div
          className="border-current/60 relative mt-1 border-y motion-reduce:transition-none"
          style={{ height: HUD_WAR_ROOM.hp.height }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 grid grid-cols-4">
            {HP_SCALE_MARKERS.slice(1, -1).map(marker => (
              <div key={marker} className="border-l border-white/20" />
            ))}
          </div>
          <div
            className="relative h-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
            data-testid="war-room-hp-fill"
            style={{
              width: `${clampedPercent}%`,
              backgroundColor: fillColor,
              boxShadow: `0 0 8px ${fillColor}66`,
            }}
          />
        </div>

        <div
          className="mt-1 flex justify-between text-[7px] font-bold text-slate-300"
          aria-hidden="true"
        >
          {HP_SCALE_MARKERS.map(marker => (
            <span key={marker}>{marker}</span>
          ))}
        </div>
      </HudGhostRail>
    </div>
  );
};

export const AccountHealthPremium: React.FC<AccountHealthProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(() => screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return <PremiumHealthInner {...props} isMobile={isMobile} />;
});
