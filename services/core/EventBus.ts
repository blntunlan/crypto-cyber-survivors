/**
 * EventBus - Observer Pattern Implementation
 *
 * Provides a strongly-typed, decoupled event system for game-wide communication.
 * Allows components to subscribe to events without direct dependencies.
 *
 * Features:
 * 1. Strongly Typed: Full type safety for event payloads.
 * 2. Scoping: Group events into 'ui', 'gameplay', 'system' for collective cleanup.
 * 3. Performance Guardrails: Profiles listener execution and logs warnings for slow handlers.
 * 4. Throttling: Built-in support for rate-limiting high-frequency events.
 * 5. Debugging: Integrated tracing and Redux DevTools support.
 */

import {
  type GameEvent,
  type EventDataMap,
  type EventCallback,
  type EventScope,
} from '../../types/events';

export type { GameEvent, EventDataMap, EventCallback, EventScope };
import { Logger } from '../system/Logger';

// =============================================================================
// TYPES
// =============================================================================

export interface EventTrace {
  event: GameEvent;
  timestamp: number;
  listenerCount: number;
  data: unknown;
  duration?: number; // profiling info
}

export interface EventBusDebugState {
  systemName: 'EventBus';
  timestamp: number;
  isTracingEnabled: boolean;
  totalEvents: number;
  eventListenerCounts: Record<string, number>;
  recentEmits: EventTrace[];
}

export interface SubscriptionOptions {
  scope?: EventScope;
  once?: boolean;
}

// =============================================================================
// EVENT BUS CLASS
// =============================================================================

class EventBusClass {
  // Scoped storage: Scope -> Event -> Set of Callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<EventScope, Map<GameEvent, Set<EventCallback<any>>>> =
    new Map();

  // Mapping for fast lookup during unsubscribe: Callback -> Scope (to avoid searching all scopes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callbackScopes: Map<EventCallback<any>, EventScope> = new Map();

  private static instance: EventBusClass | null = null;

  // Tracing support
  private tracingEnabled = false;
  private traceLog: EventTrace[] = [];
  private readonly MAX_TRACE_LOG = 100;
  private totalEmitCount = 0;

  // Performance Guardrails
  private readonly SLOW_LISTENER_THRESHOLD_MS = 5;

  // Throttling state
  private throttleMap: Map<string, number> = new Map();

  private constructor() {
    // Initialize default scopes
    const defaultScopes: EventScope[] = ['ui', 'gameplay', 'system', 'debug'];
    defaultScopes.forEach(scope => this.listeners.set(scope, new Map()));
  }

  /**
   * Get the singleton instance of EventBus
   */
  static getInstance(): EventBusClass {
    return (EventBusClass.instance ??= new EventBusClass());
  }

  // ===========================================================================
  // TRACING & DEBUGGING
  // ===========================================================================

  enableTracing(): void {
    this.tracingEnabled = true;
    Logger.info('[EventBus] Tracing ENABLED');
  }

  disableTracing(): void {
    this.tracingEnabled = false;
    Logger.info('[EventBus] Tracing DISABLED');
  }

  isTracing(): boolean {
    return this.tracingEnabled;
  }

  getTraceLog(): EventTrace[] {
    return [...this.traceLog];
  }

  clearTraceLog(): void {
    this.traceLog = [];
  }

  getDebugState(): EventBusDebugState {
    const counts: Record<string, number> = {};
    this.listeners.forEach(scopeMap => {
      scopeMap.forEach((set, event) => {
        counts[event] = (counts[event] ?? 0) + set.size;
      });
    });

    return {
      systemName: 'EventBus',
      timestamp: Date.now(),
      isTracingEnabled: this.tracingEnabled,
      totalEvents: this.totalEmitCount,
      eventListenerCounts: counts,
      recentEmits: this.traceLog.slice(-10),
    };
  }

  // ===========================================================================
  // SUBSCRIPTION API
  // ===========================================================================

