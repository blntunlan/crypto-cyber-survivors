/**
 * EventRecorderService - Game Event Recording for Replay Verification
 *
 * Records all significant game events with a blockchain-like hash chain.
 * The recorded events can be verified server-side to detect cheating.
 *
 * Features:
 * - Hash chain integrity (each event's hash includes the previous hash)
 * - Compression for efficient transmission
 * - Automatic heartbeat recording
 * - EventBus integration for automatic event capture
 *
 * @example
 * // Start recording at game start
 * EventRecorderService.startSession({
 *   pair: 'BTCUSDT',
 *   position: 'LONG',
 *   leverage: 10,
 *   entryPrice: 50000,
 *   playerNickname: 'Player1'
 * });
 *
 * // Record events during gameplay
 * EventRecorderService.record(ReplayEventType.ENEMY_KILL, {
 *   enemyId: 'enemy-123',
 *   enemyType: 'bear',
 *   damage: 100,
 *   xpValue: 10
 * });
 *
 * // End recording and get compressed replay
 * const replay = EventRecorderService.endSession(finalStats);
 */

import { EventBus } from './EventBus';
import { Logger } from '../system/Logger';
import {
  ReplayEventType,
  type ReplayEvent,
  type ReplayEventData,
  type ReplayMetadata,
  type ReplayStats,
  type SessionStartData,
  type SessionEndData,
  type HeartbeatData,
} from '../../types/replay';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  /** Heartbeat interval in ms */
  HEARTBEAT_INTERVAL: 5000,
  /** Maximum events to store (memory limit) */
  MAX_EVENTS: 50000,
  /** Game version for replay compatibility */
  GAME_VERSION: '1.0.0',
  /** Enable compression (requires pako) */
  ENABLE_COMPRESSION: true,
};

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Synchronous hash for immediate use (less secure but faster)
 */
