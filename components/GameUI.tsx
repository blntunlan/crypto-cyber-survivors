import React, { useEffect, useState, memo, useMemo, useRef } from 'react';
import {
  type MarketPosition,
  type MarketData,
  type Player,
  GameStatus,
} from '../types';
import { useLerpValues } from '../hooks/useLerpValue';
import { screenService } from '../services/system/ScreenService';
import { useGameStore } from '../stores/gameStore';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { EventBus } from '../services/core/EventBus';
import { useLanguage } from '../contexts/LanguageContext';

import { Logger } from '../services/system/Logger';
import { Z_LAYERS } from '../constants/ZIndex';

import {
  KernelStatus,
  LiveFeed,
  AccountHealthPremium,
  BuffIndicator,
  WaveTimer,
  LiquidationWarningOverlay,
  FPSCounter,
} from './hud';
import { useDifficultyV2 } from '../hooks/useDifficultyV2';

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
    const { t } = useLanguage();
    const lastPriceRef = useRef(entryPrice || marketData.price);
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

    const { fovReduction } = useDifficultyV2();
    const hpPercent = (smoothValues.hp / player.maxHp) * 100;

    // FIXED: Store timeout ref to prevent memory leaks and unmount errors
    const priceColorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      // Logic: Only update state if color OR pulse status actually needs to change.
      // This prevents the flickering described as "rewriting from scratch"
      // when the pulse class was being removed and re-added rapidly.

      const isRising = marketData.price > lastPriceRef.current;
      const isFalling = marketData.price < lastPriceRef.current;

      if (isRising) {
        setPriceColor('text-green-400 animate-pulse');

        // Debounce removal of pulse
        if (priceColorTimeoutRef.current) clearTimeout(priceColorTimeoutRef.current);
        priceColorTimeoutRef.current = setTimeout(() => {
          setPriceColor('text-green-400');
        }, 1000); // Longer duration for stability
      } else if (isFalling) {
        setPriceColor('text-red-400 animate-pulse');

        if (priceColorTimeoutRef.current) clearTimeout(priceColorTimeoutRef.current);
        priceColorTimeoutRef.current = setTimeout(() => {
          setPriceColor('text-red-400');
        }, 1000);
      }

      lastPriceRef.current = marketData.price;

      return () => {
        if (priceColorTimeoutRef.current) {
          clearTimeout(priceColorTimeoutRef.current);
        }
      };
    }, [marketData.price]);

    const isMobile = screenService.isMobile();
    const showFPS = useGameStore(state => state.graphics.showFPS);

    return (
      <div
        id="game-ui-overlay"
        className="pointer-events-none fixed left-0 top-0 flex w-full flex-col gap-2 font-mono"
        style={{
          zIndex: Z_LAYERS.HUD,
          // Mobile: Use safe-area-inset-top + extra padding for notch/status bar
          // Desktop: Standard padding with safe area fallback
          paddingTop: isMobile
            ? `calc(env(safe-area-inset-top, 0px) + 2rem)`
            : `calc(1.5rem + env(safe-area-inset-top, 0px))`,
          paddingLeft: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-left, 0px))`,
          paddingRight: `calc(${isMobile ? '1rem' : '1.5rem'} + env(safe-area-inset-right, 0px))`,
        }}
      >
        {/* ROW 1: TOP ALIGNED ELEMENTS (Timer & Pause) */}
        <div className="relative flex min-h-[44px] w-full items-center justify-between">
          {/* Spacer to balance the layout for desktop, on mobile we use absolute center for timer */}
          <div className="flex-1"></div>

          {/* Survival Time - Centered */}
          <div
            className={`${isMobile ? 'absolute left-1/2 -translate-x-1/2' : 'flex flex-1 justify-center'}`}
          >
            <WaveTimer />
          </div>

          {/* Pause Button - Aligned Right */}
          <div className="flex flex-1 justify-end">
            {status === GameStatus.PLAYING && onTogglePause && (
              <div
                className="pointer-events-auto relative z-[3005] -m-2 p-2"
                style={{
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
              >
                <button
                  type="button"
                  onPointerDown={e => {
                    e.stopPropagation();
                    Logger.info('[GameUI] Pause button pressed (PointerDown)');
                    onTogglePause();
                  }}
                  className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-sm border border-white/20 bg-slate-900/80 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all active:scale-75 active:bg-slate-700 md:h-14 md:w-14"
                  style={{
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'none',
                  }}
                  title={String(t('hud.pause_title'))}
                  aria-label={String(t('hud.pause_aria'))}
                >
                  <div className="pointer-events-none flex gap-1.5">
                    <div className="h-6 w-1.5 rounded-full bg-white shadow-sm"></div>
                    <div className="h-6 w-1.5 rounded-full bg-white shadow-sm"></div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: HUD CORE (Live Feed & Kernel Status) */}
        <div className="mt-2 flex w-full items-start justify-between">
          {/* Left Panel: Live Feed */}
          <div className="hud-element-left flex max-w-[55%] flex-col gap-2 lg:max-w-none">
            <LiveFeed
              marketData={marketData}
              entryPrice={entryPrice}
              priceColor={priceColor}
            />
            {/* Buff Indicator - Below LiveFeed */}
            {status === GameStatus.PLAYING && <BuffIndicator status={status} />}
            {/* Mobile FPS Counter - Below LiveFeed */}
            {isMobile && showFPS && <FPSCounter />}
          </div>

          {/* Right Panel: Enhanced Stats / Level */}
          <div className="hud-element-right flex max-w-[40%] flex-col items-end gap-3 lg:max-w-none">
            <KernelStatus player={player} />
          </div>
        </div>

        {/* Account Health (Bottom) - Adaptive Component */}
        <AccountHealthPremium
          hpPercent={hpPercent}
          hp={smoothValues.hp}
          maxHp={player.maxHp}
        />

        {/* Liquidation Warning Overlay */}
        <LiquidationWarningOverlay fovReduction={fovReduction} />
      </div>
    );
  }
);
