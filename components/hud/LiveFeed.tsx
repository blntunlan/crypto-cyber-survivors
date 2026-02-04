import React, { memo, useEffect, useState } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
// Import crypto config
import { CRYPTO_PAIRS } from '../../types/crypto';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { EventBus } from '../../services/core/EventBus';
import { type MarketStateData } from '../../types/events';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { LiveTicker } from '../themed/LiveTicker';

interface LiveFeedProps {
  marketData: MarketData;
  entryPrice: number;
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
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
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

/**
 * Live version of InfoRow that uses direct DOM updates for performance.
 */
const LiveInfoRow = memo(
  ({
    label,
    valueKey,
    id,
    formatter,
    colorClass = 'text-slate-100',
    isRetro = false,
  }: {
    label: string;
    valueKey: string;
    id: string;
    formatter: (val: number) => string;
    colorClass?: string;
    isRetro?: boolean;
  }) => {
    return (
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <LiveTicker
          id={id}
          valueKey={valueKey}
          formatter={formatter}
          className={`${colorClass} tabular-nums ${isRetro ? 'font-retro-text' : ''}`}
        />
      </div>
    );
  }
);

LiveInfoRow.displayName = 'LiveInfoRow';

const DesktopLiveFeed: React.FC<
  LiveFeedProps & { serverState: MarketStateData | null }
> = ({ marketData, entryPrice, priceColor, serverState }) => {
  const isRetro = useIsRetro();
  const { t } = useLanguage();

  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  return (
    <div className="flex min-w-[220px] flex-col gap-0 bg-transparent p-1.5 transition-[width] duration-300">
      <div className="mb-2 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} ${isRetro ? '' : 'animate-pulse'}`}
          ></span>
          {t('hud.live_feed')}
        </div>

        <div className="flex items-center gap-2 font-feed text-[10px] text-white">
          <span
            className={`rounded px-1 ${marketData.leverage >= 50 ? 'animate-pulse bg-amber-500 font-black text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10 opacity-60'}`}
          >
            {marketData.leverage >= 50 ? 'DEGEN' : ''} {marketData.leverage}X
          </span>
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
          <LiveTicker
            id={`${pairConfig.id}-price`}
            valueKey="price"
            formatter={(val: number) =>
              val.toLocaleString(undefined, {
                minimumFractionDigits: pairConfig.decimals,
                maximumFractionDigits: pairConfig.decimals,
              })
            }
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div
            className={`flex items-center gap-2 text-sm font-black ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
            style={{ color: pnlHex }}
          >
            <LiveTicker
              id="pnl-pct-ticker"
              valueKey="pnl"
              formatter={(val: number) => `${(val * 100).toFixed(2)}%`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <span className="text-[10px] uppercase tracking-widest opacity-70">
              {marketData.effectivePnl >= 0
                ? t('hud.profit_short')
                : t('hud.loss_short')}
            </span>
          </div>
          <div
            className={`text-xs font-black tabular-nums ${isRetro ? 'font-retro-text' : 'font-mono'}`}
            style={{ color: pnlHex, fontVariantNumeric: 'tabular-nums' }}
          >
            <LiveTicker
              id="pnl-usd-ticker"
              valueKey="pnl"
              formatter={(val: number) => {
                const amount = val * 1000;
                const formatted = Math.abs(amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
                return `${amount >= 0 ? '+' : '-'}$${formatted}`;
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800/30 pt-2">
        <InfoRow
          label={t('hud.entry')}
          value={entryPrice}
          decimals={pairConfig.decimals}
          isRetro={isRetro}
        />

        <LiveInfoRow
          id="vol-ticker"
          label={t('hud.volatility')}
          valueKey="difficulty"
          isRetro={isRetro}
          formatter={(val: number) => `x${val.toFixed(2)}`}
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
            <div className="mt-1 flex items-center justify-between border-t border-slate-800/50 pt-1 text-[9px] uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1">
                RSI <span className="text-[7px] opacity-50">({serverState.pair})</span>
              </span>
              <span
                className={`tabular-nums ${
                  serverState.rsi >= 70
                    ? 'font-bold text-red-400'
                    : serverState.rsi <= 30
                      ? 'font-bold text-green-400'
                      : 'text-slate-200'
                }`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {serverState.rsi.toFixed(1)}
              </span>
            </div>
            {serverState.whaleTier > 0 && (
              <div className="mt-1 animate-pulse rounded border border-amber-400/30 bg-amber-400/10 px-1 py-0.5 text-center text-[9px] font-black tracking-widest text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
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
> = ({ marketData, entryPrice, priceColor, serverState }) => {
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
    <div className="flex min-w-[140px] flex-col gap-0.5">
      {/* Row 1: Status header */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1 font-black uppercase tracking-widest text-slate-500"
          style={{ fontSize: rfs(9) }}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
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
          <span
            className={`rounded px-1 font-black ${marketData.leverage >= 50 ? 'animate-pulse bg-amber-500 text-black' : 'text-slate-500'}`}
            style={{ fontSize: rfs(8) }}
          >
            {marketData.leverage >= 50 ? 'DEGEN ' : ''}
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
          <LiveTicker
            id={`${pairConfig.id}-price-mobile`}
            valueKey="price"
            formatter={(val: number) =>
              val.toLocaleString(undefined, {
                minimumFractionDigits: displayDecimals,
                maximumFractionDigits: displayDecimals,
              })
            }
          />
        </div>
        <div
          className="w-fit rounded px-1.5 py-0.5 font-black leading-none"
          style={{
            backgroundColor: `${pnlHex}22`,
            color: pnlHex,
            fontSize: rfs(isSmallDevice ? 10 : 12),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <LiveTicker
            id="pnl-pct-mobile"
            valueKey="pnl"
            formatter={(val: number) =>
              `${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%`
            }
          />
        </div>
      </div>

      {/* Row 3: Compact indicator pills - All in one row */}
      <div
        className="mt-1 flex flex-wrap items-center gap-1"
        style={{ fontSize: rfs(isSmallDevice ? 9 : 10) }}
      >
        {/* Entry pill */}
        <div className="whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 font-mono font-bold tabular-nums text-slate-300">
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
              className={`whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 font-mono font-bold tabular-nums ${getLiqColor()}`}
            >
              LIQ: $
              {marketData.liquidationPrice.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          )}

        {/* Volatility pill */}
        <div className="whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 font-mono font-bold tabular-nums text-slate-300">
          {t('hud.volatility_short')} X
          <LiveTicker
            id="vol-mobile"
            valueKey="difficulty"
            formatter={(val: number) => val.toFixed(1)}
          />
        </div>

        {/* RSI pill */}
        {serverState && (
          <div
            className={`whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 font-mono font-bold tabular-nums ${getRsiColor()}`}
          >
            RSI {Math.round(serverState.rsi)}
          </div>
        )}

        {/* Whale indicator */}
        {serverState && serverState.whaleTier > 0 && (
          <div className="animate-pulse rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-400">
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
