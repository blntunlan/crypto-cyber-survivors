/**
 * HubMenu - Main hub navigation component
 *
 * Console-style hub menu with 6 main sections:
 * - PLAY: Start game (leads to MainMenu)
 * - STASH: Inventory/Consumables
 * - LOOT: Lootbox opening
 * - SKINS: Character skin selection
 * - RANKS: Leaderboard
 * - GEAR: Settings
 *
 * Supports Cyberpunk and Retro 16-bit themes.
 * Responsive: compact 2-column grid on most phones, 3-column grid on xl desktops.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { trackRender } from '../../utils/trackRender';
import { useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { CRYPTO_PAIRS, type CryptoPair } from '../../types/crypto';
import { audio } from '../../services/audio/AudioService';
import { HubMenuButton } from './HubMenuButton.tsx';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useDevice } from '../../hooks/useDevice';
import { OptimizationBadge } from '../ui/OptimizationBadge';
import { cn } from '../../utils/classnames';
import { ThemedPanel } from '../themed/ThemedPanel';
import { OverlayBackButton } from '../ui/OverlayChrome';

import { HubPlayerCard } from './HubPlayerCard.tsx';
import { PlayerProfile } from './PlayerProfile';
import { LootboxService } from '../../services/lootbox/LootboxService';
import { InventoryService } from '../../services/inventory/InventoryService';
import { useHubButtons, type HubButtonConfig } from './useHubButtons.tsx';
import {
  useResponsiveHubColumns,
  useHubGridClassName,
} from './useResponsiveHubColumns.ts';

export type HubScreen = 'hub' | 'play' | 'stash' | 'loot' | 'skins' | 'ranks' | 'gear';

interface HubMenuProps {
  nickname: string;
  coins: number;
  onNavigate: (screen: HubScreen) => void;
  selectedPair?: CryptoPair;
  /** Return to Landing Page */
  onBack?: () => void;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  nickname,
  coins,
  onNavigate,
  selectedPair = 'BTC',
  onBack,
}) => {
  trackRender('HubMenu');
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const sizes = useThemeSize();
  const device = useDevice();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pairConfig = CRYPTO_PAIRS[selectedPair];
  const accentColor = isRetro ? COLORS.ELECTRIC_BLUE : pairConfig.color;

  const [lootboxCount] = useState(() => LootboxService.getTotalUnopenedCount());
  const [consumableCount] = useState(() => InventoryService.getConsumables().length);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const columnCount = useResponsiveHubColumns();
  const hubGridClass = useHubGridClassName();

  // Icon size class for consistency
  const iconClass = 'size-7 sm:size-10 lg:size-12';

  // Hub button configurations with theme-aware icons
  const buttons: HubButtonConfig[] = useHubButtons({
    consumableCount,
    lootboxCount,
    iconClass,
    isRetro,
    t,
  });

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const cols = columnCount || 1;
      const rows = Math.ceil(buttons.length / cols);
      const currentRow = Math.floor(selectedIndex / cols);
      const currentCol = selectedIndex % cols;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          if (currentRow > 0) {
            setSelectedIndex(prev => prev - cols);
            audio.playSelectionTick();
          }
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          if (currentRow < rows - 1) {
            const newIndex = selectedIndex + cols;
            if (newIndex < buttons.length) {
              setSelectedIndex(newIndex);
              audio.playSelectionTick();
            }
          }
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          if (currentCol > 0) {
            setSelectedIndex(prev => prev - 1);
            audio.playSelectionTick();
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          if (currentCol < cols - 1 && selectedIndex < buttons.length - 1) {
            setSelectedIndex(prev => prev + 1);
            audio.playSelectionTick();
          }
          break;

        case 'Enter':
        case ' ': {
          event.preventDefault();
          const btn = buttons[selectedIndex];
          if (btn && !btn.disabled) {
            audio.playButton();
            onNavigate(btn.screen);
          }
          break;
        }
      }
    },
    [selectedIndex, buttons, onNavigate, columnCount]
  );
  const handleKeyDownRef = useRef(handleKeyDown);

  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
  }, [handleKeyDown]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDownRef.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  // Get equipped skin from inventory
  const equippedSkin = InventoryService.getEquippedSkin();

  return (
    <div
      className={`
        allow-scroll absolute inset-0 z-[100] flex flex-col items-center
        justify-start overflow-y-auto p-2.5 pb-[calc(0.75rem+var(--sab))]
        sm:justify-center sm:p-6 sm:pb-6
        landscape:px-[calc(0.75rem+var(--sal))] landscape:py-2
        ${isRetro ? 'bg-[#0a0a12]/70' : 'bg-slate-950/92'}
      `}
    >
      {/* Back Button (Top Left) */}
      {onBack && (
        <OverlayBackButton
          onClick={onBack}
          label={!device.isMobile ? 'Info' : undefined}
          className={device.isMobile ? 'top-auto' : undefined}
        />
      )}

      <div className="relative w-full max-w-xl space-y-4 py-2 text-center sm:space-y-8 sm:py-0 landscape:space-y-2">
        {/* Title */}
        <header className="space-y-2.5 text-center sm:space-y-5">
          <h1
            className={cn(
              isRetro ? 'font-retro-pixel' : 'font-cyber',
              sizes.title,
              'leading-relaxed tracking-tight',
              isRetro
                ? 'text-[#FFD600] drop-shadow-[0_0_10px_rgba(255,214,0,0.5)]'
                : 'text-white sm:drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]'
            )}
          >
            {t('common.menu.title')}
            <br />
            <span
              className={cn(
                isRetro
                  ? 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]'
                  : 'sm:drop-shadow-[0_0_20px_var(--tw-shadow-color)]'
              )}
              style={{ color: accentColor }}
            >
              {t('common.menu.subtitle')}
            </span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px] text-[#39FF14]' : 'font-cyber text-slate-500'} font-medium uppercase tracking-[0.2em] ${sizes.tiny}`}
            >
              HUB TERMINAL
            </p>

            <OptimizationBadge sizes={sizes} />
          </div>
        </header>

        {/* Player Profile Modal */}
        <PlayerProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

        <ThemedPanel
          className={cn(
            'relative space-y-3.5 overflow-hidden p-3.5 transition-colors duration-200 sm:space-y-5 sm:p-6',
            !isRetro &&
              'bg-slate-900/92 !rounded-[1.5rem] border border-white/20 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)]'
          )}
        >
          {!isRetro && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-cyan-200/10" />
              <div
                className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 20px ${accentColor}40`,
                }}
              />
            </>
          )}

          {/* Player Card */}
          <div className="relative z-10">
            <HubPlayerCard
              nickname={nickname}
              coins={coins}
              cryptoBalance={{ btc: 0, eth: 0, sol: 0 }}
              equippedSkin={equippedSkin}
              variant="embedded"
              onAvatarClick={() => {
                audio.playButton();
                setIsProfileOpen(true);
              }}
            />
          </div>

          {/* Button Grid */}
          <div className="relative z-10 flex items-center gap-2">
            <div
              className={`h-px flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-r from-transparent to-white/10'}`}
            />
            <span
              className={`text-[9px] uppercase sm:text-[10px] ${isRetro ? 'font-retro-pixel' : 'font-cyber'} font-bold tracking-[0.15em] sm:tracking-[0.2em]`}
              style={{ color: isRetro ? COLORS.NEON_GREEN : accentColor }}
            >
              HUB ACCESS
            </span>
            <div
              className={`h-px flex-1 ${isRetro ? 'bg-[#39FF14]/30' : 'bg-gradient-to-l from-transparent to-white/10'}`}
            />
          </div>
          <div className={cn('relative z-10', hubGridClass)}>
            {buttons.map((btn, index) => (
              <div key={btn.id} className="h-full">
                <HubMenuButton
                  id={btn.id}
                  icon={btn.icon}
                  title={btn.title}
                  subtitle={btn.getSubtitle()}
                  badge={btn.getBadge()}
                  badgeColor={btn.accentColor}
                  accentColor={btn.accentColor}
                  isSelected={selectedIndex === index}
                  disabled={btn.disabled}
                  onClick={() => {
                    if (btn.disabled) return;
                    audio.playButton();
                    onNavigate(btn.screen);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Navigation Help */}
          <div
            className={cn(
              'relative z-10 pt-1 text-center uppercase tracking-widest text-slate-500',
              isRetro
                ? 'border-b-2 border-t-2 border-[#39FF14]/20 font-retro-pixel text-[9px]'
                : 'font-display text-[9px] sm:text-[10px]'
            )}
          >
            {isRetro ? t('hub.nav_help_retro') : t('hub.nav_help_modern')}
          </div>
        </ThemedPanel>
      </div>
    </div>
  );
};
