/**
 * HubIcons - Custom animated icons for Hub Menu
 *
 * Features:
 * - Cyberpunk theme: Neon glow, pulse animations, scan lines
 * - Retro theme: Pixel-art style, 8-bit blink/flicker animations
 * - Hover animations via CSS classes
 */

import React from 'react';

interface HubIconProps {
  className?: string;
  color?: string;
  isRetro?: boolean;
  isAnimated?: boolean;
}

// Retro animation styles - add to component or global CSS
const retroAnimStyle: React.CSSProperties = {
  animation: 'retro-blink 1s steps(2) infinite',
};

const retroFlickerStyle: React.CSSProperties = {
  animation: 'retro-flicker 0.5s steps(3) infinite',
};

const retroBounceStyle: React.CSSProperties = {
  animation: 'retro-bounce 0.6s steps(4) infinite',
};

/**
 * PLAY Icon - Rocket with thrust animation
 * Cyberpunk: Neon rocket with pulsing thrust
 * Retro: 8-bit rocket sprite with flickering thrust
 */
export const HubIconPlay: React.FC<HubIconProps> = ({
  className,
  color = '#00E676',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit rocket with animated thrust
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Rocket body */}
        <rect x="6" y="2" width="4" height="8" fill={color} />
        {/* Rocket tip */}
        <rect x="7" y="0" width="2" height="2" fill={color} />
        {/* Wings */}
        <rect x="4" y="8" width="2" height="2" fill={color} />
        <rect x="10" y="8" width="2" height="2" fill={color} />
        {/* Animated Thrust - blink between frames */}
        <g style={isAnimated ? retroFlickerStyle : {}}>
          <rect x="7" y="10" width="2" height="2" fill="#FFD600" />
          <rect x="6" y="12" width="4" height="2" fill="#FF6600" />
        </g>
        <g style={isAnimated ? { ...retroFlickerStyle, animationDelay: '0.25s' } : {}}>
          <rect x="7" y="14" width="2" height="2" fill="#FF0000" />
        </g>
        {/* Exhaust particles */}
        {isAnimated && (
          <g style={retroBounceStyle}>
            <rect x="6" y="15" width="1" height="1" fill="#FF6600" opacity="0.8" />
            <rect x="9" y="15" width="1" height="1" fill="#FFD600" opacity="0.8" />
          </g>
        )}
      </svg>
    );
  }

  // Cyberpunk animated rocket
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="hub-rocket-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
        <filter id="hub-rocket-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rocket body */}
      <path
        d="M12 2C12 2 8 8 8 14C8 16 10 18 12 18C14 18 16 16 16 14C16 8 12 2 12 2Z"
        fill="url(#hub-rocket-grad)"
        stroke={color}
        strokeWidth="1.5"
        filter="url(#hub-rocket-glow)"
      />

      {/* Wings */}
      <path d="M8 14L5 18L8 16" fill={color} opacity="0.8" />
      <path d="M16 14L19 18L16 16" fill={color} opacity="0.8" />

      {/* Window */}
      <circle cx="12" cy="10" r="2" fill="#0a0a14" stroke={color} strokeWidth="1" />

      {/* Thrust flames - animated */}
      <g className={isAnimated ? 'animate-pulse' : ''}>
        <ellipse cx="12" cy="20" rx="2" ry="3" fill="#FF6600" opacity="0.9" />
        <ellipse cx="12" cy="21" rx="1.5" ry="2" fill="#FFD600" />
        <ellipse cx="12" cy="21.5" rx="1" ry="1" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

/**
 * STASH Icon - Chest/Vault
 * Cyberpunk: Glowing vault with circuit patterns
 * Retro: 8-bit treasure chest with blinking lock
 */
