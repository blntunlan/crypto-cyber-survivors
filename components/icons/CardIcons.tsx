import React from 'react';

interface IconProps {
  className?: string;
  color?: string;
}

/**
 * Common Tier: Market Chart
 * Minimalist chart representation with precision lines.
 */
export const IconMarketChart: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M4 17L8 12L12 15L20 8"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="20" cy="8" r="3" fill={color} />
    <path d="M4 17V19H6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M4 17L8 12L12 15L20 8V17H4Z" fill={color} fillOpacity="0.1" />
  </svg>
);

/**
 * Rare Tier: Alpha Eye
 */
export const IconAlphaEye: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
    <path
      d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="4" fill={color} />
    <path d="M12 8V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Epic Tier: Flash Pulse
 */
export const IconFlashPulse: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <filter id="glow-epic" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <path
      d="M13 3L6 14H12L11 21L18 10H12L13 3Z"
      fill={color}
      fillOpacity="0.3"
      filter="url(#glow-epic)"
    />
    <path
      d="M13 3L6 14H12L11 21L18 10H12L13 3Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="13" cy="3" r="1.5" fill="white" />
    <circle cx="11" cy="21" r="1.5" fill="white" />
  </svg>
);

/**
 * Legendary Tier: Genesis Emblem
 */
export const IconGenesisEmblem: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="leg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} />
        <stop offset="50%" stopColor="#fff" />
        <stop offset="100%" stopColor={color} />
      </linearGradient>
      <filter id="glow-leg">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path d="M16 4L6 10V22L16 28L26 22V10L16 4Z" fill={color} fillOpacity="0.1" />
    <path
      d="M16 4L6 10V22L16 28L26 22V10L16 4Z"
      stroke="url(#leg-grad)"
      strokeWidth="2"
      filter="url(#glow-leg)"
    />
    <circle cx="16" cy="16" r="6" stroke="url(#leg-grad)" strokeWidth="2.5" />
    <path d="M16 12V20M12 16H20" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 16H10M22 16H26" stroke={color} strokeWidth="1.5" />
  </svg>
);

/**
 * Defense Tier: Neon Shield
 */
export const IconShield: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
      fill={color}
      fillOpacity="0.1"
    />
    <path
      d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 10L12 13L15 10"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Utility: Magnet Pulse
 */
export const IconMagnet: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M6 9V5C6 3.89543 6.89543 3 8 3H16C17.1046 3 18 3.89543 18 5V9"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M6 9H10V12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12V9H18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M6 18C6 18 8 21 12 21C16 21 18 18 18 18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Legendary: Diamond Hands
 */
export const IconDiamond: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4L2 10L12 22L22 10L18 4H6Z" fill={color} fillOpacity="0.15" />
    <path
      d="M6 4L2 10L12 22L22 10L18 4H6Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M2 10H22M8 10L12 22L16 10" stroke={color} strokeWidth="1.5" />
    <path d="M12 4L8 10M12 4L16 10" stroke={color} strokeWidth="1.5" />
  </svg>
);

/**
 * Legendary: Moon Rocket
 */
export const IconRocket: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 3C12 3 13.5 6 13.5 9C13.5 12 12 15 12 15C12 15 9 13.5 6 13.5C3 13.5 0 12 0 12C0 12 9 0 12 3Z"
      fill={color}
      fillOpacity="0.2"
    />
    <path
      d="M12 3C12 3 13.5 6 13.5 9C13.5 12 12 15 12 15C12 15 9 13.5 6 13.5C3 13.5 0 12 0 12C0 12 9 0 12 3Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M4 17L2 22L7 20"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="6" r="3" stroke={color} strokeWidth="1.5" />
  </svg>
);

/**
 * Iconic: Full Ape
 */
export const IconApe: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 4C9 4 7 6 7 9C7 11 8 12 8 14C8 16 7 17 6 18C5 19 4 21 4 21H20C20 21 19 19 18 18C17 17 16 16 16 14C16 12 17 11 17 9C17 6 15 4 12 4Z"
      fill={color}
      fillOpacity="0.1"
    />
    <path
      d="M12 4C9 4 7 6 7 9C7 11 8 12 8 14C8 16 7 17 6 18C5 19 4 21 4 21H20C20 21 19 19 18 18C17 17 16 16 16 14C16 12 17 11 17 9C17 6 15 4 12 4Z"
      stroke={color}
      strokeWidth="2.5"
    />
    <rect x="8" y="10" width="8" height="2" fill={color} />
  </svg>
);

