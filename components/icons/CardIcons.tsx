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
        <path d="M4 17L8 12L12 15L20 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
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
        <path d="M13 3L6 14H12L11 21L18 10H12L13 3Z" fill={color} fillOpacity="0.3" filter="url(#glow-epic)" />
        <path d="M13 3L6 14H12L11 21L18 10H12L13 3Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <path d="M16 4L6 10V22L16 28L26 22V10L16 4Z" stroke="url(#leg-grad)" strokeWidth="2" filter="url(#glow-leg)" />
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
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill={color} fillOpacity="0.1" />
        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 10L12 13L15 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Utility: Magnet Pulse
 */
export const IconMagnet: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M6 9V5C6 3.89543 6.89543 3 8 3H16C17.1046 3 18 3.89543 18 5V9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M6 9H10V12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12V9H18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M6 18C6 18 8 21 12 21C16 21 18 18 18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

/**
 * Legendary: Diamond Hands
 */
export const IconDiamond: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M6 4L2 10L12 22L22 10L18 4H6Z" fill={color} fillOpacity="0.15" />
        <path d="M6 4L2 10L12 22L22 10L18 4H6Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M2 10H22M8 10L12 22L16 10" stroke={color} strokeWidth="1.5" />
        <path d="M12 4L8 10M12 4L16 10" stroke={color} strokeWidth="1.5" />
    </svg>
);

/**
 * Legendary: Moon Rocket
 */
export const IconRocket: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 3C12 3 13.5 6 13.5 9C13.5 12 12 15 12 15C12 15 9 13.5 6 13.5C3 13.5 0 12 0 12C0 12 9 0 12 3Z" fill={color} fillOpacity="0.2" />
        <path d="M12 3C12 3 13.5 6 13.5 9C13.5 12 12 15 12 15C12 15 9 13.5 6 13.5C3 13.5 0 12 0 12C0 12 9 0 12 3Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M4 17L2 22L7 20" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="6" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
);

/**
 * Iconic: Full Ape
 */
export const IconApe: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 4C9 4 7 6 7 9C7 11 8 12 8 14C8 16 7 17 6 18C5 19 4 21 4 21H20C20 21 19 19 18 18C17 17 16 16 16 14C16 12 17 11 17 9C17 6 15 4 12 4Z" fill={color} fillOpacity="0.1" />
        <path d="M12 4C9 4 7 6 7 9C7 11 8 12 8 14C8 16 7 17 6 18C5 19 4 21 4 21H20C20 21 19 19 18 18C17 17 16 16 16 14C16 12 17 11 17 9C17 6 15 4 12 4Z" stroke={color} strokeWidth="2.5" />
        <rect x="8" y="10" width="8" height="2" fill={color} />
    </svg>
);

/**
 * Danger: Rug Pull
 */
export const IconSkull: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 4C8 4 5 7 5 11C5 14 6 15 6 17H18C18 15 19 14 19 11C19 7 16 4 12 4Z" fill={color} fillOpacity="0.15" />
        <path d="M12 4C8 4 5 7 5 11C5 14 6 15 6 17H18C18 15 19 14 19 11C19 7 16 4 12 4Z" stroke={color} strokeWidth="2.5" />
        <circle cx="9" cy="11" r="2" fill={color} />
        <circle cx="15" cy="11" r="2" fill={color} />
        <path d="M10 17L12 19L14 17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Elite: Whale
 */
export const IconWhale: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M2 13C2 13 4 11 8 11C12 11 15 13 18 12C21 11 22 8 22 8C22 8 21 15 18 17C15 19 10 19 6 17C2 15 2 13 2 13Z" fill={color} fillOpacity="0.2" />
        <path d="M2 13C2 13 4 11 8 11C12 11 15 13 18 12C21 11 22 8 22 8C22 8 21 15 18 17C15 19 10 19 6 17C2 15 2 13 2 13Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M12 8V5M10 6L12 4L14 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

/**
 * Speed: Data Bolt
 */
export const IconBolt: React.FC<IconProps> = ({ className, color = 'currentColor' }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M13 2L4 14H11V22L20 10H13V2Z" fill={color} fillOpacity="0.3" />
        <path d="M13 2L4 14H11V22L20 10H13V2Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
        <path d="M5 20C5 20 5.5 11 12 7C16.5 4.2 20 2 22 2C22 2 21 8.5 18 12.5C14 18 9.5 21.5 5 20Z" fill={color} fillOpacity="0.15" />
        <path d="M5 20C5 20 5.5 11 12 7C16.5 4.2 20 2 22 2C22 2 21 8.5 18 12.5C14 18 9.5 21.5 5 20Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 5.5L21.5 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M6 18.5L4 20.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