export const HubIconStash: React.FC<HubIconProps> = ({
  className,
  color = '#00B8D4',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit chest with blinking lock
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Chest body */}
        <rect x="2" y="6" width="12" height="8" fill="#8B4513" />
        {/* Chest lid */}
        <rect x="2" y="4" width="12" height="4" fill="#A0522D" />
        {/* Metal bands */}
        <rect x="2" y="4" width="12" height="1" fill={color} />
        <rect x="2" y="9" width="12" height="1" fill={color} />
        {/* Animated Lock - blink effect */}
        <g style={isAnimated ? retroAnimStyle : {}}>
          <rect x="6" y="7" width="4" height="4" fill="#FFD600" />
          <rect x="7" y="8" width="2" height="2" fill="#0a0a14" />
        </g>
        {/* Shine effect */}
        {isAnimated && (
          <rect
            x="3"
            y="5"
            width="2"
            height="1"
            fill="#fff"
            opacity="0.6"
            style={retroFlickerStyle}
          />
        )}
      </svg>
    );
  }

  // Cyberpunk vault
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <filter id="hub-stash-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Vault body */}
      <rect
        x="3"
        y="6"
        width="18"
        height="14"
        rx="2"
        fill="#1a1a2e"
        stroke={color}
        strokeWidth="1.5"
        filter="url(#hub-stash-glow)"
      />

      {/* Circuit lines */}
      <path d="M3 12H6M18 12H21" stroke={color} strokeWidth="1" opacity="0.5" />
      <path d="M6 9V15" stroke={color} strokeWidth="1" opacity="0.5" />
      <path d="M18 9V15" stroke={color} strokeWidth="1" opacity="0.5" />

      {/* Lock mechanism */}
      <circle cx="12" cy="13" r="4" fill="#0a0a14" stroke={color} strokeWidth="1.5" />
      <circle
        cx="12"
        cy="13"
        r="2"
        fill={color}
        opacity="0.3"
        className={isAnimated ? 'animate-ping' : ''}
        style={{ animationDuration: '2s' }}
      />
      <circle cx="12" cy="13" r="1" fill={color} />

      {/* Handle */}
      <rect x="10" y="4" width="4" height="3" rx="1" fill={color} opacity="0.8" />
    </svg>
  );
};

/**
 * LOOT Icon - Slot Machine / Lootbox
 * Cyberpunk: Glowing slot machine with spinning effect
 * Retro: 8-bit slot machine with cycling symbols
 */
export const HubIconLoot: React.FC<HubIconProps> = ({
  className,
  color = '#FFD700',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit loot crate / treasure chest with coins
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Chest body - wooden brown */}
        <rect x="1" y="7" width="14" height="7" fill="#8B4513" />
        {/* Chest lid - lighter brown */}
        <rect x="1" y="5" width="14" height="3" fill="#A0522D" />
        {/* Lid top curve (blocky) */}
        <rect x="2" y="4" width="12" height="1" fill="#A0522D" />
        <rect x="3" y="3" width="10" height="1" fill="#A0522D" />
        {/* Gold bands */}
        <rect x="1" y="5" width="14" height="1" fill={color} />
        <rect x="1" y="10" width="14" height="1" fill={color} />
        {/* Gold lock/clasp */}
        <rect
          x="6"
          y="7"
          width="4"
          height="3"
          fill={color}
          style={isAnimated ? retroAnimStyle : {}}
        />
        <rect x="7" y="8" width="2" height="1" fill="#0a0a14" />
        {/* Animated coins popping out */}
        {isAnimated && (
          <>
            <g style={retroBounceStyle}>
              <rect x="4" y="1" width="2" height="2" fill={color} />
            </g>
            <g style={{ ...retroBounceStyle, animationDelay: '0.2s' }}>
              <rect x="10" y="2" width="2" height="2" fill={color} />
            </g>
            <g style={{ ...retroFlickerStyle, animationDelay: '0.4s' }}>
              <rect x="7" y="0" width="2" height="2" fill="#FFD600" />
            </g>
          </>
        )}
        {/* Corner rivets */}
        <rect x="2" y="6" width="1" height="1" fill="#C0C0C0" />
        <rect x="13" y="6" width="1" height="1" fill="#C0C0C0" />
        <rect x="2" y="12" width="1" height="1" fill="#C0C0C0" />
        <rect x="13" y="12" width="1" height="1" fill="#C0C0C0" />
      </svg>
    );
  }

  // Cyberpunk slot machine
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <filter id="hub-loot-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Machine frame */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        fill="#1a1a2e"
        stroke={color}
        strokeWidth="1.5"
        filter="url(#hub-loot-glow)"
      />

      {/* Top bar */}
      <rect x="3" y="3" width="18" height="4" rx="3" fill={color} opacity="0.8" />
      <text
        x="12"
        y="6"
        textAnchor="middle"
        fill="#0a0a14"
        fontSize="3"
        fontWeight="bold"
      >
        777
      </text>

      {/* Display windows */}
      <rect
        x="5"
        y="9"
        width="4"
        height="6"
        rx="1"
        fill="#0a0a14"
        stroke={color}
        strokeWidth="0.5"
      />
      <rect
        x="10"
        y="9"
        width="4"
        height="6"
        rx="1"
        fill="#0a0a14"
        stroke={color}
        strokeWidth="0.5"
      />
      <rect
        x="15"
        y="9"
        width="4"
        height="6"
        rx="1"
        fill="#0a0a14"
        stroke={color}
        strokeWidth="0.5"
      />

      {/* Spinning symbols */}
      <g
        className={isAnimated ? 'animate-bounce' : ''}
        style={{ animationDuration: '1s' }}
      >
        <text x="7" y="13.5" textAnchor="middle" fill="#FF6B6B" fontSize="4">
          ₿
        </text>
        <text x="12" y="13.5" textAnchor="middle" fill="#00E676" fontSize="4">
          Ξ
        </text>
        <text x="17" y="13.5" textAnchor="middle" fill="#9945FF" fontSize="4">
          ◎
        </text>
      </g>

      {/* Handle */}
      <rect x="21" y="8" width="2" height="8" rx="1" fill="#64748b" />
      <circle cx="22" cy="6" r="2" fill="#EF4444" stroke="#64748b" strokeWidth="1" />

      {/* Spin button */}
      <rect
        x="8"
        y="17"
        width="8"
        height="2"
        rx="1"
        fill={color}
        className={isAnimated ? 'animate-pulse' : ''}
      />
    </svg>
  );
};

