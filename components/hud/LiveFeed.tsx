import React, { memo, useEffect, useState } from 'react';
import { type MarketData } from '../../types';
import { COLORS } from '../../constants';
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
  return (
    <div className="bg-transparent p-2 flex flex-col gap-0 min-w-[280px]">
      <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 mb-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}
        ></span>
        Live Index Feed
      </div>

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-4xl`}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div className="text-lg font-black flex items-center gap-2" style={{ color: pnlHex }}>
          {marketData.effectivePnl >= 0 ? 'PROFIT' : 'LOSS'}
          <span className="text-2xl">{smoothValues.pnl.toFixed(2)}%</span>
          <span className="text-[10px] opacity-60 font-mono">({marketData.leverage}x)</span>
        </div>
      </div>

      <div className="mt-2 space-y-0.5 opacity-60">
        <div className="text-[9px] text-slate-400 uppercase tracking-widest">
          Entry: ${entryPrice.toLocaleString()}
        </div>
        <div className="text-[9px] text-slate-400 uppercase tracking-widest">
          Volatility: x{smoothValues.difficulty.toFixed(2)}
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
  return (
    <div className="bg-white/5 backdrop-blur-md px-3 py-2 rounded-lg flex flex-col gap-0 min-w-[140px] border border-white/5 shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
          <span
            className={`w-1 h-1 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}
          ></span>
          LIVE
        </div>
        <div className="text-[8px] text-slate-400 font-mono opacity-60">{marketData.leverage}X</div>
      </div>

      <div className="flex flex-col">
        <div
          className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} text-xl leading-none`}
        >
          $
          {smoothValues.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
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
