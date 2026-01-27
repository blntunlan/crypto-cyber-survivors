/**
 * useWindowDimensions - Window Size Management Hook
 *
 * Tracks window dimensions with resize event handling.
 * Calculates HUD insets for proper player movement bounds.
 * Used for responsive game canvas sizing.
 */

import { useState, useEffect, useMemo } from 'react';
import { screenService } from '../services/system/ScreenService';

/**
 * HUD insets for player movement bounds
 * These values define the "playable area" within the canvas
 */
export interface HUDInsets {
  /** Top offset: Safe area + HUD height (timer, market info, etc.) */
  top: number;
  /** Bottom offset: Safe area + HP bar + mobile controls area */
  bottom: number;
  /** Left offset: Safe area inset */
  left: number;
  /** Right offset: Safe area inset */
  right: number;
}

export interface WindowDimensions {
  width: number;
  height: number;
  /** HUD insets for player movement bounds calculation */
  hudInsets: HUDInsets;
}

// Constants for HUD element heights (should match CSS values)
const HUD_CONSTANTS = {
  /** Top HUD height on mobile (timer + market info + buffs) */
  MOBILE_TOP_HUD_HEIGHT: 180,
  /** Top HUD height on desktop */
  DESKTOP_TOP_HUD_HEIGHT: 100,
  /** Bottom HP bar + controls area on mobile */
  MOBILE_BOTTOM_HUD_HEIGHT: 120,
  /** Bottom HP bar on desktop */
  DESKTOP_BOTTOM_HUD_HEIGHT: 80,
};

/**
 * Calculate HUD insets based on device type and safe areas
 */
function calculateHUDInsets(isMobile: boolean): HUDInsets {
  const safeArea = screenService.getSafeAreaInsets();

  if (isMobile) {
    return {
      top: safeArea.top + HUD_CONSTANTS.MOBILE_TOP_HUD_HEIGHT,
      bottom: safeArea.bottom + HUD_CONSTANTS.MOBILE_BOTTOM_HUD_HEIGHT,
      left: safeArea.left,
      right: safeArea.right,
    };
  }

  return {
    top: safeArea.top + HUD_CONSTANTS.DESKTOP_TOP_HUD_HEIGHT,
    bottom: safeArea.bottom + HUD_CONSTANTS.DESKTOP_BOTTOM_HUD_HEIGHT,
    left: safeArea.left,
    right: safeArea.right,
  };
}

/**
 * Hook to track window dimensions with automatic resize handling
 * Includes HUD insets for player movement bounds calculation
 */
export function useWindowDimensions(): WindowDimensions {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const isMobile = screenService.isMobile();

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Memoize HUD insets calculation
  const hudInsets = useMemo(() => calculateHUDInsets(isMobile), [isMobile]);

  return {
    width: dimensions.width,
    height: dimensions.height,
    hudInsets,
  };
}
