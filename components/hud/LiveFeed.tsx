import React, { memo, useEffect, useState } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
// Import crypto config
import { CRYPTO_PAIRS } from '../../types/crypto';
import { screenService } from '../../services/ScreenService';

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

const DesktopLiveFeed: React.FC<LiveFeedProps> = ({
  marketData,
  entryPrice,
  smoothValues,
  priceColor,
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
        <div className="flex items-center gap-2 text-[10px] font-mono text-white">
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
          <span>{smoothValues.pnl.toFixed(2)}%</span>
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
      </div>
    </div>
  );
};

const MobileLiveFeed: React.FC<LiveFeedProps> = ({
  marketData,
  entryPrice,
  smoothValues,
  priceColor,
}) => {
  const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;
  const pairConfig = CRYPTO_PAIRS[marketData.pair ?? 'BTC'];

  return (
    <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-lg flex flex-col gap-0 min-w-[140px] border border-white/5 shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
          <span
            className={`w-1 h-1 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} opacity-75`}
          ></span>
          LIVE
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold" style={{ color: pairConfig.color }}>
            {pairConfig.id}
          </span>
          <div className="text-[8px] text-slate-400 font-mono opacity-60">
            {marketData.leverage}X
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-xl leading-none`}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: pairConfig.decimals,
            maximumFractionDigits: pairConfig.decimals,
          })}
        </div>
        <div
          className="text-xs font-black flex items-center gap-1.5 mt-0.5"
          style={{ color: pnlHex }}
        >
          <span className="text-sm">{smoothValues.pnl.toFixed(2)}%</span>
          <span className="text-[8px] opacity-70 tracking-tighter">
            {marketData.effectivePnl >= 0 ? 'PROFIT' : 'LOSS'}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2 opacity-50 border-t border-white/5 pt-1">
        <div className="text-[7px] text-slate-300 uppercase leading-none">
          Entry ${Math.floor(entryPrice)}
        </div>
        <div className="text-[7px] text-slate-300 uppercase leading-none">
          Vol x{smoothValues.difficulty.toFixed(1)}
        </div>
      </div>
    </div>
  );
};

export const LiveFeed: React.FC<LiveFeedProps> = memo(props => {
  const [isMobile, setIsMobile] = useState(screenService.isMobile());

  useEffect(() => {
    const unsubscribe = screenService.onChange(() => {
      setIsMobile(screenService.isMobile());
    });
    return unsubscribe;
  }, []);

  return isMobile ? <MobileLiveFeed {...props} /> : <DesktopLiveFeed {...props} />;
});
