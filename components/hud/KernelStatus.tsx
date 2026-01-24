import React, { memo, useEffect, useState } from 'react';
import { type Player } from '../../types';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';
import { STAT_DEFINITIONS, type StatKey } from '../../config/StatRegistry';
import { StatService } from '../../services/StatService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { LiveTicker } from '../themed/LiveTicker';
import { EventBus } from '../../services/EventBus';
import { useRef } from 'react';

interface KernelStatusProps {
  player: Player;
}

const DesktopKernel: React.FC<KernelStatusProps> = ({ player }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  return (
    <div className="bg-transparent p-3 flex flex-col gap-2 min-w-[220px] text-right">
      <div
        className={`text-[9px] uppercase font-black tracking-[0.2em] mb-1 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        style={{ color: COLORS.ELECTRIC_BLUE }}
      >
        {t('hud.kernel_status')}
      </div>

      <div className="flex flex-col gap-0.5">
        <div
          className={`text-3xl font-black italic text-white leading-none tracking-tighter ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
        >
          {t('hud.level_short')} {player.level}
        </div>

        <div
          className={`w-full h-2 bg-slate-800 overflow-hidden mt-1 ${isRetro ? 'rounded-none border-2 border-slate-700' : 'rounded-full'}`}
        >
          <XpBar nextLevelExp={player.nextLevelExp} isRetro={isRetro} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-2">
        {Object.values(STAT_DEFINITIONS).map(stat => {
          if (!stat.showInKernel) return null;

          return (
            <StatRow
              key={stat.id}
              label={t(`hud.stat.${stat.id}`)}
              valueKey={stat.id}
              color={stat.uiColor}
              formatter={(val: number) => StatService.format(val, stat.id as StatKey)}
            />
          );
        })}
      </div>
    </div>
  );
};

const MobileKernel: React.FC<KernelStatusProps> = ({ player }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { rs, rfs, isSmallDevice } = useResponsiveUI();

  // Minimal mobile UI: Only Level + XP bar, no stat grid
  return (
    <div
      className="bg-transparent flex flex-col text-right"
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
          className="uppercase font-black tracking-wider text-blue-400/70"
          style={{ fontSize: rfs(10) }}
        >
          {t('hud.level_short').substring(0, 2)}
        </div>

        <div
          className={`font-black text-white leading-none tracking-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{ fontSize: rfs(isSmallDevice ? 18 : 24) }}
        >
          {player.level}
        </div>
      </div>

      {/* Thin XP Bar */}
      <div
        className={`w-full bg-slate-800/40 overflow-hidden ${isRetro ? 'rounded-none border border-slate-700' : 'rounded-full'}`}
        style={{ height: isSmallDevice ? rs(2) : rs(3) }}
      >
        <XpBar nextLevelExp={player.nextLevelExp} isRetro={isRetro} />
      </div>
    </div>
  );
};

const StatRow: React.FC<{
  label: string;
  valueKey: string;
  formatter: (val: number) => string;
  color?: string;
}> = ({ label, valueKey, formatter, color = 'text-slate-100' }) => (
  <div className="flex justify-between items-center text-[9px]">
    <span className="text-slate-500 uppercase font-bold">{label}</span>
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
      className={`h-full bg-blue-500 transition-all duration-100 ${isRetro ? '' : 'shadow-[0_0_8px_#3b82f6]'}`}
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
