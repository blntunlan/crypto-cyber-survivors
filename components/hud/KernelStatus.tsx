import React, { memo, useEffect, useState } from 'react';
import { type Player } from '../../types';
import { COLORS } from '../../constants';
import { screenService } from '../../services/ScreenService';

interface KernelStatusProps {
  player: Player;
  smoothValues: {
    exp: number;
    damage: number;
    speed: number;
    fireRate: number;
    luck: number;
    lifesteal: number;
    crit: number;
    magnet: number;
    armor: number;
    area: number;
  };
}

const DesktopKernel: React.FC<KernelStatusProps> = ({ player, smoothValues }) => {
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;
  return (
    <div className="bg-slate-950/40 backdrop-blur-sm border border-white/5 p-3 rounded-xl flex flex-col gap-2 min-w-[220px] text-right shadow-2xl">
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
        <StatRow label="DMG" value={Math.round(smoothValues.damage)} />
        <StatRow label="SPD" value={smoothValues.speed.toFixed(1)} color="text-blue-400" />
        <StatRow
          label="A/S"
          value={(1000 / smoothValues.fireRate).toFixed(1)}
          color="text-orange-400"
        />
        <StatRow label="Crit" value={`${smoothValues.crit.toFixed(0)}%`} color="text-yellow-400" />
        <StatRow label="Luck" value={`+${smoothValues.luck.toFixed(1)}`} color="text-green-400" />
        <StatRow
          label="Vamp"
          value={`${((isNaN(smoothValues.lifesteal) ? 0 : smoothValues.lifesteal) * 100).toFixed(0)}%`}
          color="text-red-400"
        />
        <StatRow
          label="Magnet"
          value={`+${Math.round(smoothValues.magnet)}`}
          color="text-purple-400"
        />
        <StatRow label="Armor" value={Math.round(smoothValues.armor)} color="text-slate-300" />
        <StatRow label="Area" value={`x${smoothValues.area.toFixed(1)}`} color="text-cyan-400" />
      </div>
    </div>
  );
};

const MobileKernel: React.FC<KernelStatusProps> = ({ player, smoothValues }) => {
  const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/5 p-2.5 rounded-lg flex flex-col gap-1.5 min-w-[120px] text-right shadow-xl">
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
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">DMG</span>
          <span className="text-white font-black text-[10px]">
            {Math.round(smoothValues.damage)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">SPD</span>
          <span className="text-blue-400 font-black text-[10px]">
            {smoothValues.speed.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">A/S</span>
          <span className="text-orange-400 font-black text-[10px]">
            {(1000 / smoothValues.fireRate).toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">CRIT</span>
          <span className="text-yellow-400 font-black text-[10px]">
            {smoothValues.crit.toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">LUCK</span>
          <span className="text-green-400 font-black text-[10px]">
            +{smoothValues.luck.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">VAMP</span>
          <span className="text-red-400 font-black text-[10px]">
            {((isNaN(smoothValues.lifesteal) ? 0 : smoothValues.lifesteal) * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] gap-2">
          <span className="text-slate-500 font-bold uppercase">ARM</span>
          <span className="text-slate-300 font-black text-[10px]">
            {Math.round(smoothValues.armor)}
          </span>
        </div>
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