  /**
   * Subscribe to an event
   * @param event The event name
   * @param callback Function to execute
   * @param options Subscription options (scope, once)
   * @returns Unsubscribe function
   */
  subscribe<K extends GameEvent>(
    event: K,
    callback: EventCallback<K>,
    options: SubscriptionOptions = {}
  ): () => void {
    const scope = options.scope ?? 'system';

    if (!this.listeners.has(scope)) {
      this.listeners.set(scope, new Map());
    }

    const scopeMap = this.listeners.get(scope)!;
    if (!scopeMap.has(event)) {
      scopeMap.set(event, new Set());
    }

    const callbacks = scopeMap.get(event)!;

    if (options.once) {
      const onceWrapper = (data: EventDataMap[K]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.unsubscribe(event, onceWrapper as any);
        callback(data);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callbacks.add(onceWrapper as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.callbackScopes.set(onceWrapper as any, scope);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return () => this.unsubscribe(event, onceWrapper as any);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callbacks.add(callback as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.callbackScopes.set(callback as any, scope);

    return () => this.unsubscribe(event, callback);
  }

  /** Alias for subscribe */
  on<K extends GameEvent>(
    event: K,
    callback: EventCallback<K>,
    options?: SubscriptionOptions
  ): () => void {
    return this.subscribe(event, callback, options);
  }

  /**
   * Subscribe once
   */
  once<K extends GameEvent>(
    event: K,
    callback: EventCallback<K>,
    options?: Omit<SubscriptionOptions, 'once'>
  ): () => void {
    return this.subscribe(event, callback, { ...options, once: true });
  }

  /**
   * Unsubscribe a specific callback
   */
  unsubscribe<K extends GameEvent>(event: K, callback: EventCallback<K>): void {
    const scope = this.callbackScopes.get(callback);
    if (!scope) {
      // Fallback: search all scopes if scope tracking failed
      this.listeners.forEach(scopeMap => {
        scopeMap.get(event)?.delete(callback as EventCallback<GameEvent>);
      });
      return;
    }

    this.listeners
      .get(scope)
      ?.get(event)
      ?.delete(callback as EventCallback<GameEvent>);
    this.callbackScopes.delete(callback);
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: GameEvent): number {
    let count = 0;
    this.listeners.forEach(scopeMap => {
      count += scopeMap.get(event)?.size ?? 0;
    });
    return count;
  }

  /**
   * Clear all listeners in a specific scope
   */
  clearScope(scope: EventScope): void {
    const scopeMap = this.listeners.get(scope);
    if (scopeMap) {
      // Clean up callbackScopes mapping
      scopeMap.forEach(set => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set.forEach(cb => this.callbackScopes.delete(cb as any));
      });
      scopeMap.clear();
      Logger.debug(`[EventBus] Scope '${scope}' cleared`);
    }
  }

  /**
   * Clear listeners for a specific event across all scopes
   */
  clearEvent(event: GameEvent): void {
    this.listeners.forEach(scopeMap => {
      const set = scopeMap.get(event);
      if (set) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set.forEach(cb => this.callbackScopes.delete(cb as any));
        scopeMap.delete(event);
      }
    });
  }

  // ===========================================================================
  // EMISSION API
  // ===========================================================================

  /**
   * Emit an event to all subscribers
   */
  emit<K extends GameEvent>(event: K, data: EventDataMap[K]): void {
    this.totalEmitCount++;

    // GC-FREE OPTIMIZATION: Iterate directly without allocating intermediate array.
    // Note: Listeners added *during* this emit will essentially be 'live' and might run.

    // Check if we need performance profiling (only in Dev or excessive lag debugging)
    const shouldProfile =
      this.tracingEnabled || (import.meta.env.DEV && this.totalEmitCount % 100 === 0);
    const methodStart = shouldProfile ? performance.now() : 0;
    let listenerCount = 0;

    this.listeners.forEach(scopeMap => {
      const callbacks = scopeMap.get(event);
      if (callbacks && callbacks.size > 0) {
        callbacks.forEach(callback => {
          listenerCount++;
          if (shouldProfile) {
            const start = performance.now();
            try {
              callback(data);
            } catch (error) {
              Logger.error(`[EventBus] Error in handler for ${event}:`, error);
            }
            const duration = performance.now() - start;
            if (duration > this.SLOW_LISTENER_THRESHOLD_MS) {
              Logger.warn(
                `[EventBus] Slow listener for '${event}': ${duration.toFixed(2)}ms`
              );
            }
          } else {
            // Fast path (Production)
            try {
              callback(data);
            } catch (error) {
              Logger.error(`[EventBus] Error in handler for ${event}:`, error);
            }
          }
        });
      }
    });

    if (this.tracingEnabled) {
      this.logTrace(event, data, listenerCount, performance.now() - methodStart);
    }
  }

  /**
   * Emit an event but throttle it to prevent spam
   */
  emitThrottled<K extends GameEvent>(
    event: K,
    data: EventDataMap[K],
    limitMs: number
  ): void {
    const now = Date.now();
    const lastEmit = this.throttleMap.get(event) ?? 0;

    if (now - lastEmit >= limitMs) {
      this.emit(event, data);
      this.throttleMap.set(event, now);
    }
  }

  private logTrace(
    event: GameEvent,
    data: unknown,
    count: number,
    duration: number
  ): void {
    const trace: EventTrace = {
      event,
      timestamp: Date.now(),
      listenerCount: count,
      data,
      duration,
    };

    this.traceLog.push(trace);
    if (this.traceLog.length > this.MAX_TRACE_LOG) {
      this.traceLog.shift();
    }

    if (this.tracingEnabled) {
      Logger.debug(
        `[EventBus] EMIT: ${event} → ${count} listeners (${duration.toFixed(2)}ms)`,
        data
      );
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  clear(): void {
    this.listeners.forEach(m => m.clear());
    this.callbackScopes.clear();
    this.throttleMap.clear();
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.clear();
      this.instance.traceLog = [];
      this.instance.tracingEnabled = false;
      this.instance.totalEmitCount = 0;
    }
  }
}

export const EventBus = EventBusClass.getInstance();
