import React, { memo, useEffect, useState } from 'react';
import { type Player } from '../../types';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';
import { STAT_DEFINITIONS, type StatKey } from '../../config/StatRegistry';
import { StatService } from '../../services/StatService';

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
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;
  return (
    <div className="bg-transparent p-3 flex flex-col gap-2 min-w-[220px] text-right">
      <div
        className="text-[9px] uppercase font-black tracking-[0.2em] mb-1"
        style={{ color: COLORS.ELECTRIC_BLUE }}
      >
        Kernel Status
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="text-3xl font-black italic text-white leading-none tracking-tighter">
          LVL {player.level}
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-100"
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
            <StatRow key={stat.id} label={stat.label} value={displayValue} color={stat.uiColor} />
          );
        })}
      </div>
    </div>
  );
};

const MobileKernel: React.FC<KernelStatusProps> = ({ player, smoothValues }) => {
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;
  return (
    <div className="bg-transparent p-2.5 flex flex-col gap-1.5 min-w-[120px] text-right">
      <div className="flex justify-between items-center gap-3">
        <div className="text-[9px] uppercase font-black tracking-widest text-blue-400 opacity-80">
          LEVEL
        </div>
        <div className="text-3xl font-black italic text-white leading-none tracking-tighter">
          {player.level}
        </div>
      </div>

      <div className="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]"
          style={{ width: `${Math.min(100, expPercent)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-0.5 pt-1 border-t border-white/5">
        {Object.values(STAT_DEFINITIONS).map(stat => {
          if (!stat.showInKernel) return null;

          const value = smoothValues[stat.id as keyof typeof smoothValues] ?? 0;
          const displayValue = StatService.format(value, stat.id as StatKey);

          return (
            <div key={stat.id} className="flex justify-between items-center text-[9px] gap-2">
              <span className="text-slate-500 font-bold uppercase">{stat.label}</span>
              <span className={`${stat.uiColor} font-black text-[10px]`}>{displayValue}</span>
            </div>
          );
        })}
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
