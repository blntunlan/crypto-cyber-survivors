import React from 'react';
import { COLORS } from '../../config/Colors';
import { type HubButtonId } from './HubMenuButton.tsx';
import { type HubScreen } from './HubMenu';
import {
  HubIconPlay,
  HubIconStash,
  HubIconLoot,
  HubIconSkins,
  HubIconRanks,
  HubIconGear,
} from './HubIcons.tsx';

export interface HubButtonConfig {
  id: HubButtonId;
  icon: React.ReactNode;
  title: string;
  getSubtitle: () => string;
  getBadge: () => number;
  accentColor: string;
  screen: HubScreen;
  disabled?: boolean;
}

interface UseHubButtonsOptions {
  consumableCount: number;
  lootboxCount: number;
  iconClass: string;
  isRetro: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function useHubButtons({
  consumableCount,
  lootboxCount,
  iconClass,
  isRetro,
  t,
}: UseHubButtonsOptions): HubButtonConfig[] {
  const shouldAnimateIcons = true;

  return React.useMemo(
    () => [
      {
        id: 'play',
        icon: (
          <HubIconPlay
            className={iconClass}
            color={COLORS.PUMP_GREEN}
            isRetro={isRetro}
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.play') as string,
        getSubtitle: () => t('hub.play_subtitle') as string,
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
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.stash') as string,
        getSubtitle: () =>
          t('hub.stash_subtitle', { count: consumableCount }) as string,
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
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.loot') as string,
        getSubtitle: () =>
          lootboxCount > 0
            ? (t('hub.loot_subtitle') as string)
            : (t('hub.no_crates') as string),
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
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.skins') as string,
        getSubtitle: () => t('hub.skins_subtitle') as string,
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
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.ranks') as string,
        getSubtitle: () => t('hub.ranks_subtitle') as string,
        getBadge: () => 0,
        accentColor: COLORS.NEON_ORANGE,
        screen: 'ranks',
      },
      {
        id: 'gear',
        icon: (
          <HubIconGear
            className={iconClass}
            color="#94a3b8"
            isRetro={isRetro}
            isAnimated={shouldAnimateIcons}
          />
        ),
        title: t('hub.gear') as string,
        getSubtitle: () => t('hub.gear_subtitle') as string,
        getBadge: () => 0,
        accentColor: '#64748b',
        screen: 'gear',
      },
    ],
    [consumableCount, iconClass, isRetro, lootboxCount, shouldAnimateIcons, t]
  );
}
