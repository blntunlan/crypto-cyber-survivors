import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { trackRender } from '../../utils/trackRender';
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
import { useHubSkin } from './useHubSkin';
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
  const skin = useHubSkin();
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
    isRetro: skin.isRetroIconStyle,
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
        skin.backdrop
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
              label="Back to landing page"
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
            className={cn(skin.header, sizes.title, 'leading-relaxed tracking-tight')}
          >
            {t('common.menu.title')}
            <br />
            <span className={cn(skin.headerAccent)}>HUB TERMINAL</span>
          </h1>

          <div className="flex flex-col items-center gap-2">
            <p className={cn(skin.subtitle, 'font-medium uppercase tracking-[0.3em]')}>
              {t('common.menu.sentiment_engine')}
            </p>
            <OptimizationBadge sizes={sizes} />
          </div>
        </motion.header>

        <ThemedPanel
          surface="raised"
          padding="md"
          className="relative space-y-5 overflow-hidden"
        >
          <div aria-hidden="true" className={skin.panelDecoration} />
          <div aria-hidden="true" className={skin.panelInnerDecoration} />
          <div aria-hidden="true" className={skin.panelTopDecoration} />

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
              skin.navigationHelp
            )}
          >
            {t(skin.navigationHelpKey)}
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
}

const HubMetricCard: React.FC<HubMetricCardProps> = ({ label, value, accent }) => {
  const skin = useHubSkin();

  return (
    <div
      className={cn(
        'flex flex-col justify-between p-2.5 text-left sm:p-3',
        skin.metric
      )}
    >
      <span className={skin.metricLabel}>{label}</span>
      <span className={cn('mt-1', skin.metricValue)} style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
};
