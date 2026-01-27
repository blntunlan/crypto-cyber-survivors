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
  | 'playerHealed'
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
  | 'whaleTierChanged'
  | 'rsiStateChanged'
  | 'marketStateUpdated'
  | 'marketStateChanged'
  | 'whaleSpawned'
  | 'xpGained'
  | 'hitStop'
  | 'nearMiss'
  | 'verification:queued'
  | 'verification:processing'
  | 'verification:success'
  | 'verification:failed'
  | 'verification:retrying'
  | 'volatilityShock'
  | 'wavePhaseChange'
  | 'cycleComplete'
  | 'gameMarketUpdate'
  | 'marketDataRecovered'
  // Lootbox events
  | 'lootboxEarned'
  | 'lootboxOpening'
  | 'lootboxOpened'
  // Inventory events
  | 'inventoryItemAdded'
  | 'inventoryUpdated'
  | 'consumableUsed'
  | 'skinUnlocked'
  | 'skinEquipped'
  // Anti-cheat events
  | 'cheatDetected'
  | 'cheatWarning'
  | 'integrityCheckFailed'
  // Player events
  | 'playerDash'
  | 'gameNotification'
  // Session sync events
  | 'sessionSynced'
  | 'sessionSyncFailed'
  // Difficulty System V2 events
  | 'marketUpdate'
  | 'playerLevelUp'
  | 'playerHealthChange'
  | 'gameStart'
  | 'difficultyUpdated'
  | 'shockDetected'
  | 'liquidationWarning'
  | 'bossWaveStart'
  | 'bossWaveEnd'
  | 'cycleDecisionScreen'
  | 'cycleDecisionMade'
  | 'hudValuesUpdated'
  | 'marketReconnectRequest'
  | 'gameMarketEvent'
  | 'portalOpened'
  | 'portalClosed'
  | 'portalExtraction';

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
  /** Reason for game over: 'DEATH' (default), 'CASH_OUT', 'TIMEOUT' */
  reason?: 'DEATH' | 'CASH_OUT' | 'TIMEOUT';
}

