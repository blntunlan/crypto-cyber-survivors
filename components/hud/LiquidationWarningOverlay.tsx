/**
 * LiquidationWarningOverlay - Visual effects for liquidation proximity
 *
 * Displays warning overlays when player approaches liquidation:
 * - CAUTION: Subtle yellow vignette
 * - DANGER: Orange pulsing vignette
 * - CRITICAL: Red full-screen pulse with FOV tunneling
 *
 * @see docs/DIFFICULTY_SYSTEM_V2.md - Section: Liquidation Proximity
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiquidationWarning } from '../../hooks/useDifficultyV2';
import { useIsRetro } from '../../contexts/useTheme';
import { screenService } from '../../services/system/ScreenService';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';
import type { LiquidationWarning } from '../../services/difficulty';
import { COLORS } from '../../config/Colors';
import { cn } from '../../utils/classnames';

interface WarningConfig {
  color: string;
  glowColor: string;
  opacity: number;
  pulseSpeed: number;
  blur: number;
  showText: boolean;
  scanLines: boolean;
}

// Desktop configs: enhanced visuals with cyberpunk neon effects
const WARNING_CONFIGS: Record<LiquidationWarning, WarningConfig> = {
  NONE: {
    color: 'transparent',
    glowColor: 'transparent',
    opacity: 0,
    pulseSpeed: 0,
    blur: 0,
    showText: false,
    scanLines: false,
  },
  CAUTION: {
    color: COLORS.JACKPOT_YELLOW,
    glowColor: COLORS.JACKPOT_YELLOW,
    opacity: 0.12,
    pulseSpeed: 2.5,
    blur: 0,
    showText: false,
    scanLines: false,
  },
  DANGER: {
    color: COLORS.NEON_ORANGE,
    glowColor: COLORS.DUMP_ORANGE,
    opacity: 0.2,
    pulseSpeed: 1.2,
    blur: 0,
    showText: true,
    scanLines: true,
  },
  CRITICAL: {
    color: COLORS.SUPER_CRIT,
    glowColor: COLORS.CASINO_RED,
    opacity: 0.32,
    pulseSpeed: 0.4,
    blur: 0,
    showText: true,
    scanLines: true,
  },
};

// Mobile configs: reduced effects for performance, adjusted opacity for visibility
const MOBILE_WARNING_CONFIGS: Record<LiquidationWarning, WarningConfig> = {
  NONE: {
    color: 'transparent',
    glowColor: 'transparent',
    opacity: 0,
    pulseSpeed: 0,
    blur: 0,
    showText: false,
    scanLines: false,
  },
  CAUTION: {
    color: COLORS.JACKPOT_YELLOW,
    glowColor: COLORS.JACKPOT_YELLOW,
    opacity: 0.18,
    pulseSpeed: 3,
    blur: 0,
    showText: false,
    scanLines: false,
  },
  DANGER: {
    color: COLORS.NEON_ORANGE,
    glowColor: COLORS.DUMP_ORANGE,
    opacity: 0.28,
    pulseSpeed: 1.5,
    blur: 0,
    showText: true,
    scanLines: false,
  },
  CRITICAL: {
    color: COLORS.CASINO_RED,
    glowColor: COLORS.CASINO_RED,
    opacity: 0.4,
    pulseSpeed: 0.6,
    blur: 0,
    showText: true,
    scanLines: true, // Enable scan lines for CRITICAL on mobile — critical combat clarity
  },
};

interface LiquidationWarningOverlayProps {
  /** Current warning level (can be set externally or use hook) */
  level?: LiquidationWarning;
  /** FOV reduction percentage (0-1) */
  fovReduction?: number;
}

