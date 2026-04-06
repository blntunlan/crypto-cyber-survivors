/**
 * MetaUpgradeScreen — Permanent upgrade tree between runs
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useMetaProgressionStore } from '../../stores/metaProgressionStore';
import { MetaProgressionService } from '../../services/progression/MetaProgressionService';
import { META_UPGRADE_LIST } from '../../config/MetaUpgradeRegistry';
import {
  type MetaUpgradeId,
  type MetaUpgradeCategory,
  type MetaUpgradeIconId,
} from '../../types/metaProgression';
import { useTheme } from '../../contexts/useTheme';
import { ThemedButton } from '../themed/ThemedButton';
import { ThemedPanel } from '../themed/ThemedPanel';
import { ThemedInput } from '../themed/ThemedInput';
import { OverlayBackButton, OverlayChrome } from '../ui/OverlayChrome';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';
import {
  IconActivity,
  IconBolt,
  IconFlashPulse,
  IconLifeBuoy,
  IconMagnet,
  IconMarketChart,
  IconRocket,
  IconSparkles,
  IconTrophy,
  IconShield,
  IconSlot,
  IconSpreadShot,
  IconTarget,
  IconTimeLock,
} from '../icons/CardIcons';
import { useLanguage } from '../../contexts/useLanguage';

interface MetaUpgradeScreenProps {
  onBack: () => void;
}

const CATEGORY_COLORS: Record<MetaUpgradeCategory, string> = {
  combat: COLORS.CASINO_RED,
  survival: COLORS.PUMP_GREEN,
  economy: COLORS.CASINO_GOLD,
  special: COLORS.WHALE,
};

const CATEGORY_ICON_MAP: Record<MetaUpgradeCategory, UpgradeIconComponent> = {
  combat: IconFlashPulse,
  survival: IconLifeBuoy,
  economy: IconMarketChart,
  special: IconRocket,
};

type UpgradeIconComponent = React.ComponentType<{ className?: string; color?: string }>;
type UpgradeCategoryView = MetaUpgradeCategory | 'all';

const UPGRADE_ICON_MAP: Record<MetaUpgradeIconId, UpgradeIconComponent> = {
  'combat-damage': IconFlashPulse,
  'combat-crit': IconTarget,
  'combat-projectile': IconSpreadShot,
  'survival-hp': IconLifeBuoy,
  'survival-armor': IconShield,
  'survival-dash': IconBolt,
  'economy-magnet': IconMagnet,
  'economy-luck': IconSparkles,
  'economy-xp': IconMarketChart,
  'special-headstart': IconRocket,
  'special-quad': IconSlot,
  'special-grace': IconTimeLock,
};

export const MetaUpgradeScreen: React.FC<MetaUpgradeScreenProps> = ({ onBack }) => {
  const { metaCoins, upgrades, totalRunsCompleted, totalMetaCoinsEarned } =
    useMetaProgressionStore();
  const { isRetro } = useTheme();
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<UpgradeCategoryView>('combat');
  const [searchValue, setSearchValue] = useState('');
  const [onlyAffordable, setOnlyAffordable] = useState(false);

  const handlePurchase = useCallback(async (id: MetaUpgradeId) => {
    await MetaProgressionService.purchaseUpgrade(id);
  }, []);

  const categories = ['combat', 'survival', 'economy', 'special'] as const;

  const localizedCategoryLabels: Record<UpgradeCategoryView, string> = useMemo(
    () => ({
      all: t('menu_pages.upgrades.categories.all') as string,
      combat: t('menu_pages.upgrades.categories.combat') as string,
      survival: t('menu_pages.upgrades.categories.survival') as string,
      economy: t('menu_pages.upgrades.categories.economy') as string,
      special: t('menu_pages.upgrades.categories.special') as string,
    }),
    [t]
  );

  const panelCopy = useMemo(
    () => ({
      tagline: t('menu_pages.upgrades.tagline') as string,
      summaryHelper: t('menu_pages.upgrades.summary_helper') as string,
      searchPlaceholder: t('menu_pages.upgrades.search_placeholder') as string,
      searchLabel: t('menu_pages.upgrades.search_label') as string,
      filtersLabel: t('menu_pages.upgrades.filters_label') as string,
      affordableLabel: t('menu_pages.upgrades.affordable_label') as string,
      noResults: t('menu_pages.upgrades.no_results') as string,
      maxedLabel: t('menu_pages.upgrades.maxed_label') as string,
      progressLabel: t('menu_pages.upgrades.progress_label') as string,
      buyLabel: t('menu_pages.upgrades.buy_label') as string,
    }),
    [t]
  );

  const summaryTiles = useMemo(
    () => [
      {
        label: t('menu_pages.upgrades.tiles.balance.label') as string,
        value: metaCoins.toLocaleString(),
        helper: t('menu_pages.upgrades.tiles.balance.helper') as string,
        accent: COLORS.CASINO_GOLD,
        Icon: IconSparkles,
      },
      {
        label: t('menu_pages.upgrades.tiles.runs.label') as string,
        value: totalRunsCompleted.toLocaleString(),
        helper: t('menu_pages.upgrades.tiles.runs.helper') as string,
        accent: COLORS.ELECTRIC_BLUE,
        Icon: IconTrophy,
      },
      {
        label: t('menu_pages.upgrades.tiles.lifetime.label') as string,
        value: totalMetaCoinsEarned.toLocaleString(),
        helper: t('menu_pages.upgrades.tiles.lifetime.helper') as string,
        accent: COLORS.PUMP_GREEN,
        Icon: IconActivity,
      },
    ],
    [metaCoins, totalRunsCompleted, totalMetaCoinsEarned, t]
  );

  const filteredUpgrades = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return META_UPGRADE_LIST.filter(definition => {
      if (activeCategory !== 'all' && definition.category !== activeCategory) {
        return false;
      }

      const currentLevel = upgrades[definition.id] ?? 0;
      const isMaxed = currentLevel >= definition.maxLevel;
      const nextCost = definition.costPerLevel[currentLevel] ?? 0;

      if (onlyAffordable && (isMaxed || metaCoins < nextCost)) {
        return false;
      }

      if (!query) return true;
      const haystack = `${definition.name} ${definition.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeCategory, onlyAffordable, searchValue, upgrades, metaCoins]);

  const subtitle = t('menu_pages.upgrades.subtitle', {
    meta: metaCoins.toLocaleString(),
  }) as string;

  return (
    <>
      <OverlayBackButton onClick={onBack} />
      <OverlayChrome
        zIndex={200}
        maxWidthClassName="max-w-6xl"
        contentClassName="space-y-6"
        title={t('menu.upgrades') as string}
        subtitle={subtitle}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_1fr]">
          <ThemedPanel
            className={cn('space-y-5 p-5', isRetro ? 'font-retro-pixel' : 'font-cyber')}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                {panelCopy.summaryHelper}
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase text-white">
                {t('menu.upgrades') as string}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{panelCopy.tagline}</p>
            </div>

            <div className="grid gap-3">
              {summaryTiles.map(tile => {
                const IconRef = tile.Icon ?? IconSparkles;
                return (
                  <div
                    key={tile.label}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                        {tile.label}
                      </p>
                      <p
                        className="font-display text-xl font-black text-white"
                        style={{ color: tile.accent }}
                      >
                        {tile.value}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {tile.helper}
                      </p>
                    </div>
                    <IconRef className="h-7 w-7" color={tile.accent} />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                {panelCopy.filtersLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {(['all', ...categories] as UpgradeCategoryView[]).map(filter => {
                  const selected = activeCategory === filter;
                  const accent =
                    filter === 'all' ? COLORS.ELECTRIC_BLUE : CATEGORY_COLORS[filter];
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveCategory(filter)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] transition-all',
                        selected
                          ? isRetro
                            ? 'bg-black text-white'
                            : 'text-white shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                          : 'text-slate-400'
                      )}
                      style={{
                        borderColor: accent,
                        backgroundColor:
                          selected && !isRetro ? `${accent}25` : undefined,
                      }}
                    >
                      {localizedCategoryLabels[filter]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <ThemedButton
                intent={onlyAffordable ? 'primary' : 'secondary'}
                onClick={() => setOnlyAffordable(value => !value)}
                className="min-h-[40px] flex-1 text-[10px] font-black uppercase tracking-[0.24em]"
              >
                {panelCopy.affordableLabel}
              </ThemedButton>
            </div>
          </ThemedPanel>

          <div className="space-y-4">
            <ThemedPanel
              className={cn(
                'flex flex-wrap gap-3 p-4',
                isRetro ? 'font-retro-pixel' : 'font-cyber'
              )}
            >
              <label className="flex flex-1 flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
                {panelCopy.searchLabel}
                <ThemedInput
                  type="search"
                  value={searchValue}
                  onChange={event => setSearchValue(event.target.value)}
                  placeholder={panelCopy.searchPlaceholder}
                  className="w-full bg-white/5 py-2 text-sm text-white placeholder:text-slate-500"
                />
              </label>
            </ThemedPanel>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredUpgrades.map(definition => {
                const currentLevel = upgrades[definition.id];
                const isMaxed = currentLevel >= definition.maxLevel;
                const cost = isMaxed ? 0 : (definition.costPerLevel[currentLevel] ?? 0);
                const canAfford = metaCoins >= cost && !isMaxed;
                const IconComponent = UPGRADE_ICON_MAP[definition.icon];
                const progressPercent = Math.round(
                  (currentLevel / definition.maxLevel) * 100
                );
                const costLabel = cost.toLocaleString();
                const accent = CATEGORY_COLORS[definition.category];

                return (
                  <ThemedPanel
                    key={definition.id}
                    className={cn(
                      'group flex h-full flex-col gap-3 p-4',
                      isRetro ? 'font-retro-pixel' : 'font-cyber'
                    )}
                    style={{
                      borderColor: isMaxed ? COLORS.PUMP_GREEN : undefined,
                      background: !isRetro
                        ? `linear-gradient(135deg, ${accent}10, rgba(2,6,23,0.85))`
                        : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg border border-white/10 bg-white/5 p-2',
                            isRetro && '!rounded-none'
                          )}
                        >
                          {IconComponent && (
                            <IconComponent
                              className="h-6 w-6"
                              color={isRetro ? '#39FF14' : accent}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                            {localizedCategoryLabels[definition.category]}
                          </p>
                          <h3 className="text-base font-black uppercase text-white">
                            {definition.name}
                          </h3>
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-black uppercase tracking-[0.3em]"
                        style={{ color: isMaxed ? COLORS.PUMP_GREEN : accent }}
                      >
                        {currentLevel}/{definition.maxLevel}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400">{definition.description}</p>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-500">
                        <span>{panelCopy.progressLabel}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progressPercent}%`,
                            backgroundColor: accent,
                            boxShadow: `0 0 12px ${accent}70`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                      {isMaxed ? (
                        <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                          {panelCopy.maxedLabel}
                        </span>
                      ) : (
                        <>
                          <ThemedButton
                            intent={canAfford ? 'primary' : 'secondary'}
                            onClick={() => void handlePurchase(definition.id)}
                            disabled={!canAfford}
                            className="min-h-[40px] flex-1 text-[10px] font-black uppercase tracking-[0.24em]"
                          >
                            {panelCopy.buyLabel}
                          </ThemedButton>
                          <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                            {costLabel} META
                          </span>
                        </>
                      )}
                    </div>
                  </ThemedPanel>
                );
              })}
            </div>

            {filteredUpgrades.length === 0 && (
              <ThemedPanel className="p-6 text-center text-sm text-slate-400">
                {panelCopy.noResults}
              </ThemedPanel>
            )}
          </div>
        </div>
      </OverlayChrome>
    </>
  );
};
