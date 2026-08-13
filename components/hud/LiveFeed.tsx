import React, { memo, useEffect } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
// Import crypto config
import { CRYPTO_PAIRS } from '../../types/crypto';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { EventBus } from '../../services/core/EventBus';
import {
  type MarketStateData,
  type ClientIndicatorsUpdatedEvent,
} from '../../types/events';
import { useIsRetro } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { HudGhostRail } from './HudGhostRail';
import { HUD_WAR_ROOM } from '../../config/HUDWarRoom';
import { MARKET_REGIME_TELEGRAPH } from '../../config/MarketRegimeTelegraph';
import { useMarketRegime } from '../../hooks/useMarketRegime';
import { LiveTicker } from '../themed/LiveTicker';
import { ClientIndicatorService } from '../../services/indicators/ClientIndicatorService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getNumberLocale } from '../../utils/numberLocale';

interface LiveFeedProps {
  marketData: MarketData;
  entryPrice: number;
  priceColor: string;
}

const text = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(' ') : value;

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
    locale,
  }: {
    label: string;
    value: number | string;
    isPrice?: boolean;
    decimals?: number;
    colorClass?: string;
    isRetro?: boolean;
    animate?: boolean;
    locale: string;
  }) => {
    const displayValue =
      typeof value === 'number'
        ? isPrice
          ? `$${value.toLocaleString(locale, {
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

/**
 * Market regime telegraph. The only channel left telling the player the tape
 * changed after the market banner / announcements / canvas overlays were
 * removed — deliberately confined to this rail (see config/MarketRegimeTelegraph).
 */
const MarketRegimeChip: React.FC = () => {
  const { regime, isShifting, shiftKey } = useMarketRegime();
  const color = MARKET_REGIME_TELEGRAPH.colors[regime];

  return (
    <div
      key={shiftKey}
      data-testid="market-regime-chip"
      data-regime={regime}
      data-shifting={isShifting}
      className={`mb-1 flex items-center gap-1.5 self-start border-l px-1.5 py-0.5 font-cyber text-[9px] font-black uppercase tracking-[0.18em] transition-opacity duration-300 ${
        isShifting ? 'opacity-100' : 'opacity-60'
      }`}
      style={{ borderColor: color, color }}
    >
      <span
        className={`h-1 w-1 rounded-full ${isShifting ? 'animate-ping' : ''}`}
        style={{ backgroundColor: color }}
      />
      {MARKET_REGIME_TELEGRAPH.labels[regime]}
    </div>
  );
};

MarketRegimeChip.displayName = 'MarketRegimeChip';

const formatVolatility = (val: number) => `x${val.toFixed(2)}`;
const formatPnlPct = (val: number) => `${(val * 100).toFixed(2)}%`;
const formatPnlUsd = (val: number) => {
  const amount = val * 1000;
  const formatted = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount >= 0 ? '+' : '-'}$${formatted}`;
};
const formatPnlPctMobile = (val: number) =>
  `${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%`;
const formatVolMobile = (val: number) => val.toFixed(1);

const DesktopLiveFeed: React.FC<
  LiveFeedProps & {
    serverState: MarketStateData | null;
    clientIndicators: ClientIndicatorsUpdatedEvent | null;
  }
