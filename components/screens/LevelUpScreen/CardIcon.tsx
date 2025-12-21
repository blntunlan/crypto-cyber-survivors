import React from 'react';
import { type Card } from '../../../services/CardSystem';
import {
  IconMarketChart,
  IconAlphaEye,
  IconFlashPulse,
  IconGenesisEmblem,
  IconShield,
  IconDiamond,
  IconRocket,
  IconApe,
  IconBolt,
  IconMagnet,
  IconSkull,
  IconWhale,
  IconBanano,
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

export const CardIcon = React.memo(({ card, color, scaleDown = false }: CardIconProps) => {
  const iconSizeClass = scaleDown ? 'w-10 h-10 md:w-16 md:h-16' : 'w-16 h-16';
  const iconSize = scaleDown ? 40 : 64;
  const iconProps = { className: `${iconSizeClass} relative z-10`, color };

  // Handle Lucide icons (format: "lucide:icon-name")
  if (card.icon.startsWith('lucide:')) {
    const iconName = card.icon.replace('lucide:', '');
    const pascalName = toPascalCase(iconName);
    const LucideIcon = (
      LucideIcons as unknown as Record<
        string,
        React.ComponentType<{ size?: number; color?: string; className?: string }>
      >
    )[pascalName];
    if (LucideIcon) {
      return (
        <LucideIcon
          size={iconSize}
          color={color}
          className={`${iconSizeClass} relative z-10 drop-shadow-[0_0_8px_${color}]`}
        />
      );
    }
    // Fallback if Lucide icon not found
    return <span className="text-4xl relative z-10">💎</span>;
  }

  switch (card.icon) {
    case 'icon-market-chart':
      return <IconMarketChart {...iconProps} />;
    case 'icon-alpha-eye':
      return <IconAlphaEye {...iconProps} />;
    case 'icon-flash-pulse':
      return <IconFlashPulse {...iconProps} />;
    case 'icon-genesis-emblem': {
      const genesisSize = scaleDown ? 'w-12 h-12 md:w-20 md:h-20' : 'w-20 h-20';
      return <IconGenesisEmblem {...iconProps} className={`${genesisSize} relative z-10`} />;
    }
    case 'icon-shield':
      return <IconShield {...iconProps} />;
    case 'icon-diamond':
      return <IconDiamond {...iconProps} />;
    case 'icon-rocket':
      return <IconRocket {...iconProps} />;
    case 'icon-ape':
      return <IconApe {...iconProps} />;
    case 'icon-bolt':
      return <IconBolt {...iconProps} />;
    case 'icon-magnet':
      return <IconMagnet {...iconProps} />;
    case 'icon-skull':
      return <IconSkull {...iconProps} />;
    case 'icon-whale':
      return <IconWhale {...iconProps} />;
    case 'icon-banano':
      return <IconBanano {...iconProps} color="#FBDD11" />;
    default:
      // Emoji fallback
      return <span className="text-4xl md:text-5xl relative z-10">{card.icon}</span>;
  }
});

CardIcon.displayName = 'CardIcon';
