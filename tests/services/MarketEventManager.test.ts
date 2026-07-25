import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketEventManager } from '../../services/market/MarketEventManager';
import { EventBus } from '../../services/core/EventBus';
import { TimeService } from '../../services/core/TimeService';
import { Logger } from '../../services/system/Logger';
import { type MarketStateUpdatedEvent as MarketState } from '../../types/events';

// Mock Logger to keep test output clean
vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MarketEventManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    TimeService.reset();
    TimeService.setGameTime(0);

    // Use spyOn instead of vi.mock for EventBus to avoid singleton/import timing issues.
    // This allows us to trigger real events that the singleton is already listening to.
    vi.spyOn(EventBus, 'emit');

    // Force reset the singleton state via EventBus
    EventBus.emit('gameReset', undefined as any);

    // Clear the spy from the gameReset emit itself
    (EventBus.emit as any).mockClear();
  });

  afterEach(() => {
    TimeService.reset();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mockState: MarketState = {
    pair: 'BTC-USD',
    price: 50000,
    volume: 1000,
    rsi: 50,
    rsiState: 'NEUTRAL',
    whaleTier: 0,
    atr: 0,
    atrPercent: 0.01,
    spawnRateMultiplier: 1.0,
    normalizedVolume: 0.5,
    volumePercentile: 0.5,
    enemyAggroMultiplier: 1.0,
    updatedAt: new Date(),
  };

  it('initializes correctly and is exported as a singleton', () => {
    expect(MarketEventManager).toBeDefined();
  });

  it('detects VOLUME_SPIKE (volumePercentile > 0.9)', () => {
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.95 });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameMarketEvent',
      expect.objectContaining({
        type: 'VOLUME_SPIKE',
        intensity: 0.95,
        durationMs: 20000,
      })
    );
  });

  it('detects WHALE_ALERT (tier increase and >= 2)', () => {
    // Stage 1: Initial state (tier 0)
    EventBus.emit('marketStateUpdated', { ...mockState, whaleTier: 0 });

    // Stage 2: Whale tier 2 (spike)
    EventBus.emit('marketStateUpdated', { ...mockState, whaleTier: 2 });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameMarketEvent',
      expect.objectContaining({
        type: 'WHALE_ALERT',
        intensity: 2 / 3,
        durationMs: 30000,
      })
    );
  });

  it('detects FLASH_CRASH (price drop > 0.5%)', () => {
    // Set initial price
    EventBus.emit('marketStateUpdated', { ...mockState, price: 10000 });

    // 1% drop to 9900
    EventBus.emit('marketStateUpdated', { ...mockState, price: 9900 });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameMarketEvent',
      expect.objectContaining({
        type: 'FLASH_CRASH',
        durationMs: 15000,
      })
    );
  });

  it('detects PRICE_BREAKOUT on RSI extremes (not NEUTRAL)', () => {
    EventBus.emit('marketStateUpdated', { ...mockState, rsiState: 'OVERSOLD' });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameMarketEvent',
      expect.objectContaining({
        type: 'PRICE_BREAKOUT',
        intensity: 0.8,
        durationMs: 25000,
      })
    );
  });

  it('detects CONSOLIDATION on low volatility and neutral RSI', () => {
    EventBus.emit('marketStateUpdated', {
      ...mockState,
      atrPercent: 0.001, // < 0.002
      rsiState: 'NEUTRAL',
    });

    expect(EventBus.emit).toHaveBeenCalledWith(
      'gameMarketEvent',
      expect.objectContaining({
        type: 'CONSOLIDATION',
        intensity: 0.5,
        durationMs: 30000,
      })
    );
  });

  it('respects event cooldowns (60s)', () => {
    // First event
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.95 });

    // Second event immediately - should not fire again
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.96 });

    // Check calls: 2 for marketStateUpdated, 1 for gameMarketEvent
    const gameMarketEvents = (EventBus.emit as any).mock.calls.filter(
      (c: any[]) => c[0] === 'gameMarketEvent'
    );
    expect(gameMarketEvents.length).toBe(1);

    // Wall-clock time must not advance a gameplay cooldown.
    vi.advanceTimersByTime(61000);
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.97 });

    let gameMarketEventsAfter = (EventBus.emit as any).mock.calls.filter(
      (c: any[]) => c[0] === 'gameMarketEvent'
    );
    expect(gameMarketEventsAfter.length).toBe(1);

    TimeService.setGameTime(61000);
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.98 });

    gameMarketEventsAfter = (EventBus.emit as any).mock.calls.filter(
      (c: any[]) => c[0] === 'gameMarketEvent'
    );
    expect(gameMarketEventsAfter.length).toBe(2);
  });

  it('resets state on gameReset event', () => {
    // Set a cooldown
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.95 });

    // Reset via EventBus
    EventBus.emit('gameReset', undefined as any);

    // We need to clear the spy because we want to count fresh emits
    (EventBus.emit as any).mockClear();

    // Trigger again - should work immediately after reset
    EventBus.emit('marketStateUpdated', { ...mockState, volumePercentile: 0.95 });

    const gameMarketEvents = (EventBus.emit as any).mock.calls.filter(
      (c: any[]) => c[0] === 'gameMarketEvent'
    );
    expect(gameMarketEvents.length).toBe(1);
    expect(Logger.info).toHaveBeenCalledWith(expect.stringContaining('State reset'));
  });
});
