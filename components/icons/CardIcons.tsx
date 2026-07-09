import React from 'react';

interface IconProps {
  className?: string;
  color?: string;
}

/**
 * Common Tier: Market Chart
 * Minimalist chart representation with precision lines.
 */
export const IconMarketChart: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconAlphaEye: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeWidth="1.5"
      strokeDasharray="2 3"
    />
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
export const IconFlashPulse: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconGenesisEmblem: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
    <path
      d="M16 12V20M12 16H20"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M6 16H10M22 16H26" stroke={color} strokeWidth="1.5" />
  </svg>
);

/**
 * Defense Tier: Neon Shield
 */
export const IconShield: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconMagnet: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconDiamond: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconRocket: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconSkull: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconWhale: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
    <path
      d="M12 8V5M10 6L12 4L14 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Speed: Data Bolt
 */
export const IconBolt: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M6 5V19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 5V19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M6 5L18 19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="6" cy="5" r="2" fill={color} />
    <circle cx="18" cy="19" r="2" fill={color} />
    <path
      d="M6 12L18 12"
      stroke={color}
      strokeWidth="1"
      strokeDasharray="2 2"
      opacity="0.5"
    />
  </svg>
);

/**
 * Currency: Banano (BAN)
 * Potassium-rich meme currency. Sleek cyber-banana curve.
 */
export const IconBanano: React.FC<IconProps> = ({ className, color = '#FBDD11' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
 * Support: Life Buoy
 */
export const IconLifeBuoy: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
    <path d="M12 3V7M12 17V21M3 12H7M17 12H21" stroke={color} strokeWidth="2.5" />
    <path
      d="M6 6L9 9M15 15L18 18M15 9L18 6M6 18L9 15"
      stroke={color}
      strokeWidth="1.5"
    />
  </svg>
);

/**
 * Farming: Yield Wheat
 */
export const IconWheat: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 4V21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M12 7C10.5 7 9.5 5.5 9.5 5.5M12 10C13.5 10 14.5 8.5 14.5 8.5M12 13C10.5 13 9.5 11.5 9.5 11.5M12 16C13.5 16 14.5 14.5 14.5 14.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 7C13.5 7 14.5 5.5 14.5 5.5M12 10C10.5 10 9.5 8.5 9.5 8.5M12 13C13.5 13 14.5 11.5 14.5 11.5M12 16C10.5 16 9.5 14.5 9.5 14.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Defense: Stop Loss (Octagon)
 */
export const IconStopLoss: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 3H16L21 8V16L16 21H8L3 16V8L8 3Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M9 9L15 15M15 9L9 15"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Strategy: Repeat / Rebalance
 */
export const IconRepeat: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 10H16C18.2091 10 20 11.7909 20 14V14"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M13 6L17 10L13 14"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M20 14H8C5.79086 14 4 15.7909 4 18V18"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M11 18L7 22L11 22"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Economy: Dollar Orbit
 */
export const IconDollarCircle: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" />
    <path
      d="M10 11C10 9.89543 10.8954 9 12 9C13.1046 9 14 9.89543 14 11C14 12.1046 13.1046 13 12 13C10.8954 13 10 13.8954 10 15C10 16.1046 10.8954 17 12 17C13.1046 17 14 16.1046 14 15"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M12 7V9M12 17V19" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Utility: Duplicate
 */
export const IconDuplicate: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="8" width="10" height="12" rx="2" stroke={color} strokeWidth="2.5" />
    <rect
      x="10"
      y="4"
      width="10"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="2.5"
      opacity="0.6"
    />
    <path d="M12 14H16M14 12V16" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Utility: Key
 */
export const IconKey: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="8" cy="12" r="4" stroke={color} strokeWidth="2.5" />
    <path
      d="M12 12H22M17 12V15M20 12V14"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Economy: Coins stack
 */
export const IconCoins: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <ellipse cx="12" cy="6" rx="6" ry="3" stroke={color} strokeWidth="2.5" />
    <path
      d="M6 6V12C6 13.6569 8.68629 15 12 15C15.3137 15 18 13.6569 18 12V6"
      stroke={color}
      strokeWidth="2.5"
    />
    <path
      d="M6 12V16C6 17.6569 8.68629 19 12 19C15.3137 19 18 17.6569 18 16V12"
      stroke={color}
      strokeWidth="2.5"
    />
  </svg>
);

/**
 * Economy: Wallet
 */
export const IconWallet: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2.5" />
    <path
      d="M17 11H21V13H17C16.4477 13 16 12.5523 16 12C16 11.4477 16.4477 11 17 11Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 6V4L18 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * Balance: Scale (2D)
 */
export const IconScale: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 3V20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M5 9L9 17C9 18.6569 7.65685 20 6 20C4.34315 20 3 18.6569 3 17L7 9H5Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 9L15 17C15 18.6569 16.3431 20 18 20C19.6569 20 21 18.6569 21 17L17 9H19Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 9H18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * Balance: Scale 3D / leverage
 */