> = ({ marketData, entryPrice, priceColor, serverState, clientIndicators }) => {
  const isRetro = useIsRetro();
  const { t, language } = useLanguage();
  const numberLocale = getNumberLocale(language);

  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  // Trend Arrow
  const getTrendIcon = () => {
    const iconClass = 'h-3 w-3 inline-block mb-0.5';
    if (!clientIndicators) {
      return <Minus className={iconClass} />;
    }
    if (clientIndicators.trendDirection === 'UP') {
      return <TrendingUp className={iconClass} />;
    }
    if (clientIndicators.trendDirection === 'DOWN') {
      return <TrendingDown className={iconClass} />;
    }
    return <Minus className={iconClass} />;
  };

  const trendColor = !clientIndicators
    ? 'text-slate-500'
    : clientIndicators.trendDirection === 'UP'
      ? 'text-green-400'
      : clientIndicators.trendDirection === 'DOWN'
        ? 'text-red-400'
        : 'text-slate-400';

  return (
    <HudGhostRail
      testId="war-room-market-intel"
      side="left"
      tone="gold"
      className="flex w-full flex-col gap-0 py-1 transition-[width] duration-300"
      style={{
        minWidth: HUD_WAR_ROOM.liveFeed.minWidth,
        maxWidth: HUD_WAR_ROOM.liveFeed.maxWidth,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${isRetro ? 'font-retro-text' : 'font-cyber'}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
          ></span>
          {t('hud.live_feed')}
        </div>

        <div className="flex items-center gap-2 font-feed text-[10px] text-white">
          <span
            className={`border-l px-1 ${marketData.leverage >= 20 ? 'border-amber-400 font-black text-amber-300' : 'border-white/30 opacity-60'}`}
          >
            {marketData.leverage >= 20 ? 'DEGEN' : ''} {marketData.leverage}X
          </span>
          <span style={{ color: pairConfig.color }} className="font-black">
            {pairConfig.id}
          </span>
        </div>
      </div>

      <MarketRegimeChip />

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-3xl leading-none ${isRetro ? 'font-retro-pixel' : 'font-cyber'}`}
          style={{ fontVariantNumeric: 'tabular-nums', minWidth: '180px' }}
        >
          $
          <LiveTicker
            id={`${pairConfig.id}-price`}
            valueKey="price"
            formatter={React.useCallback(
              (val: number) =>
                val.toLocaleString(numberLocale, {
                  minimumFractionDigits: pairConfig.decimals,
                  maximumFractionDigits: pairConfig.decimals,
                }),
              [numberLocale, pairConfig.decimals]
            )}
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
              formatter={formatPnlPct}
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
            <LiveTicker id="pnl-usd-ticker" valueKey="pnl" formatter={formatPnlUsd} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800/30 pt-2">
        <InfoRow
          label={text(t('hud.entry'))}
          value={entryPrice}
          decimals={pairConfig.decimals}
          isRetro={isRetro}
          locale={numberLocale}
        />

        <LiveInfoRow
          id="vol-ticker"
          label={text(t('hud.volatility'))}
          valueKey="difficulty"
          isRetro={isRetro}
          formatter={formatVolatility}
        />

        {marketData.liquidationPrice !== undefined &&
          marketData.liquidationPrice > 0 && (
            <InfoRow
              label={text(t('hud.liquidation'))}
              value={marketData.liquidationPrice}
              decimals={pairConfig.decimals}
              isRetro={isRetro}
              locale={numberLocale}
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

        {/* Client Indicators Section */}
        {clientIndicators && (
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-800/50 pt-2 text-[9px]">
            {/* Trend */}
            <div className="flex items-center justify-between uppercase tracking-widest text-slate-400">
              <span>Trend</span>
              <span className={`font-bold ${trendColor}`}>
                {getTrendIcon()} {(clientIndicators.trendStrength * 100).toFixed(0)}%
              </span>
            </div>

            {/* ATR/Vol */}
            <div className="flex items-center justify-between uppercase tracking-widest text-slate-400">
              <span>ATR</span>
              <span
                className={`font-bold ${clientIndicators.atrPercent > 0.5 ? 'text-orange-400' : 'text-slate-200'}`}
              >
                {(clientIndicators.atrPercent * 100).toFixed(2)}%
              </span>
            </div>

            {/* Volume */}
            <div className="col-span-2 flex items-center justify-between uppercase tracking-widest text-slate-400">
              <span>Vol Rank</span>
              <div className="flex items-center gap-1">
                <div className="h-1 w-12 overflow-hidden rounded bg-slate-800">
                  <div
                    className={`h-full ${clientIndicators.normalizedVolume > 0.8 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${clientIndicators.normalizedVolume * 100}%` }}
                  />
                </div>
                <span className="font-bold text-slate-200">
                  {(clientIndicators.normalizedVolume * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {serverState && (
          <div className="mt-1 flex items-center justify-between pt-1 text-[9px] uppercase tracking-widest text-slate-400">
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
        )}

        {Math.max(clientIndicators?.whaleTier ?? 0, serverState?.whaleTier ?? 0) >
          0 && (
          <div className="mt-1 border-l-2 border-amber-400 px-1 text-center text-[9px] font-black tracking-widest text-amber-400">
            ⚠️ {t('hud.whale_detected')} (T
            {Math.max(clientIndicators?.whaleTier ?? 0, serverState?.whaleTier ?? 0)})
          </div>
        )}
      </div>
    </HudGhostRail>
  );
};

const MobileLiveFeed: React.FC<
  LiveFeedProps & {
    serverState: MarketStateData | null;
    clientIndicators: ClientIndicatorsUpdatedEvent | null;
  }
> = ({ marketData, entryPrice, priceColor, serverState, clientIndicators }) => {
  const isRetro = useIsRetro();
  const { t, language } = useLanguage();
  const numberLocale = getNumberLocale(language);
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

  const getTrendIcon = () => {
    const iconClass = 'h-2 w-2 inline-block mb-0.5';
    if (!clientIndicators) {
      return null;
    }
    if (clientIndicators.trendDirection === 'UP') {
      return <TrendingUp className={iconClass} />;
    }
    if (clientIndicators.trendDirection === 'DOWN') {
      return <TrendingDown className={iconClass} />;
    }
    return <Minus className={iconClass} />;
  };

  return (
    <HudGhostRail
      testId="war-room-market-intel"
      side="left"
      tone="gold"
      className="flex w-full min-w-0 max-w-full flex-col gap-0.5 overflow-hidden"
    >
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
            className={`border-l px-1 font-black ${marketData.leverage >= 20 ? 'border-amber-400 text-amber-300' : 'border-white/30 text-slate-500'}`}
            style={{ fontSize: rfs(8) }}
          >
            {marketData.leverage >= 20 ? 'DEGEN ' : ''}
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
            minWidth: 0,
            maxWidth: '100%',
            overflow: 'hidden',
          }}
        >
          $
          <LiveTicker
            id={`${pairConfig.id}-price-mobile`}
            valueKey="price"
            formatter={React.useCallback(
              (val: number) =>
                val.toLocaleString(numberLocale, {
                  minimumFractionDigits: displayDecimals,
                  maximumFractionDigits: displayDecimals,
                }),
              [displayDecimals, numberLocale]
            )}
          />
        </div>
        <div
          className="w-fit border-l px-1.5 py-0.5 font-black leading-none"
          style={{
            borderColor: pnlHex,
            color: pnlHex,
            fontSize: rfs(isSmallDevice ? 10 : 12),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <LiveTicker
            id="pnl-pct-mobile"
            valueKey="pnl"
            formatter={formatPnlPctMobile}
          />
        </div>
      </div>

      {/* Row 3: Compact indicator pills - Scrollable row without pushing height */}
      <div
        data-testid="mobile-live-feed-pills"
        className="mt-1 flex flex-wrap items-center gap-1 overflow-visible"
        style={{
          fontSize: rfs(isSmallDevice ? 9 : 10),
          maxWidth: '100%',
          paddingBottom: '2px', // Prevent cutoff
        }}
      >
        {/* Entry pill */}
        <div className="whitespace-nowrap border-l border-white/30 px-1.5 py-0.5 font-mono font-bold tabular-nums text-slate-300">
          {t('hud.entry_short')} $
          {entryPrice.toLocaleString(numberLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </div>

        {/* Liquidation pill */}
        {marketData.liquidationPrice !== undefined &&
          marketData.liquidationPrice > 0 && (
            <div
              className={`whitespace-nowrap border-l border-white/30 px-1.5 py-0.5 font-mono font-bold tabular-nums ${getLiqColor()}`}
            >
              LIQ: $
              {marketData.liquidationPrice.toLocaleString(numberLocale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          )}

        {/* Volatility pill */}
        <div className="whitespace-nowrap border-l border-white/30 px-1.5 py-0.5 font-mono font-bold tabular-nums text-slate-300">
          {t('hud.volatility_short')} X
          <LiveTicker
            id="vol-mobile"
            valueKey="difficulty"
            formatter={formatVolMobile}
          />
        </div>

        {/* RSI pill */}
        {serverState && (
          <div
            className={`whitespace-nowrap border-l border-white/30 px-1.5 py-0.5 font-mono font-bold tabular-nums ${getRsiColor()}`}
          >
            RSI {Math.round(serverState.rsi)}
          </div>
        )}

        {/* Whale indicator */}
        {Math.max(clientIndicators?.whaleTier ?? 0, serverState?.whaleTier ?? 0) >
          0 && (
          <div className="border-l border-amber-400 px-1.5 py-0.5 font-bold text-amber-400">
            🐋 T
            {Math.max(clientIndicators?.whaleTier ?? 0, serverState?.whaleTier ?? 0)}
          </div>
        )}

        <MarketRegimeChip />

        {/* Trend Indicator Mobile */}
        {clientIndicators && clientIndicators.trendDirection !== 'SIDEWAYS' && (
          <div
            className={`whitespace-nowrap border-l border-white/30 px-1.5 py-0.5 font-bold tabular-nums ${
              clientIndicators.trendDirection === 'UP'
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {getTrendIcon()} {(clientIndicators.trendStrength * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </HudGhostRail>
  );
};

export const LiveFeed: React.FC<LiveFeedProps> = memo(props => {
  const pendingDispatchTimersRef = React.useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set()
  );
  const [state, dispatch] = React.useReducer(
    (
      prev: {
        isMobile: boolean;
        serverState: MarketStateData | null;
        clientIndicators: ClientIndicatorsUpdatedEvent | null;
      },
      update: Partial<{
        isMobile: boolean;
        serverState: MarketStateData | null;
        clientIndicators: ClientIndicatorsUpdatedEvent | null;
      }>
    ) => ({ ...prev, ...update }),
    null,
    () => ({
      isMobile: screenService.isMobile(),
      serverState: null,
      clientIndicators: null,
    })
  );

  useEffect(() => {
    const pendingDispatchTimers = pendingDispatchTimersRef.current;
    const scheduleDispatch = (
      update: Partial<{
        isMobile: boolean;
        serverState: MarketStateData | null;
        clientIndicators: ClientIndicatorsUpdatedEvent | null;
      }>
    ) => {
      const timer = setTimeout(() => {
        pendingDispatchTimers.delete(timer);
        dispatch(update);
      }, 0);
      pendingDispatchTimers.add(timer);
    };

    // Screen resize listener
    const unsubscribeScreen = screenService.onChange(() => {
      scheduleDispatch({ isMobile: screenService.isMobile() });
    });

    // Server state listener
    const handleMarketUpdate = (data: MarketStateData) => {
      scheduleDispatch({ serverState: data });
    };

    // Client indicators listener
    const handleClientIndicators = (data: ClientIndicatorsUpdatedEvent) => {
      scheduleDispatch({ clientIndicators: data });
    };

    const unsubscribeBus = EventBus.on('marketStateUpdated', handleMarketUpdate);
    const unsubscribeIndicators = EventBus.on(
      'clientIndicatorsUpdated',
      handleClientIndicators
    );

    // Initialize/Update active pair
    if (props.marketData.pair) {
      ClientIndicatorService.setPair(props.marketData.pair);
    }

    // Initial fetch to ensure we have data immediately if available
    dispatch({
      clientIndicators:
        ClientIndicatorService.getState() as unknown as ClientIndicatorsUpdatedEvent,
    });

    return () => {
      unsubscribeScreen();
      unsubscribeBus();
      unsubscribeIndicators();
      pendingDispatchTimers.forEach(timer => clearTimeout(timer));
      pendingDispatchTimers.clear();
    };
  }, [props.marketData.pair]);

  return state.isMobile ? (
    <MobileLiveFeed
      {...props}
      serverState={state.serverState}
      clientIndicators={state.clientIndicators}
    />
  ) : (
    <DesktopLiveFeed
      {...props}
      serverState={state.serverState}
      clientIndicators={state.clientIndicators}
    />
  );
});
