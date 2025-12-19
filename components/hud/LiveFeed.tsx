import React, { memo } from 'react';
import { MarketData } from '../../types';
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

export const LiveFeed: React.FC<LiveFeedProps> = memo(({ marketData, entryPrice, smoothValues, priceColor }) => {
    const isMobile = screenService.isMobile();
    const pnlHex = marketData.effectivePnl >= 0 ? COLORS.PUMP_GREEN : COLORS.DUMP_ORANGE;

    return (
        <div className={`bg-transparent p-2 flex flex-col gap-0 ${isMobile ? 'min-w-[150px]' : 'min-w-[280px]'}`}>
            <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-slate-500 uppercase font-black tracking-[0.3em] flex items-center gap-2 mb-1`}>
                <span
                    className={`w-1.5 h-1.5 rounded-full ${marketData.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'} animate-ping`}
                ></span>
                Live Index Feed
            </div>

            <div className="flex flex-col">
                <div
                    className={`font-black tracking-tighter transition-colors duration-300 ${priceColor} ${isMobile ? 'text-2xl' : 'text-4xl'}`}
                >
                    $
                    {smoothValues.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </div>
                <div className={`${isMobile ? 'text-sm' : 'text-lg'} font-black flex items-center gap-2`} style={{ color: pnlHex }}>
                    {marketData.effectivePnl >= 0 ? 'PROFIT' : 'LOSS'}
                    <span className={isMobile ? 'text-lg' : 'text-2xl'}>{smoothValues.pnl.toFixed(2)}%</span>
                    <span className="text-[10px] opacity-60 font-mono">({marketData.leverage}x)</span>
                </div>
            </div>

            <div className={`mt-2 ${isMobile ? 'space-y-0' : 'space-y-0.5'} opacity-60`}>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                    Entry: ${entryPrice.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest">
                    Volatility: x{smoothValues.difficulty.toFixed(2)}
                </div>
            </div>
        </div>
    );
});
