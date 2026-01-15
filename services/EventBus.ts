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
 *
 * // Enable tracing for debugging
 * EventBus.enableTracing();
 */

import { type GameEvent, type EventDataMap, type EventCallback } from '../types/events';
import { Logger } from './Logger';

// Re-export types for convenience
export type { GameEvent, EventDataMap, EventCallback } from '../types/events';
export * from '../types/events';

// =============================================================================
// TRACING TYPES
// =============================================================================

export interface EventTrace {
  event: GameEvent;
  timestamp: number;
  listenerCount: number;
  data: unknown;
}

export interface EventBusDebugState {
  systemName: 'EventBus';
  timestamp: number;
  isTracingEnabled: boolean;
  totalEvents: number;
  eventListenerCounts: Record<string, number>;
  recentEmits: EventTrace[];
}

// =============================================================================
// EVENT BUS CLASS
// =============================================================================

class EventBusClass {
  private listeners: Map<GameEvent, Set<EventCallback<GameEvent>>> = new Map();
  private static instance: EventBusClass | null = null;

  // Tracing support
  private tracingEnabled = false;
  private traceLog: EventTrace[] = [];
  private readonly MAX_TRACE_LOG = 100;
  private totalEmitCount = 0;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance of EventBus
   */
  static getInstance(): EventBusClass {
    return (EventBusClass.instance ??= new EventBusClass());
  }

  // ===========================================================================
  // TRACING API
  // ===========================================================================

  /**
   * Enable tracing mode - logs all event emissions
   */
  enableTracing(): void {
    this.tracingEnabled = true;
    Logger.info('[EventBus] Tracing ENABLED - all events will be logged');
  }

  /**
   * Disable tracing mode
   */
  disableTracing(): void {
    this.tracingEnabled = false;
    Logger.info('[EventBus] Tracing DISABLED');
  }

  /**
   * Check if tracing is enabled
   */
  isTracing(): boolean {
    return this.tracingEnabled;
  }

  /**
   * Get recent trace log
   */
  getTraceLog(): EventTrace[] {
    return [...this.traceLog];
  }

  /**
   * Clear trace log
   */
  clearTraceLog(): void {
    this.traceLog = [];
  }

  /**
   * Get debug state for runtime inspection
   */
  getDebugState(): EventBusDebugState {
    const eventListenerCounts: Record<string, number> = {};
    this.listeners.forEach((listeners, event) => {
      eventListenerCounts[event] = listeners.size;
    });

    return {
      systemName: 'EventBus',
      timestamp: Date.now(),
      isTracingEnabled: this.tracingEnabled,
      totalEvents: this.totalEmitCount,
      eventListenerCounts,
      recentEmits: this.traceLog.slice(-10), // Last 10 events
    };
  }

  // ===========================================================================
  // SUBSCRIPTION API
  // ===========================================================================

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
    const listenerCount = eventListeners?.size ?? 0;

    // Increment total emit count
    this.totalEmitCount++;

    // Tracing
    if (this.tracingEnabled) {
      const trace: EventTrace = {
        event,
        timestamp: Date.now(),
        listenerCount,
        data,
      };

      this.traceLog.push(trace);
      if (this.traceLog.length > this.MAX_TRACE_LOG) {
        this.traceLog.shift();
      }

      Logger.debug(`[EventBus] EMIT: ${event} → ${listenerCount} listeners`, data);
    }

    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          Logger.error(`Error in event handler for ${event}:`, error);
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

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: GameEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): GameEvent[] {
    return Array.from(this.listeners.keys());
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

  /**
   * Reset for testing - clears everything including traces
   */
  static resetForTesting(): void {
    if (this.instance) {
      this.instance.clear();
      this.instance.clearTraceLog();
      this.instance.disableTracing();
      this.instance.totalEmitCount = 0;
    }
  }
}

// Export singleton instance
export const EventBus = EventBusClass.getInstance();
