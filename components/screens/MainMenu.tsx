import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { trackRender } from '../../utils/trackRender';
import { MarketPosition, type LeverageOption, LEVERAGE_OPTIONS } from '../../types';
import { CryptoSelector } from '../ui/CryptoSelector';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { audio } from '../../services/audio';
import { useThemeSize } from '../../hooks/useThemeSize';
import { GameMode } from '../../types/gameMode';

import { useTheme } from '../../contexts/useTheme';
import { IconTrendUp, IconTrendDown, IconZap, IconTrophy } from '../icons/CardIcons';
import { COLORS } from '../../config/Colors';
import {
  LEVERAGE_RAMP_STOPS,
  POSITION_ACCENTS,
  getLeverageRiskTier,
} from '../../config/ui/riskPalette';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedSelectionCard } from '../themed/ThemedSelectionCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { OptimizationBadge } from '../ui/OptimizationBadge';
import { getNumberLocale } from '../../utils/numberLocale';

interface MainMenuProps {
  price: number;
  onStart: (choice: MarketPosition, leverage: LeverageOption) => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenUpgrades?: () => void;
  onOpenChallenges?: () => void;
  onOpenReplays?: () => void;
  selectedPair: CryptoPair;
  onPairChange: (pair: CryptoPair) => void;
  selectedMode: GameMode;
  onModeChange: (mode: GameMode) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  price,
  onStart,
  onOpenSettings,
  onOpenUpgrades,
  onOpenChallenges,
  onOpenReplays,
  selectedPair,
  onPairChange,
  selectedMode,
  onModeChange,
}) => {
  trackRender('MainMenu');
  const { isRetro } = useTheme();
  const sizes = useThemeSize();
  const { t, language } = useLanguage();
  const numberLocale = getNumberLocale(language);

  const [selectedLeverage, setSelectedLeverage] = useState<LeverageOption>(1);
  const leverageScrollRef = useRef<HTMLDivElement>(null);

  // Scroll selected leverage button into view on mobile
  const scrollToSelectedLeverage = useCallback((lev: LeverageOption) => {
    const container = leverageScrollRef.current;
    if (!container) return;
    const idx = LEVERAGE_OPTIONS.indexOf(lev);
    const btn = container.children[idx] as HTMLElement | undefined;
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, []);

  // Scroll to default selection on mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => scrollToSelectedLeverage(selectedLeverage), 100);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getLeverageColorHex = (lev: LeverageOption) => getLeverageRiskTier(lev).color;

  const getLeverageLabel = (lev: LeverageOption) =>
    t(getLeverageRiskTier(lev).labelKey);

  return (
    <div
      className={`allow-scroll absolute inset-0 z-[100] flex flex-col items-center justify-start overflow-y-auto p-2.5 pb-[calc(0.75rem+var(--sab))] sm:justify-center sm:p-6 sm:pb-6 landscape:px-[calc(0.75rem+var(--sal))] landscape:py-2 ${isRetro ? 'bg-[#0a0a12]/70' : 'bg-slate-950/95'}`}
    >
      <div className="w-full max-w-xl space-y-4 py-2 text-center sm:space-y-8 sm:py-0 landscape:space-y-2">
        <header className="space-y-2.5 sm:space-y-5">
          <h1
            className={`${isRetro ? 'font-retro-pixel text-[#FFD600] drop-shadow-[0_0_10px_rgba(255,214,0,0.5)]' : 'cyber-sway-text font-cyber font-black uppercase italic'} ${sizes.title} leading-relaxed tracking-tight ${!isRetro ? 'text-white sm:drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]' : ''}`}
          >
            {t('common.menu.title')}
            <br />
            <span
              style={{ color: isRetro ? COLORS.ELECTRIC_BLUE : pairConfig.color }}
              className={
                isRetro
                  ? 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]'
                  : 'drop-shadow-[0_0_20px_rgba(247,147,26,0.4)]'
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
        </header>

        <ThemedPanel
          className={`relative p-3.5 transition-colors duration-200 sm:p-6 ${!isRetro ? 'overflow-hidden !rounded-[1.5rem] border border-white/20 bg-slate-900/95 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)]' : ''}`}
        >
          {!isRetro && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-cyan-200/10" />
            </>
          )}

          {/* Top Dynamic Border Accent */}
          {!isRetro && (
            <div
              className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                backgroundColor: pairConfig.color,
                boxShadow: `0 0 20px ${pairConfig.color}40`,
              }}
            />
          )}
          <div className="mb-3 space-y-2.5 sm:mb-5">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={`h-px flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[9px] uppercase sm:text-[10px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} font-bold tracking-[0.15em] sm:tracking-[0.2em]`}
                style={{ color: isRetro ? COLORS.NEON_GREEN : COLORS.WHALE }}
              >
                {t('common.menu.game_mode')}
              </span>

              <div
                className={`h-px flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-l from-transparent to-white/10'}`}
              />
            </div>
            <div className="flex gap-2">
              {Object.values(GameMode).map(mode => {
                const isActive = selectedMode === mode;
                const ModeIcon = mode === GameMode.CASUAL ? IconZap : IconTrophy;
                const modeColor =
                  mode === GameMode.CASUAL ? COLORS.WHALE : COLORS.CASINO_RED;

                return (
                  <ThemedSelectionCard
                    key={mode}
                    onClick={() => {
                      audio.playButton();
                      onModeChange(mode);
                    }}
                    accentColor={modeColor}
                    selected={isActive}
                    className="flex-1 flex-col items-stretch"
                  >
                    {!isRetro && isActive && (
                      <div
                        className="absolute right-0 top-0 h-12 w-12 -translate-y-6 translate-x-6 rotate-45 bg-gradient-to-br from-white/10 to-transparent"
                        style={{ backgroundColor: `${modeColor}20` }}
                      />
                    )}

                    <div className="mb-1 flex items-center gap-2">
                      <ModeIcon
                        className={`h-4 w-4 sm:h-3 sm:w-3 ${isActive && !isRetro ? 'animate-pulse' : ''}`}
                        color={isActive ? (isRetro ? '#ffffff' : modeColor) : '#475569'}
                      />
                      <div
                        className={`${isRetro ? 'font-retro-pixel text-[10px] landscape:text-[9px]' : 'font-cyber text-[11px] sm:text-[10px]'} uppercase tracking-wider ${isActive ? 'font-black' : ''}`}
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
                      className={`font-medium leading-snug ${isActive ? 'text-white' : 'text-slate-500'} ${isRetro ? 'font-retro-pixel text-[11px] landscape:text-[10px]' : 'text-[12px] sm:text-[11px]'}`}
                    >
                      {mode === GameMode.CASUAL
                        ? t('common.modes.casual_desc')
                        : t('common.modes.competitive_desc')}
                    </div>

                    {/* Active Indicator Line */}
                    {!isRetro && isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ backgroundColor: modeColor }}
                      />
                    )}
                  </ThemedSelectionCard>
                );
              })}
            </div>
          </div>

          <div className="mb-3 space-y-2.5 sm:mb-5">
            <div className="mb-1 flex items-center gap-2">
              <div
                className={`h-px flex-1 ${isRetro ? 'bg-[#FFD600]/30' : 'bg-gradient-to-r from-transparent to-white/10'}`}
              />
              <span
                className={`text-[9px] uppercase sm:text-[10px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} font-bold tracking-[0.15em] sm:tracking-[0.2em]`}
                style={{ color: isRetro ? COLORS.JACKPOT_YELLOW : COLORS.CASINO_GOLD }}
              >
                {t('common.menu.select_asset')}
              </span>

              <div
                className={`h-px flex-1 ${isRetro ? 'bg-[#FFD600]/30' : 'bg-gradient-to-l from-transparent to-white/10'}`}
              />
            </div>
            <CryptoSelector
              selected={selectedPair}
              onSelect={onPairChange}
              isFocused={activeRow === 1}
            />
          </div>

          <div
            data-testid="main-menu-market-price"
            className={`font-numbers ${sizes.price} py-2.5 font-bold tracking-tight transition-colors duration-500 sm:py-5`}
            style={{
              color: pairConfig.color,
              textShadow: isRetro
                ? `4px 4px 0px rgba(0,0,0,0.5)`
                : `0 0 30px ${pairConfig.color}40`,
            }}
          >
            {price > 0
              ? `$${price.toLocaleString(numberLocale, { minimumFractionDigits: 2 })}`
              : t('common.menu.connecting')}
          </div>

          <div className="mb-3 space-y-2.5 sm:mb-5">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.16em] ${isRetro ? 'font-retro-pixel text-[#DCDCDC]' : 'font-cyber text-slate-400'}`}
              >
                {t('common.menu.leverage')}
              </span>

              <div className="flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 sm:h-1 sm:w-1 ${isRetro ? '' : 'animate-pulse rounded-full'}`}
                  style={{ backgroundColor: getLeverageColorHex(selectedLeverage) }}
                />
                <span
                  className={`text-[10px] uppercase tracking-[0.08em] sm:text-[9px] sm:tracking-[0.1em] ${isRetro ? 'font-retro-pixel font-bold' : 'font-cyber font-semibold'}`}
                  style={{ color: getLeverageColorHex(selectedLeverage) }}
                >
                  {getLeverageLabel(selectedLeverage)}
                </span>
              </div>
            </div>

            <div
              ref={leverageScrollRef}
              data-testid="main-menu-leverage-options"
              data-tutorial="leverage-selector"
              className={`custom-scrollbar flex snap-x snap-mandatory flex-nowrap justify-start gap-2 overflow-x-auto px-2 py-3 transition-all duration-500 sm:gap-2.5 sm:overflow-visible sm:px-3 sm:py-3.5 ${isRetro ? 'rounded-none border-2 border-[#39FF14]/40 bg-[#0a0a12]/80' : 'rounded-lg'}`}
              style={{
                background: !isRetro
                  ? `linear-gradient(90deg, ${LEVERAGE_RAMP_STOPS[0]}0D 0%, ${LEVERAGE_RAMP_STOPS[1]}0D 45%, ${LEVERAGE_RAMP_STOPS[2]}0D 70%, ${LEVERAGE_RAMP_STOPS[3]}0D 100%)`
                  : undefined,
                border: !isRetro ? '1px solid rgba(148, 163, 184, 0.16)' : undefined,
              }}
            >
              {LEVERAGE_OPTIONS.map(lev => {
                const isSelected = selectedLeverage === lev;
                const levColor = getLeverageColorHex(lev);

                return (
                  <ThemedSelectionCard
                    key={lev}
                    onClick={() => {
                      setSelectedLeverage(lev);
                      scrollToSelectedLeverage(lev);
                    }}
                    accentColor={levColor}
                    selected={isSelected}
                    size="compact"
                    variant="leverage"
                    className="min-w-[58px] flex-none shrink-0 snap-center sm:min-w-0 sm:flex-1"
                  >
                    {lev === 1 ? t('common.menu.lev_spot') : `${lev}x`}
                  </ThemedSelectionCard>
                );
              })}
            </div>
          </div>

          {/* Position Selection */}
          <div className={`grid grid-cols-2 gap-2.5 sm:gap-4 landscape:gap-2`}>
            <ThemedSelectionCard
              onClick={() => void onStart(MarketPosition.LONG, selectedLeverage)}
              disabled={price === 0}
              size="large"
              variant="position"
              accentColor={POSITION_ACCENTS.LONG}
              selected={activeRow === 3 && actionCol === 0}
              className="items-center justify-between gap-1.5 sm:gap-3 landscape:min-h-[64px]"
            >
              <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <IconTrendUp
                  className="size-7 shrink-0 sm:size-8"
                  color="currentColor"
                />
                <span className="whitespace-nowrap text-sm font-black uppercase leading-none tracking-[0.04em] sm:tracking-[0.08em]">
                  {t('common.long')}
                </span>
              </span>
              <span className="font-numbers shrink-0 text-xs font-bold leading-none opacity-75 sm:text-sm">
                {selectedLeverage}x
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-2 h-px bg-current opacity-35"
              />
            </ThemedSelectionCard>
            <ThemedSelectionCard
              onClick={() => void onStart(MarketPosition.SHORT, selectedLeverage)}
              disabled={price === 0}
              size="large"
              variant="position"
              accentColor={POSITION_ACCENTS.SHORT}
              selected={activeRow === 3 && actionCol === 1}
              className="items-center justify-between gap-1.5 sm:gap-3 landscape:min-h-[64px]"
            >
              <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <IconTrendDown
                  className="size-7 shrink-0 sm:size-8"
                  color="currentColor"
                />
                <span className="whitespace-nowrap text-sm font-black uppercase leading-none tracking-[0.04em] sm:tracking-[0.08em]">
                  {t('common.short')}
                </span>
              </span>
              <span className="font-numbers shrink-0 text-xs font-bold leading-none opacity-75 sm:text-sm">
                {selectedLeverage}x
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-2 h-px bg-current opacity-35"
              />
            </ThemedSelectionCard>
          </div>

          <ThemedButton
            intent="secondary"
            onClick={onOpenSettings}
            className={`mt-4 min-h-[50px] w-full touch-manipulation py-3 text-xs font-black uppercase tracking-widest transition-all duration-200 active:scale-[0.98] sm:mt-5 sm:min-h-[52px] sm:py-3.5 sm:text-sm
              ${!isRetro ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:hover:shadow-[0_0_20px_rgba(148,163,184,0.15)]' : ''}
              ${
                activeRow === 4
                  ? `scale-[1.02] ${isRetro ? '!border-[#39FF14] !bg-[#39FF14]/20 !text-[#39FF14]' : '!bg-slate-700 !text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white'}`
                  : ''
              }`}
          >
            {t('common.settings')}
          </ThemedButton>
          {/* Feature buttons row */}
          <div className="mt-3 flex w-full gap-2">
            {onOpenUpgrades && (
              <ThemedButton
                intent="secondary"
                onClick={onOpenUpgrades}
                className="min-h-[36px] flex-1 touch-manipulation py-2 text-[10px] font-bold uppercase tracking-wider active:scale-[0.98] sm:text-xs"
              >
                {t('common.menu.upgrades') as string}
              </ThemedButton>
            )}
            {onOpenChallenges && (
              <ThemedButton
                intent="secondary"
                onClick={onOpenChallenges}
                className="min-h-[36px] flex-1 touch-manipulation py-2 text-[10px] font-bold uppercase tracking-wider active:scale-[0.98] sm:text-xs"
              >
                {t('common.menu.challenges') as string}
              </ThemedButton>
            )}
            {onOpenReplays && (
              <ThemedButton
                intent="secondary"
                onClick={onOpenReplays}
                className="min-h-[36px] flex-1 touch-manipulation py-2 text-[10px] font-bold uppercase tracking-wider active:scale-[0.98] sm:text-xs"
              >
                {t('common.menu.replays') as string}
              </ThemedButton>
            )}
          </div>
          <div
            className={`pt-1 uppercase tracking-wider sm:pt-2 sm:tracking-widest ${isRetro ? 'font-retro-pixel text-[10px] text-[#7558A4] landscape:text-[9px]' : 'font-display text-[9px] text-slate-500 sm:text-[10px]'}`}
          >
            {t('common.menu.controls_hint')}
          </div>
        </ThemedPanel>
      </div>
    </div>
  );
};
