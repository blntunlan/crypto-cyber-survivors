/**
 * Constants - Global Values Only
 *
 * Game-specific config moved to /config folder.
 * This file now only contains truly global constants.
 */

import { CRYPTO_PAIRS, type CryptoPair } from './types/crypto';

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
  SPAWN_TIMER_BASE: 1000, // Reduced from 2000 for faster initial action
  SPAWN_DIFFICULTY_SCALE: 0.8, // Increases difficulty impact on spawn rate
  SPAWN_OFFSET: 50, // Offset for spawning enemies off-screen
  ENEMY_OFFSCREEN_THRESHOLD: 200,
  GEM_MAGNET_BASE_RANGE: 150,
  DASH_SPEED_MULTIPLIER: 3,
  DASH_DURATION: 200, // ms
  DASH_COOLDOWN: 1000, // ms (normal dash)
  DOUBLE_DASH_COOLDOWN: 3000, // ms (after double dash)
  DOUBLE_DASH_WINDOW: 200, // ms (window to press second dash)
  // Hit Stop - brief freeze on impact for "weight" feeling
  HIT_STOP_NORMAL: 16, // ms (~1 frame) - normal hit
  HIT_STOP_CRIT: 50, // ms (~3 frames) - critical hit
  // Enemy Death Pop - scale up + fade out animation
  ENEMY_DEATH_POP_SPEED: 0.12, // Progress per frame (~8 frames = ~133ms)
  // Near Miss Tension
  NEAR_MISS_THRESHOLD: 40, // Distance buffer for near miss
  NEAR_MISS_DURATION: 300, // ms duration of effect
  NEAR_MISS_SLOWMO: 0.4, // Time scale during near miss
  NEAR_MISS_COOLDOWN: 1000, // ms global cooldown
};

// =============================================================================
// EXTERNAL APIs
// =============================================================================

// Dynamic WS URL generation - BINANCE SPOT with kline data
// Note: Using spot stream (stream.binance.com) instead of futures (fstream)
// Spot API has better global availability and works in regions where futures is blocked
export const getBinanceWsUrl = (pair: CryptoPair): string => {
  const config = CRYPTO_PAIRS[pair];
  // Using Spot stream with 1-second kline for real-time updates
  return `wss://stream.binance.com:9443/ws/${config.binanceSymbol}@kline_1s`;
};

// Note: @kline_1s provides 1-second candle updates from Spot market
// Legacy export for backward compatibility
export const BINANCE_WS_URL = getBinanceWsUrl('BTC');
export const COINBASE_WS_URL = 'wss://ws-feed.exchange.coinbase.com';

// =============================================================================
// COLORS - Re-exported from config/Colors.ts to break circular dependency
// =============================================================================

export { COLORS } from './config/Colors';

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
