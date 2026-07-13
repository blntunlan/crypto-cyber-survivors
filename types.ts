import { type CryptoPair } from './types/crypto';
export type { CryptoPair };
export type {
  RuntimePosition,
  RuntimeFeedSource,
  RuntimeConnectionState,
  RuntimeVersionInfo,
  MarketRunConstants,
  MarketRuntimeTick,
  MarketRuntimeSnapshot,
  MarketRuntimeFeedHealth,
  MarketRuntimeUpdatePayload,
} from './types/marketRuntime';

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
  normalizedVolume?: number;
  difficulty: number;
  pair?: CryptoPair;
  symbol?: string; // e.g. 'BTCUSDT'
  momentum: number; // Market momentum for parallax drift
  // Server-synced indicators
  atrPercent?: number; // ATR as percentage of price (from server)
  whaleTier?: 0 | 1 | 2 | 3;
  spawnRateMultiplier?: number;
  enemyDamage?: number;
  enemySpeed?: number;
  gemValueMultiplier?: number;
  // Runtime contract metadata (phase-0/1 compatibility layer)
  runtimeRunId?: string;
  runtimeSeq?: number;
  runtimeChecksum?: string;
  runtimeTickHash?: string;
  algoVersion?: string;
  configVersion?: string;
}

export interface Entity {
  active: boolean; // For Pooling
  poolIndex?: number; // Internal tracking for O(1) release
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
  hp: number;
  maxHp: number;
  invulnerabilityTimer: number; // For I-Frames
  dashCooldownMultiplier?: number;
  expMultiplier?: number;
  pnl?: number;
  score?: number;
}

// Note: UpgradeOption removed - now using Card from CardSystem

import { type EnemyId } from './config/EnemyRegistry';

export type EnemyIntent =
  | 'fodder'
  | 'pressure'
  | 'counter'
  | 'ranged'
  | 'elite'
  | 'boss'
  | 'reward';

export type EnemyCombatRole = 'contact' | 'ranged' | 'hybrid';

export interface Enemy extends Entity {
  speed: number;
  health: number;
  maxHealth: number;
  damage: number;
  type: EnemyId;
  id?: string;
  valueMultiplier?: number;
  // Dynamic enemy response metadata. Current enemies still deal contact damage;
  // future projectile enemies can consume canShoot/shoot* fields directly.
  intent?: EnemyIntent;
  combatRole?: EnemyCombatRole;
  powerTier?: number;
  canShoot?: boolean;
  shootCooldownMs?: number;
  shootRange?: number;
  projectileSpeed?: number;
  projectileDamage?: number;
  // Death animation
  isDying?: boolean;
  deathProgress?: number;
  hasTriggeredNearMiss?: boolean;
  spawnTimer?: number;
  hasEnteredScreen?: boolean;
  // Damage buffering for stacked numbers
  damageBuffer?: number;
  damageBufferTimer?: number;
  hitFlashTimer?: number;
  hitImpactTimer?: number;
  hitRecoilX?: number;
  hitRecoilY?: number;
  damageBufferIsCrit?: boolean;
  damageBufferIsSuperCrit?: boolean;
  damageBufferCritCount?: number; // Number of crits in this stack
  // RSI-based metadata
  visualStyle?: 'friendly' | 'neutral' | 'aggressive';
  dropBuffChance?: number;
  dropDebuffChance?: number;
  // Gatekeeper specifics
  orbitPoint?: { x: number; y: number };
  orbitAngle?: number;
  // Elite enemy metadata
  isElite?: boolean;
  eliteAbility?: string;
  // Whale tier (1=BABY_WHALE, 2=WHALE, 3=MEGA_WHALE) — set by PoolManager
  whaleTier?: number;
}

export interface BulletTrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface BulletTrailBuffer {
  x: Float32Array;
  y: Float32Array;
  age: Float32Array;
  head: number;
  count: number;
}

export type BulletPhase =
  | 'flight'
  | 'return'
  | 'detonate'
  | 'shockwave'
  | 'charge'
  | 'fire'
  | 'cooldown';

export interface Bullet extends Entity {
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  isSuperCrit?: boolean;
  // --- Phase 0 VFX scaffolding (optional; all default-undefined & non-breaking) ---
  /** Weapon that spawned this bullet; drives per-weapon visual dispatch. */
  weaponId?: string;
  /** Elapsed lifetime in ms, updated by motion/physics systems that need it. */
  age?: number;
  /** Maximum lifetime in ms; bullet despawns once `age >= maxAge`. */
  maxAge?: number;
  /** Ring of past positions for trail rendering. */
  trail?: BulletTrailBuffer | BulletTrailPoint[];
  /** Spawn origin (used by boomerang to compute return path). */
  spawnX?: number;
  spawnY?: number;
  /** Fixed target anchor for arcing/splash weapons. */
  targetX?: number;
  targetY?: number;
  /** Side of a curved projectile arc. */
  curveSign?: number;
  /** Orbit shield metadata. */
  isOrbiter?: boolean;
  orbitAngle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  /** Phased weapons (laser / nuke). */
  phase?: BulletPhase;
  phaseMs?: number;
  /** Nuke shockwave metadata. */
  shockwaveRadius?: number;
  shockwaveMaxRadius?: number;
  /** Laser beam metadata. */
  beamAngle?: number;
  beamLength?: number;
  /** Tracks which enemies have already been hit by this projectile/shockwave. */
  hitSet?: Set<string | number>;
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

export interface ImpactRing extends Entity {
  startRadius: number;
  maxRadius: number;
  life: number;
  lineWidth: number;
}

export interface Gem extends Entity {
  value: number;
  isRare?: boolean;
  magnetized?: boolean;
  vx?: number;
  vy?: number;
  elapsedLifetime?: number;
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
  vx?: number;
  vy?: number;
  isCrit?: boolean;
}

export interface Candle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  speed: number;
  layer: 1 | 2 | 3; // 1: Back, 2: Mid, 3: Front
  z?: number; // Normalized depth (0-1)
}

export interface Interactable extends Entity {
  type: 'MINING_RIG' | 'LOOT_CRATE' | 'GAS_STATION';
  health: number;
  maxHealth: number;
  isHit?: boolean; // Visual feedback
  hitTimer?: number;
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
  bgUpdateFrameCounter: number; // Frame counter for background optimization

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
  playerRotation: number; // Rotation angle in radians for squash/stretch

  // Near Miss Tension
  nearMissTimer: number; // Timer for slow-mo effect
  nearMissCooldown: number; // Cooldown to prevent spam

  // Market Visuals
  rsiVisualState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  whaleEventTimer: number; // For whale spawn splash/shake effect
  targetBg: { r: number; g: number; b: number }; // Reusable object for background color updates
  interactableSpawnTimer: number; // Timer for lootbox generation

  // Market Indicators for Visuals
  atrPercent: number; // Current volatility (0-100+)
  spawnRateMultiplier: number; // Server-provided multiplier
  marketPosition: MarketPosition;

  // Animation metadata
  isMoving: boolean;
  lastMoveX: number; // -1 for Left, 1 for Right
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'survival' | 'trading' | 'misc';
  iconKey?: string;
  conditionType: 'total_kills' | 'survival_seconds' | 'max_level' | 'pnl_percent';
  conditionValue: number;
  rewardGold: number;
  isActive: boolean;
}

export interface ProfileAchievement {
  id: string; // UUID of the record
  profileId: string;
  achievementId: string;
  unlockedAt: string; // ISO Date
  formattedDate?: string; // Helper for UI
}
