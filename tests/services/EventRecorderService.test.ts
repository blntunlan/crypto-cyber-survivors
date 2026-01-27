import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventRecorderService } from '../../services/core/EventRecorderService';
import { EventBus } from '../../services/core/EventBus';
import { ReplayEventType } from '../../types/replay';

describe('EventRecorderService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @ts-expect-error:  reset private static
    EventRecorderService.constructor.resetForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Session Lifecycle', () => {
    const startData = {
      pair: 'BTC-USD' as any,
      position: 'LONG' as any,
      leverage: 10,
      entryPrice: 50000,
      playerNickname: 'TestPlayer',
    };

    it('should start recording correctly', () => {
      EventRecorderService.startSession(startData, 'secret-123');
      expect(EventRecorderService.isActive()).toBe(true);
      expect(EventRecorderService.getEventCount()).toBe(1); // SESSION_START
    });

    it('should end session and return compressed data', () => {
      EventRecorderService.startSession(startData, 'secret-123');

      const endData = {
        survivalTimeMs: 60000,
        finalLevel: 5,
        totalKills: 100,
        totalDamageDealt: 5000,
        totalDamageTaken: 200,
        exitPrice: 51000,
        pnlPercent: 0.02,
      };

      const result = EventRecorderService.endSession(endData);
      expect(result).not.toBeNull();
      expect(result?.metadata.eventCount).toBeGreaterThanOrEqual(2);
      expect(EventRecorderService.isActive()).toBe(false);
    });
  });

  describe('Hash Chain Integrity', () => {
    it('should produce consistent and chained hashes', () => {
      EventRecorderService.startSession({ entryPrice: 50000 } as any, 'secret');

      EventRecorderService.record(ReplayEventType.XP_GAINED, {
        amount: 10,
        source: 'test',
      });
      // @ts-expect-error:  access private events
      const event1 = EventRecorderService.events[1];
      const hash1 = event1!.hash;

      EventRecorderService.record(ReplayEventType.XP_GAINED, {
        amount: 20,
        source: 'test',
      });
      // @ts-expect-error: testing
      const event2 = EventRecorderService.events[2];
      const hash2 = event2!.hash;

      expect(hash1).not.toBe(hash2);
      expect(event2!.sequence).toBe(2);
    });
  });

  describe('EventBus Integration', () => {
    it('should automatically record events from EventBus', () => {
      EventRecorderService.startSession({ entryPrice: 50000 } as any, 'secret');

      // Emit events that should be auto-captured
      EventBus.emit('enemyKilled', { type: 'fud_bear', x: 0, y: 0 });
      EventBus.emit('playerHit', { damage: 10, remainingHp: 90 });
      EventBus.emit('levelUp', { level: 2 });

      // SESSION_START + 3 events
      expect(EventRecorderService.getEventCount()).toBe(4);
    });
  });

  describe('Heartbeat Logic', () => {
    it('should record heartbeats periodically', () => {
      const heartbeatProvider = () => ({
        playerHp: 100,
        playerX: 0,
        playerY: 0,
        currentPrice: 50000,
        enemyCount: 0,
      });

      EventRecorderService.startSession(
        { entryPrice: 50000 } as any,
        'secret',
        heartbeatProvider
      );

      // Default interval is 5000ms. Move 6 seconds.
      vi.advanceTimersByTime(6000);

      // SESSION_START + 1 HEARTBEAT
      expect(EventRecorderService.getEventCount()).toBe(2);
      // @ts-expect-error: testing
      expect(EventRecorderService.events[1]!.type).toBe(ReplayEventType.HEARTBEAT);
    });
  });
});
