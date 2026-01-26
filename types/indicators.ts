/**
 * Market Indicators Type Definitions
 *
 * Types for the market indicators → gameplay mechanics system.
 * Volume, RSI, ATR indicators affect enemy behavior, spawn rates, and difficulty.
 */

import { type MarketPosition } from '../types';

// =============================================================================
// RSI (Relative Strength Index)
// =============================================================================

/**
 * RSI state with hysteresis zones to prevent flickering
 *
 * Thresholds:
 * - OVERSOLD: Entry < 30, Exit > 35
 * - OVERBOUGHT: Entry > 70, Exit < 65
 */
export type RSIState = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';

/**
 * RSI Configuration
 */
export interface RSIConfig {
  /** RSI calculation period (default: 7 for faster response) */
  period: number;
  /** Enter OVERSOLD when RSI drops below this */
  oversoldEnter: number;
  /** Exit OVERSOLD when RSI rises above this */
  oversoldExit: number;
  /** Enter OVERBOUGHT when RSI rises above this */
  overboughtEnter: number;
  /** Exit OVERBOUGHT when RSI drops below this */
  overboughtExit: number;
}

/**
 * Default RSI configuration
 * Period 14 (Standard for TradingView and Market Indicators)
 */
export const DEFAULT_RSI_CONFIG: RSIConfig = {
  period: 14,
  oversoldEnter: 30,
  oversoldExit: 35,
  overboughtEnter: 70,
  overboughtExit: 65,
};

/**
 * Synchronization Configuration for Determinism
 */
export const SYNC_CONFIG = {
  /** Maximum number of history points to keep in memory for indicators */
  MAX_HISTORY_SIZE: 300, // 5 minutes of 1s candles
  /** Indicator output precision for sync validation */
  PRECISION: 6,
  /** ATR calculation period */
  ATR_PERIOD: 14,
};

// =============================================================================
// VOLUME & WHALE TIERS
// =============================================================================

/**
 * Whale tier based on normalized volume (0-1)
 */
export enum WhaleTier {
  /** No whale spawn (normalized volume < 0.30) */
  NONE = 0,
  /** Baby whale (0.30 - 0.60): 2x size, 3x HP */
  BABY_WHALE = 1,
  /** Whale (0.60 - 0.90): 3.5x size, 8x HP */
  WHALE = 2,
  /** Mega whale (> 0.90): 5x size, 20x HP */
  MEGA_WHALE = 3,
}

/**
 * Whale tier thresholds (normalized volume 0-1)
 */
export const WHALE_TIER_THRESHOLDS = {
  BABY_WHALE: 0.3,
  WHALE: 0.6,
  MEGA_WHALE: 0.95, // Very rare - only spawns on extreme volume spikes
} as const;

/**
 * Whale tier multipliers for enemy stats
 */
export interface WhaleTierConfig {
  tier: WhaleTier;
  sizeMultiplier: number;
  healthMultiplier: number;
  valueMultiplier: number;
  spawnChance: number;
}

/**
 * Whale tier configurations
 *
 * Balanced for gameplay:
 * - BABY_WHALE: 1.3x size, 1.5x HP - slightly larger than normal
 * - WHALE: 1.6x size, 2.5x HP - noticeable but manageable
 * - MEGA_WHALE: 2x size, 4x HP - tough but not impossible
 */
export const WHALE_TIER_CONFIGS: Record<WhaleTier, WhaleTierConfig | null> = {
  [WhaleTier.NONE]: null,
  [WhaleTier.BABY_WHALE]: {
    tier: WhaleTier.BABY_WHALE,
    sizeMultiplier: 1.3,
    healthMultiplier: 1.5,
    valueMultiplier: 1.5,
    spawnChance: 0.15, // 15% chance when volume threshold met
  },
  [WhaleTier.WHALE]: {
    tier: WhaleTier.WHALE,
    sizeMultiplier: 1.6,
    healthMultiplier: 2.5,
    valueMultiplier: 2.5,
    spawnChance: 0.25, // 25% chance
  },
  [WhaleTier.MEGA_WHALE]: {
    tier: WhaleTier.MEGA_WHALE,
    sizeMultiplier: 2.0,
    healthMultiplier: 4.0,
    valueMultiplier: 5.0,
    spawnChance: 0.2, // 20% chance - very rare
  },
};

/**
 * Volume analyzer configuration
 */
export interface VolumeConfig {
  /** Number of candles to keep in history */
  historySize: number;
  /** Minimum datapoints before whale spawning enabled */
  minHistoryForWhale: number;
  /** Minimum interval between whale spawns (ms) */
  minWhaleInterval: number;
}

/**
 * Default volume configuration
 */
export const DEFAULT_VOLUME_CONFIG: VolumeConfig = {
  historySize: 100,
  minHistoryForWhale: 10,
  minWhaleInterval: 5000,
};

// =============================================================================
// ATR (Average True Range) → SPAWN RATE
// =============================================================================