/**
 * SKINS Icon - Diamond / Character
 * Cyberpunk: Holographic diamond with refraction
 * Retro: 8-bit diamond gem with sparkle animation
 */
export const HubIconSkins: React.FC<HubIconProps> = ({
  className,
  color = '#9945FF',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit diamond with sparkle animation
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Diamond shape */}
        <polygon points="8,1 2,6 8,15 14,6" fill={color} />
        {/* Facets */}
        <polygon points="8,1 5,6 8,6" fill="#fff" opacity="0.5" />
        <polygon points="8,1 11,6 8,6" fill="#fff" opacity="0.3" />
        <polygon points="2,6 5,6 8,15" fill="#fff" opacity="0.2" />
        {/* Animated Shine - moves across diamond */}
        {isAnimated && (
          <>
            <rect x="4" y="4" width="2" height="1" fill="#fff" style={retroAnimStyle} />
            <rect
              x="10"
              y="7"
              width="1"
              height="1"
              fill="#fff"
              style={{ ...retroAnimStyle, animationDelay: '0.5s' }}
            />
            <rect
              x="6"
              y="10"
              width="1"
              height="1"
              fill="#fff"
              style={{ ...retroFlickerStyle, animationDelay: '0.3s' }}
            />
          </>
        )}
      </svg>
    );
  }

  // Cyberpunk holographic diamond
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="hub-diamond-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id="hub-diamond-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Diamond body */}
      <path
        d="M12 2L4 9L12 22L20 9L12 2Z"
        fill="url(#hub-diamond-grad)"
        stroke={color}
        strokeWidth="1.5"
        filter="url(#hub-diamond-glow)"
        className={isAnimated ? '' : ''}
        style={isAnimated ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
      />

      {/* Facet lines */}
      <path d="M4 9H20" stroke={color} strokeWidth="1" opacity="0.6" />
      <path d="M12 2L8 9L12 22" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
      <path d="M12 2L16 9L12 22" stroke="#fff" strokeWidth="0.5" opacity="0.3" />

      {/* Sparkle effects */}
      <g
        className={isAnimated ? 'animate-ping' : ''}
        style={{ animationDuration: '3s' }}
      >
        <circle cx="8" cy="7" r="1" fill="#fff" opacity="0.8" />
      </g>
      <g
        className={isAnimated ? 'animate-ping' : ''}
        style={{ animationDuration: '2s', animationDelay: '1s' }}
      >
        <circle cx="16" cy="11" r="0.8" fill="#fff" opacity="0.6" />
      </g>
    </svg>
  );
};

/**
 * RANKS Icon - Trophy / Leaderboard
 * Cyberpunk: Glowing trophy with holographic nameplate
 * Retro: 8-bit trophy cup with blinking star
 */
export const HubIconRanks: React.FC<HubIconProps> = ({
  className,
  color = '#FF6600',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit trophy with animated star
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Cup body */}
        <rect x="4" y="2" width="8" height="6" fill={color} />
        {/* Handles */}
        <rect x="2" y="3" width="2" height="4" fill={color} />
        <rect x="12" y="3" width="2" height="4" fill={color} />
        {/* Stem */}
        <rect x="7" y="8" width="2" height="3" fill={color} />
        {/* Base */}
        <rect x="5" y="11" width="6" height="2" fill={color} />
        <rect x="4" y="13" width="8" height="2" fill={color} />
        {/* Animated Star decoration - blink */}
        <g style={isAnimated ? retroAnimStyle : {}}>
          <rect x="7" y="4" width="2" height="2" fill="#FFD600" />
        </g>
        {/* Sparkle particles */}
        {isAnimated && (
          <>
            <rect
              x="2"
              y="1"
              width="1"
              height="1"
              fill="#FFD600"
              style={retroFlickerStyle}
            />
            <rect
              x="13"
              y="1"
              width="1"
              height="1"
              fill="#FFD600"
              style={{ ...retroFlickerStyle, animationDelay: '0.3s' }}
            />
          </>
        )}
      </svg>
    );
  }

  // Cyberpunk trophy
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="hub-trophy-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id="hub-trophy-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cup */}
      <path
        d="M8 4H16V10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10V4Z"
        fill="url(#hub-trophy-grad)"
        stroke={color}
        strokeWidth="1.5"
        filter="url(#hub-trophy-glow)"
      />

      {/* Handles */}
      <path
        d="M8 6H6C4.9 6 4 6.9 4 8C4 9.1 4.9 10 6 10H8"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M16 6H18C19.1 6 20 6.9 20 8C20 9.1 19.1 10 18 10H16"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />

      {/* Stem and base */}
      <rect x="10" y="14" width="4" height="4" fill={color} opacity="0.8" />
      <rect x="7" y="18" width="10" height="2" rx="1" fill={color} />

      {/* #1 decoration */}
      <text
        x="12"
        y="10"
        textAnchor="middle"
        fill="#0a0a14"
        fontSize="5"
        fontWeight="bold"
        className={isAnimated ? 'animate-pulse' : ''}
      >
        1
      </text>

      {/* Stars effect */}
      <g
        className={isAnimated ? 'animate-spin' : ''}
        style={{ transformOrigin: '12px 8px', animationDuration: '10s' }}
      >
        <circle cx="6" cy="3" r="1" fill={color} opacity="0.6" />
        <circle cx="18" cy="3" r="1" fill={color} opacity="0.6" />
        <circle cx="12" cy="1" r="1.5" fill="#FFD700" />
      </g>
    </svg>
  );
};

