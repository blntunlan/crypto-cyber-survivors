/**
 * EventBus - Observer Pattern Implementation
 *
 * Provides a strongly-typed, decoupled event system for game-wide communication.
 * Allows components to subscribe to events without direct dependencies.
 *
 * @example
 * // Subscribe to event (returns unsubscribe function)
 * const unsub = EventBus.on('enemyKilled', (data) => {
 *   console.log(data.x, data.y); // Fully typed!
 * });
 *
 * // Emit event (type-safe payload)
 * EventBus.emit('enemyKilled', { x: 100, y: 200, type: 'bear' });
 *
 * // Cleanup
 * unsub();
 */

import { GameEvent, EventDataMap, EventCallback } from '../types/events';

// Re-export types for convenience
export type { GameEvent, EventDataMap, EventCallback } from '../types/events';
export * from '../types/events';

class EventBusClass {
  private listeners: Map<GameEvent, Set<EventCallback<GameEvent>>> = new Map();
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
   * Subscribe to an event with type-safe callback
   * @returns Unsubscribe function
   */
  subscribe<K extends GameEvent>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    // Cast is safe because we control the event-to-callback mapping
    this.listeners.get(event)!.add(callback as EventCallback<GameEvent>);

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
      eventListeners.delete(callback as EventCallback<GameEvent>);
    }
  }

  /**
   * Emit an event to all subscribers with type-safe payload
   */
  emit<K extends GameEvent>(event: K, data: EventDataMap[K]): void {
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
   * Subscribe to an event and automatically unsubscribe after first emit
   */
  once<K extends GameEvent>(event: K, callback: EventCallback<K>): () => void {
    const wrapper: EventCallback<K> = data => {
      this.unsubscribe(event, wrapper);
      callback(data);
    };
    return this.subscribe(event, wrapper);
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: GameEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Clear all listeners (useful for cleanup/testing)
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
