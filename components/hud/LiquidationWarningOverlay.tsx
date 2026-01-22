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

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiquidationWarning } from '../../hooks/useDifficultyV2';
import type { LiquidationWarning } from '../../services/difficulty';

interface WarningConfig {
  color: string;
  opacity: number;
  pulseSpeed: number;
  blur: number;
  showText: boolean;
}

const WARNING_CONFIGS: Record<LiquidationWarning, WarningConfig> = {
  NONE: { color: 'transparent', opacity: 0, pulseSpeed: 0, blur: 0, showText: false },
  CAUTION: { color: '#fbbf24', opacity: 0.15, pulseSpeed: 3, blur: 0, showText: false },
  DANGER: { color: '#f97316', opacity: 0.25, pulseSpeed: 1.5, blur: 2, showText: true },
  CRITICAL: {
    color: '#ef4444',
    opacity: 0.4,
    pulseSpeed: 0.5,
    blur: 8,
    showText: true,
  },
};

interface LiquidationWarningOverlayProps {
  /** Current warning level (can be set externally or use hook) */
  level?: LiquidationWarning;
  /** FOV reduction percentage (0-1) */
  fovReduction?: number;
}

export const LiquidationWarningOverlay: React.FC<LiquidationWarningOverlayProps> = ({
  level: externalLevel,
  fovReduction = 0,
}) => {
  const [currentLevel, setCurrentLevel] = useState<LiquidationWarning>('NONE');
  const [distance, setDistance] = useState<number>(100);

  // Listen for liquidation warning events if no external level provided
  useLiquidationWarning((receivedLevel, receivedDistance) => {
    if (externalLevel === undefined) {
      setCurrentLevel(receivedLevel);
      setDistance(receivedDistance);
    }
  });

  // Use external level if provided
  const activeLevel = externalLevel ?? currentLevel;
  const config = WARNING_CONFIGS[activeLevel];

  if (activeLevel === 'NONE') {
    return null;
  }

  return (
    <AnimatePresence>
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
          zIndex: 1000,
        }}
      >
        {/* Vignette Effect */}
        <motion.div
          className="vignette"
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
            background: `radial-gradient(ellipse at center, transparent 40%, ${config.color} 100%)`,
            filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
          }}
        />

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
              background: `radial-gradient(circle at center, transparent ${60 - fovReduction * 30}%, rgba(0,0,0,${fovReduction}) 100%)`,
            }}
          />
        )}

        {/* Warning Text */}
        {config.showText && (
          <motion.div
            className="warning-text"
            animate={{
              opacity: [0.6, 1, 0.6],
              scale: [0.98, 1.02, 0.98],
            }}
            transition={{
              duration: config.pulseSpeed,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              color: config.color,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: activeLevel === 'CRITICAL' ? '1.5rem' : '1rem',
              textShadow: `0 0 20px ${config.color}, 0 0 40px ${config.color}`,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            {activeLevel === 'CRITICAL'
              ? '⚠ LIQUIDATION IMMINENT ⚠'
              : '⚠ DANGER ZONE ⚠'}
          </motion.div>
        )}

        {/* Distance Indicator */}
        {config.showText && (
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '50%',
              transform: 'translateX(-50%)',
              color: config.color,
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              opacity: 0.7,
            }}
          >
            {distance.toFixed(1)}% from liquidation
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LiquidationWarningOverlay;
