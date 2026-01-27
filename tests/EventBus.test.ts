import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../services/core/EventBus';
import type {
  EnemyKilledEvent,
  GemCollectedEvent,
  LevelUpEvent,
  ComboUpdateEvent,
  CritHitEvent,
  PlayerHitEvent,
  GameOverEvent,
} from '../types/events';

/**
 * EventBus Unit Tests
 *
 * Tests cover:
 * - subscribe/on: Event subscription
 * - emit: Event emission to subscribers
 * - unsubscribe: Removing listeners
 * - once: One-time subscriptions
 * - listenerCount: Counting active listeners
 * - clear/clearEvent: Cleaning up listeners
 * - Error handling in callbacks
 * - Singleton pattern
 *
 * Following AAA pattern (Arrange-Act-Assert)
 */
describe('EventBus', () => {
  // Clean up after each test to prevent test pollution
  beforeEach(() => {
    EventBus.clear();
    EventBus.clearTraceLog();
    EventBus.disableTracing();
  });

  afterEach(() => {
    EventBus.clear();
    EventBus.clearTraceLog();
    EventBus.disableTracing();
    vi.restoreAllMocks();
  });

  // =====================
  // SECTION: subscribe()
  // =====================
  describe('subscribe()', () => {
    it('should register a callback for an event', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      EventBus.subscribe('enemyKilled', callback);

      // Assert
      expect(EventBus.listenerCount('enemyKilled')).toBe(1);
    });

    it('should allow multiple subscribers to same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      EventBus.subscribe('levelUp', callback1);
      EventBus.subscribe('levelUp', callback2);
      EventBus.subscribe('levelUp', callback3);

      expect(EventBus.listenerCount('levelUp')).toBe(3);
    });

    it('should return an unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = EventBus.subscribe('gemCollected', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe when returned function is called', () => {
      const callback = vi.fn();
      const unsubscribe = EventBus.subscribe('playerHit', callback);

      unsubscribe();

      expect(EventBus.listenerCount('playerHit')).toBe(0);
    });

    it('should allow same callback to subscribe to different events', () => {
      const callback = vi.fn();

      EventBus.subscribe('enemyKilled', callback);
      EventBus.subscribe('gemCollected', callback as any);

      expect(EventBus.listenerCount('enemyKilled')).toBe(1);
      expect(EventBus.listenerCount('gemCollected')).toBe(1);
    });
  });

  // =====================
  // SECTION: on() (alias)
  // =====================
  describe('on()', () => {
    it('should work as alias for subscribe', () => {
      const callback = vi.fn();

      EventBus.on('critHit', callback);

      expect(EventBus.listenerCount('critHit')).toBe(1);
    });

    it('should return unsubscribe function like subscribe', () => {
      const callback = vi.fn();

      const unsubscribe = EventBus.on('bulletFired', callback);
      unsubscribe();

      expect(EventBus.listenerCount('bulletFired')).toBe(0);
    });
  });

  // =====================
  // SECTION: emit()
  // =====================
  describe('emit()', () => {
    describe('basic emission', () => {
      it('should call subscriber callback when event is emitted', () => {
        const callback = vi.fn();
        EventBus.subscribe('enemyKilled', callback);
        const eventData: EnemyKilledEvent = { x: 100, y: 200, type: 'bear' };

        EventBus.emit('enemyKilled', eventData);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(eventData);
      });

      it('should call all subscribers for an event', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        const callback3 = vi.fn();
        EventBus.subscribe('levelUp', callback1);
        EventBus.subscribe('levelUp', callback2);
        EventBus.subscribe('levelUp', callback3);
        const eventData: LevelUpEvent = { level: 5 };

        EventBus.emit('levelUp', eventData);

        expect(callback1).toHaveBeenCalledWith(eventData);
        expect(callback2).toHaveBeenCalledWith(eventData);
        expect(callback3).toHaveBeenCalledWith(eventData);
      });

      it('should pass correct event data to callback', () => {
        const callback = vi.fn();
        EventBus.subscribe('gemCollected', callback);
        const eventData: GemCollectedEvent = { value: 50, isRare: true };

        EventBus.emit('gemCollected', eventData);

        expect(callback).toHaveBeenCalledWith(eventData);
      });

      it('should not call subscribers of different events', () => {
        const enemyCallback = vi.fn();
        const gemCallback = vi.fn();
        EventBus.subscribe('enemyKilled', enemyCallback);
        EventBus.subscribe('gemCollected', gemCallback);

        EventBus.emit('enemyKilled', { x: 0, y: 0 });

        expect(enemyCallback).toHaveBeenCalled();
        expect(gemCallback).not.toHaveBeenCalled();
      });
    });

    describe('with no subscribers', () => {
      it('should not throw when emitting event with no subscribers', () => {
        expect(() => {
          EventBus.emit('gameReset', {});
        }).not.toThrow();
      });

      it('should not throw for unregistered event types', () => {
        expect(() => {
          EventBus.emit('killAll', {});
        }).not.toThrow();
      });
    });

    describe('type-safe payloads', () => {
      it('should emit critHit with correct payload', () => {
        const callback = vi.fn();
        EventBus.subscribe('critHit', callback);
        const data: CritHitEvent = { damage: 150, isSuperCrit: true, x: 50, y: 75 };

        EventBus.emit('critHit', data);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            damage: 150,
            isSuperCrit: true,
            x: 50,
            y: 75,
          })
        );
      });

      it('should emit playerHit with correct payload', () => {
        const callback = vi.fn();
        EventBus.subscribe('playerHit', callback);
        const data: PlayerHitEvent = { damage: 25, remainingHp: 75 };

        EventBus.emit('playerHit', data);

        expect(callback).toHaveBeenCalledWith(data);
      });

      it('should emit comboUpdate with correct payload', () => {
        const callback = vi.fn();
        EventBus.subscribe('comboUpdate', callback);
        const data: ComboUpdateEvent = {
          killStreak: 15,
          multiplier: 2.5,
          totalBonusXp: 500,
        };

        EventBus.emit('comboUpdate', data);

        expect(callback).toHaveBeenCalledWith(data);
      });

      it('should emit gameOver with correct payload', () => {
        const callback = vi.fn();
        EventBus.subscribe('gameOver', callback);
        const data: GameOverEvent = { finalLevel: 10, finalPnl: 25.5 };

        EventBus.emit('gameOver', data);

        expect(callback).toHaveBeenCalledWith(data);
      });
    });

    describe('error handling', () => {
      it('should catch errors in callbacks and continue', () => {
        const errorCallback = vi.fn(() => {
          throw new Error('Test error');
        });
        const normalCallback = vi.fn();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        EventBus.subscribe('enemyKilled', errorCallback);
        EventBus.subscribe('enemyKilled', normalCallback);

        EventBus.emit('enemyKilled', { x: 0, y: 0 });

        expect(normalCallback).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
      });

      it('should log error with event name', () => {
        const errorCallback = vi.fn(() => {
          throw new Error('Handler error');
        });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        EventBus.subscribe('levelUp', errorCallback);
        EventBus.emit('levelUp', { level: 5 });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('levelUp'),
          expect.any(Error)
        );
      });
    });
  });

  // =====================
  // SECTION: unsubscribe()
  // =====================
  describe('unsubscribe()', () => {
    it('should remove specific callback from event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      EventBus.subscribe('enemyKilled', callback1);
      EventBus.subscribe('enemyKilled', callback2);

      EventBus.unsubscribe('enemyKilled', callback1);

      expect(EventBus.listenerCount('enemyKilled')).toBe(1);

      EventBus.emit('enemyKilled', { x: 0, y: 0 });
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should not throw when unsubscribing non-existent callback', () => {
      const callback = vi.fn();

      expect(() => {
        EventBus.unsubscribe('enemyKilled', callback);
      }).not.toThrow();
    });

    it('should not throw when unsubscribing from non-existent event', () => {
      const callback = vi.fn();

      expect(() => {
        EventBus.unsubscribe('gameReset', callback);
      }).not.toThrow();
    });

    it('should only remove the specific callback reference', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      EventBus.subscribe('levelUp', callback1);
      EventBus.subscribe('levelUp', callback2);

      EventBus.unsubscribe('levelUp', callback1);
      EventBus.emit('levelUp', { level: 3 });

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  // =====================
  // SECTION: once()
  // =====================
  describe('once()', () => {
    it('should call callback only once', () => {
      const callback = vi.fn();
      EventBus.once('enemyKilled', callback);

      EventBus.emit('enemyKilled', { x: 0, y: 0 });
      EventBus.emit('enemyKilled', { x: 100, y: 100 });
      EventBus.emit('enemyKilled', { x: 200, y: 200 });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should automatically unsubscribe after first emit', () => {
      const callback = vi.fn();
      EventBus.once('levelUp', callback);

      expect(EventBus.listenerCount('levelUp')).toBe(1);

      EventBus.emit('levelUp', { level: 2 });

      expect(EventBus.listenerCount('levelUp')).toBe(0);
    });

    it('should pass correct data to callback', () => {
      const callback = vi.fn();
      const eventData: EnemyKilledEvent = { x: 50, y: 75, type: 'whale' };
      EventBus.once('enemyKilled', callback);

      EventBus.emit('enemyKilled', eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = EventBus.once('gemCollected', callback);

      unsubscribe();

      expect(EventBus.listenerCount('gemCollected')).toBe(0);
    });

    it('should allow manual unsubscribe before emit', () => {
      const callback = vi.fn();
      const unsubscribe = EventBus.once('playerHit', callback);

      unsubscribe();
      EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // =====================
  // SECTION: listenerCount()
  // =====================
  describe('listenerCount()', () => {
    it('should return 0 for event with no listeners', () => {
      expect(EventBus.listenerCount('enemyKilled')).toBe(0);
    });

    it('should return correct count after adding listeners', () => {
      EventBus.subscribe('levelUp', vi.fn());
      EventBus.subscribe('levelUp', vi.fn());

      expect(EventBus.listenerCount('levelUp')).toBe(2);
    });

    it('should return correct count after removing listeners', () => {
      const callback = vi.fn();
      EventBus.subscribe('gemCollected', callback);
      EventBus.subscribe('gemCollected', vi.fn());

      EventBus.unsubscribe('gemCollected', callback);

      expect(EventBus.listenerCount('gemCollected')).toBe(1);
    });

    it('should return 0 after clearing event', () => {
      EventBus.subscribe('critHit', vi.fn());
      EventBus.subscribe('critHit', vi.fn());

      EventBus.clearEvent('critHit');

      expect(EventBus.listenerCount('critHit')).toBe(0);
    });

    it('should track different events independently', () => {
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('levelUp', vi.fn());

      expect(EventBus.listenerCount('enemyKilled')).toBe(2);
      expect(EventBus.listenerCount('levelUp')).toBe(1);
      expect(EventBus.listenerCount('gameOver')).toBe(0);
    });
  });

  // =====================
  // SECTION: clear()
  // =====================
  describe('clear()', () => {
    it('should remove all listeners from all events', () => {
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('levelUp', vi.fn());
      EventBus.subscribe('gemCollected', vi.fn());
      EventBus.subscribe('critHit', vi.fn());

      EventBus.clear();

      expect(EventBus.listenerCount('enemyKilled')).toBe(0);
      expect(EventBus.listenerCount('levelUp')).toBe(0);
      expect(EventBus.listenerCount('gemCollected')).toBe(0);
      expect(EventBus.listenerCount('critHit')).toBe(0);
    });

    it('should not throw when clearing empty bus', () => {
      expect(() => EventBus.clear()).not.toThrow();
    });

    it('should allow new subscriptions after clear', () => {
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.clear();

      const newCallback = vi.fn();
      EventBus.subscribe('enemyKilled', newCallback);

      expect(EventBus.listenerCount('enemyKilled')).toBe(1);
    });
  });

  // =====================
  // SECTION: clearEvent()
  // =====================
  describe('clearEvent()', () => {
    it('should remove all listeners for specific event', () => {
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('levelUp', vi.fn());

      EventBus.clearEvent('enemyKilled');

      expect(EventBus.listenerCount('enemyKilled')).toBe(0);
      expect(EventBus.listenerCount('levelUp')).toBe(1);
    });

    it('should not affect other events', () => {
      const levelUpCallback = vi.fn();
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.subscribe('levelUp', levelUpCallback);

      EventBus.clearEvent('enemyKilled');
      EventBus.emit('levelUp', { level: 5 });

      expect(levelUpCallback).toHaveBeenCalled();
    });

    it('should not throw when clearing non-existent event', () => {
      expect(() => EventBus.clearEvent('gameReset')).not.toThrow();
    });
  });

  // =====================
  // SECTION: Singleton Pattern
  // =====================
  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus;
      const instance2 = EventBus;

      expect(instance1).toBe(instance2);
    });

    it('should share state across references', () => {
      const callback = vi.fn();

      EventBus.subscribe('enemyKilled', callback);
      EventBus.emit('enemyKilled', { x: 0, y: 0 });

      expect(callback).toHaveBeenCalled();
    });
  });

  // =====================
  // SECTION: Edge Cases
  // =====================
  describe('edge cases', () => {
    it('should handle rapid subscribe/unsubscribe cycles', () => {
      for (let i = 0; i < 100; i++) {
        const callback = vi.fn();
        const unsub = EventBus.subscribe('enemyKilled', callback);
        unsub();
      }

      expect(EventBus.listenerCount('enemyKilled')).toBe(0);
    });

    it('should handle unsubscribing during emit', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const unsubscribeHolder: { fn: (() => void) | null } = { fn: null };

      const selfUnsubscribeCallback = vi.fn(() => {
        unsubscribeHolder.fn?.();
      });

      EventBus.subscribe('levelUp', callback1);
      EventBus.subscribe('levelUp', selfUnsubscribeCallback);
      unsubscribeHolder.fn = EventBus.subscribe('levelUp', callback2);

      // Emit should not crash even though callback2 is unsubscribed during iteration
      // Due to Set iteration behavior, this should be safe
      EventBus.emit('levelUp', { level: 3 });

      expect(callback1).toHaveBeenCalled();
      expect(selfUnsubscribeCallback).toHaveBeenCalled();
    });

    it('should handle empty event payloads', () => {
      const callback = vi.fn();
      EventBus.subscribe('gameReset', callback);

      EventBus.emit('gameReset', {});

      expect(callback).toHaveBeenCalledWith({});
    });

    it('should handle multiple once subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      EventBus.once('levelUp', callback1);
      EventBus.once('levelUp', callback2);

      EventBus.emit('levelUp', { level: 5 });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(EventBus.listenerCount('levelUp')).toBe(0);
    });

    it('should maintain subscription order (Set behavior)', () => {
      const callOrder: number[] = [];
      EventBus.subscribe('enemyKilled', () => callOrder.push(1));
      EventBus.subscribe('enemyKilled', () => callOrder.push(2));
      EventBus.subscribe('enemyKilled', () => callOrder.push(3));

      EventBus.emit('enemyKilled', { x: 0, y: 0 });

      expect(callOrder).toEqual([1, 2, 3]);
    });
  });
  // =====================
  // SECTION: Tracing API
  // =====================
  describe('tracing API', () => {
    it('should enable and disable tracing', () => {
      expect(EventBus.isTracing()).toBe(false);

      EventBus.enableTracing();
      expect(EventBus.isTracing()).toBe(true);

      EventBus.disableTracing();
      expect(EventBus.isTracing()).toBe(false);
    });

    it('should log events when tracing is enabled', () => {
      EventBus.clearTraceLog();
      EventBus.enableTracing();
      EventBus.subscribe('enemyKilled', vi.fn());

      const data = { x: 10, y: 20 };
      EventBus.emit('enemyKilled', data);

      const logs = EventBus.getTraceLog();
      expect(logs.length).toBe(1);

      if (logs[0]) {
        expect(logs[0]).toMatchObject({
          event: 'enemyKilled',
          data,
          listenerCount: 1,
        });
        expect(logs[0].timestamp).toBeDefined();
      }
    });

    it('should not log events when tracing is disabled', () => {
      EventBus.disableTracing();
      EventBus.subscribe('enemyKilled', vi.fn());

      EventBus.emit('enemyKilled', { x: 0, y: 0 });

      expect(EventBus.getTraceLog()).toHaveLength(0);
    });

    it('should limit trace log size', () => {
      EventBus.enableTracing();
      // Implementation has MAX_TRACE_LOG = 100
      for (let i = 0; i < 110; i++) {
        EventBus.emit('gameReset', {});
      }

      const logs = EventBus.getTraceLog();
      expect(logs.length).toBeLessThanOrEqual(100);
      expect(logs.length).toBe(100);
    });

    it('should clear trace log', () => {
      EventBus.enableTracing();
      EventBus.emit('gameReset', {});
      expect(EventBus.getTraceLog()).not.toHaveLength(0);

      EventBus.clearTraceLog();
      expect(EventBus.getTraceLog()).toHaveLength(0);
    });

    it('should provide debug state', () => {
      EventBus.enableTracing();
      EventBus.subscribe('enemyKilled', vi.fn());
      EventBus.emit('enemyKilled', { x: 0, y: 0 });

      const debugState = EventBus.getDebugState();

      expect(debugState).toMatchObject({
        systemName: 'EventBus',
        isTracingEnabled: true,
        eventListenerCounts: expect.objectContaining({
          enemyKilled: 1,
        }),
      });
      expect(debugState.recentEmits).toHaveLength(1);
      expect(debugState.totalEvents).toBeGreaterThan(0);
    });
  });
});
