import React, { memo, useEffect, useState } from 'react';
import { type Player } from '../../types';
import { HUD_WAR_ROOM } from '../../config/HUDWarRoom';
import { screenService } from '../../services/system/ScreenService';
import { STAT_DEFINITIONS, type StatKey } from '../../config/StatRegistry';
import { StatService } from '../../services/gameplay/StatService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { LiveTicker } from '../themed/LiveTicker';
import { EventBus } from '../../services/core/EventBus';
import { useRef } from 'react';
import { HudGhostRail } from './HudGhostRail';

interface KernelStatusProps {
  player: Player;
}

const OPERATOR_STAT_ID_SET = new Set(HUD_WAR_ROOM.operatorStatIds);

const text = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(' ') : value;

const DesktopKernel: React.FC<KernelStatusProps> = ({ player }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  return (
    <HudGhostRail
      testId="war-room-operator"
      side="right"
      tone="danger"
      className="flex min-w-[180px] flex-col gap-2 py-1 text-right"
    >
      <div
        className={`mb-1 text-[9px] font-black uppercase tracking-[0.2em] ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        style={{ color: HUD_WAR_ROOM.colors.dangerText }}
      >
        {t('hud.kernel_status')}
      </div>

      <div className="flex flex-col gap-0.5">
        <div
          className={`text-3xl font-black italic leading-none tracking-tighter text-white ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
        >
          {t('hud.level_short')} {player.level}
        </div>

        <div className="mt-1 h-px w-full bg-white/25">
          <XpBar nextLevelExp={player.nextLevelExp} isRetro={isRetro} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
        {Object.values(STAT_DEFINITIONS).map(stat => {
          if (
            !stat.showInKernel ||
            !OPERATOR_STAT_ID_SET.has(
              stat.id as (typeof HUD_WAR_ROOM.operatorStatIds)[number]
            )
          ) {
            return null;
          }

          return (
            <StatRow
              key={stat.id}
              label={text(t(`hud.stat.${stat.id}`))}
              valueKey={stat.id}
              color={stat.uiColor}
              formatter={(val: number) => StatService.format(val, stat.id as StatKey)}
            />
          );
        })}
      </div>
    </HudGhostRail>
  );
};

const MobileKernel: React.FC<KernelStatusProps> = ({ player }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { rs, rfs, isSmallDevice } = useResponsiveUI();

  // Minimal mobile UI: Only Level + XP bar, no stat grid
  return (
    <HudGhostRail
      testId="war-room-operator"
      side="right"
      tone="danger"
      className="flex flex-col text-right"
      style={{
        padding: isSmallDevice ? rs(4) : rs(6),
        gap: isSmallDevice ? rs(2) : rs(4),
        minWidth: isSmallDevice ? rs(50) : rs(70),
      }}
    >
      {/* Compact Level Display */}
      <div
        className="flex items-center justify-end"
        style={{ gap: isSmallDevice ? rs(2) : rs(4) }}
      >
        <div
          className="font-black uppercase tracking-wider text-blue-400/70"
          style={{ fontSize: rfs(10) }}
        >
          {text(t('hud.level_short')).substring(0, 2)}
        </div>

        <div
          className={`font-black leading-none tracking-tight text-white ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{ fontSize: rfs(isSmallDevice ? 18 : 24) }}
        >
          {player.level}
        </div>
      </div>

      {/* Thin XP Bar */}
      <div
        className="w-full bg-white/20"
        style={{ height: isSmallDevice ? rs(2) : rs(3) }}
      >
        <XpBar nextLevelExp={player.nextLevelExp} isRetro={isRetro} />
      </div>
    </HudGhostRail>
  );
};

const StatRow: React.FC<{
  label: string;
  valueKey: string;
  formatter: (val: number) => string;
  color?: string;
}> = ({ label, valueKey, formatter, color = 'text-slate-100' }) => (
  <div className="flex items-center justify-between text-[9px]">
    <span className="font-bold uppercase text-slate-500">{label}</span>
    <LiveTicker
      id={`stat-${valueKey}`}
      valueKey={valueKey}
      formatter={formatter}
      className={`${color} font-black tabular-nums`}
    />
  </div>
);

/**
 * High-performance XP bar that updates width via Ref.
 */
const XpBar: React.FC<{ nextLevelExp: number; isRetro: boolean }> = ({
  nextLevelExp,
  isRetro,
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = EventBus.on(
      'hudValuesUpdated',
      (data: Record<string, number>) => {
        if (!barRef.current) return;
        const exp = data['exp'] ?? 0;
        const pct = Math.min(100, (exp / nextLevelExp) * 100);
        barRef.current.style.width = `${pct}%`;
      }
    );
    return unsubscribe;
  }, [nextLevelExp]);

  return (
    <div
      ref={barRef}
      className={`h-full bg-[#D6B85C] transition-all duration-100 ${isRetro ? '' : 'shadow-[0_0_8px_#D6B85C]'}`}
      data-testid="war-room-xp-fill"
      style={{ width: '0%' }}
    />
  );
};

export const KernelStatus: React.FC<KernelStatusProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileKernel {...props} /> : <DesktopKernel {...props} />;
});