export const LiquidationWarningOverlay: React.FC<LiquidationWarningOverlayProps> = memo(
  ({ level: externalLevel, fovReduction = 0 }) => {
    const [currentLevel, setCurrentLevel] = useState<LiquidationWarning>('NONE');
    const [distance, setDistance] = useState<number>(100);
    const [isMobile, setIsMobile] = useState(screenService.isMobile());
    const isRetro = useIsRetro();
    const { rs, rfs, bottomSafeZone } = useResponsiveUI();

    // Subscribe to screen changes for mobile detection
    useEffect(() => {
      const unsubscribe = screenService.onChange(() => {
        setIsMobile(screenService.isMobile());
      });
      return unsubscribe;
    }, []);

    // Listen for liquidation warning events if no external level provided
    const handleWarning = useCallback(
      (receivedLevel: LiquidationWarning, receivedDistance: number) => {
        if (externalLevel === undefined) {
          setCurrentLevel(receivedLevel);
          setDistance(receivedDistance);
        }
      },
      [externalLevel]
    );

    useLiquidationWarning(handleWarning);

    // Use external level if provided; select mobile/desktop config
    const activeLevel = externalLevel ?? currentLevel;
    const config = isMobile
      ? MOBILE_WARNING_CONFIGS[activeLevel]
      : WARNING_CONFIGS[activeLevel];

    return (
      <AnimatePresence>
        {activeLevel !== 'NONE' && (
          <motion.div
            key={activeLevel}
            className="liquidation-warning-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 500,
            }}
          >
            {/* Vignette Effect - Multi-layered for desktop depth */}
            <motion.div
              className="vignette gpu-accelerated"
              animate={{
                opacity: [config.opacity * 0.7, config.opacity, config.opacity * 0.7],
              }}
              transition={{
                duration: config.pulseSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                inset: 0,
                background: isRetro
                  ? undefined
                  : isMobile
                    ? `radial-gradient(ellipse at center, transparent 25%, ${config.color} 100%)`
                    : `
                    radial-gradient(ellipse 85% 65% at center, transparent 30%, ${config.color}33 60%, ${config.color}88 85%, ${config.color} 100%),
                    radial-gradient(ellipse at center, transparent 50%, ${config.glowColor}22 100%)
                  `,
                // Retro: solid border vignette with sharp edges (scaled for mobile)
                ...(isRetro && {
                  boxShadow: isMobile
                    ? `inset 0 0 0 ${rs(6)}px ${config.color}, inset 0 0 0 ${rs(12)}px ${config.color}88`
                    : `inset 0 0 0 8px ${config.color}, inset 0 0 0 16px ${config.color}88`,
                  border: `${isMobile ? rs(3) : 4}px solid ${config.color}`,
                }),
              }}
            />

            {/* Neon Edge Glow - Cyberpunk effect (lighter on mobile for performance) */}
            {!isRetro && (
              <motion.div
                className="neon-edge-glow gpu-accelerated"
                animate={{
                  opacity: isMobile ? [0.2, 0.4, 0.2] : [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: config.pulseSpeed * 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  boxShadow: isMobile
                    ? `inset 0 0 40px ${config.glowColor}30, inset 0 0 80px ${config.glowColor}15`
                    : `inset 0 0 80px ${config.glowColor}40, inset 0 0 160px ${config.glowColor}20`,
                }}
              />
            )}

            {/* Scan Lines Effect - Cyberpunk (lighter on mobile, CRITICAL only) */}
            {config.scanLines &&
              !isRetro &&
              (!isMobile || activeLevel === 'CRITICAL') && (
                <div
                  className="scan-lines"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 0, 0, ${isMobile ? 0.04 : 0.06}) 2px,
                rgba(0, 0, 0, ${isMobile ? 0.04 : 0.06}) 4px
              )`,
                    pointerEvents: 'none',
                    opacity: isMobile ? 0.25 : activeLevel === 'CRITICAL' ? 0.5 : 0.3,
                  }}
                />
              )}

            {/* FOV Tunneling Effect (Critical only) */}
            {fovReduction > 0 && (
              <motion.div
                className="fov-tunnel"
                animate={{
                  opacity: [fovReduction * 0.8, fovReduction, fovReduction * 0.8],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isRetro
                    ? undefined
                    : `radial-gradient(circle at center, transparent ${60 - fovReduction * 30}%, rgba(0,0,0,${fovReduction}) 100%)`,
                  // Retro: sharp stepped border tunneling
                  ...(isRetro && {
                    boxShadow: `inset 0 0 0 ${Math.round(fovReduction * 60)}px rgba(0,0,0,${fovReduction}), inset 0 0 0 ${Math.round(fovReduction * 100)}px rgba(0,0,0,${fovReduction * 0.5})`,
                  }),
                }}
              />
            )}

            {/* Warning Text - Enhanced cyberpunk glow for desktop */}
            {config.showText && (
              <motion.div
                className={cn(
                  'warning-text gpu-accelerated',
                  isRetro && 'font-retro-pixel',
                  !isRetro && 'font-cyber font-black'
                )}
                animate={{
                  opacity: [0.7, 1, 0.7],
                  scale: isRetro
                    ? [1, 1, 1]
                    : isMobile
                      ? [1, 1.03, 1]
                      : [0.98, 1.02, 0.98],
                }}
                transition={{
                  duration: config.pulseSpeed,
                  repeat: Infinity,
                  ease: isRetro ? 'linear' : 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  top: isMobile
                    ? `max(env(safe-area-inset-top, 0px) + ${rs(8)}px, 12%)`
                    : '8%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: isRetro ? config.color : '#ffffff',
                  fontSize: isMobile
                    ? rfs(activeLevel === 'CRITICAL' ? 14 : 11)
                    : activeLevel === 'CRITICAL'
                      ? '1.75rem'
                      : '1.125rem',
                  background: !isRetro ? `${COLORS.BG}B3` : undefined,
                  border: !isRetro ? `1px solid ${config.glowColor}66` : undefined,
                  borderRadius: !isRetro ? (isMobile ? rs(10) : 12) : undefined,
                  boxShadow: !isRetro
                    ? `0 10px 40px ${COLORS.BG}8C, 0 0 20px ${config.glowColor}40, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : undefined,
                  // Enhanced neon glow for cyberpunk desktop
                  textShadow: isRetro
                    ? `${isMobile ? rs(2) : 4}px ${isMobile ? rs(2) : 4}px 0 #000`
                    : isMobile
                      ? `0 0 ${rs(12)}px ${config.color}, 0 0 ${rs(24)}px ${config.color}`
                      : `
                      0 0 10px ${config.glowColor},
                      0 0 20px ${config.glowColor},
                      0 0 40px ${config.glowColor},
                      0 0 80px ${config.glowColor}80,
                      2px 2px 0 #000
                    `,
                  textTransform: 'uppercase',
                  letterSpacing: isMobile ? '0.1em' : '0.25em',
                  textAlign: 'center',
                  maxWidth: isMobile ? '90vw' : undefined,
                  padding: !isRetro
                    ? isMobile
                      ? `${rs(10)}px ${rs(14)}px`
                      : '10px 20px'
                    : isMobile
                      ? `0 ${rs(8)}px`
                      : undefined,
                  // Retro: pixel-perfect rendering
                  ...(isRetro && {
                    imageRendering: 'pixelated',
                    WebkitFontSmoothing: 'none',
                  }),
                }}
              >
                {activeLevel === 'CRITICAL'
                  ? isRetro
                    ? '!! LIQUIDATION !!'
                    : isMobile
                      ? '⚠ LIQUIDATION! ⚠'
                      : '⚠ LIQUIDATION IMMINENT ⚠'
                  : isRetro
                    ? '! DANGER ZONE !'
                    : '⚠ DANGER ZONE ⚠'}
              </motion.div>
            )}

            {/* Distance Indicator - Enhanced for desktop cyberpunk */}
            {config.showText && (
              <motion.div
                className={cn(
                  'distance-indicator gpu-accelerated',
                  isRetro && 'font-retro-pixel',
                  !isRetro && 'font-cyber uppercase tracking-[0.12em]'
                )}
                animate={{ opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  bottom: isMobile
                    ? `max(env(safe-area-inset-bottom, 0px) + ${bottomSafeZone + rs(16)}px, 20%)`
                    : '12%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: config.color,
                  fontWeight: isRetro ? 400 : 600,
                  fontSize: isMobile
                    ? rfs(isRetro ? 8 : 12)
                    : isRetro
                      ? '0.625rem'
                      : '1rem',
                  textShadow: isRetro
                    ? `${isMobile ? rs(1) : 2}px ${isMobile ? rs(1) : 2}px 0 #000`
                    : isMobile
                      ? undefined
                      : `0 0 8px ${config.glowColor}, 0 0 16px ${config.glowColor}80`,
                  textAlign: 'center',
                  letterSpacing: isRetro ? '0.05em' : undefined,
                  background: !isRetro ? `${COLORS.BG}8C` : undefined,
                  border: !isRetro ? `1px solid ${config.glowColor}44` : undefined,
                  borderRadius: !isRetro ? (isMobile ? rs(8) : 10) : undefined,
                  padding: !isRetro
                    ? isMobile
                      ? `${rs(5)}px ${rs(10)}px`
                      : '6px 12px'
                    : undefined,
                }}
              >
                {distance.toFixed(1)}% from liquidation
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

export default LiquidationWarningOverlay;