/**
 * GEAR Icon - Settings / Configuration
 * Cyberpunk: Rotating holographic gear with inner circuitry
 * Retro: 8-bit cog sprite with rotation animation
 */
export const HubIconGear: React.FC<HubIconProps> = ({
  className,
  color = '#94a3b8',
  isRetro = false,
  isAnimated = true,
}) => {
  if (isRetro) {
    // Retro 8-bit gear with step rotation
    return (
      <svg
        viewBox="0 0 16 16"
        className={className}
        style={{
          imageRendering: 'pixelated',
          ...(isAnimated ? { animation: 'retro-rotate 2s steps(8) infinite' } : {}),
        }}
      >
        {/* Gear teeth */}
        <rect x="6" y="1" width="4" height="2" fill={color} />
        <rect x="6" y="13" width="4" height="2" fill={color} />
        <rect x="1" y="6" width="2" height="4" fill={color} />
        <rect x="13" y="6" width="2" height="4" fill={color} />
        {/* Diagonal teeth */}
        <rect x="2" y="2" width="3" height="3" fill={color} />
        <rect x="11" y="2" width="3" height="3" fill={color} />
        <rect x="2" y="11" width="3" height="3" fill={color} />
        <rect x="11" y="11" width="3" height="3" fill={color} />
        {/* Center body */}
        <rect x="4" y="4" width="8" height="8" fill={color} />
        {/* Center hole */}
        <rect x="6" y="6" width="4" height="4" fill="#0a0a14" />
        {/* Animated center dot */}
        <rect
          x="7"
          y="7"
          width="2"
          height="2"
          fill={color}
          style={isAnimated ? retroAnimStyle : {}}
        />
      </svg>
    );
  }

  // Cyberpunk gear
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <filter id="hub-gear-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer gear with animation */}
      <g
        style={
          isAnimated
            ? {
                animation: 'spin 8s linear infinite',
                transformOrigin: '12px 12px',
              }
            : {}
        }
      >
        {/* Gear teeth */}
        <path
          d="M12 1V4M12 20V23M1 12H4M20 12H23M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Main gear body */}
        <circle
          cx="12"
          cy="12"
          r="7"
          fill="#1a1a2e"
          stroke={color}
          strokeWidth="2"
          filter="url(#hub-gear-glow)"
        />
      </g>

      {/* Inner mechanism (counter-rotate) */}
      <g
        style={
          isAnimated
            ? {
                animation: 'spin 4s linear infinite reverse',
                transformOrigin: '12px 12px',
              }
            : {}
        }
      >
        <circle cx="12" cy="12" r="4" fill="#0a0a14" stroke={color} strokeWidth="1" />
        <path
          d="M12 9V12L14 14"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Center dot */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill={color}
        className={isAnimated ? 'animate-pulse' : ''}
      />
    </svg>
  );
};

// CSS keyframes for both themes - add to global styles or index.css
export const HubIconStyles = `
  /* Cyberpunk animations */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Retro 8-bit animations - using steps() for choppy effect */
  @keyframes retro-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.3; }
  }
  
  @keyframes retro-flicker {
    0% { opacity: 1; }
    33% { opacity: 0.4; }
    66% { opacity: 0.8; }
    100% { opacity: 1; }
  }
  
  @keyframes retro-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
  
  @keyframes retro-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes retro-color-cycle {
    0% { fill: #FF0000; }
    33% { fill: #00FF00; }
    66% { fill: #FFD600; }
    100% { fill: #FF0000; }
  }
`;
