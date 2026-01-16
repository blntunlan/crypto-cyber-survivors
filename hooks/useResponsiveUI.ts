import { useMemo } from 'react';
import { useWindowDimensions } from './useWindowDimensions';

// Design baseline (iPhone 13/14 Pro width approx)
const BASE_WIDTH = 390;

export interface ResponsiveUI {
  // Current scale factor relative to base design
  scale: number;
  // Device categories
  isSmallDevice: boolean;
  isVeryNarrow: boolean; // <320px - ultra compact mode required
  isTablet: boolean;
  isLandscape: boolean;
  // Bottom safe zone in pixels (for mobile controls area)
  bottomSafeZone: number;
  // Helper to scale pixel values
  rs: (pixels: number) => number;
  // Helper for responsive font size
  rfs: (pixels: number) => number;
}

/**
 * Hook for calculating responsive UI scaling based on screen size.
 * Uses a baseline width for scaling calculations to ensure consistency across devices.
 */
export function useResponsiveUI(): ResponsiveUI {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;

    // For games, we often care about the short edge for UI sizing
    // to ensure buttons don't overlap on small screens
    const shortEdge = isLandscape ? height : width;

    // Determine device category
    const isSmallDevice = shortEdge < 360;
    const isVeryNarrow = shortEdge < 320; // Ultra-compact mode
    const isTablet = shortEdge >= 600;

    // Bottom safe zone: Mobile controls area reservation
    // Landscape mode on small devices needs more space for touch controls
    const bottomSafeZone = isLandscape && shortEdge < 500 ? 90 : 60;

    // Calculate scale factor using short edge comparison
    // We clamp the scale to avoid elements becoming too tiny or too massive
    // Range: 0.65x to 1.5x
    let rawScale = shortEdge / BASE_WIDTH;

    // Adjust scale curve
    if (isTablet) {
      // Tablets don't need linear scaling from phone sizes,
      // otherwise buttons become comically large. Dampen the scaling.
      rawScale = 1 + (rawScale - 1) * 0.5;
    }

    // Clamp scale - lowered minimum to 0.65 for very small screens
    const scale = Math.min(Math.max(rawScale, 0.65), 1.5);

    // Responsive sizer helper
    const rs = (pixels: number) => Math.round(pixels * scale);

    // Font sizer (usually scales slightly less aggressively)
    const rfs = (pixels: number) => Math.round(pixels * (1 + (scale - 1) * 0.8));

    return {
      scale,
      isSmallDevice,
      isVeryNarrow,
      isTablet,
      isLandscape,
      bottomSafeZone,
      rs,
      rfs,
    };
  }, [width, height]);
}
