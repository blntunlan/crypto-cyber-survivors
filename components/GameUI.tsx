import React, { useEffect, useState, memo, useMemo, useRef } from 'react';
import { type MarketPosition, type MarketData, type Player, GameStatus } from '../types';
import { useLerpValues } from '../hooks/useLerpValue';
import { screenService } from '../services/ScreenService';
import { useGameStore } from '../stores/gameStore';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { EventBus } from '../services/EventBus';

import { Logger } from '../services/Logger';
import { Z_LAYERS } from '../constants/ZIndex';

import { KernelStatus, LiveFeed, AccountHealthPremium, BuffIndicator } from './hud';

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
    const [buffTrigger, setBuffTrigger] = useState(0);

    // Listen to buff changes to trigger re-render
    useEffect(() => {
      const unsubApply = EventBus.on('buffApplied', () => setBuffTrigger(t => t + 1));
      const unsubExpire = EventBus.on('buffExpired', () => setBuffTrigger(t => t + 1));
      return () => {
        unsubApply();
        unsubExpire();
      };
    }, []);

    // Calculate effective stats with buffs applied
    const effectiveStats = useMemo(() => {
      // buffTrigger intentionally triggers recalculation
      void buffTrigger;
      if (BuffManager.isInitialized() && status === GameStatus.PLAYING) {
        try {
          const decorated = BuffManager.getDecoratedStats();
          return {
            baseDamage: decorated.getDamage(),
            speed: decorated.getSpeed(),
            fireRate: decorated.getFireRate(),
            luck: decorated.getLuck(),
            lifesteal: decorated.getLifesteal(),
            critChance: decorated.getCritChance(),
            magnet: decorated.getMagnet(),
            armor: decorated.getArmor(),
            area: decorated.getArea(),
          };
        } catch (err) {
          // Fallback to player stats - BuffManager may not be ready
          Logger.debug('[GameUI] BuffManager not ready, using player stats', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return {
        baseDamage: player.baseDamage,
        speed: player.speed,
        fireRate: player.fireRate,
        luck: player.luck,
        lifesteal: player.lifesteal,
        critChance: player.critChance,
        magnet: player.magnet,
        armor: player.armor,
        area: player.area,
      };
    }, [player, status, buffTrigger]);

    // Smooth lerp for all dynamic values using a single animation loop
    const smoothValues = useLerpValues(
      {
        price: marketData.price,
        pnl: marketData.effectivePnl,
        difficulty: marketData.difficulty,
        hp: player.hp,
        exp: player.exp,
        baseDamage: effectiveStats.baseDamage,
        speed: effectiveStats.speed,
        fireRate: effectiveStats.fireRate,
        luck: effectiveStats.luck,
        lifesteal: effectiveStats.lifesteal,
        critChance: effectiveStats.critChance,
        magnet: effectiveStats.magnet,
        armor: effectiveStats.armor,
        area: effectiveStats.area,
      },
      { speed: 0.15, decimals: 4 }
    );

    const hpPercent = (smoothValues.hp / player.maxHp) * 100;

    // FIXED: Store timeout ref to prevent memory leaks and unmount errors
    const priceColorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      // Clear previous timeout before setting new one
      if (priceColorTimeoutRef.current) {
        clearTimeout(priceColorTimeoutRef.current);
      }

      if (marketData.price > lastPrice) {
        setPriceColor('text-green-400 animate-pulse');
        priceColorTimeoutRef.current = setTimeout(() => setPriceColor('text-green-400'), 300);
      } else if (marketData.price < lastPrice) {
        setPriceColor('text-red-400 animate-pulse');
        priceColorTimeoutRef.current = setTimeout(() => setPriceColor('text-red-400'), 300);
      }
      setLastPrice(marketData.price);

      // Cleanup on unmount
      return () => {
        if (priceColorTimeoutRef.current) {
          clearTimeout(priceColorTimeoutRef.current);
        }
      };
    }, [marketData.price, lastPrice]);

    const isMobile = screenService.isMobile();
    const showFPS = useGameStore(state => state.graphics.showFPS);

    return (
      <div
        className={`fixed top-0 left-0 w-full pointer-events-none flex flex-col gap-2 font-mono z-[${Z_LAYERS.HUD}]`}
        style={{
          paddingTop: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-top, 0px))`,
          paddingLeft: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-left, 0px))`,
          paddingRight: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-right, 0px))`,
        }}
      >
        <div className="flex justify-between items-start w-full">
          {/* Left Panel: Transparent & Numerical Only */}
          <div className="flex flex-col gap-2">
            <LiveFeed
              marketData={marketData}
              entryPrice={entryPrice}
              smoothValues={smoothValues}
              priceColor={priceColor}
            />
            {/* Buff Indicator - Below LiveFeed */}
            {status === GameStatus.PLAYING && <BuffIndicator status={status} />}
            {/* Mobile FPS Counter - Below LiveFeed */}
            {isMobile && showFPS && (
              <div className="px-1.5 py-0.5 rounded text-[8px] font-stats font-bold bg-green-500/60 text-white w-fit">
                <span id="fps-counter-mobile">-- FPS</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Pause Button - Visible during active play */}
            {status === GameStatus.PLAYING && onTogglePause && (
              <div className="pointer-events-auto p-2 -m-2">
                {' '}
                {/* Larger invisible hit area */}
                <button
                  onPointerDown={e => {
                    e.stopPropagation();
                    onTogglePause();
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    // Fallback for browsers that might not support onPointerDown correctly or click events
                  }}
                  className="bg-slate-900/60 backdrop-blur-md border border-white/10 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white hover:bg-slate-800/80 active:scale-90 transition-all shadow-lg active:bg-slate-700"
                  title="Pause (Esc)"
                  aria-label="Pause Game"
                >
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-5 bg-white rounded-full"></div>
                  </div>
                </button>
              </div>
            )}

            {/* Right Panel: Enhanced Stats */}
            <KernelStatus player={player} smoothValues={smoothValues} />
          </div>
        </div>

        {/* Account Health (Bottom) - Adaptive Component */}
        <AccountHealthPremium hpPercent={hpPercent} hp={smoothValues.hp} maxHp={player.maxHp} />
      </div>
    );
  }
);
