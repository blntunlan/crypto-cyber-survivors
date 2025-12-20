import React, { useEffect, useState, memo } from 'react';
import { MarketPosition, MarketData, Player, GameStatus } from '../types';
import { useLerpValues } from '../hooks/useLerpValue';
import { screenService } from '../services/ScreenService';

import { KernelStatus, LiveFeed, AccountHealth } from './hud';

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

    const hpPercent = (smoothValues.hp / player.maxHp) * 100;

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
          <LiveFeed
            marketData={marketData}
            entryPrice={entryPrice}
            smoothValues={smoothValues}
            priceColor={priceColor}
          />

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
            <KernelStatus
              player={player}
              smoothValues={smoothValues}
            />
          </div>
        </div>

        {/* Account Health (Bottom) - Adaptive Component */}
        <AccountHealth hpPercent={hpPercent} />
      </div>
    );
  }
);
