/**
 * Event Types - Strongly typed event definitions
 *
 * All game events are defined here with their payload types.
 * This provides type-safety across the entire event system.
 */

import { type MarketData } from '../types.ts';
import { type CryptoPair } from './crypto';
import {
  type MarketRuntimeTick,
  type MarketRuntimeSnapshot,
  type MarketRuntimeFeedHealth,
  type MarketRuntimeUpdatePayload,
} from './marketRuntime';
import {
  type CanonicalMarketFrame,
  type CanonicalMarketPayload,
} from './marketCanonical';
import {
  type LootboxType,
  type LootboxRarity,
  type LootboxSource,
  type LootboxDrop,
  type CharacterSkinId,
  type ConsumableEffectType,
} from './lootbox';
import {
  type LootCacheDebugMode,
  type LootCacheRarity,
  type LootCacheRewardId,
  type LootCacheSource,
} from './lootCache';
import { type InventoryItemType } from './inventory';
import { type WeaponId } from './weapons';
import { type TutorialPhase } from './tutorial';
import { type RuntimeDifficultySnapshot } from './runtimeDifficulty';

export type DifficultySnapshotCommittedEvent = {
  snapshot: RuntimeDifficultySnapshot;
};

export type DifficultyRunInitializedEvent = {
  runId: string;
  seed: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
};

// =============================================================================
// EVENT NAMES
// =============================================================================

export type EventScope = 'ui' | 'gameplay' | 'system' | 'debug';

export type GameEvent =
  | 'enemyKilled'
  | 'enemySpawned'
  | 'gemCollected'
  | 'levelUp'
  | 'levelUpComplete'
  | 'gameOver'
  | 'critHit'
  | 'enemyDamaged'
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
  | 'marketTimeoutWarning'
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
  | 'cycleComplete'
  | 'gameMarketUpdate'
  | 'marketDataRecovered'
  | 'marketRuntimeTick'
  | 'marketRuntimeSnapshot'
  | 'marketRuntimeFeedHealth'
  | 'marketRuntimeUpdate'
  // Lootbox events
  | 'lootboxEarned'
  | 'lootboxOpening'
  | 'lootboxOpened'
  | 'lootCacheSpawned'
  | 'lootCacheOpened'
  | 'cosmeticFragmentEarned'
  | 'debugLootCacheSpawnRequested'
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
  | 'playerExperienceChange'
  | 'playerHealthChange'
  | 'gameStart'
  | 'difficultyRunInitialized'
  | 'difficultySnapshotCommitted'
  | 'difficultyUpdated'
  | 'shockDetected'
  | 'liquidationWarning'
  | 'secondElapsed'
  | 'fpsUpdated'
  | 'cycleDecisionScreen'
  | 'cycleDecisionMade'
  | 'cashOutOfferOpened'
  | 'cashOutOfferQuoteFailed'
  | 'cashOutDecisionCommitted'
  | 'hudValuesUpdated'
  | 'marketReconnectRequest'
  | 'marketConnectionStateChanged'
  | 'marketDataFallback'
  | 'marketReconnectAttempt'
  | 'gameMarketEvent'
  | 'portalOpened'
  | 'portalClosed'
  | 'portalExtraction'
  | 'gameplayValidation'
  // Railway health events
  | 'railwayHealthCheck'
  | 'railwayConnectionLost'
  | 'railwayConnectionRestored'
  // Twitter auth events
  | 'twitterLoginSuccess'
  | 'twitterUnlinked'
  // AI Director / Optimization events
  | 'playerRespawn'
  | 'optimizationProgress'
  | 'trainingProgress'
  | 'directorParamsUpdated'
  | 'optimizationComplete'
  | 'directorAutoTuned'
  | 'directorDecision'
  | 'strategicLayerUpdate'
  | 'tacticalLayerUpdate'
  | 'flowStateChanged'
  | 'directorBlendedOutput'
  | 'clientIndicatorsUpdated'
  | 'portalEntered'
  | 'portalRejected'
  | 'portalMissed'
  // Market / Gameplay interaction events
  | 'visualOverlay'
  | 'spawnBoss'
  | 'playerModifierApplied'
  | 'playerModifierRemoved'
  | 'marketFlowInfluence'
  // Price Momentum Engine events
  | 'priceMomentumUpdate'
  // Consolidated market event (Step 3)
  | 'canonicalMarketUpdate'
  | 'canonicalMarketFrame'
  // Railway auth events
  | 'authStateChanged'
  // Market Event Announcements
  | 'marketAnnouncement'
  // Elite enemy events
  | 'eliteAbilityActivated'
  | 'eliteChainExplosion'
  | 'eliteSpawned'
  // Weapon System events
  | 'weaponAcquired'
  | 'weaponUpgraded'
  | 'weaponEvolution'
  | 'weaponFired'
  // Meta Progression events
  | 'metaUpgradePurchased'
  | 'metaCoinsTransferred'
  | 'metaStateLoaded'
  // Challenge events
  | 'challengeObjectiveUpdate'
  | 'challengeCompleted'
  | 'challengeStarted'
  // Replay events
  | 'replaySaved'
  | 'replayLoaded'
  | 'replayTick'
  // Tutorial lifecycle events
  | 'tutorialStarted'
  | 'tutorialStepChanged'
  | 'tutorialActionCompleted'
  | 'tutorialCompleted'
  | 'tutorialSkipped';

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

