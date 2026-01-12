import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../services/EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.clear();
    EventBus.disableTracing();
  });

  it('should allow subscribing to and emitting events', () => {
    let callCount = 0;
    const payload = { x: 10, y: 20 };

    EventBus.on('enemyKilled', data => {
      callCount++;
      expect(data).toEqual(payload);
    });

    EventBus.emit('enemyKilled', payload);
    expect(callCount).toBe(1);
  });

  it('should allow unsubscribing from events', () => {
    let callCount = 0;
    const unsub = EventBus.on('levelUp', () => {
      callCount++;
    });

    EventBus.emit('levelUp', { level: 1 });
    unsub();
    EventBus.emit('levelUp', { level: 2 });

    expect(callCount).toBe(1);
  });

  it('should support "once" subscriptions', () => {
    let callCount = 0;
    EventBus.once('gameOver', () => {
      callCount++;
    });

    EventBus.emit('gameOver', { finalLevel: 10, finalPnl: 100 });
    EventBus.emit('gameOver', { finalLevel: 11, finalPnl: 110 });

    expect(callCount).toBe(1);
  });

  it('should handle errors in listeners without crashing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    EventBus.on('gameReset', () => {
      throw new Error('Test Error');
    });

    // This should not throw
    expect(() => EventBus.emit('gameReset', {} as any)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should support tracing', () => {
    EventBus.enableTracing();
    expect(EventBus.isTracing()).toBe(true);

    EventBus.emit('levelUp', { level: 2 });
    const log = EventBus.getTraceLog();

    expect(log.length).toBe(1);
    expect(log[0]!.event).toBe('levelUp');
    expect(log[0]!.data).toEqual({ level: 2 });

    EventBus.clearTraceLog();
    expect(EventBus.getTraceLog().length).toBe(0);
  });

  it('should return listener counts', () => {
    const unsub1 = EventBus.on('enemyKilled', () => {});
    const unsub2 = EventBus.on('enemyKilled', () => {});

    expect(EventBus.listenerCount('enemyKilled')).toBe(2);

    unsub1();
    expect(EventBus.listenerCount('enemyKilled')).toBe(1);

    unsub2();
    expect(EventBus.listenerCount('enemyKilled')).toBe(0);
  });
});
