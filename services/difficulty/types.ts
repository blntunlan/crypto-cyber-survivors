import type { MarketPosition } from '../../types';
import type { MACDResult } from '../../types/indicators';

/**
 * Wave phase names
 * Legacy Support (V1)
 * Difficulty is now driven by market conditions and player flow state.
 * Keeping this type for legacy compatibility.
 */
export type WavePhase =
  | 'active' // New: Single active phase (V2)
  | 'warmup' // @deprecated
  | 'buildup' // @deprecated
  | 'firstPeak' // @deprecated
  | 'breather' // @deprecated
  | 'escalation' // @deprecated
  | 'climax' // @deprecated
  | 'resolution'; // @deprecated

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
  enemyHealthPool: number; // Total HP of active enemies
  screenDensity: number; // Normalized 0-1 (activeEnemies / limit)
  upgradeEfficiency: number; // CoinsSpent / TotalCoins (0-1)
  movementEntropy: number; // 0-1 (how much player avoids patterns)

  // History
  pnlHistory: number[]; // buffer of leveraged PnL values

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
}