/**
 * ATR-based spawn rate multipliers
 *
 * ATR Percent → Spawn Rate:
 * - < 1.0%: 0.5x (calm market)
 * - 1-2%: 1.0x (normal)
 * - 2-4%: 1.5x (volatile)
 * - > 4.0%: 2.5x (chaos) - capped at 4% for safety
 */
export interface ATRSpawnConfig {
  /** ATR percent thresholds */
  thresholds: {
    calm: number;
    normal: number;
    volatile: number;
  };
  /** Spawn rate multipliers */
  multipliers: {
    calm: number;
    normal: number;
    volatile: number;
    chaos: number;
  };
  /** Maximum ATR percent to consider (caps extreme values) */
  maxATRPercent: number;
}

/**
 * Default ATR spawn configuration
 */
export const DEFAULT_ATR_SPAWN_CONFIG: ATRSpawnConfig = {
  thresholds: {
    calm: 1.0,
    normal: 2.0,
    volatile: 4.0,
  },
  multipliers: {
    calm: 0.5,
    normal: 1.0,
    volatile: 1.5,
    chaos: 2.5,
  },
  maxATRPercent: 4.0,
};

// =============================================================================
// ENEMY BEHAVIOR MODIFIERS
// =============================================================================

/**
 * Movement pattern for enemies based on RSI state
 */
export type MovementPattern = 'straight' | 'zigzag' | 'chase' | 'circle';

/**
 * Visual style for enemies based on RSI + position favorability
 */
export type EnemyVisualStyle = 'friendly' | 'neutral' | 'aggressive';

/**
 * Enemy behavior modifier based on RSI + player position
 *
 * Favorable RSI (LONG+OVERSOLD or SHORT+OVERBOUGHT):
 * - Friendly enemies: straight movement, easy to hit, drop buffs
 *
 * Unfavorable RSI (LONG+OVERBOUGHT or SHORT+OVERSOLD):
 * - Aggressive enemies: zigzag movement, hard to hit, drop debuffs
 */
export interface RSIEnemyModifier {
  /** Enemy aggression multiplier (0.5 = passive, 1.8 = very aggressive) */
  aggroMultiplier: number;
  /** Enemy speed multiplier */
  speedMultiplier: number;
  /** Enemy damage multiplier */
  damageMultiplier: number;
  /** Enemy health multiplier */
  healthMultiplier: number;
  /** Chance to drop buff (0-1) */
  dropBuffChance: number;
  /** Chance to drop debuff (0-1) */
  dropDebuffChance: number;
  /** Movement pattern */
  movementPattern: MovementPattern;
  /** Visual style for rendering */
  visualStyle: EnemyVisualStyle;
}

/**
 * Default (neutral) enemy modifier
 */
export const NEUTRAL_ENEMY_MODIFIER: RSIEnemyModifier = {
  aggroMultiplier: 1.0,
  speedMultiplier: 1.0,
  damageMultiplier: 1.0,
  healthMultiplier: 1.0,
  dropBuffChance: 0.25,
  dropDebuffChance: 0.25,
  movementPattern: 'chase',
  visualStyle: 'neutral',
};

/**
 * Friendly enemy modifier (favorable RSI)
 */
export const FRIENDLY_ENEMY_MODIFIER: RSIEnemyModifier = {
  aggroMultiplier: 0.5,
  speedMultiplier: 0.8,
  damageMultiplier: 0.7,
  healthMultiplier: 0.8,
  dropBuffChance: 0.7,
  dropDebuffChance: 0.1,
  movementPattern: 'straight',
  visualStyle: 'friendly',
};

/**
 * Aggressive enemy modifier (unfavorable RSI)
 */
export const AGGRESSIVE_ENEMY_MODIFIER: RSIEnemyModifier = {
  aggroMultiplier: 1.8,
  speedMultiplier: 1.4,
  damageMultiplier: 1.5,
  healthMultiplier: 1.3,
  dropBuffChance: 0.1,
  dropDebuffChance: 0.5,
  movementPattern: 'zigzag',
  visualStyle: 'aggressive',
};

// =============================================================================
// MARKET INDICATOR STATE
// =============================================================================

/**
 * Complete market indicator state snapshot
 * Updated on every price/volume update
 */
export interface MarketIndicatorState {
  // Volume indicators
  /** Normalized volume (0-1) */
  normalizedVolume: number;
  /** Current whale tier based on volume */
  whaleTier: WhaleTier;
  /** Whether a whale can spawn (respects cooldown) */
  canSpawnWhale: boolean;
  /** Time of last whale spawn (ms) */
  lastWhaleSpawnTime: number;

  // RSI indicators
  /** Current RSI value (0-100) */
  rsi: number;
  /** Current RSI state with hysteresis */
  rsiState: RSIState;
  /** Previous RSI state (for transition detection) */
  previousRsiState: RSIState;

