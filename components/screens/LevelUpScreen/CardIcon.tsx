import React from 'react';
import { type Card } from '../../../services/cards/CardSystem';
import {
  IconActivity,
  IconAlphaEye,
  IconApe,
  IconBanano,
  IconBolt,
  IconBoomerang,
  IconCode,
  IconCoins,
  IconDiamond,
  IconDice,
  IconDollarCircle,
  IconDuplicate,
  IconExplosion,
  IconFileText,
  IconFlame,
  IconFlashPulse,
  IconGenesisEmblem,
  IconKey,
  IconLifeBuoy,
  IconMagnet,
  IconMarketChart,
  IconRainbow,
  IconRepeat,
  IconRocket,
  IconScale,
  IconScale3D,
  IconShield,
  IconSkull,
  IconSpreadShot,
  IconStopLoss,
  IconSwapArrows,
  IconTarget,
  IconTimeLock,
  IconTrendUp,
  IconWallet,
  IconWhale,
  IconWheat,
  IconZap,
} from '../../icons/CardIcons';
import * as LucideIcons from 'lucide-react';

// Helper function to convert kebab-case to PascalCase for Lucide icons
const toPascalCase = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

interface CardIconProps {
  card: Card;
  color: string;
  scaleDown?: boolean;
}

type LucideIconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}>;

// Cache Lucide icon lookups to avoid repeated string conversion on every render
const lucideIconCache = new Map<string, LucideIconComponent | null>();

const getLucideIcon = (iconName: string) => {
  if (lucideIconCache.has(iconName)) return lucideIconCache.get(iconName)!;
  const pascalName = toPascalCase(iconName);
  const icon =
    (LucideIcons as unknown as Record<string, LucideIconComponent>)[pascalName] ?? null;
  lucideIconCache.set(iconName, icon);
  return icon;
};

type IconRendererInput = {
  className: string;
  color: string;
  scaleDown: boolean;
};

type IconRenderer = (input: IconRendererInput) => React.ReactNode;

const withComponent =
  (
    Component: React.ComponentType<{ className?: string; color?: string }>,
    options?: {
      fixedColor?: string;
      className?: (input: IconRendererInput) => string;
    }
  ): IconRenderer =>
  input => (
    <Component
      className={options?.className ? options.className(input) : input.className}
      color={options?.fixedColor ?? input.color}
    />
  );

const ICON_RENDERERS: Record<string, IconRenderer> = {
  'icon-market-chart': withComponent(IconMarketChart),
  'icon-alpha-eye': withComponent(IconAlphaEye),
  'icon-flash-pulse': withComponent(IconFlashPulse),
  'icon-genesis-emblem': withComponent(IconGenesisEmblem, {
    className: ({ scaleDown }) =>
      `${scaleDown ? 'w-12 h-12 md:w-20 md:h-20' : 'w-20 h-20'} relative z-10`,
  }),
  'icon-shield': withComponent(IconShield),
  'icon-diamond': withComponent(IconDiamond),
  'icon-rocket': withComponent(IconRocket),
  'icon-ape': withComponent(IconApe),
  'icon-bolt': withComponent(IconBolt),
  'icon-magnet': withComponent(IconMagnet),
  'icon-skull': withComponent(IconSkull),
  'icon-whale': withComponent(IconWhale),
  'icon-banano': withComponent(IconBanano, { fixedColor: '#FBDD11' }),
  'lucide:trending-up': withComponent(IconMarketChart),
  'lucide:zap': withComponent(IconZap),
  'lucide:life-buoy': withComponent(IconLifeBuoy),
  'lucide:wheat': withComponent(IconWheat),
  'lucide:octagon-x': withComponent(IconStopLoss),
  'lucide:crosshair': withComponent(IconTarget),
  'lucide:repeat': withComponent(IconRepeat),
  'lucide:scale': withComponent(IconScale),
  'lucide:activity': withComponent(IconActivity),
  'lucide:arrow-down-up': withComponent(IconSwapArrows),
  'lucide:arrow-up-right': withComponent(IconTrendUp),
  'lucide:file-text': withComponent(IconFileText),
  'lucide:circle-dollar-sign': withComponent(IconDollarCircle),
  'lucide:copy-plus': withComponent(IconDuplicate),
  'lucide:eye': withComponent(IconAlphaEye),
  'lucide:key': withComponent(IconKey),
  'lucide:shield': withComponent(IconShield),
  'lucide:rocket': withComponent(IconRocket),
  'lucide:gem': withComponent(IconDiamond),
  'lucide:scale-3d': withComponent(IconScale3D),
  'lucide:bolt': withComponent(IconBolt),
  'lucide:coins': withComponent(IconCoins),
  'lucide:wallet': withComponent(IconWallet),
  'lucide:file-code': withComponent(IconCode),
  'lucide:flame': withComponent(IconFlame),
  '⚡': withComponent(IconBolt),
  '⏰': withComponent(IconTimeLock),
  '🌈': withComponent(IconRainbow),
  '🎲': withComponent(IconDice),
  '💥': withComponent(IconExplosion),
  '🔫': withComponent(IconSpreadShot),
  '🔥': withComponent(IconFlame),
  '🛡️': withComponent(IconShield),
  '🪃': withComponent(IconBoomerang),
};

export const CardIcon = React.memo(
  ({ card, color, scaleDown = false }: CardIconProps) => {
    const iconSizeClass = scaleDown ? 'w-10 h-10 md:w-16 md:h-16' : 'w-16 h-16';
    const iconSize = scaleDown ? 40 : 64;
    const sharedProps = {
      className: `${iconSizeClass} relative z-10`,
      color,
      scaleDown,
    };

    const iconRenderer = ICON_RENDERERS[card.icon];
    if (iconRenderer) {
      return iconRenderer(sharedProps);
    }

    if (card.icon.startsWith('lucide:')) {
      const iconName = card.icon.replace('lucide:', '');
      const LucideIcon = getLucideIcon(iconName);
      if (LucideIcon) {
        return (
          <LucideIcon
            size={iconSize}
            color={color}
            className={`${iconSizeClass} relative z-10`}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        );
      }
    }

    // Emoji fallback for any future icons
    return <span className="relative z-10 text-4xl md:text-5xl">{card.icon}</span>;
  },
  (prev, next) =>
    prev.card.icon === next.card.icon &&
    prev.color === next.color &&
    prev.scaleDown === next.scaleDown
);

CardIcon.displayName = 'CardIcon';
