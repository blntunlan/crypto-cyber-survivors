/**
 * EventBus - Observer Pattern Implementation
 *
 * Provides a decoupled event system for game-wide communication.
 * Allows components to subscribe to events without direct dependencies.
 */

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
  | 'settingsUpdate';

export interface EventData {
  enemyKilled: { x: number; y: number; type?: string; isCrit?: boolean };
  gemCollected: { value: number; isRare: boolean };
  levelUp: { level: number };
  levelUpComplete: { newLevel: number };
  gameOver: { finalLevel: number; finalPnl: number };
  critHit: { damage: number; isSuperCrit: boolean; x: number; y: number };
  playerHit: { damage: number; remainingHp: number };
  bulletFired: { x: number; y: number };
  killAll: Record<string, never>;
  comboUpdate: { killStreak: number; multiplier: number; totalBonusXp: number };
  comboMilestone: { name: string; kills: number; multiplier: number; color: string; sound: string };
  comboEnd: { finalStreak: number; bonusXp: number };
  levelUpStart: Record<string, never>;
  milestoneAchieved: { id: string; name: string; icon: string; color: string; type: string; threshold: number };
  gameReset: Record<string, never>;
  beforeReset: Record<string, never>;
  afterReset: Record<string, never>;
  gameInitialized: { position: string; entryPrice: number; leverage: number };
  settingsUpdate: Record<string, unknown>;
}

type EventCallback<K extends GameEvent> = (data: EventData[K]) => void;

class EventBusClass {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<GameEvent, Set<EventCallback<any>>> = new Map();
  private static instance: EventBusClass | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of EventBus
   */
  static getInstance(): EventBusClass {
    if (!EventBusClass.instance) {
      EventBusClass.instance = new EventBusClass();
    }
    return EventBusClass.instance;
  }

  /**
   * Subscribe to an event
   */
  subscribe<K extends GameEvent>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Alias for subscribe (convenience method)
   */
  on<K extends GameEvent>(event: K, callback: EventCallback<K>): () => void {
    return this.subscribe(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe<K extends GameEvent>(event: K, callback: EventCallback<K>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends GameEvent>(event: K, data: EventData[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Clear listeners for a specific event
   */
  clearEvent(event: GameEvent): void {
    this.listeners.delete(event);
  }
}

// Export singleton instance
export const EventBus = EventBusClass.getInstance();
