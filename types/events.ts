/**
 * Event Types - Strongly typed event definitions
 *
 * All game events are defined here with their payload types.
 * This provides type-safety across the entire event system.
 */

// =============================================================================
// EVENT NAMES
// =============================================================================

export type GameEvent =
  | 'enemyKilled'
  | 'gemCollected'
  | 'levelUp'
  | 'levelUpComplete'
  | 'gameOver'
  | 'critHit'
  | 'playerHit'
  | 'bulletFired'
  | 'killAll'
  | 'comboUpdate'
  | 'comboMilestone'
  | 'comboEnd'
  | 'levelUpStart'
  | 'milestoneAchieved'
  | 'gameReset'
  | 'beforeReset'
  | 'afterReset'
  | 'gameInitialized'
  | 'settingsUpdate'
  | 'buffApplied'
  | 'buffExpired'
  | 'buffGemSpawned'
  | 'buffGemCollected'
  | 'marketDataTimeout'
  | 'marketStateChanged'
  | 'whaleSpawned'
  | 'verification:queued'
  | 'verification:processing'
  | 'verification:success'
  | 'verification:failed'
  | 'verification:retrying';

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

/** Enemy killed event data */
export interface EnemyKilledEvent {
  x: number;
  y: number;
  type?: string;
  isCrit?: boolean;
}

/** Gem collected event data */
export interface GemCollectedEvent {
  value: number;
  isRare: boolean;
}

/** Level up event data */
export interface LevelUpEvent {
  level: number;
}

/** Level up complete event data */
export interface LevelUpCompleteEvent {
  newLevel: number;
}

/** Game over event data */
export interface GameOverEvent {
  finalLevel: number;
  finalPnl: number;
}

/** Critical hit event data */
export interface CritHitEvent {
  damage: number;
  isSuperCrit: boolean;
  x: number;
  y: number;
}

/** Player hit event data */
export interface PlayerHitEvent {
  damage: number;
  remainingHp: number;
}

/** Bullet fired event data */
export interface BulletFiredEvent {
  x: number;
  y: number;
}

/** Combo update event data */
export interface ComboUpdateEvent {
  killStreak: number;
  multiplier: number;
  totalBonusXp: number;
}

/** Combo milestone event data */
export interface ComboMilestoneEvent {
  name: string;
  kills: number;
  multiplier: number;
  color: string;
  sound?: string; // Optional - may be undefined when on cooldown
}

/** Combo end event data */
export interface ComboEndEvent {
  finalStreak: number;
  bonusXp: number;
}

/** Milestone achieved event data */
export interface MilestoneAchievedEvent {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
  threshold: number;
}

import { type CryptoPair } from './crypto';

// ...

/** Game initialized event data */
export interface GameInitializedEvent {
  position: string;
  entryPrice: number;
  leverage: number;
  pair: CryptoPair;
}

/** Empty event (no payload) */
export type EmptyEvent = Record<string, never>;

/** Settings update event data */
export type SettingsUpdateEvent = Record<string, unknown>;

/** Buff applied event data */
export interface BuffAppliedEvent {
  name: string;
  icon: string;
  duration: number; // ms, -1 = permanent
}

/** Buff expired event data */
export interface BuffExpiredEvent {
  name: string;
}

/** Buff gem spawned event data */
export interface BuffGemSpawnedEvent {
  type: string;
  x: number;
  y: number;
  isDebuff: boolean;
}

/** Buff gem collected event data */
export interface BuffGemCollectedEvent {
  type: string;
  decoratorClass: string;
}

/** Market data timeout event data */
export interface MarketDataTimeoutEvent {
  lastPriceTime: number | null;
  disconnectedDuration: number; // ms
  pair: string;
}

/** Market state changed event data (indicator system) */
export interface MarketStateChangedEvent {
  /** Normalized volume (0-1) */
  normalizedVolume: number;
  /** Current RSI value (0-100) */
  rsi: number;
  /** RSI state: OVERSOLD | NEUTRAL | OVERBOUGHT */
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  /** Spawn rate multiplier from ATR */
  spawnRateMultiplier: number;
  /** Whether current market favors player position */
  isFavorable: boolean;
  /** Player's current position */
  position: 'LONG' | 'SHORT';
}

/** Whale spawned event data */
export interface WhaleSpawnedEvent {
  /** Whale tier (1=Baby, 2=Normal, 3=Mega) */
  tier: number;
  /** Spawn X position */
  x: number;
  /** Spawn Y position */
  y: number;
  /** Health multiplier applied */
  healthMultiplier: number;
  /** Size multiplier applied */
  sizeMultiplier: number;
}

// =============================================================================
// EVENT DATA MAP
// =============================================================================

/**
 * Maps event names to their payload types.
 * Used by EventBus for type-safe emit and subscribe.
 */
export interface EventDataMap {
  enemyKilled: EnemyKilledEvent;
  gemCollected: GemCollectedEvent;
  levelUp: LevelUpEvent;
  levelUpComplete: LevelUpCompleteEvent;
  gameOver: GameOverEvent;
  critHit: CritHitEvent;
  playerHit: PlayerHitEvent;
  bulletFired: BulletFiredEvent;
  killAll: EmptyEvent;
  comboUpdate: ComboUpdateEvent;
  comboMilestone: ComboMilestoneEvent;
  comboEnd: ComboEndEvent;
  levelUpStart: EmptyEvent;
  milestoneAchieved: MilestoneAchievedEvent;
  gameReset: EmptyEvent;
  beforeReset: EmptyEvent;
  afterReset: EmptyEvent;
  gameInitialized: GameInitializedEvent;
  settingsUpdate: SettingsUpdateEvent;
  buffApplied: BuffAppliedEvent;
  buffExpired: BuffExpiredEvent;
  buffGemSpawned: BuffGemSpawnedEvent;
  buffGemCollected: BuffGemCollectedEvent;
  marketDataTimeout: MarketDataTimeoutEvent;
  marketStateChanged: MarketStateChangedEvent;
  whaleSpawned: WhaleSpawnedEvent;
  'verification:queued': Record<string, unknown>;
  'verification:processing': Record<string, unknown>;
  'verification:success': Record<string, unknown>;
  'verification:failed': Record<string, unknown>;
  'verification:retrying': Record<string, unknown>;
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/** Callback type for event handlers */
export type EventCallback<K extends GameEvent> = (data: EventDataMap[K]) => void;
