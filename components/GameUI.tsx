import React, { useEffect, useState, memo } from 'react';
import { MarketPosition, MarketData, Player } from '../types';
import { DifficultyManager } from '../services/DifficultyManager';

interface GameUIProps {
  position: MarketPosition;
  entryPrice: number;
  marketData: MarketData;
  player: Player;
}

export const GameUI: React.FC<GameUIProps> = memo(
  ({ position: _position, entryPrice, marketData, player }) => {
    const [lastPrice, setLastPrice] = useState(marketData.price);
    const [priceColor, setPriceColor] = useState('text-white');

    const pnlColor = marketData.pnl >= 0 ? 'text-green-400' : 'text-red-400';
    const hpPercent = (player.hp / player.maxHp) * 100;

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

    return (
      <div className="fixed top-0 left-0 w-full p-6 pointer-events-none flex flex-col gap-2 z-50 font-mono">
        <div className="flex justify-between items-start w-full">
          {/* Left Panel: Transparent & Numerical Only */}
          <div className="bg-transparent p-2 flex flex-col gap-0 min-w-[280px]">
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 mb-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}
              ></span>
              Live Index Feed
            </div>

            <div className="flex flex-col">
              <div
                className={`text-4xl font-black tracking-tighter transition-colors duration-300 ${priceColor}`}
              >
                $
                {marketData.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className={`text-lg font-black ${pnlColor} flex items-center gap-2`}>
                {marketData.pnl >= 0 ? 'PROFIT' : 'LOSS'}
                <span className="text-2xl">{(marketData.pnl * 100).toFixed(2)}%</span>
              </div>
            </div>

            <div className="mt-4 space-y-0.5 opacity-60">
              <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                Entry: ${entryPrice.toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                Volatility: x{marketData.difficulty.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Right Panel: Enhanced Stats */}
          <div className="bg-slate-950/40 backdrop-blur-sm border border-white/5 p-4 rounded-xl flex flex-col gap-2 min-w-[220px] text-right">
            <div className="text-[9px] text-blue-500 uppercase font-black tracking-[0.2em] mb-1">
              Kernel Status
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="text-3xl font-black italic text-white leading-none tracking-tighter">
                LVL {player.level}
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                  style={{ width: `${(player.exp / player.nextLevelExp) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-2">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">DMG</span>
                <span className="text-slate-100 font-black">{player.baseDamage}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">Luck</span>
                <span className="text-green-400 font-black">+{player.luck.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">Crit</span>
                <span className="text-yellow-400 font-black">
                  {(player.critChance * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">Magnet</span>
                <span className="text-purple-400 font-black">+{player.magnet}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">Armor</span>
                <span className="text-slate-300 font-black">{player.armor}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-500 uppercase font-bold">Area</span>
                <span className="text-cyan-400 font-black">x{player.area.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Health (Bottom) */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-96 text-center">
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
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Streak</span>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${DifficultyManager.getKillStreak() >= 10
                  ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                  : DifficultyManager.getKillStreak() >= 5
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-slate-700 text-slate-300'
                  }`}
              >
                🔥 {DifficultyManager.getKillStreak()}
              </span>
            </div>
          </div>

          <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1 tracking-[0.2em]">
            <span>Margin integrity</span>
            <span className={hpPercent < 30 ? 'text-red-500 animate-pulse' : 'text-slate-300'}>
              {Math.ceil(hpPercent)}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-950/80 rounded-full border border-white/5 overflow-hidden p-0.5">
            <div
              className={`h-full transition-all duration-300 rounded-full ${hpPercent < 30 ? 'bg-red-600' : 'bg-green-500'}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
);