/** Enemy killed event data */
export interface EnemyKilledEvent {
  x: number;
  y: number;
  type?: string;
  enemyType?: string; // Legacy/Compat
  enemyId?: string;
  coinDrop?: number;
  isCrit?: boolean;
}

/** Enemy spawned event data — emitted by SpawnSystem on every spawn */
export interface EnemySpawnedEvent {
  /** Per-spawn instance id (monotonic counter assigned by SpawnSystem) */
  spawnId: number;
  /** Enemy type id from EnemyRegistry */
  enemyType: string;
  x: number;
  y: number;
  isElite?: boolean;
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
  /** Reason for game over: 'DEATH' (default), 'CASH_OUT', 'TIMEOUT', 'DISCONNECT' */
  reason?: 'DEATH' | 'CASH_OUT' | 'TIMEOUT' | 'DISCONNECT';
}

/** Critical hit event data */
export interface CritHitEvent {
  damage: number;
  isSuperCrit: boolean;
  x: number;
  y: number;
  count?: number;
}

/** Enemy damaged event data */
export interface EnemyDamagedEvent {
  damage: number;
  remainingHp: number;
  maxHp: number;
  x: number;
  y: number;
  enemyId?: string;
  enemyType: string;
  isCrit: boolean;
  isSuperCrit: boolean;
}

/** Player hit event data */
export interface PlayerHitEvent {
  damage: number;
  remainingHp: number;
  sourceX?: number;
  sourceY?: number;
  enemyType?: string;
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
  /** Resolved English fallback name (used when no locale entry exists) */
  name: string;
  /** i18n key under `milestones.*`, translated by the announcer */
  nameKey?: string;
  nameParams?: Record<string, string | number>;
  icon: string;
  color: string;
  type: string;
  threshold: number;
  severity?: 'celebration' | 'danger';
  sound?: 'glint' | 'tension';
}

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
  reason?: 'market_timeout';
}

/** Market timeout warning event data */
export interface MarketTimeoutWarningEvent {
  level: 'warning' | 'critical';
  remainingMs: number;
  disconnectedDuration: number;
}

export type MarketRuntimeTickEvent = MarketRuntimeTick;
export type MarketRuntimeSnapshotEvent = MarketRuntimeSnapshot;
export type MarketRuntimeFeedHealthEvent = MarketRuntimeFeedHealth;
export type MarketRuntimeUpdateEvent = MarketRuntimeUpdatePayload;

/**
 * Transitional market update payload.
 * Legacy listeners can keep using `price`/`pnlPercent`,
 * while runtime-aware listeners can switch to `tick`/`snapshot`.
 */
export interface MarketUpdateEvent {
  pnlPercent?: number;
  price?: number;
  runId?: string;
  seq?: number;
  tick?: MarketRuntimeTickEvent;
  snapshot?: MarketRuntimeSnapshotEvent;
  algoVersion?: string;
  configVersion?: string;
}

