/**
 * MetaUpgradeScreen — Permanent upgrade tree between runs
 */

import React, { useCallback } from 'react';
import { useMetaProgressionStore } from '../../stores/metaProgressionStore';
import { MetaProgressionService } from '../../services/progression/MetaProgressionService';
import { META_UPGRADE_LIST } from '../../config/MetaUpgradeRegistry';
import {
  type MetaUpgradeId,
  type MetaUpgradeCategory,
} from '../../types/metaProgression';
import { useTheme } from '../../contexts/useTheme';
import { useThemeSize } from '../../hooks/useThemeSize';
import { ThemedButton } from '../themed/ThemedButton';
import {
  OverlayBackButton,
  OverlayChrome,
  OverlaySectionRail,
} from '../ui/OverlayChrome';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';

interface MetaUpgradeScreenProps {
  onBack: () => void;
}

const CATEGORY_LABELS: Record<MetaUpgradeCategory, string> = {
  combat: 'Combat',
  survival: 'Survival',
  economy: 'Economy',
  special: 'Special',
};

const CATEGORY_COLORS: Record<MetaUpgradeCategory, string> = {
  combat: COLORS.CASINO_RED,
  survival: COLORS.PUMP_GREEN,
  economy: COLORS.CASINO_GOLD,
  special: COLORS.WHALE,
};

export const MetaUpgradeScreen: React.FC<MetaUpgradeScreenProps> = ({ onBack }) => {
  const { metaCoins, upgrades } = useMetaProgressionStore();
  const { isRetro } = useTheme();
  const sizes = useThemeSize();

  const handlePurchase = useCallback(async (id: MetaUpgradeId) => {
    await MetaProgressionService.purchaseUpgrade(id);
  }, []);

  const categories = ['combat', 'survival', 'economy', 'special'] as const;

  return (
    <>
      <OverlayBackButton onClick={onBack} />
      <OverlayChrome
        zIndex={200}
        maxWidthClassName="max-w-6xl"
        title="Meta Upgrades"
        subtitle={`${metaCoins} meta credits available`}
      >
        <div className="space-y-6">
          {categories.map(category => {
            const items = META_UPGRADE_LIST.filter(
              upgrade => upgrade.category === category
            );
            if (items.length === 0) return null;

            return (
              <section key={category} className="space-y-3">
                <OverlaySectionRail
                  label={CATEGORY_LABELS[category]}
                  color={CATEGORY_COLORS[category]}
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(definition => {
                    const currentLevel = upgrades[definition.id];
                    const isMaxed = currentLevel >= definition.maxLevel;
                    const cost = isMaxed
                      ? 0
                      : (definition.costPerLevel[currentLevel] ?? 0);
                    const canAfford = metaCoins >= cost;

                    return (
                      <div
                        key={definition.id}
                        className={cn(
                          'relative overflow-hidden p-4 transition-all sm:p-5',
                          isRetro
                            ? 'border-2 border-[#39FF14]/40 bg-[#0a0a12]/80'
                            : 'rounded-sm border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                        )}
                        style={{
                          borderColor: isMaxed ? COLORS.PUMP_GREEN : undefined,
                          backgroundColor: !isRetro
                            ? `${CATEGORY_COLORS[category]}08`
                            : undefined,
                          opacity: isMaxed ? 0.8 : 1,
                        }}
                      >
                        {!isRetro && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
                            style={{
                              boxShadow: `0 0 14px ${CATEGORY_COLORS[category]}30`,
                            }}
                          />
                        )}

                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h3
                              className={cn(
                                isRetro ? 'font-retro-pixel' : 'font-cyber',
                                'text-base font-black uppercase tracking-wide text-white sm:text-lg'
                              )}
                            >
                              {definition.icon} {definition.name}
                            </h3>
                            <p
                              className={cn(
                                sizes.small,
                                'mt-1 leading-relaxed text-slate-400'
                              )}
                            >
                              {definition.description}
                            </p>
                          </div>
                          <span
                            className={cn(
                              isRetro ? 'font-retro-pixel' : 'font-cyber',
                              'shrink-0 text-[10px] font-black uppercase tracking-[0.2em]'
                            )}
                            style={{
                              color: isMaxed
                                ? COLORS.PUMP_GREEN
                                : CATEGORY_COLORS[category],
                            }}
                          >
                            {currentLevel}/{definition.maxLevel}
                          </span>
                        </div>

                        <div className="mb-4 flex gap-2">
                          {Array.from({ length: definition.maxLevel }).map(
                            (_, index) => (
                              <div
                                key={index}
                                className={cn(
                                  'h-2 flex-1',
                                  isRetro ? '' : 'rounded-full'
                                )}
                                style={{
                                  backgroundColor:
                                    index < currentLevel
                                      ? CATEGORY_COLORS[category]
                                      : 'rgba(148,163,184,0.25)',
                                  boxShadow:
                                    index < currentLevel
                                      ? `0 0 14px ${CATEGORY_COLORS[category]}55`
                                      : 'none',
                                }}
                              />
                            )
                          )}
                        </div>

                        {isMaxed ? (
                          <div className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                            Fully upgraded
                          </div>
                        ) : (
                          <ThemedButton
                            intent={canAfford ? 'primary' : 'secondary'}
                            onClick={() => void handlePurchase(definition.id)}
                            disabled={!canAfford}
                            className="min-h-[46px] w-full text-xs font-black uppercase tracking-[0.22em]"
                          >
                            {cost} Meta
                          </ThemedButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </OverlayChrome>
    </>
  );
};
