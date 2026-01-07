import React, { useState, useEffect, useMemo } from 'react';
import { MarketPosition, type LeverageOption, LEVERAGE_OPTIONS } from '../../types';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { CryptoSelector } from '../ui/CryptoSelector';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { audio } from '../../services/AudioService';
import { useThemeSize } from '../../hooks/useThemeSize';

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption) => void;
  onOpenSettings: () => void;
  selectedPair: CryptoPair;
  onPairChange: (pair: CryptoPair) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  price,
  onStart,
  onOpenSettings,
  selectedPair,
  onPairChange,
}) => {
  const sizes = useThemeSize();
  const [selectedLeverage, setSelectedLeverage] = useState<LeverageOption>(10);

  // Navigation State
  const [activeRow, setActiveRow] = useState<number>(0);
  // 0: Assets, 1: Leverage, 2: Actions (Long/Short), 3: Settings
  const [actionCol, setActionCol] = useState<number>(0);
  // 0: Long, 1: Short

  const pairConfig = CRYPTO_PAIRS[selectedPair];
  const pairsList = useMemo(() => Object.values(CRYPTO_PAIRS), []);
  const leverageList = LEVERAGE_OPTIONS;

  // Keyboard Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if settings is likely open (managed by parent, but simple check helps)
      // For now, we assume MainMenu is only mounted when visible/active

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setActiveRow(prev => Math.max(0, prev - 1));
          // audio.playHover(); // Optional: Add nav sound
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setActiveRow(prev => Math.min(3, prev + 1));
          // audio.playHover();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (activeRow === 0) {
            // Cycle Assets
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx - 1 + pairsList.length) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
          } else if (activeRow === 1) {
            // Cycle Leverage
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx - 1 + leverageList.length) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
          } else if (activeRow === 2) {
            setActionCol(0); // Focus Long
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (activeRow === 0) {
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx + 1) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
          } else if (activeRow === 1) {
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx + 1) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
          } else if (activeRow === 2) {
            setActionCol(1); // Focus Short
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          audio.playButton();
          if (activeRow === 2) {
            // Start Game
            if (actionCol === 0) onStart(MarketPosition.LONG, selectedLeverage);
            else onStart(MarketPosition.SHORT, selectedLeverage);
          } else if (activeRow === 3) {
            onOpenSettings();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeRow,
    actionCol,
    selectedPair,
    selectedLeverage,
    pairsList,
    leverageList,
    onStart,
    onPairChange,
    onOpenSettings,
  ]);

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
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto landscape:py-2">
      <div className="max-w-xl w-full text-center space-y-3 sm:space-y-6 landscape:space-y-2 py-2 sm:py-0">
        <header className="space-y-2 sm:space-y-4">
          <h1
            className={`font-display ${sizes.title} tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 leading-relaxed`}
          >
            CRYPTO
            <br />
            <span style={{ color: pairConfig.color }}>SURVIVORS</span>
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p
              className={`font-heading text-slate-500 font-medium uppercase tracking-[0.2em] ${sizes.tiny}`}
            >
              Market Sentiment Engine
            </p>
            <OptimizationBadge sizes={sizes} />
          </div>
        </header>

        <div className="bg-slate-900/40 border border-white/5 p-3 sm:p-6 landscape:p-3 rounded-2xl space-y-3 sm:space-y-5 landscape:space-y-2">
          {/* Pair Selector */}
          <div className="space-y-3">
            <span className={`${sizes.tiny} text-slate-500 uppercase font-bold tracking-widest`}>
              Select Asset
            </span>
            <CryptoSelector
              selected={selectedPair}
              onSelect={onPairChange}
              isFocused={activeRow === 0}
            />
          </div>

          <div
            className={`font-heading ${sizes.price} font-bold tracking-tight transition-colors duration-500`}
            style={{ color: pairConfig.color, textShadow: `0 0 30px ${pairConfig.color}40` }}
          >
            {price > 0
              ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : 'CONNECTING...'}
          </div>

          {/* Leverage Selection */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className={`${sizes.tiny} text-slate-500 uppercase font-bold tracking-widest`}>
                Leverage
              </span>
              <span
                className={`text-xs font-black uppercase px-2 py-0.5 rounded ${getLeverageColor(selectedLeverage)}`}
              >
                {getLeverageLabel(selectedLeverage)}
              </span>
            </div>
            <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap">
              {LEVERAGE_OPTIONS.map(lev => (
                <button
                  key={lev}
                  onClick={() => setSelectedLeverage(lev)}
                  className={`min-w-[44px] min-h-[44px] px-2.5 sm:px-3 py-2 rounded-lg border font-black text-sm transition-all touch-manipulation ${
                    selectedLeverage === lev
                      ? getLeverageColor(lev) +
                        ' ring-2 ring-white/20 scale-105' +
                        (activeRow === 1
                          ? ' ring-white shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                          : '')
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700 active:scale-95'
                  }`}
                >
                  {lev === 1 ? '1x' : `${lev}x`}
                </button>
              ))}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-600 mt-1">
              Higher leverage = More volatile difficulty & bigger swings
            </p>
          </div>

          {/* Position Selection */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 landscape:gap-2">
            <button
              onClick={() => onStart(MarketPosition.LONG, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center p-3 sm:p-5 landscape:p-2 bg-green-500/10 border border-green-500/20 rounded-xl transition-all group touch-manipulation active:scale-95 ${
                price === 0
                  ? 'opacity-50 cursor-not-allowed grayscale'
                  : 'hover:border-green-500 hover:bg-green-500/20'
              } ${activeRow === 2 && actionCol === 0 ? 'ring-2 ring-white scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-green-500/20' : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="text-green-400 sm:w-10 sm:h-10 landscape:w-8 landscape:h-8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <span className="font-black text-green-500 text-base sm:text-lg uppercase">Long</span>
              <span className="text-[10px] sm:text-xs text-green-500/60 mt-0.5">
                {selectedLeverage}x
              </span>
            </button>
            <button
              onClick={() => onStart(MarketPosition.SHORT, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center p-3 sm:p-5 landscape:p-2 bg-red-500/10 border border-red-500/20 rounded-xl transition-all group touch-manipulation active:scale-95 ${
                price === 0
                  ? 'opacity-50 cursor-not-allowed grayscale'
                  : 'hover:border-red-500 hover:bg-red-500/20'
              } ${activeRow === 2 && actionCol === 1 ? 'ring-2 ring-white scale-105 shadow-[0_0_20px_rgba(239,68,68,0.4)] bg-red-500/20' : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="text-red-400 sm:w-10 sm:h-10 landscape:w-8 landscape:h-8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                  <polyline points="16 17 22 17 22 11" />
                </svg>
              </div>
              <span className="font-black text-red-500 text-base sm:text-lg uppercase">Short</span>
              <span className="text-[10px] sm:text-xs text-red-500/60 mt-0.5">
                {selectedLeverage}x
              </span>
            </button>
          </div>

          <button
            onClick={onOpenSettings}
            className={`w-full min-h-[44px] py-2.5 sm:py-3 bg-slate-800 text-white font-black uppercase text-xs sm:text-sm tracking-widest rounded-xl border border-white/10 hover:bg-slate-700 active:scale-[0.98] transition-all touch-manipulation ${
              activeRow === 3 ? 'ring-2 ring-white scale-[1.02] bg-slate-700' : ''
            }`}
          >
            Settings
          </button>
          <div
            className={`pt-1 sm:pt-2 ${sizes.tiny} text-slate-500 font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]`}
          >
            WASD / Arrows to Move • SPACE to Dash
          </div>
        </div>
      </div>
    </div>
  );
};
interface OptimizationBadgeProps {
  sizes: ReturnType<typeof useThemeSize>;
}

const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({ sizes }) => {
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
      className={`px-3 py-1 rounded-full border ${sizes.tiny} font-bold uppercase tracking-wider ${getColor(profile)}`}
    >
      Optimized: {profile}
    </div>
  );
};
