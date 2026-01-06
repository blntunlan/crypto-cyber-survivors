import React, { memo, useEffect, useState } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
// Import crypto config
import { CRYPTO_PAIRS } from '../../types/crypto';
import { screenService } from '../../services/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import { EventBus } from '../../services/EventBus';
import { type MarketStateData } from '../../types/events';

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

const DesktopLiveFeed: React.FC<LiveFeedProps & { serverState: MarketStateData | null }> = ({
  marketData,
  entryPrice,
  smoothValues,
  priceColor,
  serverState,
}) => {
  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  return (
    <div className="bg-transparent p-2 flex flex-col gap-0 min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
          ></span>
          Live Feed
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
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-3xl leading-none`}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: pairConfig.decimals,
            maximumFractionDigits: pairConfig.decimals,
          })}
        </div>
        <div className="text-sm font-black flex items-center gap-2 mt-1" style={{ color: pnlHex }}>
          <span>{(smoothValues.pnl * 100).toFixed(2)}%</span>
          <span className="text-[10px] opacity-70 tracking-widest uppercase">
            {marketData.effectivePnl >= 0 ? 'Profit' : 'Loss'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1 pt-2">
        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest">
          <span>Entry</span>
          <span className="text-slate-200">
            ${entryPrice.toLocaleString(undefined, { maximumFractionDigits: pairConfig.decimals })}
          </span>
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest">
          <span>Volatility</span>
          <span className="text-slate-200">x{smoothValues.difficulty.toFixed(2)}</span>
        </div>

        {marketData.liquidationPrice !== undefined && marketData.liquidationPrice > 0 && (
          <div className="flex justify-between items-center text-[9px] uppercase tracking-widest mt-1 pt-1 border-t border-slate-800/50">
            <span className="text-slate-400">Liquidation</span>
            <span
              className={
                marketData.effectivePnl <= -0.7
                  ? 'text-red-500 font-bold animate-pulse'
                  : marketData.effectivePnl <= -0.4
                    ? 'text-orange-400'
                    : 'text-slate-200'
              }
            >
              $
              {marketData.liquidationPrice.toLocaleString(undefined, {
                maximumFractionDigits: pairConfig.decimals,
              })}
            </span>
          </div>
        )}

        {serverState && (
          <>
            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest mt-1 pt-1 border-t border-slate-800/50">
              <span className="flex items-center gap-1">
                RSI <span className="text-[7px] opacity-50">({serverState.pair})</span>
              </span>
              <span
                className={
                  serverState.rsi >= 70
                    ? 'text-red-400 font-bold'
                    : serverState.rsi <= 30
                      ? 'text-green-400 font-bold'
                      : 'text-slate-200'
                }
              >
                {serverState.rsi.toFixed(1)}
              </span>
            </div>
            {serverState.whaleTier > 0 && (
              <div className="mt-1 text-center text-[9px] text-amber-400 font-black tracking-widest animate-pulse border border-amber-400/30 rounded bg-amber-400/10 px-1 py-0.5 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                ⚠️ WHALE DETECTED (T{serverState.whaleTier})
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const MobileLiveFeed: React.FC<LiveFeedProps & { serverState: MarketStateData | null }> = ({
  marketData,
  entryPrice,
  smoothValues,
  priceColor,
  serverState,
}) => {
  const { rs, rfs } = useResponsiveUI();
  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  return (
    <div
      className="bg-transparent flex flex-col gap-0 relative overflow-hidden"
      style={{
        paddingTop: rs(8),
        paddingBottom: rs(8),
        paddingLeft: rs(12),
        paddingRight: rs(12),
        minWidth: rs(140),
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div
          className="text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5"
          style={{ fontSize: rfs(9) }}
        >
          <span
            className={`w-1 h-1 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} opacity-75`}
          ></span>
          LIVE
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold" style={{ color: pairConfig.color, fontSize: rfs(10) }}>
            {pairConfig.id}
          </span>
          <div className="text-slate-400 font-feed opacity-60" style={{ fontSize: rfs(9) }}>
            {marketData.leverage}X
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} leading-none`}
          style={{ fontSize: rfs(24) }}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: pairConfig.decimals,
            maximumFractionDigits: pairConfig.decimals,
          })}
        </div>
        <div
          className="font-black flex items-center gap-1.5 mt-0.5"
          style={{ color: pnlHex, fontSize: rfs(12) }}
        >
          <span className="text-base">{(smoothValues.pnl * 100).toFixed(2)}%</span>
          <span className="opacity-70 tracking-tighter" style={{ fontSize: rfs(9) }}>
            {marketData.effectivePnl >= 0 ? 'PROFIT' : 'LOSS'}
          </span>
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-y-1 opacity-50 border-t border-white/5 pt-1">
        <div className="text-slate-300 uppercase leading-none" style={{ fontSize: rfs(8) }}>
          Entry ${Math.floor(entryPrice)}
        </div>
        <div
          className="text-slate-300 uppercase leading-none text-right"
          style={{ fontSize: rfs(8) }}
        >
          Vol x{smoothValues.difficulty.toFixed(1)}
        </div>
        {marketData.liquidationPrice !== undefined && marketData.liquidationPrice > 0 && (
          <div
            className={`col-span-2 uppercase leading-none text-center pt-1 mt-1 border-t border-white/5 ${marketData.effectivePnl <= -0.7 ? 'text-red-500 font-bold' : 'text-slate-400'}`}
            style={{ fontSize: rfs(8) }}
          >
            LIQ: $
            {marketData.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        )}
        {serverState && (
          <div
            className={`col-span-2 uppercase leading-none font-bold text-center border-t border-white/5 pt-0.5 mt-0.5 ${
              serverState.rsi >= 70
                ? 'text-red-400'
                : serverState.rsi <= 30
                  ? 'text-green-400'
                  : 'text-slate-400'
            }`}
            style={{ fontSize: rfs(8) }}
          >
            RSI {Math.round(serverState.rsi)} • {serverState.rsiState}
          </div>
        )}
      </div>

      {serverState && serverState.whaleTier > 0 && (
        <div className="absolute top-0 right-0 p-1 animate-pulse">
          <span
            className="text-amber-400 filter drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"
            style={{ fontSize: rfs(12) }}
          >
            🐋
          </span>
        </div>
      )}
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
