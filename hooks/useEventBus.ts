/**
 * useEventBus - React hook for type-safe event subscriptions with auto-cleanup
 *
 * Ensures that event listeners are correctly unsubscribed when the component
 * unmounts, preventing memory leaks and stale closure bugs.
 *
 * @param event The game event to listen for
 * @param callback The function to execute when event is emitted
 * @param deps Optional dependency array for the callback
 * @param options Optional subscription options (scope, once)
 *
 * @example
 * useEventBus('playerHealthChange', (data) => {
 *   console.log('Health:', data.hp);
 * }, []);
 */

import { useEffect, useCallback } from 'react';
import { EventBus, type SubscriptionOptions } from '../services/core/EventBus';
import type { GameEvent, EventCallback } from '../types/events';

export function useEventBus<K extends GameEvent>(
  event: K,
  callback: EventCallback<K>,
  deps: unknown[] = [],
  options: SubscriptionOptions = { scope: 'ui' }
): void {
  // Memoize the callback based on dependencies to prevent unnecessary resubscriptions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps);

  useEffect(() => {
    // Automatically use 'ui' scope for hook-based subscriptions if not specified
    const finalOptions = { scope: 'ui', ...options } as SubscriptionOptions;

    const unsubscribe = EventBus.on(event, memoizedCallback, finalOptions);

    return () => {
      unsubscribe();
    };
  }, [event, memoizedCallback, options]);
}