function quickHash(message: string): string {
  let hash = 5381;
  for (let i = 0; i < message.length; i++) {
    hash = (hash * 33) ^ message.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// =============================================================================
// EVENT RECORDER SERVICE
// =============================================================================

class EventRecorderServiceClass {
  private static instance: EventRecorderServiceClass | null = null;

  // Recording state
  private isRecording = false;
  private sessionId: string = '';
  private sessionSecret: string = ''; // Key for HMAC-like signing
  private sessionStartTime: number = 0;
  private events: ReplayEvent[] = [];
  private eventWriteIndex = 0;
  private previousHash: string = '0';
  private sequence: number = 0;

  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private getHeartbeatData: (() => HeartbeatData) | null = null;

  // EventBus subscriptions
  private unsubscribers: Array<() => void> = [];

  // Stats tracking
  private stats: ReplayStats = this.createEmptyStats();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventRecorderServiceClass {
    return (EventRecorderServiceClass.instance ??= new EventRecorderServiceClass());
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Start recording a new session
   */
  startSession(
    data: SessionStartData,
    sessionSecret: string,
    heartbeatProvider?: () => HeartbeatData
  ): void {
    if (this.isRecording) {
      Logger.warn('[EventRecorder] Session already in progress, ending previous');
      this.reset();
    }

    // Initialize state
    this.sessionId = data.sessionId ?? `local-${Date.now()}`;
    this.sessionSecret = sessionSecret;
    this.sessionStartTime = performance.now();
    this.events = [];
    this.eventWriteIndex = 0;
    this.previousHash = '0';
    this.sequence = 0;
    this.stats = this.createEmptyStats();
    this.stats.priceAtStart = data.entryPrice;
    this.isRecording = true;

    // Set heartbeat provider
    if (heartbeatProvider) {
      this.getHeartbeatData = heartbeatProvider;
    }

    // Record session start event
    this.record(ReplayEventType.SESSION_START, data);

    // Start heartbeat
    this.startHeartbeat();

    // Subscribe to EventBus events
    this.subscribeToEvents();

    Logger.info('[EventRecorder] Session started', {
      sessionId: this.sessionId,
      signed: !!sessionSecret,
    });
  }

  /**
   * Record a game event
   */
  record(type: ReplayEventType, data: ReplayEventData): void {
    if (!this.isRecording) {
      return;
    }

    const timestamp = performance.now() - this.sessionStartTime;

    // Compute hash synchronously for performance
    // Incorporate sessionSecret for signing
    const hashPayload = JSON.stringify({
      secret: this.sessionSecret, // Keyed hash
      previousHash: this.previousHash,
      type,
      data,
      timestamp,
      sequence: this.sequence,
    });
    const hash = quickHash(hashPayload);

    const event: ReplayEvent = {
      type,
      timestamp,
      data,
      hash,
      sequence: this.sequence,
    };

    if (this.events.length < CONFIG.MAX_EVENTS) {
      this.events.push(event);
    } else {
      if (this.eventWriteIndex === 0) {
        Logger.warn('[EventRecorder] Max events reached, overwriting oldest');
      }
      this.events[this.eventWriteIndex] = event;
      this.eventWriteIndex = (this.eventWriteIndex + 1) % CONFIG.MAX_EVENTS;
    }
    this.previousHash = hash;
    this.sequence++;

    // Update stats
    this.updateStats(type, data);
  }

  /**
   * End the session and return compressed replay
   */
  endSession(finalStats: SessionEndData): {
    metadata: ReplayMetadata;
    replayData: string;
    stats: ReplayStats;
  } | null {
    if (!this.isRecording) {
      Logger.warn('[EventRecorder] No session in progress');
      return null;
    }

    // Record session end event
    this.record(ReplayEventType.SESSION_END, finalStats);

    // Stop heartbeat
    this.stopHeartbeat();

    // Unsubscribe from events
    this.unsubscribeFromEvents();

    // Update final stats
    this.stats.level = finalStats.finalLevel;
    this.stats.kills = finalStats.totalKills;
    this.stats.damageDealt = finalStats.totalDamageDealt;
    this.stats.damageTaken = finalStats.totalDamageTaken;
    this.stats.priceAtEnd = finalStats.exitPrice;
    this.stats.pnlPercent = finalStats.pnlPercent;

    // Compress replay data
    const replayData = this.compressReplay();

    // Create metadata
    const replayId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `replay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const metadata: ReplayMetadata = {
      replayId,
      sessionId: this.sessionId,
      playerId: '', // Will be filled by caller
      startTime: new Date(Date.now() - finalStats.survivalTimeMs).toISOString(),
      durationMs: finalStats.survivalTimeMs,
      eventCount: this.events.length,
      finalHash: this.previousHash,
      compressedSize: replayData.length,
      gameVersion: CONFIG.GAME_VERSION,
    };

    const result = {
      metadata,
      replayData,
      stats: { ...this.stats },
    };

    // Reset state
    this.isRecording = false;

    Logger.info('[EventRecorder] Session ended', {
      eventCount: metadata.eventCount,
      compressedSize: metadata.compressedSize,
    });

    return result;
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get current event count
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Reset recording state
   */
  reset(): void {
    this.stopHeartbeat();
    this.unsubscribeFromEvents();
    this.isRecording = false;
    this.sessionId = '';
    this.sessionStartTime = 0;
    this.events = [];
    this.eventWriteIndex = 0;
    this.previousHash = '0';
    this.sequence = 0;
    this.stats = this.createEmptyStats();
  }

  /**
   * Reset for testing
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Compress the replay data for transmission
   */
  private compressReplay(): string {
    const orderedEvents =
      this.events.length === CONFIG.MAX_EVENTS && this.eventWriteIndex > 0
        ? [
            ...this.events.slice(this.eventWriteIndex),
            ...this.events.slice(0, this.eventWriteIndex),
          ]
        : this.events;
    const jsonData = JSON.stringify(orderedEvents);

    // Try to use compression if available
    if (CONFIG.ENABLE_COMPRESSION && typeof CompressionStream !== 'undefined') {
      // CompressionStream not widely supported yet, use base64 for now
    }

    // Base64 encode for safe transmission
    try {
      return btoa(encodeURIComponent(jsonData));
    } catch {
      // Fallback for large data
      return jsonData;
    }
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): ReplayStats {
    return {
      level: 1,
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      xpGained: 0,
      goldCollected: 0,
      cardsSelected: [],
      priceAtStart: 0,
      priceAtEnd: 0,
      pnlPercent: 0,
    };
  }

  /**
   * Update stats based on event
   */
  private updateStats(type: ReplayEventType, data: ReplayEventData): void {
    switch (type) {
      case ReplayEventType.ENEMY_KILL:
        this.stats.kills++;
        if ('damage' in data) {
          this.stats.damageDealt += (data as { damage: number }).damage;
        }
        break;
      case ReplayEventType.DAMAGE_TAKEN:
        if ('amount' in data) {
          this.stats.damageTaken += (data as { amount: number }).amount;
        }
        break;
      case ReplayEventType.XP_GAINED:
        if ('amount' in data) {
          this.stats.xpGained += (data as { amount: number }).amount;
        }
        break;
      case ReplayEventType.GOLD_COLLECTED:
        if ('value' in data) {
          this.stats.goldCollected += (data as { value: number }).value;
        }
        break;
      case ReplayEventType.LEVEL_UP:
        if ('newLevel' in data) {
          this.stats.level = (data as { newLevel: number }).newLevel;
        }
        break;
      case ReplayEventType.CARD_SELECT:
        if ('cardId' in data) {
          this.stats.cardsSelected.push((data as { cardId: string }).cardId);
        }
        break;
    }
  }

  /**
   * Start automatic heartbeat recording
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isRecording && this.getHeartbeatData) {
        const heartbeatData = this.getHeartbeatData();
        this.record(ReplayEventType.HEARTBEAT, heartbeatData);
      }
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat recording
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Subscribe to EventBus events for automatic recording
   */
  private subscribeToEvents(): void {
    // Enemy killed
    this.unsubscribers.push(
      EventBus.on('enemyKilled', data => {
        this.record(ReplayEventType.ENEMY_KILL, {
          enemyId: `enemy-${Date.now()}`,
          enemyType: data.type ?? 'unknown',
          damage: 0,
          xpValue: 0,
        });
      })
    );

    // Player hit
    this.unsubscribers.push(
      EventBus.on('playerHit', data => {
        this.record(ReplayEventType.DAMAGE_TAKEN, {
          amount: data.damage,
          source: 'enemy',
          isCrit: false,
        });
      })
    );

    // Level up
    this.unsubscribers.push(
      EventBus.on('levelUp', data => {
        this.record(ReplayEventType.LEVEL_UP, {
          newLevel: data.level,
          totalXp: 0,
        });
      })
    );

    // XP gained
    this.unsubscribers.push(
      EventBus.on('xpGained', data => {
        this.record(ReplayEventType.XP_GAINED, {
          amount: data.amount,
          source: 'enemy',
        });
      })
    );

    // Gem collected
    this.unsubscribers.push(
      EventBus.on('gemCollected', data => {
        this.record(ReplayEventType.GEM_COLLECTED, {
          type: data.isRare ? 'rare' : 'common',
          value: data.value,
          x: 0,
          y: 0,
        });
      })
    );

    // Buff applied
    this.unsubscribers.push(
      EventBus.on('buffApplied', data => {
        this.record(ReplayEventType.BUFF_APPLIED, {
          buffName: data.name,
          duration: data.duration,
        });
      })
    );

    // Buff expired
    this.unsubscribers.push(
      EventBus.on('buffExpired', data => {
        this.record(ReplayEventType.BUFF_EXPIRED, {
          buffName: data.name,
          duration: 0,
        });
      })
    );
  }

  /**
   * Unsubscribe from EventBus events
   */
  private unsubscribeFromEvents(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }
}

// Export singleton
export const EventRecorderService = EventRecorderServiceClass.getInstance();
