/**
 * useDevice - React Hook for Device Detection
 *
 * Provides reactive device info that updates on:
 * - Screen resize
 * - Orientation change
 *
 * Usage:
 *   const { isMobile, platform } = useDevice();
 *   const isMobile = useIsMobile();
 */

import { useState, useEffect } from 'react';
import {
  screenService,
  type DeviceInfo,
  type Platform,
  type ScreenInfo,
} from '../services/system/ScreenService';

/**
 * Full device information hook
 * Updates on resize and orientation change
 */
export function useDevice(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
    screenService.getDeviceInfo()
  );

  useEffect(() => {
    // Update device info on changes
    const updateInfo = () => {
      setDeviceInfo(screenService.getDeviceInfo());
    };

    // Subscribe to changes
    const unsubscribe = screenService.onChange(updateInfo);

    // Cleanup
    return unsubscribe;
  }, []);

  return deviceInfo;
}

/**
 * Simple mobile detection hook
 */
export function useIsMobile(): boolean {
  const { isMobile } = useDevice();
  return isMobile;
}

/**
 * Simple desktop detection hook
 */
export function useIsDesktop(): boolean {
  const { isDesktop } = useDevice();
  return isDesktop;
}

/**
 * Platform detection hook
 */
export function usePlatform(): Platform {
  const { platform } = useDevice();
  return platform;
}

/**
 * Screen info hook (dimensions, orientation, safe areas)
 */
export function useScreenInfo(): ScreenInfo {
  const { screen } = useDevice();
  return screen;
}

/**
 * Orientation hook
 */
export function useIsLandscape(): boolean {
  const { screen } = useDevice();
  return screen.isLandscape;
}

/**
 * iOS detection hook
 */
export function useIsIOS(): boolean {
  const { isIOS } = useDevice();
  return isIOS;
}

/**
 * Android detection hook
 */
export function useIsAndroid(): boolean {
  const { isAndroid } = useDevice();
  return isAndroid;
}

/**
 * PWA mode detection hook
 */
export function useIsPWA(): boolean {
  const { isPWA } = useDevice();
  return isPWA;
}

/**
 * Should show mobile controls hook
 */
export function useShouldShowMobileControls(): boolean {
  const { isMobile } = useDevice();
  return isMobile;
}

/**
 * Touch capability hook
 */
export function useHasTouch(): boolean {
  const { hasTouch } = useDevice();
  return hasTouch;
}

/**
 * Optimal game dimensions hook
 * Accounts for safe areas
 */
export function useGameDimensions(): { width: number; height: number } {
  useDevice(); // Still need to subscribe to changes to trigger rerender
  return screenService.getOptimalGameDimensions();
}

/**
 * Safe area insets hook
 */
export function useSafeAreaInsets() {
  const { screen } = useDevice();
  return screen.safeArea;
}