/**
 * Danger: Rug Pull
 */
export const IconSkull: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 4C8 4 5 7 5 11C5 14 6 15 6 17H18C18 15 19 14 19 11C19 7 16 4 12 4Z"
      fill={color}
      fillOpacity="0.15"
    />
    <path
      d="M12 4C8 4 5 7 5 11C5 14 6 15 6 17H18C18 15 19 14 19 11C19 7 16 4 12 4Z"
      stroke={color}
      strokeWidth="2.5"
    />
    <circle cx="9" cy="11" r="2" fill={color} />
    <circle cx="15" cy="11" r="2" fill={color} />
    <path
      d="M10 17L12 19L14 17"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Elite: Whale
 */
export const IconWhale: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M2 13C2 13 4 11 8 11C12 11 15 13 18 12C21 11 22 8 22 8C22 8 21 15 18 17C15 19 10 19 6 17C2 15 2 13 2 13Z"
      fill={color}
      fillOpacity="0.2"
    />
    <path
      d="M2 13C2 13 4 11 8 11C12 11 15 13 18 12C21 11 22 8 22 8C22 8 21 15 18 17C15 19 10 19 6 17C2 15 2 13 2 13Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M12 8V5M10 6L12 4L14 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Speed: Data Bolt
 */
export const IconBolt: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M13 2L4 14H11V22L20 10H13V2Z" fill={color} fillOpacity="0.3" />
    <path
      d="M13 2L4 14H11V22L20 10H13V2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Currency: Nano (XNO)
 * The standard for instant & feeless. A cybernetic 'N' node structure.
 */
