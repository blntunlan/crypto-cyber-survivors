import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../utils/trackRender';
import { useTheme } from '../../contexts/useTheme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useThemeSize } from '../../hooks/useThemeSize';
import { useDevice } from '../../hooks/useDevice';
import { OptimizationBadge } from '../ui/OptimizationBadge';
import { cn } from '../../utils/classnames';
import { ThemedPanel } from '../themed/ThemedPanel';
import { OverlayBackButton } from '../ui/OverlayChrome';
import { HubPlayerCard } from './HubPlayerCard.tsx';
import { LootboxService } from '../../services/lootbox';
import { InventoryService } from '../../services/inventory';
import { HubMenuButton } from './HubMenuButton.tsx';
import { useHubButtons, type HubButtonConfig } from './useHubButtons.tsx';
import { audio } from '../../services/audio';
import { COLORS } from '../../config/Colors';
import { type HubScreen } from './HubMenu';
import {
  useResponsiveHubColumns,
  useHubGridClassName,
} from './useResponsiveHubColumns.ts';

interface HubMenuV2Props {
  nickname: string;
  coins: number;
  onNavigate: (screen: HubScreen) => void;
  onBack?: () => void;
}

export const HubMenuV2: React.FC<HubMenuV2Props> = ({
  nickname,
  coins,
  onNavigate,
  onBack,
}) => {
  trackRender('HubMenuV2');
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const sizes = useThemeSize();
  const device = useDevice();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const columnCount = useResponsiveHubColumns();
  const hubGridClass = useHubGridClassName();

  const [lootboxCount, setLootboxCount] = useState(0);
  const [consumableCount, setConsumableCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      setLootboxCount(LootboxService.getTotalUnopenedCount());
      setConsumableCount(InventoryService.getConsumables().length);
    };

    updateCounts();
  }, []);

  const iconClass = 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14';

  const buttons: HubButtonConfig[] = useHubButtons({
    consumableCount,
    lootboxCount,
    iconClass,
    isRetro,
    t,
  });

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
        case ' ':
          event.preventDefault();
          {
            const btn = buttons[selectedIndex];
            if (btn && !btn.disabled) {
              audio.playButton();
              onNavigate(btn.screen);
            }
          }
          break;
      }
    },
    [buttons, columnCount, onNavigate, selectedIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const equippedSkin = InventoryService.getEquippedSkin();

  const statusCards = useMemo(
    () => [
      {
        label: t('hub.play_subtitle') as string,
        value: coins.toLocaleString(),
        accent: COLORS.JACKPOT_YELLOW,
      },
      {
        label: t('hub.stash') as string,
        value: consumableCount.toString(),
        accent: COLORS.WHALE,
      },
      {
        label: t('hub.loot') as string,
        value: lootboxCount.toString(),
        accent: COLORS.CASINO_GOLD,
      },
    ],
    [coins, consumableCount, lootboxCount, t]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'allow-scroll absolute inset-0 z-[110] flex flex-col items-center justify-start overflow-y-auto p-2.5 pb-[calc(0.75rem+var(--sab))] sm:justify-center sm:p-5',
        isRetro ? 'bg-[#0a0a12]/80' : 'bg-slate-950/60 backdrop-blur-lg'
      )}
    >
      <div
        className={cn(
          'relative w-full max-w-xl space-y-5 py-2 text-center sm:space-y-7 sm:py-0',
          onBack && 'pt-10 sm:pt-0'
        )}
      >
        {onBack && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <OverlayBackButton
              onClick={onBack}
              label={!device.isMobile ? 'Info' : undefined}
              className={device.isMobile ? 'top-auto' : undefined}
            />
          </motion.div>
        )}

        <motion.header
          className="space-y-3"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className={cn(
              isRetro
                ? 'font-retro-pixel text-[#FFD600]'
                : 'cyber-sway-text font-cyber',
              sizes.title,
              'leading-relaxed tracking-tight text-white'
            )}
          >
            {t('common.menu.title')}
            <br />
            <span
              className={cn(
                isRetro
                  ? 'drop-shadow-[0_0_10px_rgba(0,191,255,0.5)]'
                  : 'text-pump-green'
              )}
              style={{ color: isRetro ? COLORS.ELECTRIC_BLUE : COLORS.PUMP_GREEN }}
            >
              HUB TERMINAL
            </span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p
              className={cn(
                isRetro ? 'font-retro-pixel text-[10px] text-[#39FF14]' : 'font-cyber',
                'font-medium uppercase tracking-[0.3em] text-slate-500'
              )}
            >
              {t('common.menu.sentiment_engine')}
            </p>
            <OptimizationBadge sizes={sizes} />
          </div>
        </motion.header>

        <ThemedPanel
          className={cn(
            'relative space-y-5 overflow-hidden p-4 sm:p-5',
            !isRetro &&
              'bg-slate-900/85 !rounded-[1.75rem] border border-white/15 shadow-[0_30px_80px_rgba(2,6,23,0.85)] backdrop-blur-2xl'
          )}
        >
          {!isRetro && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/15" />
              <div className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-cyan-200/10" />
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hub-grid-item">
              <HubPlayerCard
                nickname={nickname}
                coins={coins}
                cryptoBalance={{ btc: 0, eth: 0, sol: 0 }}
                equippedSkin={equippedSkin}
                onAvatarClick={() => {
                  audio.playButton();
                  onNavigate('profile');
                }}
              />
            </div>
            <div className="hub-grid-item grid gap-3 sm:grid-cols-2">
              {statusCards.map(card => (
                <HubMetricCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  accent={card.accent}
                  isRetro={isRetro}
                />
              ))}
            </div>
          </div>

          <div className={cn(hubGridClass, 'relative z-10')}>
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

          <div
            className={cn(
              'hub-grid-item relative z-10 pt-1 text-center uppercase tracking-widest text-slate-400',
              isRetro
                ? 'font-retro-pixel text-[9px]'
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

interface HubMetricCardProps {
  label: string;
  value: string;
  accent: string;
  isRetro: boolean;
}

const HubMetricCard: React.FC<HubMetricCardProps> = ({
  label,
  value,
  accent,
  isRetro,
}) => (
  <div
    className={cn(
      'flex flex-col justify-between rounded-xl border border-white/5 p-2.5 text-left transition-shadow duration-300 sm:p-3',
      !isRetro && 'bg-white/5 hover:shadow-[0_0_25px_rgba(148,163,184,0.25)]',
      isRetro && 'border-2 border-[#39FF14]/30 bg-zinc-900/70'
    )}
  >
    <span
      className={cn(
        isRetro
          ? 'font-retro-pixel text-[9px]'
          : 'font-cyber text-xs uppercase tracking-[0.25em]',
        'text-slate-400'
      )}
    >
      {label}
    </span>
    <span
      className={cn(
        isRetro ? 'font-retro-pixel text-xl' : 'font-numbers text-2xl font-black',
        'mt-1'
      )}
      style={{ color: accent }}
    >
      {value}
    </span>
  </div>
);
