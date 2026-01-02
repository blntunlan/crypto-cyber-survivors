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
  maxEnemies: 300,
};

/**
 * MOBILE PHONE LAYOUT (Landscape)
 */
export const MOBILE_LAYOUT: HUDLayout = {
  globalScale: 0.85, // Slightly smaller to save screen real estate
  elements: {
    waveTimer: { visible: true, scale: 1.2, opacity: 0.9, offset: { x: 0, y: 10 } },
    fpsCounter: { visible: false, scale: 0.8, opacity: 0.5 }, // Hide FPS on mobile by default
    comboPanel: { visible: true, scale: 1.1, opacity: 1.0, offset: { x: 0, y: 0 } },
    milestoneAnnouncer: { visible: true, scale: 0.8, opacity: 1.0 },
    achievementPopup: { visible: true, scale: 0.9, opacity: 1.0 },
    enemyPointers: { visible: true, scale: 1.0, opacity: 0.8 },
    clutchAnnouncement: { visible: true, scale: 1.0, opacity: 1.0 },
  },
  positioning: 'compact',
  maxEnemies: 100,
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

/**
 * Helper to get layout based on platform/device
 */
export const getHUDLayout = (platform: 'desktop' | 'mobile' | 'tablet'): HUDLayout => {
  switch (platform) {
    case 'mobile':
      return MOBILE_LAYOUT;
    case 'tablet':
      return TABLET_LAYOUT;
    default:
      return DESKTOP_LAYOUT;
  }
};