export const IconNano: React.FC<IconProps> = ({ className, color = '#4A90E2' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 5V19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 5V19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 5L18 19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="6" cy="5" r="2" fill={color} />
    <circle cx="18" cy="19" r="2" fill={color} />
    <path d="M6 12L18 12" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

/**
 * Currency: Banano (BAN)
 * Potassium-rich meme currency. Sleek cyber-banana curve.
 */
export const IconBanano: React.FC<IconProps> = ({ className, color = '#FBDD11' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M5 20C5 20 5.5 11 12 7C16.5 4.2 20 2 22 2C22 2 21 8.5 18 12.5C14 18 9.5 21.5 5 20Z"
      fill={color}
      fillOpacity="0.15"
    />
    <path
      d="M5 20C5 20 5.5 11 12 7C16.5 4.2 20 2 22 2C22 2 21 8.5 18 12.5C14 18 9.5 21.5 5 20Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M19 5.5L21.5 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M6 18.5L4 20.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Volume Control
 */
export const IconVolume: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.07 4.93C20.9447 6.80528 21.9979 9.34812 21.9979 12C21.9979 14.6519 20.9447 17.1947 19.07 19.07"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * UI: Volume Muted
 */
export const IconVolumeMuted: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M23 9L17 15M17 9L23 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Settings / Mixer
 */
export const IconSettings: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2.5" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * UI: Trend Up (Long)
 */
export const IconTrendUp: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M23 6L13.5 15.5L8.5 10.5L1 18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 6H23V12"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * UI: Trend Down (Short)
 */
export const IconTrendDown: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M23 18L13.5 8.5L8.5 13.5L1 6"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 18H23V12"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * UI: Cyberpunk Theme
 */
export const IconCyberpunk: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 22V12L22 7M12 12L2 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.2" />
  </svg>
);

/**
 * UI: Retro Theme
 */
export const IconRetro: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 12H10M8 10V14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="15" cy="12" r="1.5" fill={color} />
    <circle cx="18" cy="12" r="1.5" fill={color} />
  </svg>
);

/**
 * UI: Quality / Performance
 */
export const IconCpu: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M9 9H15V15H9V9Z" stroke={color} strokeWidth="2.5" />
    <path
      d="M9 1L9 4M15 1L15 4M9 20L9 23M15 20L15 23M20 9L23 9M20 15L23 15M1 9L4 9M1 15L4 15"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * UI: Graphics
 */
export const IconMonitor: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M8 21H16M12 17V21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Mobile
 */
export const IconSmartphone: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M12 18H12.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Controls
 */
export const IconZap: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * CRYPTO: Bitcoin
 */
export const IconBitcoin: React.FC<IconProps & { size?: number }> = ({
  className,
  color = '#F7931A',
  size = 24,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill={color} />
    <path
      d="M22.5 14.2c.3-2-.2-3.3-1.4-4.2-1.1-.8-2.7-1-4.3-.9V6h-1.6v3h-1.3V6h-1.6v3H9v2h1.2c.5 0 .8.3.8.8v8.4c0 .5-.3.8-.8.8H9v2h3.3v3h1.6v-3h1.3v3h1.6v-3.1c2.7-.2 4.6-.9 5-3.4.3-2-.8-2.9-2.3-3.3zm-6.3-3.1h1.5c1.2 0 2.4.2 2.4 1.6 0 1.5-1.2 1.7-2.4 1.7h-1.5v-3.3zm1.8 9.8h-1.8v-3.6h1.8c1.4 0 2.7.3 2.7 1.8 0 1.6-1.3 1.8-2.7 1.8z"
      fill="white"
    />
  </svg>
);

/**
 * CRYPTO: Ethereum
 */
export const IconEthereum: React.FC<IconProps & { size?: number }> = ({
  className,
  color = '#627EEA',
  size = 24,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill={color} />
    <path d="M16 4v9.5l8 3.6L16 4z" fill="white" fillOpacity="0.6" />
    <path d="M16 4L8 17.1l8-3.6V4z" fill="white" />
    <path d="M16 21.9v6.1l8-11.1-8 5z" fill="white" fillOpacity="0.6" />
    <path d="M16 28V21.9l-8-5 8 11.1z" fill="white" />
    <path d="M16 20.4l8-3.6-8-3.6v7.2z" fill="white" fillOpacity="0.2" />
    <path d="M8 16.8l8 3.6v-7.2l-8 3.6z" fill="white" fillOpacity="0.6" />
  </svg>
);

/**
 * CRYPTO: Solana
 */
export const IconSolana: React.FC<IconProps & { size?: number }> = ({
  className,
  color = '#9945FF',
  size = 24,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <circle cx="16" cy="16" r="16" fill={color} />
    <path
      d="M9.5 19.8c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z"
      fill="white"
    />
    <path
      d="M9.5 9.4c.1-.1.3-.2.5-.2h12.8c.3 0 .5.4.3.6l-2.4 2.4c-.1.1-.3.2-.5.2H7.4c-.3 0-.5-.4-.3-.6l2.4-2.4z"
      fill="white"
    />
    <path
      d="M22.5 14.6c-.1-.1-.3-.2-.5-.2H9.2c-.3 0-.5.4-.3.6l2.4 2.4c.1.1.3.2.5.2h12.8c.3 0 .5-.4.3-.6l-2.4-2.4z"
      fill="white"
    />
  </svg>
);

/**
 * UI: Trophy (High Score)
 */
export const IconTrophy: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M6 9H4.5C3.11929 9 2 7.88071 2 6.5C2 5.11929 3.11929 4 4.5 4H6"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 9H19.5C20.8807 9 22 7.88071 22 6.5C22 5.11929 20.8807 4 19.5 4H18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 4H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V4Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 18V22M8 22H16"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * UI: Sparkles
 */
export const IconSparkles: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M9 3L12 9L18 12L12 15L9 21L6 15L0 12L6 9L9 3Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M19 1L20 4L23 5L20 6L19 9L18 6L15 5L18 4L19 1Z" fill={color} />
  </svg>
);

/**
 * UI: Slot Machine
 */
export const IconSlot: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M5 8H19M5 16H19M9 8V16M15 8V16" stroke={color} strokeWidth="2.5" />
    <circle cx="21" cy="6" r="1.5" fill={color} />
    <path d="M19 10L21 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Target
 */
export const IconTarget: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2.5" />
  </svg>
);
