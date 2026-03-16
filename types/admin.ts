/**
 * Admin Dashboard Type Definitions
 *
 * Core types for the game configuration dashboard
 */

// =============================================================================
// PRICE ANALYSIS
// =============================================================================

export type CryptoPair = 'BTC' | 'ETH' | 'SOL';
export type TrendDirection = 'bullish' | 'bearish' | 'sideways';
export type PriceSource = 'binance' | 'coinbase' | 'sse' | 'mock';

export interface PriceSnapshot {
  pair: CryptoPair;
  price: number;
  timestamp: number;
  source: PriceSource;
}

export interface PriceAnalysis {
  pair: CryptoPair;
  currentPrice: number;

  // Time-based changes (percentage)
  change5m: number;
  change10m: number;
  change30m: number;
  change1h: number;

  // Volatility metrics
  volatility: number; // 0-1 normalized score
  atr: number; // Average True Range

  // Trend
  trend: TrendDirection;
  trendStrength: number; // 0-1

  // Meta
  timestamp: number;
  source: PriceSource;
  isStale: boolean; // Data older than 1 minute
}

// =============================================================================
// GAME CONFIG
// =============================================================================

export type DifficultyCurve = 'linear' | 'exponential' | 'logarithmic';

export interface DifficultyConfig {
  base: number; // 1-10
  volatilityMultiplier: number; // 0.5-2.0
  timeMultiplier: number; // Per minute increase
  maxDifficulty: number; // Cap
  curve: DifficultyCurve;
}

export interface SpawnConfig {
  baseInterval: number; // ms
  minInterval: number; // ms
  maxEnemies: number;
  waveIntensity: number; // 0-1
  bossSpawnTime: number; // ms
  enemyDistribution: {
    normal: number; // percentage
    fast: number;
    tank: number;
    ranged: number;
  };
}

export interface ItemConfig {
  gemDropRate: number; // 0-1
  healthDropRate: number;
  powerUpDropRate: number;
  gemValues: {
    small: number;
    medium: number;
    large: number;
  };
  powerUpDurations: {
    shield: number; // ms
    speedBoost: number;
    damage: number;
    magnet: number;
  };
}

export type ThemeType = 'btc' | 'eth' | 'sol' | 'custom';

export interface VisualConfig {
  theme: ThemeType;
  particleDensity: number; // 0-1
  screenShake: boolean;
  glowEffects: boolean;
}

export interface GameConfig {
  version: string;
  lastModified: number;
  difficulty: DifficultyConfig;
  spawn: SpawnConfig;
  items: ItemConfig;
  visuals: VisualConfig;
}

// =============================================================================
// ENTITY SYSTEM (Extensible)
// =============================================================================

export type EntityCategory =
  | 'enemy'
  | 'powerup'
  | 'weapon'
  | 'card'
  | 'boss'
  | 'hazard'
  | 'collectible';

export type FieldType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'color'
  | 'select'
  | 'array'
  | 'icon';

export interface FieldSchema {
  type: FieldType;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  items?: string;
  group?: string;
  condition?: string;
  tooltip?: string;
}

export interface EntitySchema {
  [key: string]: FieldSchema;
}

export interface GameEntity {
  id: string;
  name: string;
  category: EntityCategory;
  icon: string;
  description: string;
  schema: EntitySchema;
  values: Record<string, unknown>;
}

// =============================================================================
// ADMIN DASHBOARD STATE
// =============================================================================

export interface AdminDashboardState {
  // Current config
  config: GameConfig;
  isDirty: boolean;

  // Price data
  priceAnalysis: Record<CryptoPair, PriceAnalysis | null>;

  // Entity browser
  selectedCategory: EntityCategory | null;
  selectedEntityId: string | null;

  // UI state
  activePanels: string[];
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_DIFFICULTY_CONFIG: DifficultyConfig = {
  base: 5,
  volatilityMultiplier: 1.0,
  timeMultiplier: 0.1,
  maxDifficulty: 10,
  curve: 'linear',
};

export const DEFAULT_SPAWN_CONFIG: SpawnConfig = {
  baseInterval: 2000,
  minInterval: 500,
  maxEnemies: 50,
  waveIntensity: 0.5,
  bossSpawnTime: 120000,
  enemyDistribution: {
    normal: 50,
    fast: 25,
    tank: 15,
    ranged: 10,
  },
};

export const DEFAULT_ITEM_CONFIG: ItemConfig = {
  gemDropRate: 0.8,
  healthDropRate: 0.05,
  powerUpDropRate: 0.02,
  gemValues: {
    small: 5,
    medium: 15,
    large: 50,
  },
  powerUpDurations: {
    shield: 5000,
    speedBoost: 3000,
    damage: 10000,
    magnet: 8000,
  },
};

export const DEFAULT_VISUAL_CONFIG: VisualConfig = {
  theme: 'btc',
  particleDensity: 0.7,
  screenShake: true,
  glowEffects: true,
};

export const DEFAULT_GAME_CONFIG: GameConfig = {
  version: '1.0.0',
  lastModified: Date.now(),
  difficulty: DEFAULT_DIFFICULTY_CONFIG,
  spawn: DEFAULT_SPAWN_CONFIG,
  items: DEFAULT_ITEM_CONFIG,
  visuals: DEFAULT_VISUAL_CONFIG,
};

export const CRYPTO_PAIRS: CryptoPair[] = ['BTC', 'ETH', 'SOL'];
