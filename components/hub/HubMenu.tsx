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
 * Responsive: 2-column grid on all screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/useTheme';
import { COLORS } from '../../config/Colors';
import { audio } from '../../services/audio';
import { HubMenuButton, type HubButtonId } from './HubMenuButton';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeSize } from '../../hooks/useThemeSize';
import { OptimizationBadge } from '../ui/OptimizationBadge';

import { HubPlayerCard } from './HubPlayerCard';
import { LootboxService } from '../../services/lootbox';
import { InventoryService } from '../../services/inventory';
import {
  HubIconPlay,
  HubIconStash,
  HubIconLoot,
  HubIconSkins,
  HubIconRanks,
  HubIconGear,
} from './HubIcons';

export type HubScreen = 'hub' | 'play' | 'stash' | 'loot' | 'skins' | 'ranks' | 'gear';

interface HubMenuProps {
  nickname: string;
  coins: number;
  onNavigate: (screen: HubScreen) => void;
}

interface HubButtonConfig {
  id: HubButtonId;
  icon: React.ReactNode;
  title: string;
  getSubtitle: () => string;
  getBadge: () => number;
  accentColor: string;
  screen: HubScreen;
  disabled?: boolean;
}

export const HubMenu: React.FC<HubMenuProps> = ({ nickname, coins, onNavigate }) => {
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const sizes = useThemeSize();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [lootboxCount, setLootboxCount] = useState(0);
  const [consumableCount, setConsumableCount] = useState(0);

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
  const buttons: HubButtonConfig[] = React.useMemo(
    () => [
      {
        id: 'play',
        icon: (
          <HubIconPlay
            className={iconClass}
            color={COLORS.PUMP_GREEN}
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.play'),
        getSubtitle: () => t('hub.play_subtitle'),
        getBadge: () => 0,

        accentColor: COLORS.PUMP_GREEN,
        screen: 'play',
      },
      {
        id: 'stash',
        icon: (
          <HubIconStash
            className={iconClass}
            color={COLORS.WHALE}
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.stash'),
        getSubtitle: () => t('hub.stash_subtitle', { count: consumableCount }),
        getBadge: () => 0,

        accentColor: COLORS.WHALE,
        screen: 'stash',
        disabled: true,
      },
      {
        id: 'loot',
        icon: (
          <HubIconLoot
            className={iconClass}
            color={COLORS.CASINO_GOLD}
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.loot'),
        getSubtitle: () =>
          lootboxCount > 0 ? t('hub.loot_subtitle') : t('hub.no_crates'),
        getBadge: () => lootboxCount,

        accentColor: COLORS.CASINO_GOLD,
        screen: 'loot',
        disabled: true,
      },
      {
        id: 'skins',
        icon: (
          <HubIconSkins
            className={iconClass}
            color="#9945FF"
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.skins'),
        getSubtitle: () => t('hub.skins_subtitle'),
        getBadge: () => 0,

        accentColor: '#9945FF',
        screen: 'skins',
        disabled: true,
      },
      {
        id: 'ranks',
        icon: (
          <HubIconRanks
            className={iconClass}
            color={COLORS.NEON_ORANGE}
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.ranks'),
        getSubtitle: () => t('hub.ranks_subtitle'),
        getBadge: () => 0,

        accentColor: COLORS.NEON_ORANGE,
        screen: 'ranks',
        disabled: true,
      },
      {
        id: 'gear',
        icon: (
          <HubIconGear
            className={iconClass}
            color="#94a3b8"
            isRetro={isRetro}
            isAnimated
          />
        ),
        title: t('hub.gear'),
        getSubtitle: () => t('hub.gear_subtitle'),
        getBadge: () => 0,

        accentColor: '#64748b',
        screen: 'gear',
      },
    ],
    [consumableCount, lootboxCount, iconClass, isRetro, t]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const cols = 2;
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
    [selectedIndex, buttons, onNavigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get equipped skin from inventory
  const equippedSkin = InventoryService.getEquippedSkin();

  return (
    <div
      className={`
        absolute inset-0 z-[100]
        flex flex-col items-center justify-start
        p-4 sm:p-6 lg:p-8
        overflow-y-auto
        allow-scroll
        ${isRetro ? 'bg-zinc-950' : 'bg-slate-950/80 backdrop-blur-sm'}
      `}
    >
      {/* Container */}
      <div className="w-full max-w-lg space-y-4 sm:space-y-6">
        {/* Title */}
        <motion.header
          className="space-y-3 sm:space-y-5 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className={`${isRetro ? 'font-retro-pixel' : 'font-cyber cyber-sway-text'} ${sizes.title} tracking-tight text-white leading-relaxed`}
          >
            {t('common.menu.title')}
            <br />
            <span style={{ color: COLORS.PUMP_GREEN }}>
              {t('common.menu.subtitle')}
            </span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={`${isRetro ? 'font-retro-pixel text-[10px]' : 'font-cyber'} text-slate-500 font-medium uppercase tracking-[0.2em] ${sizes.tiny}`}
            >
              HUB TERMINAL
            </p>

            <OptimizationBadge sizes={sizes} />
          </div>
        </motion.header>

        {/* Player Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <HubPlayerCard
            nickname={nickname}
            coins={coins}
            cryptoBalance={{ btc: 0, eth: 0, sol: 0 }}
            equippedSkin={equippedSkin}
            // onAvatarClick={() => onNavigate('skins')} // Temporarily disabled: Player menu/skins and stash not yet fully integrated
          />
        </motion.div>

        {/* Button Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 sm:gap-4"
        >
          {buttons.map((btn, index) => (
            <motion.div
              key={btn.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
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
            </motion.div>
          ))}
        </motion.div>

        {/* Navigation Help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`
            text-center
            py-2
            ${
              isRetro
                ? 'font-retro-pixel text-[8px] border-t-2 border-b-2 border-zinc-700'
                : 'font-cyber text-xs'
            }
            text-slate-500
            uppercase tracking-widest
          `}
        >
          {isRetro ? t('hub.nav_help_retro') : t('hub.nav_help_modern')}
        </motion.div>
      </div>
    </div>
  );
};