/** Client-side indicators updated event (AI Director V2) */
export interface ClientIndicatorsUpdatedEvent {
  /** Current RSI value (0-100) */
  rsi: number;
  /** RSI state: OVERSOLD | NEUTRAL | OVERBOUGHT */
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  /** ATR as percentage of price */
  atrPercent: number;
  /** ATR-derived spawn rate multiplier (0.5x-2.0x) */
  spawnRateMultiplier?: number;
  /** Normalized volume (0-1) */
  normalizedVolume: number;
  /** Price change % in last 60s */
  priceChangePercent: number;
  /** Trend strength (0-1) */
  trendStrength: number;
  /** Trend direction */
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  /** MACD values */
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  /** Whale tier (0=none, 1=baby, 2=normal, 3=mega) */
  whaleTier: 0 | 1 | 2 | 3;
}

/** Flow state changed event (AI Director V2) */
export interface FlowStateChangedEvent {
  /** Previous flow state */
  previousState: 'bored' | 'flow' | 'stressed';
  /** New flow state */
  newState: 'bored' | 'flow' | 'stressed';
  /** Current engagement score (0-1) */
  engagementScore: number;
  /** Current frustration score (0-1) */
  frustrationScore: number;
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

/** Price momentum update event data (PriceMomentumEngine) */
export interface PriceMomentumUpdateEvent {
  /** Current momentum phase */
  phase: 'STAGNANT' | 'DRIFTING' | 'TRENDING' | 'SURGING' | 'CRASHING';
  /** Current intensity (0-1) */
  intensity: number;
  /** Price direction */
  direction: 'up' | 'down' | 'flat';
  /** Suggested music BPM */
  suggestedBPM: number;
  /** Whether current direction is favorable for player's position */
  isFavorable: boolean;
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
// ELITE ENEMY EVENTS
// =============================================================================

/** Elite ability activated event data */
export interface EliteAbilityActivatedEvent {
  /** Which elite ability was triggered */
  type: string;
  /** X position of the activation */
  x: number;
  /** Y position of the activation */
  y: number;
}

/** Elite chain explosion event data */
export interface EliteChainExplosionEvent {
  /** Explosion center X */
  x: number;
  /** Explosion center Y */
  y: number;
  /** Explosion radius */
  radius: number;
  /** Explosion damage */
  damage: number;
  /** Number of active enemies damaged by the explosion */
  damagedCount?: number;
}

/** Elite enemy spawned event data */
export interface EliteSpawnedEvent {
  /** Enemy type that became elite */
  type: string;
  /** Spawn X position */
  x: number;
  /** Spawn Y position */
  y: number;
}

/** Hit stop event data (freeze frame on impact) */
export interface HitStopEvent {
  /** Duration of freeze in ms */
  duration: number;
  /** Whether this was a critical hit */
  isCrit: boolean;
  /** Whether this hit was a super critical hit */
  isSuperCrit?: boolean;
}

/** Near miss event data (tension effect) */
export interface NearMissEvent {
  /** Source enemy type */
  enemyType: string;
  /** Gap between collision radius and enemy position, in pixels */
  distance?: number;
  /** Optional reward hook for future near-miss bonuses */
  bonusXp?: number;
}

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
// GAMEPLAY VALIDATION EVENTS
// =============================================================================

/** Validation issue severity */
export type ValidationSeverity = 'warning' | 'error' | 'critical';

/** Validation category */
export type ValidationCategory =
  | 'player'
  | 'market'
  | 'enemy'
  | 'gem'
  | 'ui'
  | 'state'
  | 'performance';

/** Individual validation issue */
export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  field?: string;
  expected?: unknown;
  actual?: unknown;
  autoFixed: boolean;
  timestamp: number;
}

/** Gameplay validation event data */
export interface GameplayValidationEvent {
  issues: ValidationIssue[];
  fixedCount: number;
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
  enemySpawned: EnemySpawnedEvent;
  gemCollected: GemCollectedEvent;
  levelUp: LevelUpEvent;
  levelUpComplete: LevelUpCompleteEvent;
  gameOver: GameOverEvent;
  critHit: CritHitEvent;
  enemyDamaged: EnemyDamagedEvent;
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
  playerRespawn: EmptyEvent;
  optimizationProgress: { progress: number; iteration?: number; total?: number };
  trainingProgress: {
    episode: number;
    totalEpisodes: number;
    avgReward: number;
    bestReward: number;
    flowRatio: number;
    progress?: number;
  };
  directorParamsUpdated: { params: unknown };
  buffApplied: BuffAppliedEvent;
  buffExpired: BuffExpiredEvent;
  buffGemSpawned: BuffGemSpawnedEvent;
  buffGemCollected: BuffGemCollectedEvent;
  marketDataTimeout: MarketDataTimeoutEvent;
  marketTimeoutWarning: MarketTimeoutWarningEvent;
  // Deprecated: marketStateChanged: MarketStateChangedEvent;
  marketStateChanged: MarketStateChangedEvent;
  clientIndicatorsUpdated: ClientIndicatorsUpdatedEvent;
  flowStateChanged: FlowStateChangedEvent;
  whaleSpawned: WhaleSpawnedEvent;
  directorBlendedOutput: {
    flowState: string;
    interventionActive: boolean;
    blendFactor: number;
    spawnRate: number;
  };
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
  volatilityShock: {
    intensity: number;
    direction: 'up' | 'down' | 'none';
    isHighLeverage: boolean;
  };
  cycleComplete: { cycleNumber: number; totalElapsedSeconds: number };
  gameMarketUpdate: MarketData;
  marketDataRecovered: { pair: CryptoPair };
  marketRuntimeTick: MarketRuntimeTickEvent;
  marketRuntimeSnapshot: MarketRuntimeSnapshotEvent;
  marketRuntimeFeedHealth: MarketRuntimeFeedHealthEvent;
  marketRuntimeUpdate: MarketRuntimeUpdateEvent;
  // Lootbox events
  lootboxEarned: LootboxEarnedEvent;
  lootboxOpening: LootboxOpeningEvent;
  lootboxOpened: LootboxOpenedEvent;
  lootCacheSpawned: {
    cacheId: number;
    rarity: LootCacheRarity;
    x: number;
    y: number;
    source: LootCacheSource;
  };
  lootCacheOpened: {
    cacheId: number;
    rarity: LootCacheRarity;
    primaryReward: LootCacheRewardId;
    secondaryReward: LootCacheRewardId | null;
    x: number;
    y: number;
    elapsedSeconds: number;
    source: LootCacheSource;
  };
  cosmeticFragmentEarned: {
    amount: number;
    rarity: LootCacheRarity;
    elapsedSeconds: number;
    source: 'runtime';
  };
  debugLootCacheSpawnRequested: { mode: LootCacheDebugMode };
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
  marketUpdate: MarketUpdateEvent;
  playerExperienceChange: { exp: number; nextLevelExp: number; expPercent: number };
  playerHealthChange: { hpPercent: number; hp: number; maxHp: number };
  gameStart: { leverage?: number; position?: 'LONG' | 'SHORT'; entryPrice?: number };
  difficultyRunInitialized: DifficultyRunInitializedEvent;
  difficultySnapshotCommitted: DifficultySnapshotCommittedEvent;
  difficultyUpdated: {
    trendAlignment?: string;
    lootboxDropChance?: number;
    sourceSnapshotRevision: number;
    [key: string]: unknown;
  };
  shockDetected: {
    intensity: number;
    direction: 'up' | 'down';
    sourceSnapshotRevision: number;
  };
  liquidationWarning: {
    level: 'NONE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
    distance: number;
    distanceToLiquidation?: number;
    effectivePnl?: number;
    fovReduction?: number;
    sourceSnapshotRevision: number;
  };
  secondElapsed: { totalSeconds: number };
  fpsUpdated: { avgFps: number };
  cycleDecisionScreen: { cycleNumber: number; options: string[] };
  cycleDecisionMade: { decision: 'CONTINUE' | 'CASH_OUT'; cycleNumber: number };
  cashOutOfferOpened: { cycleNumber: number };
  cashOutOfferQuoteFailed: { cycleNumber: number };
  cashOutDecisionCommitted: {
    sessionId: string;
    quoteId: string;
    canonicalSequence: number;
    decision: 'accept' | 'reject' | 'safe_exit' | 'timeout';
    greedLevel: number;
  };
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
  portalOpened: {
    x: number;
    y: number;
    type: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';
    portalNumber: number;
    reason: string;
    isForced: boolean;
  };
  portalClosed: {
    type: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';
    portalNumber: number;
  };
  portalMissed: {
    type: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';
    portalNumber: number;
    consequence?: 'game_over' | 'penalty';
  };
  portalRejected: {
    rejectionCount: number;
    spawnRateMultiplier: number;
    speedMultiplier: number;
  };
  portalEntered: {
    type: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED';
    portalNumber: number;
    pnlPercent: number;
  };
  portalExtraction: {
    totalCoins: number;
    rawCoins: number;
    bonus: number;
    // RewardPayload fields (optional for backward compat)
    kills?: number;
    level?: number;
    survivalSeconds?: number;
    pnlPercent?: number;
    maxStreak?: number;
    exitType?: 'portal' | 'death' | 'afk_death' | 'cycle_complete';
    portalType?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'FLOW_EXIT' | 'FORCED' | null;
    enemyDropCoins?: number;
  };
  marketConnectionStateChanged: {
    state: 'connected' | 'degraded' | 'disconnected' | 'reconnecting';
  };
  marketDataFallback: {
    lastRealData: unknown;
    usingDefaults: boolean;
  };
  marketReconnectAttempt: { attempt: number };

