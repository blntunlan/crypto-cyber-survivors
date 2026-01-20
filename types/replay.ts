/**
 * Replay Event Types
 *
 * Types for the game event recording and replay verification system.
 * These events form a hash chain that can be verified server-side.
 */

// =============================================================================
// REPLAY EVENT TYPES
// =============================================================================

/**
 * Types of game events that can be recorded for replay
 */
export enum ReplayEventType {
  // Session lifecycle
  SESSION_START = 'SESSION_START',
  SESSION_END = 'SESSION_END',
  HEARTBEAT = 'HEARTBEAT',

  // Player actions
  PLAYER_MOVE = 'PLAYER_MOVE',
  PLAYER_SHOOT = 'PLAYER_SHOOT',
  PLAYER_DASH = 'PLAYER_DASH',

  // Level & Cards
  LEVEL_UP = 'LEVEL_UP',
  CARD_SELECT = 'CARD_SELECT',

  // Combat
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_KILL = 'ENEMY_KILL',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  DAMAGE_TAKEN = 'DAMAGE_TAKEN',

  // Collectibles
  XP_GAINED = 'XP_GAINED',
  GOLD_COLLECTED = 'GOLD_COLLECTED',
  GEM_COLLECTED = 'GEM_COLLECTED',
  BUFF_COLLECTED = 'BUFF_COLLECTED',

  // Market
  PRICE_UPDATE = 'PRICE_UPDATE',
  POSITION_CHANGE = 'POSITION_CHANGE',

  // Buffs
  BUFF_APPLIED = 'BUFF_APPLIED',
  BUFF_EXPIRED = 'BUFF_EXPIRED',
}

/**
 * Base interface for all replay events
 */
export interface ReplayEvent {
  /** Event type */
  type: ReplayEventType;
  /** Timestamp relative to session start (ms) */
  timestamp: number;
  /** Event-specific data */
  data: ReplayEventData;
  /** SHA-256 hash of previous event + this event */
  hash: string;
  /** Sequence number for ordering */
  sequence: number;
}

/**
 * Union type for all event data payloads
 */
export type ReplayEventData =
  | SessionStartData
  | SessionEndData
  | HeartbeatData
  | PlayerMoveData
  | PlayerShootData
  | LevelUpData
  | CardSelectData
  | EnemySpawnData
  | EnemyKillData
  | DamageData
  | XPGainedData
  | CollectibleData
  | PriceUpdateData
  | BuffData
  | Record<string, never>; // Empty data

// =============================================================================
// EVENT DATA INTERFACES
// =============================================================================

export interface SessionStartData {
  sessionId?: string; // Server-issued UUID
  pair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  playerNickname: string;
}

export interface SessionEndData {
  exitPrice: number;
  finalLevel: number;
  totalKills: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  survivalTimeMs: number;
  pnlPercent: number;
}

export interface HeartbeatData {
  playerX: number;
  playerY: number;
  playerHp: number;
  currentPrice: number;
  enemyCount: number;
}

export interface PlayerMoveData {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface PlayerShootData {
  targetX: number;
  targetY: number;
  bulletCount: number;
}

export interface LevelUpData {
  newLevel: number;
  totalXp: number;
}

export interface CardSelectData {
  cardId: string;
  cardName: string;
  rarity: string;
}

export interface EnemySpawnData {
  enemyId: string;
  enemyType: string;
  x: number;
  y: number;
}

export interface EnemyKillData {
  enemyId: string;
  enemyType: string;
  damage: number;
  xpValue: number;
}

export interface DamageData {
  amount: number;
  source: string;
  isCrit: boolean;
}

export interface XPGainedData {
  amount: number;
  source: string;
}

export interface CollectibleData {
  type: string;
  value: number;
  x: number;
  y: number;
}

export interface PriceUpdateData {
  price: number;
  change: number;
  pnlPercent: number;
}

export interface BuffData {
  buffName: string;
  duration: number;
}

// =============================================================================
// REPLAY METADATA
// =============================================================================

/**
 * Metadata about a recorded replay
 */
export interface ReplayMetadata {
  /** Unique replay ID */
  replayId: string;
  /** Session ID this replay belongs to */
  sessionId: string;
  /** Player ID */
  playerId: string;
  /** Session start time (ISO string) */
  startTime: string;
  /** Total duration in ms */
  durationMs: number;
  /** Total events recorded */
  eventCount: number;
  /** Final hash of the chain */
  finalHash: string;
  /** Compressed replay size in bytes */
  compressedSize: number;
  /** Game version */
  gameVersion: string;
}

/**
 * Final stats computed from replay
 */
export interface ReplayStats {
  level: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  xpGained: number;
  goldCollected: number;
  cardsSelected: string[];
  priceAtStart: number;
  priceAtEnd: number;
  pnlPercent: number;
}

/**
 * Verification result from server
 */
export interface ReplayVerificationResult {
  valid: boolean;
  reason?: string;
  discrepancies?: string[];
  replayHash?: string;
  verifiedAt?: string;
}
