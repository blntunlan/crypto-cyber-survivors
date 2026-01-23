import React, { memo, useEffect, useState } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
// Import crypto config
import { CRYPTO_PAIRS } from '../../types/crypto';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { EventBus } from '../../services/EventBus';
import { type MarketStateData } from '../../types/events';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';

interface LiveFeedProps {
  marketData: MarketData;
  entryPrice: number;
  smoothValues: {
    price: number;
    pnl: number;
    difficulty: number;
  };
  priceColor: string;
}

/**
 * Sub-component for static/slow-updating info rows to prevent redundant re-renders
 * and maintain layout stability.
 */
const InfoRow = memo(
  ({
    label,
    value,
    isPrice = true,
    decimals = 2,
    colorClass = 'text-slate-100',
    isRetro = false,
    animate = false,
  }: {
    label: string;
    value: number | string;
    isPrice?: boolean;
    decimals?: number;
    colorClass?: string;
    isRetro?: boolean;
    animate?: boolean;
  }) => {
    const displayValue =
      typeof value === 'number'
        ? isPrice
          ? `$${value.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}`
          : `x${value.toFixed(2)}`
        : value;

    return (
      <div className="flex justify-between items-center text-[11px] uppercase tracking-widest font-bold">
        <span className="text-slate-400">{label}</span>
        <span
          className={`${colorClass} tabular-nums ${isRetro ? 'font-retro-text' : ''} ${animate ? 'animate-pulse' : ''}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {displayValue}
        </span>
      </div>
    );
  }
);

InfoRow.displayName = 'InfoRow';

const DesktopLiveFeed: React.FC<
  LiveFeedProps & { serverState: MarketStateData | null }
> = ({ marketData, entryPrice, smoothValues, priceColor, serverState }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  return (
    <div className="bg-transparent p-1.5 flex flex-col gap-0 min-w-[220px] transition-[width] duration-300">
      <div className="flex items-center justify-between mb-2">
        <div
          className={`text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] flex items-center gap-2 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} ${isRetro ? '' : 'animate-pulse'}`}
          ></span>
          {t('hud.live_feed')}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-feed text-white">
          <span className="opacity-40">{marketData.leverage}X</span>
          <span style={{ color: pairConfig.color }} className="font-black">
            {pairConfig.id}
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-3xl leading-none ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{ fontVariantNumeric: 'tabular-nums', minWidth: '180px' }}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: pairConfig.decimals,
            maximumFractionDigits: pairConfig.decimals,
          })}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div
            className={`text-sm font-black flex items-center gap-2 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
            style={{ color: pnlHex }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(smoothValues.pnl * 100).toFixed(2)}%
            </span>
            <span className="text-[10px] opacity-70 tracking-widest uppercase">
              {marketData.effectivePnl >= 0
                ? t('hud.profit_short')
                : t('hud.loss_short')}
            </span>
          </div>
          <div
            className={`text-xs font-black tabular-nums ${isRetro ? 'font-retro-text' : 'font-mono'}`}
            style={{ color: pnlHex, fontVariantNumeric: 'tabular-nums' }}
          >
            {smoothValues.pnl >= 0 ? '+' : ''}$
            {(smoothValues.pnl * 1000).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-800/30">
        <InfoRow
          label={t('hud.entry')}
          value={entryPrice}
          decimals={pairConfig.decimals}
          isRetro={isRetro}
        />

        <InfoRow
          label={t('hud.volatility')}
          value={smoothValues.difficulty}
          isPrice={false}
          isRetro={isRetro}
        />

        {marketData.liquidationPrice !== undefined &&
          marketData.liquidationPrice > 0 && (
            <InfoRow
              label={t('hud.liquidation')}
              value={marketData.liquidationPrice}
              decimals={pairConfig.decimals}
              isRetro={isRetro}
              colorClass={
                marketData.effectivePnl <= -0.7
                  ? 'text-red-500 font-bold'
                  : marketData.effectivePnl <= -0.4
                    ? 'text-orange-400'
                    : 'text-slate-200'
              }
              animate={marketData.effectivePnl <= -0.7}
            />
          )}

        {serverState && (
          <>
            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest mt-1 pt-1 border-t border-slate-800/50">
              <span className="flex items-center gap-1">
                RSI <span className="text-[7px] opacity-50">({serverState.pair})</span>
              </span>
              <span
                className={`tabular-nums ${
                  serverState.rsi >= 70
                    ? 'text-red-400 font-bold'
                    : serverState.rsi <= 30
                      ? 'text-green-400 font-bold'
                      : 'text-slate-200'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {serverState.rsi.toFixed(1)}
              </span>
            </div>
            {serverState.whaleTier > 0 && (
              <div className="mt-1 text-center text-[9px] text-amber-400 font-black tracking-widest animate-pulse border border-amber-400/30 rounded bg-amber-400/10 px-1 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                ⚠️ {t('hud.whale_detected')} (T{serverState.whaleTier})
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const MobileLiveFeed: React.FC<
  LiveFeedProps & { serverState: MarketStateData | null }
> = ({ marketData, entryPrice, smoothValues, priceColor, serverState }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();
  const { rfs, isSmallDevice } = useResponsiveUI();

  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];
  const displayDecimals = isSmallDevice
    ? Math.min(pairConfig.decimals, 2)
    : pairConfig.decimals;

  // RSI status color
  const getRsiColor = () => {
    if (!serverState) return 'text-slate-500';
    if (serverState.rsi >= 70) return 'text-red-400';
    if (serverState.rsi <= 30) return 'text-green-400';
    return 'text-slate-300';
  };

  // Liquidation status color
  const getLiqColor = () => {
    if (marketData.effectivePnl <= -0.7) return 'text-red-500';
    if (marketData.effectivePnl <= -0.4) return 'text-orange-400';
    return 'text-slate-300';
  };

  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      {/* Row 1: Status header */}
      <div className="flex items-center justify-between">
        <div
          className="text-slate-500 uppercase font-black tracking-widest flex items-center gap-1"
          style={{ fontSize: rfs(9) }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
          />
          LIVE
        </div>
        <div className="flex items-center gap-1">
          <span
            className="font-bold"
            style={{ color: pairConfig.color, fontSize: rfs(9) }}
          >
            {pairConfig.id}
          </span>
          <span className="text-slate-500" style={{ fontSize: rfs(8) }}>
            {marketData.leverage}X
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div
          className={`font-black tracking-tighter ${priceColor} leading-none ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{
            fontSize: rfs(isSmallDevice ? 18 : 22),
            fontVariantNumeric: 'tabular-nums',
            minWidth: '100px',
          }}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: displayDecimals,
            maximumFractionDigits: displayDecimals,
          })}
        </div>
        <div
          className="font-black px-1.5 py-0.5 rounded leading-none w-fit"
          style={{
            backgroundColor: `${pnlHex}22`,
            color: pnlHex,
            fontSize: rfs(isSmallDevice ? 10 : 12),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {(smoothValues.pnl * 100).toFixed(2)}%
        </div>
      </div>

      {/* Row 3: Compact indicator pills - All in one row */}
      <div
        className="flex items-center gap-1 mt-1 flex-wrap"
        style={{ fontSize: rfs(isSmallDevice ? 9 : 10) }}
      >
        {/* Entry pill */}
        <div className="bg-white/5 px-1.5 py-0.5 rounded text-slate-300 font-mono font-bold whitespace-nowrap tabular-nums">
          {t('hud.entry_short')} $
          {entryPrice.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </div>

        {/* Liquidation pill */}
        {marketData.liquidationPrice !== undefined &&
          marketData.liquidationPrice > 0 && (
            <div
              className={`bg-white/5 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap tabular-nums ${getLiqColor()}`}
            >
              LIQ: $
              {marketData.liquidationPrice.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          )}

        {/* Volatility pill */}
        <div className="bg-white/5 px-1.5 py-0.5 rounded text-slate-300 font-mono font-bold whitespace-nowrap tabular-nums">
          {t('hud.volatility_short')} X{smoothValues.difficulty.toFixed(1)}
        </div>

        {/* RSI pill */}
        {serverState && (
          <div
            className={`bg-white/5 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap tabular-nums ${getRsiColor()}`}
          >
            RSI {Math.round(serverState.rsi)}
          </div>
        )}

        {/* Whale indicator */}
        {serverState && serverState.whaleTier > 0 && (
          <div className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-400 font-bold animate-pulse">
            🐋 T{serverState.whaleTier}
          </div>
        )}
      </div>
    </div>
  );
};

export const LiveFeed: React.FC<LiveFeedProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());
  const [serverState, setServerState] = useState<MarketStateData | null>(null);

  useEffect(() => {
    // Screen resize listener
    const unsubscribeScreen = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });

    // Server state listener
    const handleMarketUpdate = (data: MarketStateData) => {
      setServerState(data);
    };
    const unsubscribeBus = EventBus.on('marketStateUpdated', handleMarketUpdate);

    return () => {
      unsubscribeScreen();
      unsubscribeBus();
    };
  }, []);

  return isMobile ? (
    <MobileLiveFeed {...props} serverState={serverState} />
  ) : (
    <DesktopLiveFeed {...props} serverState={serverState} />
  );
});
