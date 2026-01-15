import React, { memo, useEffect, useState } from 'react';
import { type Player } from '../../types';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';
import { STAT_DEFINITIONS, type StatKey } from '../../config/StatRegistry';
import { StatService } from '../../services/StatService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { useIsRetro } from '../../contexts/useTheme';

interface KernelStatusProps {
  player: Player;
  smoothValues: {
    exp: number;
    damage?: number; // legacy support if needed
    baseDamage: number;
    speed: number;
    fireRate: number;
    luck: number;
    lifesteal: number;
    crit?: number; // legacy support if needed
    critChance: number;
    magnet: number;
    armor: number;
    area: number;
  };
}

const DesktopKernel: React.FC<KernelStatusProps> = ({ player, smoothValues }) => {
  const isRetro = useIsRetro();
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;
  return (
    <div className="bg-transparent p-3 flex flex-col gap-2 min-w-[220px] text-right">
      <div
        className={`text-[9px] uppercase font-black tracking-[0.2em] mb-1 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        style={{ color: COLORS.ELECTRIC_BLUE }}
      >
        Kernel Status
      </div>

      <div className="flex flex-col gap-0.5">
        <div
          className={`text-3xl font-black italic text-white leading-none tracking-tighter ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
        >
          LVL {player.level}
        </div>
        <div
          className={`w-full h-2 bg-slate-800 overflow-hidden mt-1 ${isRetro ? 'rounded-none border-2 border-slate-700' : 'rounded-full'}`}
        >
          <div
            className={`h-full bg-blue-500 transition-all duration-100 ${isRetro ? '' : 'shadow-[0_0_8px_#3b82f6]'}`}
            style={{ width: `${Math.min(100, expPercent)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-2">
        {Object.values(STAT_DEFINITIONS).map(stat => {
          if (!stat.showInKernel) return null;

          const value = smoothValues[stat.id as keyof typeof smoothValues] ?? 0;
          const displayValue = StatService.format(value, stat.id as StatKey);

          return (
            <StatRow
              key={stat.id}
              label={stat.label}
              value={displayValue}
              color={stat.uiColor}
            />
          );
        })}
      </div>
    </div>
  );
};

const MobileKernel: React.FC<KernelStatusProps> = ({ player, smoothValues }) => {
  const isRetro = useIsRetro();
  const { rs, rfs } = useResponsiveUI();
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;

  // Minimal mobile UI: Only Level + XP bar, no stat grid
  return (
    <div
      className="bg-transparent flex flex-col text-right"
      style={{
        padding: rs(6),
        gap: rs(4),
        minWidth: rs(70),
      }}
    >
      {/* Compact Level Display */}
      <div className="flex items-center justify-end" style={{ gap: rs(4) }}>
        <div
          className="uppercase font-black tracking-wider text-blue-400/70"
          style={{ fontSize: rfs(8) }}
        >
          LV
        </div>
        <div
          className={`font-black text-white leading-none tracking-tight ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{ fontSize: rfs(24) }}
        >
          {player.level}
        </div>
      </div>

      {/* Thin XP Bar */}
      <div
        className={`w-full bg-slate-800/40 overflow-hidden ${isRetro ? 'rounded-none border border-slate-700' : 'rounded-full'}`}
        style={{ height: rs(3) }}
      >
        <div
          className={`h-full bg-blue-400 ${isRetro ? '' : 'shadow-[0_0_4px_rgba(96,165,250,0.4)]'}`}
          style={{ width: `${Math.min(100, expPercent)}%` }}
        />
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label,
  value,
  color = 'text-slate-100',
}) => (
  <div className="flex justify-between items-center text-[9px]">
    <span className="text-slate-500 uppercase font-bold">{label}</span>
    <span className={`${color} font-black tabular-nums`}>{value}</span>
  </div>
);

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
