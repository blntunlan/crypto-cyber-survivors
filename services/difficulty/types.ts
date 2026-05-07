import type { MarketPosition } from '../../types';
import type { MACDResult } from '../../types/indicators';

// =============================================================================
// INPUT SLICES (Step 1: Aggregator pattern)
// =============================================================================

/** Market-sourced inputs, owned by MarketInputAggregator */
export interface MarketInputSlice {
  pnlPercent: number;
  currentPrice: number;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  atrPercent: number;
  macd: MACDResult;
  pnlHistory: number[];
}

/** Player-state inputs, owned by PlayerMetricsAggregator */
export interface PlayerInputSlice {
  level: number;
  hpPercent: number;
  killStreak: number;
  timeSinceLastKill: number;
  accuracy: number;
  damageTakenFrequency: number;
  performanceScore: number;
  dps: number;
  playerPower: number;
  offensePower: number;
  counterPressure: number;
  rangedPressure: number;
  enemyHealthPool: number;
  screenDensity: number;
  upgradeEfficiency: number;
  movementEntropy: number;
  stress: {
    score: number;
    damageRate: number;
    dashUsage: number;
    nearDeathDuration: number;
  };
}

/** Leverage-related inputs, owned by LeverageStateProvider */
export interface LeverageInputSlice {
  leverage: number;
  position: MarketPosition;
  entryPrice: number;
  liquidationPrice: number;
  cycleFactor: number;
}

/**
 * Wave phase names (AI Director V2).
 * Difficulty is now driven continuously and exposed as a single active phase.
 */
export type WavePhase = 'active';

/** Liquidation warning levels */
export type LiquidationWarning = 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';

/** Leverage tier configuration */
export interface LeverageScale {
  spawn: number;
  speed: number;
  hp: number;
  damage: number;
  xpReq: number;
}

/** All inputs required by factor calculators */
export interface DifficultyInputs {
  // Time-based
  elapsedSeconds: number;
  cycleDuration: number;

  // Market-based
  pnlPercent: number; // -1.0 to +1.0 (raw, unleveraged)
  currentPrice: number;
  entryPrice: number;
  liquidationPrice: number;

  // Market Indicators
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  atrPercent: number;

  // Player state
  level: number;
  leverage: number;
  hpPercent: number;
  position: MarketPosition;

  // Combat state
  killStreak: number;
  timeSinceLastKill: number; // ms, -1 if no kills yet

  // Performance (ADS)
  accuracy: number; // 0.0 to 1.0
  damageTakenFrequency: number; // units per minute or similar
  performanceScore: number; // 0.0 to 1.0 (calculated ADS)

  // --- Neural / AI Metrics ---
  dps: number; // Current Damage Per Second dealt
  playerPower: number; // 0-1 composite of player combat + survivability scaling
  offensePower: number; // 0-1 weapon/stat offensive pressure
  counterPressure: number; // 0-1 enemy response pressure after flow relief
  rangedPressure: number; // 0-1 readiness for ranged/hybrid enemy composition
  enemyHealthPool: number; // Total HP of active enemies
  screenDensity: number; // Normalized 0-1 (activeEnemies / limit)
  upgradeEfficiency: number; // CoinsSpent / TotalCoins (0-1)
  movementEntropy: number; // 0-1 (how much player avoids patterns)

  // History
  pnlHistory: number[]; // buffer of leveraged PnL values

  // Cycle progression
  cycleFactor: number; // Multiplier from continuing past cycle (1.0 = base, 1.5 = cycle 1 continue, etc.)

  // --- Neural Network Sensors (V2) ---
  macd: MACDResult;
  stress: {
    score: number; // 0-1, Composite score
    damageRate: number; // 5-sec window damage
    dashUsage: number; // dashes per minute
    nearDeathDuration: number; // seconds spent < 20% HP
  };
}

/** State container for difficulty context */
export interface DifficultyContextState {
  factors: {
    cycle: number;
    pnl: number;
    level: number;
    wave: number;
    wavePhase: WavePhase;
    liquidation: {
      factor: number;
      warningLevel: LiquidationWarning;
      fovReduction: number;
    };
    streak: number;
    nearDeath: number;
    shock: {
      factor: number;
      triggered: boolean;
    };
    rsi: number;
    volume: number;
    atr: number;
    performance: number; // New ADS factor
  };
  aggregates: {
    core: number; // cycle × pnl × level × wave
    modifier: number; // liquidation × streak × nearDeath × shock
    market: number; // rsi × volume × atr
    performance: number; // Impact of player skill
    total: number; // clamp(core × modifier × market * performance, 1.0, 20.0)
  };
  inputs: DifficultyInputs & {
    leverageScale: LeverageScale;
  };
}

/** Final outputs for game consumers */
export interface DifficultyOutputV2 {
  total: number;
  wavePhase: WavePhase;
  liquidationWarning: LiquidationWarning;
  fovReduction: number;
  shockActive: boolean;
  spawnRate: number;
  enemySpeed: number;
  enemyHP: number;
  enemyDamage: number;
  // Director Advanced Metrics
  enemyVariety: number;
  chaosLevel: number;
  mercyFactor: number;
  pressureIntensity: number;
  whaleProbability: number;
  xpMultiplier: number;
  gemDropRate: number;
}