  // Market Event Mapper V2 events
  visualOverlay: {
    effect: 'none' | 'red_flash' | 'green_pulse' | 'blue_calm' | 'purple_chaos';
    intensity: number;
    durationMs: number;
  };
  spawnBoss: { type: string; tier: number };
  playerModifierApplied: {
    source: string;
    speedMultiplier: number;
    damageMultiplier: number;
    defenseMultiplier: number;
    durationMs: number;
  };
  playerModifierRemoved: { source: string };
  marketFlowInfluence: {
    stressChange: number;
    engagementChange: number;
    source: string;
  };
  // Gameplay validation events
  gameplayValidation: GameplayValidationEvent;
  // Railway health events
  railwayHealthCheck: RailwayHealthCheckEvent;
  railwayConnectionLost: { error: string; timestamp: string };
  railwayConnectionRestored: { latencyMs: number; timestamp: string };
  // Twitter auth events
  twitterLoginSuccess: { username: string; displayName: string };
  twitterUnlinked: Record<string, never>;
  // AI Director / Optimization events
  optimizationComplete: { bestParams: unknown; bestScore: number };
  directorAutoTuned: { improvement: number; newScore: number };
  directorDecision: {
    spawnRate: number;
    flowState: string;
    interventions: string[];
  };
  strategicLayerUpdate: {
    difficultyMultiplier: number;
    error: number;
    integral: number;
    derivative: number;
  };
  tacticalLayerUpdate: {
    chaosLevel: string;
    marketMood: string;
    enemyBias: string;
  };
  // Price Momentum Engine
  priceMomentumUpdate: PriceMomentumUpdateEvent;
  // Consolidated market event (Step 3)
  canonicalMarketUpdate: CanonicalMarketPayload;
  canonicalMarketFrame: Readonly<CanonicalMarketFrame>;
  // Railway auth state change event
  authStateChanged: AuthStateChangedEvent;
  // Market Event Announcements
  marketAnnouncement: MarketAnnouncementEvent;
  // Elite enemy events
  eliteAbilityActivated: EliteAbilityActivatedEvent;
  eliteChainExplosion: EliteChainExplosionEvent;
  eliteSpawned: EliteSpawnedEvent;
  // Weapon System events
  weaponAcquired: WeaponAcquiredEvent;
  weaponUpgraded: WeaponUpgradedEvent;
  weaponEvolution: WeaponEvolutionEvent;
  weaponFired: WeaponFiredEvent;
  // Meta Progression events
  metaUpgradePurchased: MetaUpgradePurchasedEvent;
  metaCoinsTransferred: MetaCoinsTransferredEvent;
  metaStateLoaded: MetaStateLoadedEvent;
  // Challenge events
  challengeObjectiveUpdate: ChallengeObjectiveUpdateEvent;
  challengeCompleted: ChallengeCompletedEvent;
  challengeStarted: ChallengeStartedEvent;
  // Replay events
  replaySaved: ReplaySavedEvent;
  replayLoaded: ReplayLoadedEvent;
  replayTick: ReplayTickEvent;
  // Tutorial lifecycle events
  tutorialStarted: TutorialStartedEvent;
  tutorialStepChanged: TutorialStepChangedEvent;
  tutorialActionCompleted: TutorialActionCompletedEvent;
  tutorialCompleted: TutorialCompletedEvent;
  tutorialSkipped: TutorialSkippedEvent;
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

/** Session successfully synced to Railway */
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

/** Railway health check result event */
export interface RailwayHealthCheckEvent {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  recommendations: string[];
}

/** Market event announcement data */
export interface MarketAnnouncementEvent {
  type: string;
  message: string;
  color: string;
  icon: string;
  duration: number;
  priority: number;
}

/** Auth state changed event (Railway Auth) */
export interface AuthStateChangedEvent {
  type:
    | 'signIn'
    | 'signOut'
    | 'signUp'
    | 'tokenRefreshed'
    | 'userUpdated'
    | 'passwordRecovery';
  user: unknown | null;
  session?: unknown | null;
}

// =============================================================================
// WEAPON SYSTEM EVENTS
// =============================================================================

export interface WeaponAcquiredEvent {
  weaponId: string;
  slot: number;
}

export interface WeaponUpgradedEvent {
  weaponId: string;
  newLevel: number;
}

export interface WeaponEvolutionEvent {
  from: [string, string];
  to: string;
}

export interface WeaponFiredEvent {
  weaponId: WeaponId;
  x: number;
  y: number;
  damage: number;
  level?: number;
}

// =============================================================================
// META PROGRESSION EVENTS
// =============================================================================

export interface MetaUpgradePurchasedEvent {
  id: string;
  newLevel: number;
  cost: number;
}

export interface MetaCoinsTransferredEvent {
  metaShare: number;
  newBalance: number;
}

export interface MetaStateLoadedEvent {
  metaCoins: number;
  upgrades: Record<string, number>;
}

// =============================================================================
// CHALLENGE EVENTS
// =============================================================================

export interface ChallengeObjectiveUpdateEvent {
  type: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface ChallengeCompletedEvent {
  challengeId: string;
  reward: { metaCoins: number; bonusXp: number };
}

export interface ChallengeStartedEvent {
  challengeId: string;
  type: 'daily' | 'weekly';
}

// =============================================================================
// REPLAY EVENTS
// =============================================================================

export interface ReplaySavedEvent {
  replayId: string;
  sessionId: string;
  size: number;
}

export interface ReplayLoadedEvent {
  replayId: string;
  duration: number;
  totalKills: number;
}

export interface ReplayTickEvent {
  progress: number;
  currentTimeMs: number;
}

// =============================================================================
// TUTORIAL EVENTS
// =============================================================================

/** Emitted when the tutorial run starts (auto or replay). */
export interface TutorialStartedEvent {
  startedAt: number;
}

/** Emitted when the active tutorial step changes. */
export interface TutorialStepChangedEvent {
  stepId: string;
  stepIndex: number;
  phase: TutorialPhase;
}

/** Emitted when a step's required action is completed (before advancing). */
export interface TutorialActionCompletedEvent {
  stepId: string;
  actionType: string;
}

/** Emitted when the tutorial run completes fully. */
export interface TutorialCompletedEvent {
  completedAt: number;
  durationMs: number;
}

/** Emitted when the player skips the tutorial. */
export interface TutorialSkippedEvent {
  stepId: string;
  skippedAt: number;
}
