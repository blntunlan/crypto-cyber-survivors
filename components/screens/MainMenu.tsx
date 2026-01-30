import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion'; // 📦 [Import Cost]: 32.4KB (gzipped: 10.8KB)
import { MarketPosition, type LeverageOption, LEVERAGE_OPTIONS } from '../../types';
import { CryptoSelector } from '../ui/CryptoSelector';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { audio } from '../../services/audio';
import { useThemeSize } from '../../hooks/useThemeSize';
import { GameMode } from '../../types/gameMode';

import { useTheme } from '../../contexts/useTheme';
import { IconTrendUp, IconTrendDown, IconZap, IconTrophy } from '../icons/CardIcons';
import { COLORS } from '../../config/Colors';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedPanel } from '../themed/ThemedPanel';
import { useLanguage } from '../../contexts/LanguageContext';
import { OptimizationBadge } from '../ui/OptimizationBadge';

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption) => void | Promise<void>;
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
          setActiveRow(prev => {
            const next = Math.max(0, prev - 1);
            if (next !== prev) audio.playSelectionTick();
            return next;
          });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setActiveRow(prev => {
            const next = Math.min(4, prev + 1);
            if (next !== prev) audio.playSelectionTick();
            return next;
          });
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
            audio.playSelectionTick();
          } else if (activeRow === 1) {
            // Cycle Assets
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx - 1 + pairsList.length) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
            audio.playPairSelect();
          } else if (activeRow === 2) {
            // Cycle Leverage
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx - 1 + leverageList.length) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
            audio.playSelectionTick();
          } else if (activeRow === 3) {
            setActionCol(0); // Focus Long
            audio.playSelectionTick();
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
            audio.playSelectionTick();
          } else if (activeRow === 1) {
            const currIdx = pairsList.findIndex(p => p.id === selectedPair);
            const nextIdx = (currIdx + 1) % pairsList.length;
            onPairChange(pairsList[nextIdx]!.id);
            audio.playPairSelect();
          } else if (activeRow === 2) {
            const currIdx = leverageList.indexOf(selectedLeverage);
            const nextIdx = (currIdx + 1) % leverageList.length;
            setSelectedLeverage(leverageList[nextIdx]!);
            audio.playSelectionTick();
          } else if (activeRow === 3) {
            setActionCol(1); // Focus Short
            audio.playSelectionTick();
          }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeRow === 3) {
            // Start Game
            audio.playLevelUp(); // Play extra start sound
            if (actionCol === 0) void onStart(MarketPosition.LONG, selectedLeverage);
            else void onStart(MarketPosition.SHORT, selectedLeverage);
          } else if (activeRow === 4) {
            audio.playButton();
            onOpenSettings();
          } else {
            audio.playButton();
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`absolute inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto p-3 pb-[calc(0.75rem+var(--sab))] landscape:py-2 landscape:px-[calc(0.75rem+var(--sal))] sm:justify-center sm:p-6 sm:pb-6 allow-scroll ${isRetro ? 'bg-[#0a0a12]/70' : 'bg-slate-950/60 backdrop-blur-sm'}`}
    >
      <div className="max-w-xl w-full text-center space-y-4 py-2 sm:space-y-8 sm:py-0 landscape:space-y-2">
        <motion.header
          className="space-y-3 sm:space-y-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className={`${isRetro ? 'font-retro-pixel text-[#FFD600] drop-shadow-[0_0_10px_rgba(255,214,0,0.5)]' : 'font-cyber cyber-sway-text'} ${sizes.title} tracking-tight leading-relaxed ${!isRetro ? 'text-white sm:drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]' : ''}`}
          >
            {t('common.menu.title')}
            <br />
            <span
              style={{ color: isRetro ? COLORS.ELECTRIC_BLUE : pairConfig.color }}
              className={
                isRetro
                  ? 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]'
                  : 'sm:drop-shadow-[0_0_20px_var(--tw-shadow-color)]'
              }
            >
              {t('common.menu.subtitle')}
            </span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px] text-[#39FF14]' : 'font-cyber text-slate-500'} font-medium uppercase tracking-[0.2em] ${sizes.tiny}`}
            >
              {t('common.menu.sentiment_engine')}
            </p>

            <OptimizationBadge sizes={sizes} />
          </div>
        </motion.header>

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
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[9px] sm:text-[10px] uppercase ${isRetro ? 'font-retro-pixel' : 'font-cyber'} tracking-[0.15em] sm:tracking-[0.2em] font-bold`}
                style={{ color: isRetro ? COLORS.NEON_GREEN : COLORS.WHALE }}
              >
                {t('common.menu.game_mode')}
              </span>

              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-l from-transparent to-white/10'}`}
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
                    className={`flex-1 min-h-[48px] p-2.5 sm:p-3 transition-all duration-300 text-left relative group overflow-hidden touch-manipulation active:scale-[0.98]
                      ${
                        isRetro
                          ? 'rounded-none border-2 border-[#39FF14]/40 hover:border-[#39FF14] bg-[#0a0a12]/80 font-primary'
                          : 'rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
                      } 
                      ${isActive ? 'scale-[1.02] z-10' : 'bg-white/5 opacity-40 hover:opacity-100 sm:hover:scale-[1.01]'}`}
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
                        className={`w-4 h-4 sm:w-3 sm:h-3 ${isActive && !isRetro ? 'animate-pulse' : ''}`}
                        color={isActive ? (isRetro ? '#ffffff' : modeColor) : '#475569'}
                      />
                      <div
                        className={`${isRetro ? 'font-retro-pixel text-[10px] landscape:text-[9px]' : 'font-cyber text-[10px] sm:text-[9px]'} uppercase tracking-wider ${isActive ? 'font-black' : ''}`}
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
                      className={`leading-snug font-medium ${isActive ? 'text-white' : 'text-slate-500'} ${isRetro ? 'font-retro-pixel text-[11px] landscape:text-[10px]' : 'text-[11px] sm:text-[10px]'}`}
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
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-[#FFD600]/30' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[9px] sm:text-[10px] uppercase ${isRetro ? 'font-retro-pixel' : 'font-cyber'} tracking-[0.15em] sm:tracking-[0.2em] font-bold`}
                style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.CASINO_GOLD }}
              >
                {t('common.menu.select_asset')}
              </span>

              <div
                className={`h-[0.5px] flex-1 ${isRetro ? 'bg-[#FFD600]/30' : 'bg-gradient-to-l from-transparent to-white/10'}`}
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
                className={`text-[9px] sm:text-[8px] uppercase font-display tracking-[0.15em] sm:tracking-[0.2em] font-bold ${isRetro ? 'font-retro-pixel text-[#DCDCDC]' : 'text-slate-500'}`}
              >
                {t('common.menu.leverage')}
              </span>

              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 sm:w-1 sm:h-1 ${isRetro ? '' : 'rounded-full animate-pulse'}`}
                  style={{ backgroundColor: getLeverageColorHex(selectedLeverage) }}
                />
                <span
                  className={`text-[10px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest ${isRetro ? 'font-retro-pixel' : ''}`}
                  style={{ color: getLeverageColorHex(selectedLeverage) }}
                >
                  {getLeverageLabel(selectedLeverage)}
                </span>
              </div>
            </div>

            <div
              className={`flex gap-1.5 justify-center flex-wrap py-2 px-2 transition-all duration-500 ${isRetro ? 'rounded-none border-2 border-[#39FF14]/40 bg-[#0a0a12]/80' : 'rounded-xl'}`}
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
                    className={`min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] px-2.5 py-1.5 sm:px-2 sm:py-1 transition-all duration-200 text-[10px] sm:text-[9px] relative group touch-manipulation active:scale-95
                      ${isRetro ? 'rounded-none font-retro-pixel' : 'rounded-lg font-display sm:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'}
                      ${isSelected ? 'scale-105 z-10' : 'bg-white/5 opacity-50 hover:opacity-80'}`}
                    style={{
                      boxShadow:
                        isSelected && !isRetro
                          ? `0 8px 20px -5px ${levColor}40, 0 0 12px -3px ${levColor}30`
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
          <div className={`grid grid-cols-2 gap-3 sm:gap-4 landscape:gap-2`}>
            <button
              onClick={() => void onStart(MarketPosition.LONG, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center min-h-[72px] p-3 sm:p-5 landscape:p-2 landscape:min-h-[56px] transition-all duration-200 group touch-manipulation active:scale-95 
                ${isRetro ? 'rounded-none border-2 border-[#39FF14]/60 hover:border-[#39FF14] bg-[#39FF14]/10 font-retro-pixel' : 'rounded-xl bg-green-500/10 hover:bg-green-500/20 sm:hover:shadow-[0_0_30px_rgba(34,197,94,0.25)] border border-transparent sm:hover:border-green-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'}
                ${
                  price === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
                } ${activeRow === 3 && actionCol === 0 ? `scale-105 ${isRetro ? 'ring-0 !border-[#39FF14] border-[3px] shadow-[4px_4px_0px_rgba(57,255,20,0.4)] bg-[#39FF14]/20' : 'bg-green-500/20 ring-1 ring-white shadow-[0_0_25px_rgba(34,197,94,0.5)]'}` : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 sm:group-hover:drop-shadow-[0_0_12px_rgba(74,222,128,0.6)] transition-all duration-200">
                <IconTrendUp
                  className="w-8 h-8 sm:w-10 sm:h-10 landscape:w-7 landscape:h-7"
                  color={isRetro ? COLORS.NEON_GREEN : '#4ade80'}
                />
              </div>
              <span
                className={`text-xs sm:text-sm uppercase tracking-tight sm:group-hover:text-green-400 transition-colors ${isRetro ? 'font-retro-pixel text-[#39FF14]' : 'font-cyber text-green-500'}`}
              >
                {t('common.long')}
              </span>

              <span
                className={`text-[11px] sm:text-xs mt-0.5 font-medium transition-colors ${isRetro ? 'font-retro-pixel text-[#39FF14]/70 group-hover:text-[#39FF14]' : 'text-green-500/70 sm:group-hover:text-green-400/80'}`}
              >
                {selectedLeverage}x
              </span>
            </button>
            <button
              onClick={() => void onStart(MarketPosition.SHORT, selectedLeverage)}
              disabled={price === 0}
              className={`flex flex-col items-center min-h-[72px] p-3 sm:p-5 landscape:p-2 landscape:min-h-[56px] transition-all duration-200 group touch-manipulation active:scale-95 
                ${isRetro ? 'rounded-none border-2 border-[#B22222]/60 hover:border-[#FF3D00] bg-[#B22222]/10 font-retro-pixel' : 'rounded-xl bg-red-500/10 hover:bg-red-500/20 sm:hover:shadow-[0_0_30px_rgba(239,68,68,0.25)] border border-transparent sm:hover:border-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'}
                ${
                  price === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''
                } ${activeRow === 3 && actionCol === 1 ? `scale-105 ${isRetro ? 'ring-0 !border-[#FF3D00] border-[3px] shadow-[4px_4px_0px_rgba(178,34,34,0.4)] bg-[#B22222]/20' : 'bg-red-500/20 ring-1 ring-white shadow-[0_0_25px_rgba(239,68,68,0.5)]'}` : ''}`}
            >
              <div className="mb-1 sm:mb-2 group-hover:scale-110 sm:group-hover:drop-shadow-[0_0_12px_rgba(248,113,113,0.6)] transition-all duration-200">
                <IconTrendDown
                  className="w-8 h-8 sm:w-10 sm:h-10 landscape:w-7 landscape:h-7"
                  color={isRetro ? COLORS.CASINO_RED : '#f87171'}
                />
              </div>
              <span
                className={`text-xs sm:text-sm uppercase tracking-tight transition-colors ${isRetro ? 'font-retro-pixel text-[#FF3D00] group-hover:text-[#FF3D00]' : 'font-cyber text-red-500 sm:group-hover:text-red-400'}`}
              >
                {t('common.short')}
              </span>

              <span
                className={`text-[11px] sm:text-xs mt-0.5 font-medium transition-colors ${isRetro ? 'font-retro-pixel text-[#FF3D00]/70 group-hover:text-[#FF3D00]' : 'text-red-500/70 sm:group-hover:text-red-400/80'}`}
              >
                {selectedLeverage}x
              </span>
            </button>
          </div>

          <ThemedButton
            intent="secondary"
            onClick={onOpenSettings}
            className={`w-full min-h-[44px] py-2.5 sm:py-3 font-black uppercase text-xs sm:text-sm tracking-widest active:scale-[0.98] transition-all duration-200 touch-manipulation mt-3 sm:mt-4
              ${!isRetro ? 'sm:hover:shadow-[0_0_20px_rgba(148,163,184,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900' : ''}
              ${
                activeRow === 4
                  ? `scale-[1.02] ${isRetro ? '!bg-[#39FF14]/20 !text-[#39FF14] !border-[#39FF14]' : '!bg-slate-700 !text-white ring-1 ring-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`
                  : ''
              }`}
          >
            {t('common.settings')}
          </ThemedButton>
          <div
            className={`pt-1 sm:pt-2 uppercase tracking-wider sm:tracking-widest ${isRetro ? 'font-retro-pixel text-[10px] landscape:text-[9px] text-[#7558A4]' : 'font-display text-[9px] sm:text-[10px] text-slate-500'}`}
          >
            {t('common.menu.controls_hint')}
          </div>
        </ThemedPanel>
      </div>
    </motion.div>
  );
};
