import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MARKET_EVENT_PRESENTATIONS,
  createMarketEventMapperV2,
} from '../../../services/market/MarketEventMapperV2';
import { EventBus } from '../../../services/core/EventBus';

vi.mock('../../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

type MarketEventListener = (payload: {
  type: keyof typeof MARKET_EVENT_PRESENTATIONS;
  intensity: number;
  durationMs: number;
}) => void;

const getMarketEventListener = (): MarketEventListener => {
  const subscription = vi
    .mocked(EventBus.on)
    .mock.calls.find(([eventName]) => eventName === 'gameMarketEvent');
  const listener = subscription?.[1];
  if (typeof listener !== 'function')
    throw new Error('Market event listener was not registered');
  return listener as MarketEventListener;
};

describe('MarketEventMapperV2', () => {
  let mapper: ReturnType<typeof createMarketEventMapperV2>;

  beforeEach(() => {
    vi.clearAllMocks();
    mapper = createMarketEventMapperV2();
  });

  afterEach(() => {
    mapper.reset();
    vi.useRealTimers();
  });

  it('registers only market lifecycle and reset subscriptions', () => {
    expect(EventBus.on).toHaveBeenCalledWith('gameMarketEvent', expect.any(Function));
    expect(EventBus.on).toHaveBeenCalledWith('gameReset', expect.any(Function));
  });

  it('records an active presentation event without emitting gameplay effects', () => {
    getMarketEventListener()({
      type: 'WHALE_ALERT',
      intensity: 0.8,
      durationMs: 5_000,
    });

    expect(mapper.isEventActive('WHALE_ALERT')).toBe(true);
    expect(mapper.getActiveEffects()).toEqual([
      expect.objectContaining({ type: 'WHALE_ALERT', intensity: 0.8 }),
    ]);
    expect(EventBus.emit).not.toHaveBeenCalled();
  });

  it('refreshes a matching lifecycle event instead of stacking it', () => {
    const listener = getMarketEventListener();
    listener({ type: 'VOLUME_SPIKE', intensity: 0.3, durationMs: 2_000 });
    listener({ type: 'VOLUME_SPIKE', intensity: 0.9, durationMs: 4_000 });

    expect(mapper.getActiveEffects()).toHaveLength(1);
    expect(mapper.getActiveEffects()[0]).toEqual(
      expect.objectContaining({ type: 'VOLUME_SPIKE', intensity: 0.9 })
    );
  });

  it('expires lifecycle events without publishing modifier-removal effects', () => {
    vi.useFakeTimers();
    getMarketEventListener()({ type: 'FLASH_CRASH', intensity: 1, durationMs: 1_000 });

    vi.advanceTimersByTime(1_100);
    mapper.update(1_100);

    expect(mapper.isEventActive('FLASH_CRASH')).toBe(false);
    expect(EventBus.emit).not.toHaveBeenCalled();
  });

  it('resets event history and lifecycle state', () => {
    getMarketEventListener()({
      type: 'PRICE_BREAKOUT',
      intensity: 0.7,
      durationMs: 5_000,
    });
    mapper.reset();

    expect(mapper.getActiveEffects()).toEqual([]);
    expect(mapper.getEventHistory()).toEqual([]);
  });

  it('keeps presentation metadata limited to lifecycle durations', () => {
    expect(MARKET_EVENT_PRESENTATIONS.VOLUME_SPIKE.durationMs).toBeGreaterThan(10_000);
    expect(MARKET_EVENT_PRESENTATIONS.WHALE_ALERT.durationMs).toBeGreaterThan(20_000);
    expect(MARKET_EVENT_PRESENTATIONS.FLASH_CRASH.durationMs).toBeGreaterThan(10_000);
  });
});
