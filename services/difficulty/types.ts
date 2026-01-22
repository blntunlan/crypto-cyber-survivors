import type { MarketPosition } from '../../types';

/** Wave phase names */
export type WavePhase =
  | 'warmup'
  | 'buildup'
  | 'firstPeak'
  | 'breather'
  | 'escalation'
  | 'climax'
  | 'resolution';

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

  // History
  pnlHistory: number[]; // buffer of leveraged PnL values
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
  };
  aggregates: {
    core: number; // cycle × pnl × level × wave
    modifier: number; // liquidation × streak × nearDeath × shock
    market: number; // rsi × volume × atr
    total: number; // clamp(core × modifier × market, 1.0, 10.0)
  };
  inputs: {
    leverage: number;
    leverageScale: LeverageScale;
    pnlHistory: number[];
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
