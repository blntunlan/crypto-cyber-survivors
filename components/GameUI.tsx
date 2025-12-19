import React, { useEffect, useState, memo } from 'react';
import { MarketPosition, MarketData, Player, GameStatus } from '../types';
import { DifficultyManager } from '../services/DifficultyManager';
import { ComboSystem } from '../services/ComboSystem';
import { COLORS } from '../constants';
import { useLerpValues } from '../hooks/useLerpValue';
import { screenService } from '../services/ScreenService';

interface GameUIProps {
  position: MarketPosition;
  entryPrice: number;
  marketData: MarketData;
  player: Player;
  onTogglePause?: () => void;
  status?: GameStatus;
}

export const GameUI: React.FC<GameUIProps> = memo(
  ({ position: _position, entryPrice, marketData, player, onTogglePause, status }) => {
    const [lastPrice, setLastPrice] = useState(marketData.price);
    const [priceColor, setPriceColor] = useState('text-white');

    // Smooth lerp for all dynamic values using a single animation loop
    const smoothValues = useLerpValues({
      price: marketData.price,
      pnl: marketData.effectivePnl * 100,
      difficulty: marketData.difficulty,
      hp: player.hp,
      exp: player.exp,
      damage: player.baseDamage,
      luck: player.luck,
      crit: player.critChance * 100,
      magnet: player.magnet,
      armor: player.armor,
      area: player.area,
    }, { speed: 0.15, decimals: 2 });

    const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
    const hpPercent = (smoothValues.hp / player.maxHp) * 100;
    const expPercent = (smoothValues.exp / player.nextLevelExp) * 100;

    useEffect(() => {
      if (marketData.price > lastPrice) {
        setPriceColor('text-green-400 animate-pulse');
        setTimeout(() => setPriceColor('text-green-400'), 300);
      } else if (marketData.price < lastPrice) {
        setPriceColor('text-red-400 animate-pulse');
        setTimeout(() => setPriceColor('text-red-400'), 300);
      }
      setLastPrice(marketData.price);
    }, [marketData.price, lastPrice]);

    const isMobile = screenService.isMobile();

    return (
      <div
        className="fixed top-0 left-0 w-full pointer-events-none flex flex-col gap-2 z-[1000] font-mono"
        style={{
          paddingTop: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-top, 0px))`,
          paddingLeft: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-left, 0px))`,
          paddingRight: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-right, 0px))`
        }}
      >
        <div className="flex justify-between items-start w-full">
          {/* Left Panel: Transparent & Numerical Only */}
          <div className={`bg-transparent p-2 flex flex-col gap-0 ${isMobile ? 'min-w-[150px]' : 'min-w-[280px]'}`}>
            <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-slate-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 mb-1`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}
              ></span>
              Live Index Feed
            </div>

            <div className="flex flex-col">
              <div
                className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} ${isMobile ? 'text-2xl' : 'text-4xl'}`}
              >
                $
                {smoothValues.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-black flex items-center gap-2`} style={{ color: pnlHex }}>
                {marketData.effectivePnl >= 0 ? 'PROFIT' : 'LOSS'}
                <span className={isMobile ? 'text-lg' : 'text-2xl'}>{smoothValues.pnl.toFixed(2)}%</span>
                <span className="text-[10px] opacity-60 font-mono">({marketData.leverage}x)</span>
              </div>
            </div>

            <div className={`mt-2 ${isMobile ? 'space-y-0' : 'space-y-0.5'} opacity-60`}>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                Entry: ${entryPrice.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                Volatility: x{smoothValues.difficulty.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Pause Button - Visible during active play */}
            {status === GameStatus.PLAYING && onTogglePause && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePause();
                }}
                className="pointer-events-auto bg-slate-900/60 backdrop-blur-md border border-white/10 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white hover:bg-slate-800/80 active:scale-95 transition-all"
                title="Pause (Esc)"
              >
                <div className="flex gap-1">
                  <div className="w-1.5 h-5 bg-white rounded-full"></div>
                  <div className="w-1.5 h-5 bg-white rounded-full"></div>
                </div>
              </button>
            )}

            {/* Right Panel: Enhanced Stats */}
            <div className={`bg-slate-950/40 backdrop-blur-sm border border-white/5 p-3 rounded-xl flex flex-col gap-2 ${isMobile ? 'min-w-[120px]' : 'min-w-[220px]'} text-right`}>
              <div className="text-[9px] uppercase font-black tracking-[0.2em] mb-1" style={{ color: COLORS.ELECTRIC_BLUE }}>
                Kernel Status
              </div>

              <div className="flex flex-col gap-0.5">
                <div className={`${isMobile ? 'text-xl' : 'text-3xl'} font-black italic text-white leading-none tracking-tighter`}>
                  LVL {player.level}
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6] transition-all duration-100"
                    style={{ width: `${Math.min(100, expPercent)}%` }}
                  />
                </div>
              </div>

              <div className={`grid grid-cols-2 ${isMobile ? 'gap-y-0.5 gap-x-2' : 'gap-y-1 gap-x-4'} pt-2`}>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">DMG</span>
                  <span className="text-slate-100 font-black tabular-nums">{smoothValues.damage}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Luck</span>
                  <span className="text-green-400 font-black tabular-nums">+{smoothValues.luck.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Crit</span>
                  <span className="text-yellow-400 font-black tabular-nums">
                    {smoothValues.crit}%
                  </span>
                </div>
                {!isMobile && (
                  <>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Magnet</span>
                      <span className="text-purple-400 font-black tabular-nums">+{smoothValues.magnet}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Armor</span>
                      <span className="text-slate-300 font-black tabular-nums">{smoothValues.armor}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Area</span>
                      <span className="text-cyan-400 font-black tabular-nums">x{smoothValues.area.toFixed(1)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Health (Bottom) */}
        <div
          className={`fixed left-1/2 -translate-x-1/2 ${isMobile ? 'w-[80%] max-w-sm px-4' : 'w-96'} text-center`}
          style={{ bottom: `calc(${isMobile ? '1.5rem' : '2.5rem'} + env(safe-area-inset-bottom, 0px))` }}
        >
          {/* Wave and Streak indicators */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Wave</span>
              <span
                className={`text-xs font-black uppercase px-2 py-0.5 rounded ${DifficultyManager.getWavePhase() === 'calm'
                  ? 'bg-blue-500/20 text-blue-400'
                  : DifficultyManager.getWavePhase() === 'building'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : DifficultyManager.getWavePhase() === 'intense'
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
              >
                {DifficultyManager.getWavePhase()}
              </span>
            </div>
            {/* Only show mini streak on desktop, as mobile has the dedicated ComboPanel higher up to avoid overlap */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase font-bold">Streak</span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded tabular-nums`}
                  style={{
                    backgroundColor: (ComboSystem.getKillStreak() >= 5 ? ComboSystem.getCurrentMilestone()?.color : '#334155') + '33',
                    color: ComboSystem.getKillStreak() >= 5 ? ComboSystem.getCurrentMilestone()?.color : '#cbd5e1'
                  }}
                >
                  🔥 {ComboSystem.getKillStreak()}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1 tracking-[0.2em]">
            <span>Margin integrity</span>
            <span className={`tabular-nums ${hpPercent < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
              {Math.ceil(hpPercent)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950/80 rounded-full border border-white/5 overflow-hidden p-0.5">
            <div
              className={`h-full transition-all duration-150 rounded-full`}
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN,
                boxShadow: `0 0 10px ${hpPercent < 30 ? COLORS.CASINO_RED : COLORS.CASINO_GREEN}44`
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);