/** Critical hit event data */
export interface CritHitEvent {
  damage: number;
  isSuperCrit: boolean;
  x: number;
  y: number;
  count?: number;
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

/** Player healed event data (lifesteal, regen, etc.) */
export interface PlayerHealedEvent {
  amount: number;
  x: number;
  y: number;
  source: 'lifesteal' | 'regen' | 'pickup' | 'card';
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
import { type WavePhase } from './metrics';
import { type MarketData } from '../types';

// ...

/** Game initialized event data */
export interface GameInitializedEvent {
  position: string;
  entryPrice: number;
  leverage: number;
  pair: CryptoPair;
  sessionId?: string; // Optional UUID from server
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

/** MarketState (imported dynamically to avoid circular deps or re-defined) */
export interface MarketStateData {
  pair: string;
  price: number;
  volume: number;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atr: number;
  atrPercent: number;
  spawnRateMultiplier: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: 0 | 1 | 2 | 3;
  enemyAggroMultiplier: number;
  updatedAt: Date;
}

/** Whale tier changed event data */
export interface WhaleTierChangedEvent {
  tier: 0 | 1 | 2 | 3;
  percentile: number;
}

/** RSI state changed event data */
export interface RSIStateChangedEvent {
  state: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  rsi: number;
  pair?: string;
}

/** Market state updated event data (full state) */
export type MarketStateUpdatedEvent = MarketStateData;

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

/** Hit stop event data (freeze frame on impact) */
export interface HitStopEvent {
  /** Duration of freeze in ms */
  duration: number;
  /** Whether this was a critical hit */
  isCrit: boolean;
}

/** Near miss event data (tension effect) */
export interface NearMissEvent {
  /** Source enemy type */
  enemyType: string;
}

// =============================================================================
// LOOTBOX EVENTS
// =============================================================================

import {
  type LootboxType,
  type LootboxRarity,
  type LootboxSource,
  type LootboxDrop,
  type CharacterSkinId,
  type ConsumableEffectType,
} from './lootbox';
import { type InventoryItemType } from './inventory';

/** Lootbox earned event data */
export interface LootboxEarnedEvent {
  profileId: string;
  boxType: LootboxType;
  rarity: LootboxRarity;
  source: LootboxSource;
}

/** Lootbox opening event data (animation start) */
export interface LootboxOpeningEvent {
  lootboxId: string;
  boxType: LootboxType;
}

/** Lootbox opened event data (result) */
export interface LootboxOpenedEvent {
  lootboxId: string;
  drop: LootboxDrop;
  isJackpot: boolean;
}

// =============================================================================
// INVENTORY EVENTS
// =============================================================================

/** Item added to inventory */
export interface InventoryItemAddedEvent {
  itemType: InventoryItemType;
  itemId: string;
  quantity: number;
}

/** Inventory updated */
export interface InventoryUpdatedEvent {
  itemType: InventoryItemType;
  itemId: string;
  action: 'add' | 'remove' | 'use' | 'unlock';
}

/** Consumable used */
export interface ConsumableUsedEvent {
  itemId: string;
  effectType: ConsumableEffectType;
  effectValue: number;
  duration?: number;
}

/** Skin unlocked */
export interface SkinUnlockedEvent {
  skinId: CharacterSkinId;
}

/** Skin equipped */
export interface SkinEquippedEvent {
  skinId: CharacterSkinId;
  previousSkinId: CharacterSkinId;
}

// =============================================================================
// ANTI-CHEAT EVENTS
// =============================================================================

/** Type of cheat detected */
export type CheatType =
  | 'DEVTOOLS_OPEN'
  | 'DEBUGGER_DETECTED'
  | 'MEMORY_TAMPER'
  | 'SPEED_HACK'
  | 'CONSOLE_MANIPULATION'
  | 'CODE_INJECTION'
  | 'NETWORK_MANIPULATION'
  | 'INDICATOR_DESYNC'
  | 'UNKNOWN';

/** Cheat detected event data */
export interface CheatDetectedEvent {
  /** Type of cheat detected */
  type: CheatType;
  /** When the cheat was detected */
  timestamp: number;
  /** Additional details about the detection */
  details?: string;
  /** Device fingerprint for tracking */
  fingerprint?: string;
  /** Severity level (1-10) */
  severity: number;
}

/** Cheat warning event data (soft detection) */
export interface CheatWarningEvent {
  /** Type of suspicious activity */
  type: CheatType;
  /** Warning message */
  message: string;
  /** How many warnings for this type */
  warningCount: number;
}

/** Integrity check failed event data */
export interface IntegrityCheckFailedEvent {
  /** Which value/system failed the check */
  target: string;
  /** Expected checksum/value */
  expected: string;
  /** Actual checksum/value */
  actual: string;
  /** When the check failed */
  timestamp: number;
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
  playerHealed: PlayerHealedEvent;
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
  // Deprecated: marketStateChanged: MarketStateChangedEvent;
  marketStateChanged: MarketStateChangedEvent;
  whaleSpawned: WhaleSpawnedEvent;
  whaleTierChanged: WhaleTierChangedEvent;
  rsiStateChanged: RSIStateChangedEvent;
  marketStateUpdated: MarketStateUpdatedEvent;
  xpGained: { amount: number };
  hitStop: HitStopEvent;
  nearMiss: NearMissEvent;
  'verification:queued': Record<string, unknown>;
  'verification:processing': Record<string, unknown>;
  'verification:success': Record<string, unknown>;
  'verification:failed': Record<string, unknown>;
  'verification:retrying': Record<string, unknown>;
  volatilityShock: { intensity: number; direction: 'up' | 'down' };
  wavePhaseChange: { phase: WavePhase; oldPhase: WavePhase };
  cycleComplete: { cycleNumber: number; totalElapsedSeconds: number };
  gameMarketUpdate: MarketData;
  marketDataRecovered: { pair: CryptoPair };
  // Lootbox events
  lootboxEarned: LootboxEarnedEvent;
  lootboxOpening: LootboxOpeningEvent;
  lootboxOpened: LootboxOpenedEvent;
  // Inventory events
  inventoryItemAdded: InventoryItemAddedEvent;
  inventoryUpdated: InventoryUpdatedEvent;
  consumableUsed: ConsumableUsedEvent;
  skinUnlocked: SkinUnlockedEvent;
  skinEquipped: SkinEquippedEvent;
  // Anti-cheat events
  cheatDetected: CheatDetectedEvent;
  cheatWarning: CheatWarningEvent;
  integrityCheckFailed: IntegrityCheckFailedEvent;
  playerDash: { duration: number; cooldown: number; isDoubleDash: boolean };
  gameNotification: NotificationEvent;
  // Session sync events
  sessionSynced: SessionSyncedEvent;
  sessionSyncFailed: SessionSyncFailedEvent;
  // Difficulty System V2 events
  marketUpdate: { pnlPercent?: number; price?: number };
  playerLevelUp: { level: number };
  playerHealthChange: { hpPercent: number };
  gameStart: { leverage?: number; position?: 'LONG' | 'SHORT'; entryPrice?: number };
  difficultyUpdated: Record<string, unknown>;
  shockDetected: { intensity: number; direction: 'up' | 'down' };
  liquidationWarning: {
    level: 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
    distance: number;
  };
  bossWaveStart: { cycleNumber: number };
  bossWaveEnd: { cycleNumber: number };
  cycleDecisionScreen: { cycleNumber: number; options: string[] };
  cycleDecisionMade: { decision: 'CONTINUE' | 'CASH_OUT'; cycleNumber: number };
  hudValuesUpdated: Record<string, number>;
  marketReconnectRequest: { pair?: string };
  gameMarketEvent: {
    type:
      | 'VOLUME_SPIKE'
      | 'PRICE_BREAKOUT'
      | 'WHALE_ALERT'
      | 'CONSOLIDATION'
      | 'FLASH_CRASH';
    intensity: number;
    durationMs: number;
  };
  portalOpened: { x: number; y: number; type: 'TAKE_PROFIT' | 'STOP_LOSS' };
  portalClosed: EmptyEvent;
  portalExtraction: { totalCoins: number; rawCoins: number; bonus: number };
}

export interface NotificationEvent {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/** Callback type for event handlers */
export type EventCallback<K extends GameEvent> = (data: EventDataMap[K]) => void;

// =============================================================================
// SESSION SYNC EVENTS
// =============================================================================

/** Session successfully synced to Supabase */
export interface SessionSyncedEvent {
  sessionId: string;
  profileId: string;
}

/** Session sync failed after retries */
export interface SessionSyncFailedEvent {
  sessionId: string;
  error: string;
  retryCount: number;
}
