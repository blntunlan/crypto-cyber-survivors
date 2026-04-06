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
 * Responsive: 2-column grid on mobile/tablet, 3-column grid on xl desktops.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../utils/trackRender';
import { useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { audio } from '../../services/audio';
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
import { LootboxService } from '../../services/lootbox';
import { InventoryService } from '../../services/inventory';
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
  /** Return to Landing Page */
  onBack?: () => void;
}

export const HubMenu: React.FC<HubMenuProps> = ({
  nickname,
  coins,
  onNavigate,
  onBack,
}) => {
  trackRender('HubMenu');
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const sizes = useThemeSize();
  const device = useDevice();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [lootboxCount, setLootboxCount] = useState(0);
  const [consumableCount, setConsumableCount] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const columnCount = useResponsiveHubColumns();
  const hubGridClass = useHubGridClassName();

  // Update counts from services
  useEffect(() => {
    const updateCounts = () => {
      setLootboxCount(LootboxService.getTotalUnopenedCount());
      setConsumableCount(InventoryService.getConsumables().length);
    };

    updateCounts();
    // Could subscribe to events here for real-time updates
  }, []);

  // Icon size class for consistency
  const iconClass = 'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12';

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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get equipped skin from inventory
  const equippedSkin = InventoryService.getEquippedSkin();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        allow-scroll absolute inset-0
        z-[100] flex flex-col items-center
        justify-start overflow-y-auto overscroll-contain
        scroll-smooth p-2.5 pb-[calc(0.75rem+var(--sab))]
        sm:justify-center sm:p-5
        ${isRetro ? 'bg-zinc-950' : 'bg-slate-950/60 backdrop-blur-sm'}
      `}
    >
      <div
        className={cn(
          'relative w-full max-w-xl space-y-4 py-2 text-center sm:space-y-6 sm:py-0',
          onBack && 'pt-10 sm:pt-0'
        )}
      >
        {/* Back Button (Top Left) */}
        {onBack && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <OverlayBackButton
              onClick={onBack}
              label={!device.isMobile ? 'Info' : undefined}
              className={device.isMobile ? 'top-auto' : undefined}
            />
          </motion.div>
        )}

        {/* Title */}
        <motion.header
          className="space-y-3 text-center sm:space-y-5"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className={cn(
              isRetro ? 'font-retro-pixel' : 'cyber-sway-text font-cyber',
              sizes.title,
              'leading-relaxed tracking-tight',
              isRetro
                ? 'text-[#FFD600] drop-shadow-[0_0_10px_rgba(255,214,0,0.5)]'
                : 'text-white'
            )}
          >
            {t('common.menu.title')}
            <br />
            <span
              className={cn(isRetro && 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]')}
              style={{ color: isRetro ? COLORS.ELECTRIC_BLUE : COLORS.PUMP_GREEN }}
            >
              {t('common.menu.subtitle')}
            </span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px]' : 'font-cyber'} font-medium uppercase tracking-[0.2em] text-slate-500 ${sizes.tiny}`}
            >
              HUB TERMINAL
            </p>

            <OptimizationBadge sizes={sizes} />
          </div>
        </motion.header>

        {/* Player Profile Modal */}
        <PlayerProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

        <ThemedPanel
          className={cn(
            'relative space-y-4 p-4 sm:space-y-5 sm:p-5',
            !isRetro &&
              'bg-slate-900/78 !rounded-[1.5rem] border border-white/20 shadow-[0_20px_80px_rgba(2,6,23,0.8),0_0_0_1px_rgba(148,163,184,0.22)] backdrop-blur-xl'
          )}
        >
          {!isRetro && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-white/25" />
              <div className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-cyan-200/10" />
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.25)]" />
            </>
          )}

          {/* Player Card */}
          <div
            className="hub-grid-item relative z-10"
            style={{ animationDelay: '0.1s' }}
          >
            <HubPlayerCard
              nickname={nickname}
              coins={coins}
              cryptoBalance={{ btc: 0, eth: 0, sol: 0 }}
              equippedSkin={equippedSkin}
              onAvatarClick={() => {
                audio.playButton();
                setIsProfileOpen(true);
              }}
            />
          </div>

          {/* Button Grid - CSS stagger instead of per-item framer-motion */}
          <div className={cn('relative z-10', hubGridClass)}>
            {buttons.map((btn, index) => (
              <div
                key={btn.id}
                className="hub-grid-item h-full"
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
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
              'hub-grid-item relative z-10 pt-1 text-center uppercase tracking-widest text-slate-500',
              isRetro
                ? 'border-b-2 border-t-2 border-[#39FF14]/20 font-retro-pixel text-[9px]'
                : 'font-display text-[9px] sm:text-[10px]'
            )}
          >
            {isRetro ? t('hub.nav_help_retro') : t('hub.nav_help_modern')}
          </div>
        </ThemedPanel>
      </div>
    </motion.div>
  );
};
