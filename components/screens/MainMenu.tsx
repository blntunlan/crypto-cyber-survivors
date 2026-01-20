import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion'; // 📦 [Import Cost]: 32.4KB (gzipped: 10.8KB)
import { MarketPosition, type LeverageOption, LEVERAGE_OPTIONS } from '../../types';
import { DeviceBenchmarkService } from '../../services/DeviceBenchmarkService';
import { DeviceProfile } from '../../types/DeviceProfile';
import { CryptoSelector } from '../ui/CryptoSelector';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { audio } from '../../services/AudioService';
import { useThemeSize } from '../../hooks/useThemeSize';
import { GameMode } from '../../types/gameMode';

import { useTheme } from '../../contexts/useTheme';
import { IconTrendUp, IconTrendDown, IconZap, IconTrophy } from '../icons/CardIcons';
import { COLORS } from '../../config/Colors';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedPanel } from '../themed/ThemedPanel';
import { useLanguage } from '../../contexts/LanguageContext';

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption) => void;
  onOpenSettings: () => void;
  selectedPair: CryptoPair;
  onPairChange: (pair: CryptoPair) => void;
  selectedMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  price,
  onStart,
  onOpenSettings,
  selectedPair,
  onPairChange,
  selectedMode,
  onModeChange,
}) => {
  const { isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t } = useLanguage();

  const [selectedLeverage, setSelectedLeverage] = useState<LeverageOption>(10);

  // Navigation State
  const [activeRow, setActiveRow] = useState<number>(0);
  // 0: Game Mode, 1: Assets, 2: Leverage, 3: Actions (Long/Short), 4: Settings
  const [actionCol, setActionCol] = useState<number>(0);
  // 0: Long, 1: Short

  const pairConfig = CRYPTO_PAIRS[selectedPair];
  const pairsList = useMemo(() => Object.values(CRYPTO_PAIRS), []);
  const leverageList = LEVERAGE_OPTIONS;

  // Keyboard Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip keyboard navigation if user is typing in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

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
          setActiveRow(prev => Math.min(4, prev + 1));
          // audio.playHover();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (activeRow === 0) {
            // Cycle Game Modes
            onModeChange(
              selectedMode === GameMode.CASUAL ? GameMode.COMPETITIVE : GameMode.CASUAL
            );
          } else if (activeRow === 1) {
            // Cycle Assets
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx - 1 + pairsList.length) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
          } else if (activeRow === 2) {
            // Cycle Leverage
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx - 1 + leverageList.length) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
          } else if (activeRow === 3) {
            setActionCol(0); // Focus Long
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (activeRow === 0) {
            // Cycle Game Modes
            onModeChange(
              selectedMode === GameMode.CASUAL ? GameMode.COMPETITIVE : GameMode.CASUAL
            );
          } else if (activeRow === 1) {
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx + 1) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
          } else if (activeRow === 2) {
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx + 1) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
          } else if (activeRow === 3) {
            setActionCol(1); // Focus Short
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          audio.playButton();
          if (activeRow === 3) {
            // Start Game
            if (actionCol === 0) onStart(MarketPosition.LONG, selectedLeverage);
            else onStart(MarketPosition.SHORT, selectedLeverage);
          } else if (activeRow === 4) {
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
    onModeChange,
    selectedMode,
  ]);

  const getLeverageColorHex = (lev: LeverageOption) => {
    if (lev <= 2) return COLORS.PUMP_GREEN;
    if (lev <= 10) return COLORS.JACKPOT_YELLOW;
    if (lev <= 25) return COLORS.NEON_ORANGE;
    return COLORS.CASINO_RED;
  };

  const getLeverageLabel = (lev: LeverageOption) => {
    if (lev === 1) return t('common.menu.lev_spot');
    if (lev <= 2) return t('common.menu.lev_safe');
    if (lev <= 10) return t('common.menu.lev_standard');
    if (lev <= 25) return t('common.menu.lev_risky');
    return t('common.menu.lev_degen');
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm landscape:py-2 sm:justify-center sm:p-6">
      <div className="max-w-xl w-full text-center space-y-4 py-2 sm:space-y-8 sm:py-0 landscape:space-y-2">
        <header className="space-y-3 sm:space-y-5">
          <h1
            className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-glitch-text'} ${sizes.title} tracking-tight text-white leading-relaxed`}
          >
            {t('common.menu.title')}
            <br />
            <span style={{ color: pairConfig.color }}>{t('common.menu.subtitle')}</span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px]' : 'font-cyber'} text-slate-500 font-medium uppercase tracking-[0.2em] ${sizes.tiny}`}
            >
              {t('common.menu.sentiment_engine')}
            </p>

            <OptimizationBadge sizes={sizes} />
          </div>
        </header>

        <ThemedPanel
          className={`relative p-3 sm:p-5 transition-all duration-700 ${!isRetro ? 'backdrop-blur-xl !rounded-[1.5rem] overflow-hidden' : ''}`}
        >
          {/* Top Dynamic Border Accent */}
          {!isRetro && (
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ backgroundColor: pairConfig.color }}
              style={{ boxShadow: `0 0 20px ${pairConfig.color}40` }}
            />
          )}
          <div className="space-y-2 mb-2 sm:mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-zinc-700' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[7px] uppercase ${isRetro ? 'font-retro-pixel' : 'font-cyber'} tracking-[0.2em] font-bold`}
                style={{ color: COLORS.WHALE }}
              >
                {t('common.menu.game_mode')}
              </span>

              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-zinc-700' : 'bg-gradient-to-l from-transparent to-white/10'}`}
              />
            </div>
            <div className="flex gap-2">
              {Object.values(GameMode).map(mode => {
                const isActive = selectedMode === mode;
                const ModeIcon = mode === GameMode.CASUAL ? IconZap : IconTrophy;
                const modeColor =
                  mode === GameMode.CASUAL ? COLORS.WHALE : COLORS.CASINO_RED;

                return (
                  <button
                    key={mode}
                    onClick={() => {
                      audio.playButton();
                      onModeChange(mode);
                    }}
                    className={`flex-1 p-2.5 transition-all duration-300 text-left relative group overflow-hidden 
                      ${
                        isRetro
                          ? 'rounded-none border-2 border-zinc-700 hover:border-zinc-500 bg-zinc-900 font-primary'
                          : 'rounded-xl overflow-hidden'
                      } 
                      ${isActive ? 'scale-[1.02] z-10' : 'bg-white/5 opacity-40 hover:opacity-100'}`}
                    style={{
                      boxShadow: isActive
                        ? isRetro
                          ? `4px 4px 0px rgba(0,0,0,0.5)`
                          : `0 0 20px -2px ${modeColor}50, inset 0 0 10px ${modeColor}20`
                        : 'none',
                      backgroundColor: isActive
                        ? isRetro
                          ? modeColor
                          : `${modeColor}15`
                        : undefined,
                      border: isActive
                        ? `${isRetro ? '4px' : '1.5px'} solid ${isRetro ? '#ffffff' : modeColor}`
                        : isRetro
                          ? undefined
                          : '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {!isRetro && isActive && (
                      <div
                        className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-white/10 to-transparent rotate-45 translate-x-6 -translate-y-6"
                        style={{ backgroundColor: `${modeColor}20` }}
                      />
                    )}

                    <div className="flex items-center gap-2 mb-1">
                      <ModeIcon
                        className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`}
                        color={isActive ? (isRetro ? '#ffffff' : modeColor) : '#475569'}
                      />
                      <div
                        className={`text-[8px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} uppercase tracking-wider ${isActive ? 'font-black' : ''}`}
                        style={{
                          color: isActive
                            ? isRetro
                              ? '#ffffff'
                              : modeColor
                            : '#475569',
                        }}
                      >
                        {mode === GameMode.CASUAL
                          ? t('common.modes.casual_name')
                          : t('common.modes.competitive_name')}
                      </div>
                    </div>
                    <div
                      className={`text-[10px] leading-tight font-medium ${isActive ? 'text-white' : 'text-slate-500'} ${isRetro ? 'font-primary' : ''}`}
                    >
                      {mode === GameMode.CASUAL
                        ? t('common.modes.casual_desc')
                        : t('common.modes.competitive_desc')}
                    </div>

                    {/* Active Indicator Line */}
                    {!isRetro && isActive && (
                      <motion.div
                        layoutId="mode-active-bar"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ backgroundColor: modeColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 mb-2 sm:mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-zinc-700' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[7px] uppercase ${isRetro ? 'font-retro-pixel' : 'font-cyber'} tracking-[0.2em] font-bold`}
                style={{ color: COLORS.CASINO_GOLD }}
              >
                {t('common.menu.select_asset')}
              </span>

              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-zinc-700' : 'bg-gradient-to-l from-transparent to-white/10'}`}
              />
            </div>
            <CryptoSelector
              selected={selectedPair}
              onSelect={onPairChange}
              isFocused={activeRow === 1}
            />
          </div>

          <div
            className={`font-numbers ${sizes.price} font-bold tracking-tight transition-colors duration-500 py-2 sm:py-4`}
            style={{
              color: pairConfig.color,
              textShadow: isRetro
                ? `4px 4px 0px rgba(0,0,0,0.5)`
                : `0 0 30px ${pairConfig.color}40`,
            }}
          >
            {price > 0
              ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : t('common.menu.connecting')}
          </div>

          <div className="space-y-2 mb-2 sm:mb-4">
            <div className="flex items-center justify-between px-1 mb-1">
              <span
                className={`text-[7px] uppercase font-display tracking-[0.2em] font-bold text-slate-500`}
              >
                {t('common.menu.leverage')}
              </span>

              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1 h-1 rounded-full ${isRetro ? '' : 'animate-pulse'}`}
                  style={{ backgroundColor: getLeverageColorHex(selectedLeverage) }}
                />
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${isRetro ? 'font-display' : ''}`}
                  style={{ color: getLeverageColorHex(selectedLeverage) }}
                >
                  {getLeverageLabel(selectedLeverage)}
                </span>
              </div>
            </div>

            <div
              className={`flex gap-1.5 justify-center flex-wrap py-2 px-2 transition-all duration-500 ${isRetro ? 'rounded-none border-2 border-zinc-700 bg-zinc-900' : 'rounded-xl'}`}
              style={{
                backgroundColor: !isRetro
                  ? `${getLeverageColorHex(selectedLeverage)}05`
                  : undefined,
                border: !isRetro
                  ? `1px solid ${getLeverageColorHex(selectedLeverage)}15`
                  : undefined,
              }}
            >
              {LEVERAGE_OPTIONS.map(lev => {
                const isSelected = selectedLeverage === lev;
                const levColor =
                  lev <= 2
                    ? COLORS.PUMP_GREEN
                    : lev <= 10
                      ? COLORS.JACKPOT_YELLOW
                      : lev <= 25
                        ? COLORS.NEON_ORANGE
                        : COLORS.CASINO_RED;

                return (
                  <button
                    key={lev}
                    onClick={() => setSelectedLeverage(lev)}
                    className={`min-w-[36px] min-h-[32px] px-2 py-1 transition-all duration-300 font-display text-[8px] relative group 
                      ${isRetro ? 'rounded-none' : 'rounded-lg'}
                      ${isSelected ? 'scale-105 z-10' : 'bg-white/5 opacity-40 hover:opacity-80'}`}
                    style={{
                      boxShadow:
                        isSelected && !isRetro
                          ? `0 8px 20px -5px ${levColor}40`
                          : isSelected && isRetro
                            ? '2px 2px 0px rgba(0,0,0,0.5)'
                            : 'none',
                      backgroundColor: isSelected
                        ? isRetro
                          ? '#18181b'
                          : `${levColor}20`
                        : undefined,
                      border: isSelected
                        ? `${isRetro ? '2px' : '1px'} solid ${levColor}`
                        : isRetro
                          ? undefined
                          : '1px solid transparent',
                      color: isSelected ? levColor : '#64748b',
                    }}
                  >
                    {lev === 1 ? t('common.menu.lev_spot') : `${lev}x`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position Selection */}
          <div className={`grid grid-cols-2 gap-2 sm:gap-4 landscape:gap-2`}>
            <button
              onClick={() => onStart(MarketPosition.LONG, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center p-3 sm:p-5 landscape:p-2 bg-green-500/10 transition-all group touch-manipulation active:scale-95 
                ${isRetro ? 'rounded-none border-2 border-zinc-700 hover:border-green-500 font-display' : 'rounded-xl hover:bg-green-500/20'}
                ${
                  price === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
                } ${activeRow === 3 && actionCol === 0 ? `scale-105 bg-green-500/20 ${isRetro ? 'ring-0 border-white border-2' : 'ring-1 ring-white shadow-[0_0_20px_rgba(34,197,94,0.4)]'}` : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                <IconTrendUp
                  className="text-green-400 sm:w-10 sm:h-10 landscape:w-8 landscape:h-8"
                  color={isRetro ? '#ffd600' : '#4ade80'}
                />
              </div>
              <span className="font-display text-green-500 text-[10px] sm:text-xs uppercase tracking-tighter">
                {t('common.long')}
              </span>

              <span className="text-[10px] sm:text-xs text-green-500/60 mt-0.5">
                {selectedLeverage}x
              </span>
            </button>
            <button
              onClick={() => onStart(MarketPosition.SHORT, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center p-3 sm:p-5 landscape:p-2 bg-red-500/10 transition-all group touch-manipulation active:scale-95 
                ${isRetro ? 'rounded-none border-2 border-zinc-700 hover:border-red-500 font-display' : 'rounded-xl hover:bg-red-500/20'}
                ${
                  price === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
                } ${activeRow === 3 && actionCol === 1 ? `scale-105 bg-red-500/20 ${isRetro ? 'ring-0 border-white border-2' : 'ring-1 ring-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'}` : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                <IconTrendDown
                  className="text-red-400 sm:w-10 sm:h-10 landscape:w-8 landscape:h-8"
                  color={isRetro ? '#ffd600' : '#f87171'}
                />
              </div>
              <span className="font-display text-red-500 text-[10px] sm:text-xs uppercase tracking-tighter">
                {t('common.short')}
              </span>

              <span className="text-[10px] sm:text-xs text-red-500/60 mt-0.5">
                {selectedLeverage}x
              </span>
            </button>
          </div>

          <ThemedButton
            intent="secondary"
            onClick={onOpenSettings}
            className={`w-full min-h-[44px] py-2.5 sm:py-3 font-black uppercase text-xs sm:text-sm tracking-widest active:scale-[0.98] transition-all touch-manipulation mt-3
              ${
                activeRow === 4
                  ? `scale-[1.02] !bg-slate-700 !text-white ${isRetro ? '!border-white' : 'ring-1 ring-white'}`
                  : ''
              }`}
          >
            {t('common.settings')}
          </ThemedButton>
          <div
            className={`pt-1 sm:pt-2 text-[7px] sm:text-[8px] font-display text-slate-500 uppercase tracking-widest ${isRetro ? 'font-primary brightness-150' : ''}`}
          >
            {t('common.menu.controls_hint')}
          </div>
        </ThemedPanel>
      </div>
    </div>
  );
};
interface OptimizationBadgeProps {
  sizes: ReturnType<typeof useThemeSize>;
}

const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({ sizes }) => {
  const config = DeviceBenchmarkService.getPerformanceConfig();
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const profile = config.profile;

  const getColor = (p: DeviceProfile) => {
    switch (p) {
      case DeviceProfile.ULTRA:
        return `text-purple-400 bg-purple-500/10 ${isRetro ? '' : 'border-purple-500/20'}`;
      case DeviceProfile.HIGH:
        return `text-green-400 bg-green-500/10 ${isRetro ? '' : 'border-green-500/20'}`;
      case DeviceProfile.MEDIUM:
        return `text-yellow-400 bg-yellow-500/10 ${isRetro ? '' : 'border-yellow-500/20'}`;
      case DeviceProfile.LOW:
        return `text-red-400 bg-red-500/10 ${isRetro ? '' : 'border-red-500/20'}`;
      default:
        return `text-slate-400 bg-slate-500/10 ${isRetro ? '' : 'border-slate-500/20'}`;
    }
  };

  return (
    <div
      className={`px-3 py-1 border ${sizes.tiny} font-bold uppercase tracking-wider ${getColor(profile)} 
        ${isRetro ? 'rounded-none border-2 border-zinc-700 font-primary' : 'rounded-full'}`}
    >
      {t('common.menu.optimized')}: {profile}
    </div>
  );
};
