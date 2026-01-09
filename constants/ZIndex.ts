/**
 * Z-Index Hierarchy Strategy
 *
 * We use a structured z-index scale to manage stacking contexts.
 *
 * Scale:
 * 0-99: World & Gameplay Elements
 * 100-999: Standard UI (HUD)
 * 1000-1999: Overlays & Effects
 * 2000-2999: Modals & Dialogs (Pause, Settings)
 * 3000-3999: Critical Game States (GameOver, LevelUp, CycleComplete)
 * 9000+: System & Debug Tools
 */

export const Z_LAYERS = {
  // Gameplay
  CANVAS: 0,
  WORLD: 10,
  PARTICLES: 20,

  // HUD (Heads Up Display)
  HUD: 100, // Main GameUI container
  CROSSHAIR: 150,

  // Feedback & Effects
  DAMAGE_NUMBERS: 200,
  NEAR_DEATH_GLOW: 500,
  LEVEL_UP_FLASH: 600,

  // Modal Backdrops
  BACKDROP: 1000,

  // Menus & Modals
  PAUSE_MENU: 2000,
  SETTINGS_PANEL: 2100,
  MARKET_DISCONNECTED: 2200,

  // Critical Game Screens (Must overlap Menus)
  GAME_OVER: 3000,
  CYCLE_COMPLETE: 3100,
  LEVEL_UP_SCREEN: 3200,
  NICKNAME_ENTRY: 3300,

  // Toast / Notifications
  TOAST: 5000,
  TUTORIAL: 5100,

  // Debug & System
  DEBUG_PANEL: 9999,
  ADMIN_DASHBOARD: 9990,
  TOOLTIP: 9950,
} as const;
