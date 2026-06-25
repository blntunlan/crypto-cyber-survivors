/**
 * UILayout - Responsive UI Configuration
 *
 * Defines how HUD elements and UI components should be scaled
 * and positioned across different platforms.
 */

export interface HUDElementStyle {
  visible: boolean;
  scale: number;
  opacity: number;
  /** Offset from original position in pixels */
  offset?: { x: number; y: number };
}

export interface HUDLayout {
  /** Overall scaling factor for all HUD elements */
  globalScale: number;

  /** Specific element adjustments */
  elements: {
    waveTimer: HUDElementStyle;
    fpsCounter: HUDElementStyle;
    comboPanel: HUDElementStyle;
    milestoneAnnouncer: HUDElementStyle;
    achievementPopup: HUDElementStyle;
    enemyPointers: HUDElementStyle;
    clutchAnnouncement: HUDElementStyle;
  };

  /** Positioning presets */
  positioning: 'default' | 'compact' | 'minimal';

  /** Max enemies on screen for performance */
  maxEnemies: number;
}

/**
 * DEFAULT DESKTOP LAYOUT
 */
export const DESKTOP_LAYOUT: HUDLayout = {
  globalScale: 1.0,
  elements: {
    waveTimer: { visible: true, scale: 1.0, opacity: 1.0 },
    fpsCounter: { visible: true, scale: 1.0, opacity: 1.0 },
    comboPanel: { visible: true, scale: 1.0, opacity: 1.0 },
    milestoneAnnouncer: { visible: true, scale: 1.0, opacity: 1.0 },
    achievementPopup: { visible: true, scale: 1.0, opacity: 1.0 },
    enemyPointers: { visible: true, scale: 1.0, opacity: 1.0 },
    clutchAnnouncement: { visible: true, scale: 1.0, opacity: 1.0 },
  },
  positioning: 'default',
  maxEnemies: 150,
};

/**
 * MOBILE PHONE LAYOUT (Landscape)
 * For screens 360-480px width
 */
export const MOBILE_LAYOUT: HUDLayout = {
  globalScale: 0.85, // Slightly smaller to save screen real estate
  elements: {
    waveTimer: { visible: true, scale: 1.0, opacity: 0.9, offset: { x: 0, y: 5 } }, // Reduced from 1.2
    fpsCounter: { visible: false, scale: 0.8, opacity: 0.5 }, // Hide FPS on mobile by default
    comboPanel: { visible: true, scale: 0.9, opacity: 1.0, offset: { x: 0, y: -20 } }, // Reduced, shifted up from controls
    milestoneAnnouncer: { visible: true, scale: 0.7, opacity: 1.0 }, // Reduced from 0.8
    achievementPopup: { visible: true, scale: 0.8, opacity: 1.0 }, // Reduced from 0.9
    enemyPointers: { visible: true, scale: 0.9, opacity: 0.7 }, // Reduced opacity
    clutchAnnouncement: { visible: true, scale: 0.9, opacity: 1.0 },
  },
  positioning: 'compact',
  maxEnemies: 150, // Gameplay cap uniform across platforms — DeviceBenchmarkService handles perf scaling
};

/**
 * SMALL MOBILE PHONE LAYOUT
 * For screens <360px (iPhone SE, Galaxy A01, etc.)
 */
export const SMALL_MOBILE_LAYOUT: HUDLayout = {
  globalScale: 0.75, // More aggressive scaling for tiny screens
  elements: {
    waveTimer: { visible: true, scale: 0.9, opacity: 0.8, offset: { x: 0, y: 0 } },
    fpsCounter: { visible: false, scale: 0.6, opacity: 0.3 }, // Always hidden
    comboPanel: { visible: false, scale: 0.8, opacity: 0.9 }, // Hidden on very small screens
    milestoneAnnouncer: { visible: true, scale: 0.6, opacity: 1.0 },
    achievementPopup: { visible: true, scale: 0.7, opacity: 1.0 },
    enemyPointers: { visible: true, scale: 0.8, opacity: 0.6 },
    clutchAnnouncement: { visible: true, scale: 0.8, opacity: 1.0 },
  },
  positioning: 'minimal',
  maxEnemies: 150, // Gameplay cap uniform across platforms — DeviceBenchmarkService handles perf scaling
};

/**
 * TABLET LAYOUT
 */
export const TABLET_LAYOUT: HUDLayout = {
  globalScale: 1.0,
  elements: {
    waveTimer: { visible: true, scale: 1.1, opacity: 1.0 },
    fpsCounter: { visible: true, scale: 0.9, opacity: 0.7 },
    comboPanel: { visible: true, scale: 1.0, opacity: 1.0 },
    milestoneAnnouncer: { visible: true, scale: 1.0, opacity: 1.0 },
    achievementPopup: { visible: true, scale: 1.0, opacity: 1.0 },
    enemyPointers: { visible: true, scale: 1.0, opacity: 1.0 },
    clutchAnnouncement: { visible: true, scale: 1.0, opacity: 1.0 },
  },
  positioning: 'default',
  maxEnemies: 150,
};

export type Platform = 'desktop' | 'mobile' | 'tablet';

/**
 * Helper to get layout based on platform/device
 * @param platform - Target platform
 * @param screenWidth - Optional screen width for finer mobile breakpoints
 */
export const getHUDLayout = (platform: Platform, screenWidth?: number): HUDLayout => {
  if (platform === 'mobile') {
    // Use SMALL_MOBILE_LAYOUT for very narrow screens
    if (screenWidth !== undefined && screenWidth < 360) {
      return SMALL_MOBILE_LAYOUT;
    }
    return MOBILE_LAYOUT;
  }
  if (platform === 'tablet') {
    return TABLET_LAYOUT;
  }
  return DESKTOP_LAYOUT;
};