export const IconScale3D: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 3L3 9L12 15L21 9L12 3Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M6 11L6 15.5C6 16.3284 6.67157 17 7.5 17H16.5C17.3284 17 18 16.3284 18 15.5V11"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M12 15V21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * Damage: Flame Burst
 */
export const IconFlame: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 21C6.34315 21 5 19.6569 5 18C5 15 8 13 8 10C8 7 6 5 6 5C10 6 12 9 12 12C12 9 14 7 14 7C15.3333 8.33333 17 11 17 14C17 17.866 13.866 21 10 21H8Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Tech: Smart Contract (code)
 */
export const IconCode: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M15 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V8L15 2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M15 2V8H19" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M9 11L7 13L9 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M15 11L17 13L15 15"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Luck: Dice
 */
export const IconDice: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth="2.5" />
    <circle cx="9" cy="9" r="1.5" fill={color} />
    <circle cx="15" cy="15" r="1.5" fill={color} />
    <circle cx="15" cy="9" r="1.5" fill={color} />
    <circle cx="9" cy="15" r="1.5" fill={color} />
  </svg>
);

/**
 * Weapon: Boomerang
 */
export const IconBoomerang: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 4C4 4 14 4 19 9C24 14 20 20 20 20C20 20 13 16 9 12C5 8 4 4 4 4Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 7L9 9M12 12L14 14"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Weapon: Explosion / Nuke
 */
export const IconExplosion: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2L14.5 8.5L21 9L16 13.5L17.5 20L12 16.5L6.5 20L8 13.5L3 9L9.5 8.5L12 2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Weapon: Spread Shot
 */
export const IconSpreadShot: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M5 19L10 5L12 11L14 5L19 19"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 11L12 19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * Utility: Time Lock
 */
export const IconTimeLock: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="13" r="6" stroke={color} strokeWidth="2.5" />
    <path d="M12 13L15 11" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M9 3H15V7H9V3Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M9 5H15" stroke={color} strokeWidth="2.5" />
  </svg>
);

/**
 * Collection: Rainbow
 */
export const IconRainbow: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 16C4 11.5817 7.58172 8 12 8C16.4183 8 20 11.5817 20 16"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M6 16C6 12.6863 8.68629 10 12 10C15.3137 10 18 12.6863 18 16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 16C8 13.7909 9.79086 12 12 12C14.2091 12 16 13.7909 16 16"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Trade: swap arrows
 */
export const IconSwapArrows: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M7 5L11 9L7 13"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11 9H4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M17 19L13 15L17 11"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13 15H20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Volume Control
 */
export const IconVolume: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconVolumeMuted: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M11 5L6 9H2V15H6L11 19V5Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23 9L17 15M17 9L23 15"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * UI: Settings / Mixer
 */
export const IconSettings: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconTrendUp: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconTrendDown: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconCyberpunk: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 22V12L22 7M12 12L2 7"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.2" />
  </svg>
);

/**
 * UI: Retro Theme
 */
export const IconRetro: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconMonitor: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="2.5" />
    <path
      d="M8 21H16M12 17V21"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * UI: Mobile
 */
export const IconSmartphone: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M12 18H12.01" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Controls
 */
export const IconZap: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconTrophy: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
 * UI: Crown (rank #1)
 */
export const IconCrown: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M3 7L8 11L12 4L16 11L21 7L19 17H5L3 7Z"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3 7L8 11L12 4L16 11L21 7L19 17H5L3 7Z" fill={color} fillOpacity="0.1" />
    <path d="M7 21H17" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Medal (podium ranks)
 */
export const IconMedal: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="15" r="6" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="15" r="6" fill={color} fillOpacity="0.1" />
    <path
      d="M8.5 10L6 2H10L12 6L14 2H18L15.5 10"
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
export const IconSparkles: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
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
export const IconSlot: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="2.5" />
    <path d="M5 8H19M5 16H19M9 8V16M15 8V16" stroke={color} strokeWidth="2.5" />
    <circle cx="21" cy="6" r="1.5" fill={color} />
    <path d="M19 10L21 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * UI: Target
 */
export const IconTarget: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2.5" />
    <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2.5" />
  </svg>
);

/**
 * UI: Database
 */
export const IconDatabase: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

/**
 * UI: Activity
 */
export const IconActivity: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

/**
 * UI: Power
 */
export const IconPower: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

/**
 * UI: FileText
 */
export const IconFileText: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/**
 * UI: Check
 */
export const IconCheck: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * UI: Alert
 */
export const IconAlert: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * UI: Book
 */
export const IconBook: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

/**
 * UI: Link
 */
export const IconLink: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

/**
 * UI: List
 */
export const IconList: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

/**
 * UI: ShieldCheck
 */
export const IconShieldCheck: React.FC<IconProps> = ({
  className,
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
