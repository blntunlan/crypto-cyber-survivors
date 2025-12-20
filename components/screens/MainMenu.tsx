import React, { useState } from 'react';
import { MarketPosition, LeverageOption, LEVERAGE_OPTIONS } from '../../types';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption) => void;
  onOpenSettings: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ price, onStart, onOpenSettings }) => {
  const [selectedLeverage, setSelectedLeverage] = useState<LeverageOption>(10);

  const getLeverageColor = (lev: LeverageOption) => {
    if (lev <= 2) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (lev <= 10) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    if (lev <= 25) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getLeverageLabel = (lev: LeverageOption) => {
    if (lev === 1) return 'SPOT';
    if (lev <= 2) return 'SAFE';
    if (lev <= 10) return 'STANDARD';
    if (lev <= 25) return 'RISKY';
    return 'DEGEN';
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
      <div className="max-w-xl w-full text-center space-y-8">
        <header className="space-y-4 pt-12 sm:pt-0">
          <h1 className="text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            CRYPTO
            <br />
            <span className="text-yellow-500">SURVIVORS</span>
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
              Market Sentiment Engine
            </p>
            <OptimizationBadge />
          </div>
        </header>

        <div className="bg-slate-900/40 border border-white/5 p-8 rounded-2xl space-y-6">
          <div className="text-5xl font-black text-white tracking-tighter">
            {price > 0
              ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : 'CONNECTING...'}
          </div>

          {/* Leverage Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                Leverage
              </span>
              <span
                className={`text-xs font-black uppercase px-2 py-0.5 rounded ${getLeverageColor(selectedLeverage)}`}
              >
                {getLeverageLabel(selectedLeverage)}
              </span>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {LEVERAGE_OPTIONS.map(lev => (
                <button
                  key={lev}
                  onClick={() => setSelectedLeverage(lev)}
                  className={`px-3 py-2 rounded-lg border font-black text-sm transition-all ${
                    selectedLeverage === lev
                      ? getLeverageColor(lev) + ' ring-2 ring-white/20 scale-110'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lev === 1 ? '1x' : `${lev}x`}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-600 mt-1">
              Higher leverage = More volatile difficulty & bigger swings
            </p>
          </div>

          {/* Position Selection */}
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => onStart(MarketPosition.LONG, selectedLeverage)}
              className="flex flex-col items-center p-6 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500 transition-all hover:bg-green-500/20 group"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📈</div>
              <span className="font-black text-green-500 text-lg uppercase">Long</span>
              <span className="text-[10px] text-green-500/60 mt-1">{selectedLeverage}x</span>
            </button>
            <button
              onClick={() => onStart(MarketPosition.SHORT, selectedLeverage)}
              className="flex flex-col items-center p-6 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500 transition-all hover:bg-red-500/20 group"
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📉</div>
              <span className="font-black text-red-500 text-lg uppercase">Short</span>
              <span className="text-[10px] text-red-500/60 mt-1">{selectedLeverage}x</span>
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full py-4 bg-slate-800 text-white font-black uppercase text-xs tracking-widest rounded-xl border border-white/10 hover:bg-slate-700 transition-all"
          >
            Settings
          </button>
          <div className="pt-2 text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            WASD / Arrows to Move • SPACE to Dash
          </div>
        </div>
      </div>
    </div>
  );
};
const OptimizationBadge = () => {
  const config = DeviceBenchmarkService.getPerformanceConfig();
  const profile = config.profile;

  const getColor = (p: DeviceProfile) => {
    switch (p) {
      case DeviceProfile.ULTRA:
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case DeviceProfile.HIGH:
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case DeviceProfile.MEDIUM:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case DeviceProfile.LOW:
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div
      className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getColor(profile)}`}
    >
      Optimized: {profile}
    </div>
  );
};
