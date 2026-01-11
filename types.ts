import { type CryptoPair } from './types/crypto';

// Re-export GameMode types
export {
  GameMode,
  type GameModeConfig,
  type CycleCompleteData,
} from './types/gameMode';
export { GAME_MODE_CONFIGS } from './types/gameMode';

export enum MarketPosition {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAMEOVER = 'GAMEOVER',
  CYCLE_COMPLETE = 'CYCLE_COMPLETE',
  DATA_DISCONNECTED = 'DATA_DISCONNECTED',
}

// Available leverage options
export type LeverageOption = 1 | 2 | 5 | 10 | 25 | 50 | 100;

export const LEVERAGE_OPTIONS: LeverageOption[] = [1, 2, 5, 10, 25, 50, 100];

export interface DamageIndicator {
  sourceX: number;
  sourceY: number;
  timestamp: number;
}

export interface MarketData {
  price: number;
  volume: number;
  pnl: number; // Raw PnL (%)
  effectivePnl: number; // PnL * Leverage
  leverage: LeverageOption;
  position?: MarketPosition;
  liquidationPrice?: number;
  rsi: number;
  rsiState?: string;
  difficulty: number;
  pair?: CryptoPair;
  symbol?: string; // e.g. 'BTCUSDT'
  // Server-synced indicators
  atrPercent?: number; // ATR as percentage of price (from server)
  whaleTier?: 0 | 1 | 2 | 3;
  spawnRateMultiplier?: number;
}

export interface Entity {
  active: boolean; // For Pooling
  x: number;
  y: number;
  radius: number;
  color: string;
}

import { type StatKey } from './config/StatRegistry';

export type PlayerStats = {
  [K in StatKey]: number;
};

export interface Player extends Omit<Entity, 'active'>, PlayerStats {
  level: number;
  exp: number;
  nextLevelExp: number;
}

// Note: UpgradeOption removed - now using Card from CardSystem

import { type EnemyId } from './config/EnemyRegistry';

export interface Enemy extends Entity {
  speed: number;
  health: number;
  maxHealth: number;
  type: EnemyId;
  valueMultiplier?: number;
  // Death animation
  isDying?: boolean;
  deathProgress?: number;
  hasTriggeredNearMiss?: boolean;
  spawnTimer?: number;
  hasEnteredScreen?: boolean;
  // Damage buffering for stacked numbers
  damageBuffer?: number;
  damageBufferTimer?: number;
  damageBufferIsCrit?: boolean;
  damageBufferIsSuperCrit?: boolean;
}

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  isSuperCrit?: boolean;
}

export interface SpeedLine extends Entity {
  length: number;
  width: number;
  angle: number;
  opacity: number;
  decay: number;
  vx: number;
  vy: number;
}

export interface Gem extends Entity {
  value: number;
  isRare?: boolean;
  magnetized?: boolean;
  vx?: number;
  vy?: number;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  isPixel?: boolean;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  size: number;
}

export interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  speed: number;
}

export interface GameState {
  bgCandles: Candle[];
  lastFireTime: number;
  fireTimer: number;
  spawnTimer: number;
  damageIndicators: DamageIndicator[];
  shake: number;
  critFlash: number;
  critFlashColor: string;
  currentBg: { r: number; g: number; b: number };
  lastTime: number;

  levelUpFreeze: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldownTimer: number;
  dashTrail: { x: number; y: number }[];
  dashTrailAccumulator: number;
  isGameOverTriggered: boolean; // Prevents multiple game over calls
  lastHeartbeatTime: number;

  // Double Dash system
  doubleDashQueued: boolean; // Player pressed dash again during active dash
  doubleDashUsed: boolean; // Track if double dash was used (for extended cooldown)
  dashHaloOpacity: number; // Visual halo effect during dash window

  // Hit Stop (freeze frame on impact)
  hitStopTimer: number; // Remaining freeze time in ms

  // Squash & Stretch (player animation)
  playerScaleX: number; // Horizontal scale (1.0 = normal)
  playerScaleY: number; // Vertical scale (1.0 = normal)

  // Near Miss Tension
  nearMissTimer: number; // Timer for slow-mo effect
  nearMissCooldown: number; // Cooldown to prevent spam
}