  // ATR indicators
  /** ATR absolute value */
  atr: number;
  /** ATR as percentage of current price */
  atrPercent: number;
  /** Spawn rate multiplier derived from ATR */
  spawnRateMultiplier: number;

  // Enemy modifier (derived from RSI + position)
  /** Current enemy modifier based on market state */
  enemyModifier: RSIEnemyModifier;

  // Meta
  /** Whether the indicator system has enough data */
  isInitialized: boolean;
  /** Last update timestamp (ms) */
  lastUpdateTime: number;
  /** Current player position (for modifier calculation) */
  currentPosition: MarketPosition;
}

/**
 * Get default (uninitialized) market indicator state
 */
export function getDefaultMarketIndicatorState(): MarketIndicatorState {
  return {
    normalizedVolume: 0.5,
    whaleTier: WhaleTier.NONE,
    canSpawnWhale: false,
    lastWhaleSpawnTime: 0,
    rsi: 50,
    rsiState: 'NEUTRAL',
    previousRsiState: 'NEUTRAL',
    atr: 0,
    atrPercent: 0,
    spawnRateMultiplier: 1.0,
    enemyModifier: NEUTRAL_ENEMY_MODIFIER,
    isInitialized: false,
    lastUpdateTime: 0,
    currentPosition: 'LONG' as MarketPosition,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine RSI state with hysteresis to prevent flickering
 *
 * @param rsi Current RSI value
 * @param previousState Previous RSI state
 * @param config RSI configuration
 * @returns New RSI state
 */
export function getRSIStateWithHysteresis(
  rsi: number,
  previousState: RSIState,
  config: RSIConfig = DEFAULT_RSI_CONFIG
): RSIState {
  // Handle invalid RSI
  if (!Number.isFinite(rsi)) {
    return 'NEUTRAL';
  }

  // Entry thresholds (cross into new state)
  if (rsi < config.oversoldEnter) {
    return 'OVERSOLD';
  }
  if (rsi > config.overboughtEnter) {
    return 'OVERBOUGHT';
  }

  // Exit thresholds (leave current state)
  if (previousState === 'OVERSOLD' && rsi > config.oversoldExit) {
    return 'NEUTRAL';
  }
  if (previousState === 'OVERBOUGHT' && rsi < config.overboughtExit) {
    return 'NEUTRAL';
  }

  // Stay in current state (hysteresis zone)
  return previousState;
}

/**
 * Determine whale tier from normalized volume
 *
 * @param normalizedVolume Volume normalized to 0-1 range
 * @returns Whale tier
 */
export function getWhaleTierFromVolume(normalizedVolume: number): WhaleTier {
  if (normalizedVolume >= WHALE_TIER_THRESHOLDS.MEGA_WHALE) {
    return WhaleTier.MEGA_WHALE;
  }
  if (normalizedVolume >= WHALE_TIER_THRESHOLDS.WHALE) {
    return WhaleTier.WHALE;
  }
  if (normalizedVolume >= WHALE_TIER_THRESHOLDS.BABY_WHALE) {
    return WhaleTier.BABY_WHALE;
  }
  return WhaleTier.NONE;
}

/**
 * Get spawn rate multiplier from ATR percent
 *
 * @param atrPercent ATR as percentage of price
 * @param config ATR spawn configuration
 * @returns Spawn rate multiplier
 */
export function getSpawnRateFromATR(
  atrPercent: number,
  config: ATRSpawnConfig = DEFAULT_ATR_SPAWN_CONFIG
): number {
  // Cap extreme ATR values
  const cappedATR = Math.min(atrPercent, config.maxATRPercent);

  if (cappedATR < config.thresholds.calm) {
    return config.multipliers.calm;
  }
  if (cappedATR < config.thresholds.normal) {
    return config.multipliers.normal;
  }
  if (cappedATR < config.thresholds.volatile) {
    return config.multipliers.volatile;
  }
  return config.multipliers.chaos;
}

/**
 * Get enemy modifier based on RSI state and player position
 *
 * Matrix:
 * - LONG + OVERSOLD = Friendly (market supports long)
 * - LONG + OVERBOUGHT = Aggressive (market against long)
 * - SHORT + OVERSOLD = Aggressive (market against short)
 * - SHORT + OVERBOUGHT = Friendly (market supports short)
 *
 * @param rsiState Current RSI state
 * @param position Player's market position
 * @returns Enemy modifier
 */
export function getEnemyModifierFromRSI(
  rsiState: RSIState,
  position: MarketPosition
): RSIEnemyModifier {
  // Neutral RSI = neutral enemies
  if (rsiState === 'NEUTRAL') {
    return NEUTRAL_ENEMY_MODIFIER;
  }

  // Determine if RSI is favorable for the position
  const isFavorable =
    (position === 'LONG' && rsiState === 'OVERSOLD') ||
    (position === 'SHORT' && rsiState === 'OVERBOUGHT');

  return isFavorable ? FRIENDLY_ENEMY_MODIFIER : AGGRESSIVE_ENEMY_MODIFIER;
}
