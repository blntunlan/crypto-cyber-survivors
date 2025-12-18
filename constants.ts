/**
 * Constants - Global Values Only
 *
 * Game-specific config moved to /config folder.
 * This file now only contains truly global constants.
 */

// =============================================================================
// SCREEN
// =============================================================================

// Note: GAME_WIDTH and GAME_HEIGHT are now managed dynamically in App.tsx
// These are fallback/initial values
export const INITIAL_GAME_WIDTH = window.innerWidth;
export const INITIAL_GAME_HEIGHT = window.innerHeight;

// =============================================================================
// GAME ENGINE
// =============================================================================

export const GAME_ENGINE = {
  BULLET_SPEED: 8,
  PROJECTILE_SPREAD: 0.15, // radians (~8.5 degrees)
  SHAKE_DECAY: 0.9,
  CRIT_FLASH_DECAY: 0.85,
  SPAWN_TIMER_BASE: 2000, // Increased from 1200 for slower initial spawn
  SPAWN_DIFFICULTY_SCALE: 0.5, // Softens difficulty impact on spawn rate
  SPAWN_OFFSET: 50, // Offset for spawning enemies off-screen
  ENEMY_OFFSCREEN_THRESHOLD: 200,
  GEM_MAGNET_BASE_RANGE: 150,
  DASH_SPEED_MULTIPLIER: 3,
  DASH_DURATION: 200, // ms
  DASH_COOLDOWN: 1000, // ms
};

// =============================================================================
// EXTERNAL APIs
// =============================================================================

// Note: @ticker provides 1-second updates, @kline_1m was 1-minute
export const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker';
export const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';

// =============================================================================
// COLORS (Slot Machine / Casino Palette)
// =============================================================================

export const COLORS = {
  // Market & Core Actions
  LONG: '#22c55e', // green-500
  SHORT: '#ef4444', // red-500
  BG: '#020617', // slate-950 (Dark night)
  TEXT: '#f8fafc', // slate-50

  // Standard Colors
  GEM: '#FFD700', // Gold
  RARE_GEM: '#FF10F0', // Neon pink
  BULLET: '#00FFFF', // Electric blue neon
  WHALE: '#B026FF', // Neon purple
  CRIT: '#FFD700', // Rich gold
  SUPER_CRIT: '#D20202', // Casino hot red

  // Casino Slot Machine / Arcade Palette
  CASINO_GOLD: '#D6B85C',
  CASINO_RED: '#B22222',
  CASINO_GREEN: '#05732c', // Roulette table green
  NEON_ORANGE: '#FF6600',
  NEON_GREEN: '#39FF14',
  ROYAL_PURPLE: '#7558A4',
  BRILLIANT_ROSE: '#F4599D',
  ELECTRIC_BLUE: '#00BFFF',
  SLOT_BLACK: '#1A1A1A',
  SLOT_SILVER: '#DCDCDC',
  PUMP_GREEN: '#00E676',
  DUMP_ORANGE: '#FF3D00',
  JACKPOT_YELLOW: '#FFD600',
};

// =============================================================================
// RE-EXPORTS FROM CONFIG (backwards compatibility)
// =============================================================================

export {
  PLAYER_STATS,
  PLAYER_INITIAL_HP,
  INITIAL_FIRE_RATE,
  createInitialPlayer,
} from './config/PlayerConfig';

export { ENEMY_BASE_SPEED } from './config/EnemyConfig';

export { UI_CONFIG } from './config/GameConfig';

// Legacy export for chart
export const MAX_CHART_POINTS = 60;
